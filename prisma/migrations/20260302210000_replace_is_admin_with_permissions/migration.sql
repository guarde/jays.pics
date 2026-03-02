-- AddColumn
ALTER TABLE "User" ADD COLUMN "permissions" BIGINT NOT NULL DEFAULT 26;

-- Migrate existing admins
UPDATE "User" SET "permissions" = 31 WHERE "is_admin" = true;

-- DropColumn
ALTER TABLE "User" DROP COLUMN "is_admin";
