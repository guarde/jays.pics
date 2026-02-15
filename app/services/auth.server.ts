import bcrypt from "bcryptjs";
import { Authenticator, AuthorizationError } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { z } from "zod";

import { prisma } from "./database.server";
import { sessionStorage, getClientIP } from "./session.server";

export class FormError extends AuthorizationError {
  constructor(
    message: string,
    public data: {
      payload: Record<string, string>;
      formErrors: string[];
      fieldErrors: Record<string, string | undefined>;
    },
  ) {
    super(message);
  }
}

export const authenticator = new Authenticator<string>(sessionStorage, {
  sessionKey: "userID",
  throwOnError: true,
});

export async function redirectIfUser(request: Request) {
  return authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard/index",
  });
}

const loginSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Must be 3 or more characters")
    .max(20, "Must be 20 or less characters"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Must be 8 or more characters")
    .max(256, "Must be 256 or less characters"),
});

authenticator.use(
  new FormStrategy(async ({ form, request }) => {
    const payload = Object.fromEntries(form) as Record<string, string>;
    const result = loginSchema.safeParse(payload);

    if (!result.success) {
      const error = result.error.flatten();
      throw new FormError("Validation", {
        payload,
        formErrors: error.formErrors,
        fieldErrors: error.fieldErrors,
      });
    }

    if (result.data.username === "system") {
      throw new FormError("Invalid", {
        payload,
        formErrors: [],
        fieldErrors: { username: "Invalid account", password: "" },
      });
    }

    const user = await prisma.user.findFirst({
      where: { username: result.data.username },
    });

    if (user === null) {
      throw new FormError("Missing", {
        payload,
        formErrors: [],
        fieldErrors: { username: "This username does not exist", password: "" },
      });
    }

    if (!(await bcrypt.compare(result.data.password, user.password))) {
      throw new FormError("Incorrect", {
        payload,
        formErrors: [],
        fieldErrors: { username: "", password: "Incorrect password" },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
        last_login_ip: getClientIP(request) ?? null,
      },
    });

    return user.id;
  }),
  "login",
);

const registerSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .regex(/^[a-z0-9_]+$/gim, "Invalid username")
    .min(3, { message: "Must be 3 or more characters" })
    .max(20, { message: "Must be 20 or less characters" }),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, { message: "Must be 8 or more characters" })
    .max(256, { message: "Must be 256 or less characters" })
    .regex(
      /([!?&-_]+)/g,
      "Insecure password - Please add one (or more) of (!, ?, &, - or _)",
    )
    .regex(
      /([0-9]+)/g,
      "Insecure password - Please add one (or more) digit (0-9)",
    ),
  referralCode: z
    .string({ required_error: "Referral Code is required" })
    .uuid("Must be a valid referral code"),
});

authenticator.use(
  new FormStrategy(async ({ form, request }) => {
    const payload = Object.fromEntries(form) as Record<string, string>;
    const result = registerSchema.safeParse(payload);

    if (!result.success) {
      const error = result.error.flatten();
      throw new FormError("Validation", {
        payload,
        formErrors: error.formErrors,
        fieldErrors: error.fieldErrors,
      });
    }

    if (
      await prisma.user.findFirst({ where: { username: result.data.username } })
    ) {
      throw new FormError("Exists", {
        payload,
        formErrors: [],
        fieldErrors: {
          username: "This username already exists",
          password: "",
          referralCode: "",
        },
      });
    }

    const referrer = await prisma.referrerProfile.findFirst({
      where: { referral_code: result.data.referralCode },
    });

    if (referrer === null) {
      throw new FormError("Invalid", {
        payload,
        formErrors: [],
        fieldErrors: {
          username: "",
          password: "",
          referralCode: "This referral code is invalid",
        },
      });
    }

    const referralsAlreadyUsed = (
      await prisma.referral.findMany({ where: { referrer_id: referrer.id } })
    ).length;

    if (referralsAlreadyUsed === referrer.referral_limit) {
      throw new FormError("Limit", {
        payload,
        formErrors: [],
        fieldErrors: {
          username: "",
          password: "",
          referralCode: "This referral code has been used too many times",
        },
      });
    }

    const hashedPassword = bcrypt.hashSync(result.data.password, 10);

    const count = await prisma.user.count();

    let badges: string | undefined;
    if (count < 100) {
      badges = JSON.stringify([
        { name: "user", text: "User" },
        { name: "early", text: "Early" },
      ]);
    }

    const user = await prisma.user.create({
      data: {
        username: result.data.username,
        password: hashedPassword,
        referrer_profile: {
          create: {},
        },
        upload_preferences: {
          create: {
            subdomains: {},
          },
        },
        last_login_at: new Date(),
        last_login_ip: getClientIP(request) ?? null,
        badges,
      },
    });

    if (process.env.DISCORD_WEBHOOK_URL) {
      fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "New user joined",
              description: `🎉 ${user.username} just signed up`,
            },
          ],
        }),
      }).catch(() => {});
    }

    await prisma.referral.create({
      data: {
        referred_id: user.id,
        referrer_id: referrer.id,
      },
    });

    return user.id;
  }),
  "register",
);

export async function logout(request: Request) {
  return authenticator.logout(request, { redirectTo: "/" });
}
