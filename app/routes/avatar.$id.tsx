import { LoaderFunctionArgs, redirect } from "@remix-run/node";

import { prisma } from "~/services/database.server";
import { getDiscordAvatarUrl } from "~/services/discord.server";
import { get } from "~/services/s3.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { discord_profile: true },
  });

  if (!user) return new Response("Not found", { status: 404 });

  // Serve Discord avatar when the toggle is enabled
  if (user.discord_profile?.use_avatar && user.discord_profile.discord_avatar) {
    return redirect(
      getDiscordAvatarUrl(
        user.discord_profile.discord_id,
        user.discord_profile.discord_avatar,
      ),
    );
  }

  if (!user.avatar_url) return new Response("Not found", { status: 404 });

  const data = await get(user.avatar_url);
  return new Response(data, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
