import { createPermissions } from "@guarde/perms.ts/dist/Perms";

export const perms = createPermissions({
  flags: [
    "CanBlockUploads",
    "CanManageUsers",
    "CanUpdatePermissions",
    "CanViewReports",
    "CanSeeErrors",
    "CanMakeAnnouncement",
    "CanUpdateProfilePicture",
    "CanMakeReport",
    "CanUpdateStorageLimit",
    "CanComment",
    "CanUpdateUsername",
    "CanForceUpdateUsername",
    "CanViewAdminDashboard",
    "CanUploadImages",
    "CanDonateDomains",
    "CanMakeReferrals",
  ] as const,
  roles: {
    User: [
      "CanUpdateProfilePicture",
      "CanMakeReport",
      "CanComment",
      "CanUpdateUsername",
      "CanUploadImages",
      "CanDonateDomains",
      "CanMakeReferrals",
    ],
    Admin: [
      "CanBlockUploads",
      "CanManageUsers",
      "CanUpdatePermissions",
      "CanViewReports",
      "CanSeeErrors",
      "CanMakeAnnouncement",
      "CanUpdateProfilePicture",
      "CanMakeReport",
      "CanUpdateStorageLimit",
      "CanComment",
      "CanUpdateUsername",
      "CanForceUpdateUsername",
      "CanViewAdminDashboard",
      "CanUploadImages",
      "CanDonateDomains",
      "CanMakeReferrals",
    ],
  },
});

export function can(permissions: string | bigint, flag: bigint): boolean {
  const p = typeof permissions === "string" ? BigInt(permissions) : permissions;
  return perms.hasAll(p, flag);
}

/** Human-readable label for each permission flag */
export const PERMISSION_LABELS: Record<keyof typeof perms.bits, string> = {
  CanBlockUploads: "Block Uploads",
  CanManageUsers: "Manage Users",
  CanUpdatePermissions: "Update Permissions",
  CanViewReports: "View Reports",
  CanSeeErrors: "See Errors & Logs",
  CanMakeAnnouncement: "Make Announcements",
  CanUpdateProfilePicture: "Update Profile Picture",
  CanMakeReport: "Make Reports",
  CanUpdateStorageLimit: "Update Storage Limit",
  CanComment: "Comment",
  CanUpdateUsername: "Update Username",
  CanForceUpdateUsername: "Force Update Username",
  CanViewAdminDashboard: "View Admin Dashboard",
  CanUploadImages: "Upload Images",
  CanDonateDomains: "Donate Domains",
  CanMakeReferrals: "Make Referrals",
};

export const PERMISSION_DESCRIPTIONS: Record<keyof typeof perms.bits, string> =
  {
    CanBlockUploads: "Toggle the global site upload block",
    CanManageUsers: "View and manage user profiles in admin panel",
    CanUpdatePermissions: "Change permission levels for other users",
    CanViewReports: "View content reports and delete reported content",
    CanSeeErrors: "Access system logs and tracked errors",
    CanMakeAnnouncement: "Post site-wide announcements",
    CanUpdateProfilePicture: "Upload a custom profile picture",
    CanMakeReport: "Submit reports on images and comments",
    CanUpdateStorageLimit: "Change a user's storage quota",
    CanComment: "Post comments on images and profiles",
    CanUpdateUsername: "Change own username",
    CanForceUpdateUsername: "Override any user's username",
    CanViewAdminDashboard: "Access the admin dashboard",
    CanUploadImages: "Upload images to the platform",
    CanDonateDomains: "Donate custom domains for use on the platform",
    CanMakeReferrals: "Generate and share referral codes",
  };
