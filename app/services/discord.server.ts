import { randomUUID } from "crypto";

import bcrypt from "bcryptjs";
import { OAuth2Strategy, type OAuth2Profile } from "remix-auth-oauth2";

import { prisma } from "./database.server";
import { getSession } from "./session.server";

// Re-export client-safe URL helpers so server-only code can import from one place
export {
  getDiscordAvatarUrl,
  getDiscordBannerUrl,
  getDiscordDecorationUrl,
} from "./discord";

export type DiscordAPIUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  banner: string | null;
  avatar_decoration_data: { asset: string; sku_id?: string } | null;
};

export interface DiscordProfile extends OAuth2Profile {
  provider: "discord";
}

export async function fetchDiscordUser(
  accessToken: string,
): Promise<DiscordAPIUser> {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to fetch Discord user");
  return response.json() as Promise<DiscordAPIUser>;
}

export const discordStrategy = new OAuth2Strategy<string, DiscordProfile>(
  {
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    authorizationEndpoint: "https://discord.com/oauth2/authorize",
    tokenEndpoint: "https://discord.com/api/oauth2/token",
    redirectURI: process.env.DISCORD_REDIRECT_URI!,
    scopes: ["identify"],
  },
  async ({ tokens, request }) => {
    const discordUser = await fetchDiscordUser(tokens.access_token);

    // Detect link-to-existing-account flow via a short-lived cookie
    const cookieHeader = request.headers.get("Cookie") ?? "";
    const isLinkMode = cookieHeader
      .split(";")
      .some((c: string) => c.trim() === "discord_link_mode=1");

    if (isLinkMode) {
      const session = await getSession(cookieHeader);
      const linkUserId = session.get("userID") as string | undefined;
      if (!linkUserId) throw new Error("Not authenticated");

      // Ensure this Discord ID isn't already linked to a different account
      const existing = await prisma.discordProfile.findUnique({
        where: { discord_id: discordUser.id },
      });
      if (existing && existing.userId !== linkUserId) {
        throw new Error(
          "This Discord account is already linked to another user",
        );
      }

      await prisma.discordProfile.upsert({
        where: { userId: linkUserId },
        create: {
          userId: linkUserId,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar,
          discord_avatar_decoration:
            discordUser.avatar_decoration_data?.asset ?? null,
          discord_banner: discordUser.banner,
        },
        update: {
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar,
          discord_avatar_decoration:
            discordUser.avatar_decoration_data?.asset ?? null,
          discord_banner: discordUser.banner,
        },
      });

      return linkUserId;
    }

    // Check if a DiscordProfile already exists for this Discord ID
    const existingProfile = await prisma.discordProfile.findUnique({
      where: { discord_id: discordUser.id },
      select: { userId: true },
    });

    if (existingProfile) {
      // Check if account is locked before logging in
      const userRecord = await prisma.user.findUnique({
        where: { id: existingProfile.userId },
        select: { locked: true },
      });
      if (userRecord?.locked) throw new Error("This account has been locked.");

      // Refresh Discord data and log the user in
      await prisma.discordProfile.update({
        where: { discord_id: discordUser.id },
        data: {
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar,
          discord_avatar_decoration:
            discordUser.avatar_decoration_data?.asset ?? null,
          discord_banner: discordUser.banner,
        },
      });
      return existingProfile.userId;
    }

    // New Discord user — create a pending account awaiting referral activation
    const sanitized = discordUser.username
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase()
      .slice(0, 15);
    let username = sanitized || "user";

    let attempt = 0;
    while (await prisma.user.findFirst({ where: { username } })) {
      attempt++;
      username = `${sanitized || "user"}${attempt}`;
    }

    const hashedPassword = await bcrypt.hash(randomUUID(), 10);
    const count = await prisma.user.count();

    let badges: string | undefined;
    if (count < 100) {
      badges = JSON.stringify([
        { name: "user", text: "User" },
        { name: "early", text: "Early" },
      ]);
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        discord_pending: true,
        discord_pending_since: new Date(),
        referrer_profile: { create: {} },
        upload_preferences: { create: { subdomains: {} } },
        discord_profile: {
          create: {
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_avatar: discordUser.avatar,
            discord_avatar_decoration:
              discordUser.avatar_decoration_data?.asset ?? null,
            discord_banner: discordUser.banner,
          },
        },
        badges,
      },
    });

    return newUser.id;
  },
);
