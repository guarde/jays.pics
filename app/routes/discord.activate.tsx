import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  const user = await getUserBySession(session);
  if (!user) return redirect("/login");
  if (!user.discord_pending) return redirect("/dashboard/index");

  return { username: user.username };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  const user = await getUserBySession(session);
  if (!user || !user.discord_pending) return redirect("/dashboard/index");

  const formData = await request.formData();
  const referralCode = formData.get("referralCode");

  if (typeof referralCode !== "string" || referralCode.trim().length === 0) {
    return { error: "Referral code is required" };
  }

  const referrer = await prisma.referrerProfile.findFirst({
    where: { referral_code: referralCode.trim() },
  });

  if (!referrer) {
    return { error: "This referral code is invalid" };
  }

  const referralsUsed = await prisma.referral.count({
    where: { referrer_id: referrer.id },
  });

  if (referralsUsed >= referrer.referral_limit) {
    return { error: "This referral code has been used too many times" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { discord_pending: false, discord_pending_since: null },
    }),
    prisma.referral.create({
      data: { referred_id: user.id, referrer_id: referrer.id },
    }),
  ]);

  if (process.env.DISCORD_WEBHOOK_URL) {
    fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New user joined via Discord",
            description: `🎉 ${user.username} just signed up with Discord`,
          },
        ],
      }),
    }).catch(() => {});
  }

  return redirect("/dashboard/index");
}

export default function DiscordActivate() {
  const { username } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {/* Discord logo */}
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "#5865F2" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="white"
              className="w-8 h-8"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Almost there!</h1>
          <p className="text-muted-foreground text-sm">
            Welcome, <span className="text-white font-medium">{username}</span>.
            This is an invite-only service — enter a referral code to activate
            your account.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Your account will be deleted if not activated within 12 hours.
          </p>
        </div>

        <Form method="post" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="referralCode" className="text-white">
              Referral Code
            </Label>
            <Input
              id="referralCode"
              name="referralCode"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              className="font-mono"
            />
            {actionData && "error" in actionData && (
              <p className="text-sm text-destructive">{actionData.error}</p>
            )}
          </div>
          <Button className="w-full" type="submit">
            Activate Account
          </Button>
        </Form>
      </div>
    </div>
  );
}
