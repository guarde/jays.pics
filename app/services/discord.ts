/** Pure helper functions for building Discord CDN URLs. Safe to import client-side. */

export function getDiscordAvatarUrl(discordId: string, avatar: string): string {
  const ext = avatar.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=256`;
}

export function getDiscordBannerUrl(discordId: string, banner: string): string {
  const ext = banner.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/banners/${discordId}/${banner}.${ext}?size=480`;
}

export function getDiscordDecorationUrl(asset: string): string {
  return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=96&passthrough=true`;
}
