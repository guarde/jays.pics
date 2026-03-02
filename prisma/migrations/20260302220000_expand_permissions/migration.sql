-- Remap existing admin users (had old CanViewAdminPage bit = bit 2 = 4 in previous scheme)
-- Old admin value was 31 (all 5 old flags set), which has bit 2 set.
UPDATE "User" SET "permissions" = 65535 WHERE ("permissions" & 4::bigint) != 0;

-- Remap all remaining users to new User role value (59072)
UPDATE "User" SET "permissions" = 59072 WHERE ("permissions" & 4::bigint) = 0;

-- Update column default to new User role
ALTER TABLE "User" ALTER COLUMN "permissions" SET DEFAULT 59072;
