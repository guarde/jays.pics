-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discord_pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discord_pending_since" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DiscordProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "discord_username" TEXT NOT NULL,
    "discord_avatar" TEXT,
    "discord_avatar_decoration" TEXT,
    "discord_banner" TEXT,
    "use_avatar" BOOLEAN NOT NULL DEFAULT false,
    "use_banner" BOOLEAN NOT NULL DEFAULT false,
    "use_decoration" BOOLEAN NOT NULL DEFAULT false,
    "display_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordProfile_id_key" ON "DiscordProfile"("id");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordProfile_userId_key" ON "DiscordProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordProfile_discord_id_key" ON "DiscordProfile"("discord_id");

-- AddForeignKey
ALTER TABLE "DiscordProfile" ADD CONSTRAINT "DiscordProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
