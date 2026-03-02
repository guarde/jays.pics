-- Update column default to new User role (9920)
-- CanUpdateProfilePicture(64) + CanMakeReport(128) + CanComment(512) + CanUpdateUsername(1024) + CanUploadImages(8192)
ALTER TABLE "User" ALTER COLUMN "permissions" SET DEFAULT 9920;
