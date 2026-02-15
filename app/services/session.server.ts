import { randomUUID } from "crypto";

import { createCookieSessionStorage, Session } from "@remix-run/node";

import { prisma } from "~/services/database.server";

const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production" && !sessionSecret) {
  throw new Error("SESSION_SECRET must be set in production");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [sessionSecret ?? randomUUID()],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getUserBySession(session: Session) {
  const user = await prisma.user.findUnique({
    where: { id: session.get("userID") },
    select: {
      id: true,
      username: true,
      images: true,
      referrer_profile: true,
      upload_preferences: true,
      is_admin: true,
      upload_key: true,
      username_changed_at: true,
      username_history: true,
      max_space: true,
      space_used: true,
      pinned_images: true,
      avatar_url: true,
      email: true,
      StorageSubscription: true,
      notifications: {
        where: {
          seen: false,
        },
      },
    },
  });

  if (!user) return null;

  return {
    ...user,
    max_space: Number(user.max_space),
    space_used: Number(user.space_used),
    StorageSubscription:
      user.StorageSubscription?.map((s) => ({
        ...s,
        storage: Number(s.storage),
      })) ?? [],
  };
}

export async function getUserByID(id: string) {
  return await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true,
      username: true,
      images: true,
      created_at: true,
      badges: true,
      referrer_profile: true,
      pinned_images: true,
      avatar_url: true,
    },
  });
}

export async function getAllReferrals(referrer_id: string) {
  return await prisma.referral.findMany({
    where: { referrer_id: referrer_id },
  });
}

export function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return null;
}

export const { getSession, commitSession, destroySession } = sessionStorage;
