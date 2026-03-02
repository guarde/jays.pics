import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useFetcher } from "@remix-run/react";
import {
  Check,
  Container,
  Download,
  Hammer,
  Link as LinkIcon,
  Link2Off,
  Pencil,
  Settings as SettingsIcon,
  TriangleAlert,
  UserPen,
  X,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "~/components/confirm-dialog";
import {
  Segment,
  SegmentedProgressBar,
} from "~/components/segmented-progress-bar";
import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getDiscordAvatarUrl } from "~/services/discord";
import { uploadToS3 } from "~/services/s3.server";
import { getSession, getUserBySession } from "~/services/session.server";

import { useAppLoaderData } from "./_app";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");

  const user = await getUserBySession(session);
  const formData = await request.formData();
  const type = formData.get("type");
  let updated = false;

  if (type === "update_username") {
    if (!can(user!.permissions, perms.bits.CanUpdateUsername))
      return redirect("/dashboard/settings");
    const username = formData.get("username");
    if (typeof username === "string" && username.length > 0) {
      const changedAt = Date.parse(
        user!.username_changed_at as unknown as string,
      );
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (changedAt < sevenDaysAgo) {
        await prisma.user.update({
          where: { id: user!.id },
          data: {
            username,
            username_changed_at: new Date(),
            username_history: JSON.stringify([
              username,
              ...JSON.parse(user!.username_history as unknown as string),
            ]),
          },
        });
        updated = true;
      }
    }
  }

  if (type === "update_avatar") {
    if (!can(user!.permissions, perms.bits.CanUpdateProfilePicture))
      return redirect("/dashboard/settings");
    const file = formData.get("avatar");
    if (file && file instanceof File && file.size > 0) {
      const ext = file.type.split("/")[1] ?? "png";
      const key = `avatars/${user!.id}.${ext}`;
      const response = await uploadToS3(file, key);
      if (response?.$metadata.httpStatusCode === 200) {
        await prisma.user.update({
          where: { id: user!.id },
          data: { avatar_url: key },
        });
        updated = true;
      }
    }
  }

  if (type === "update_discord_settings") {
    const use_avatar = formData.get("use_avatar") === "on";
    const use_banner = formData.get("use_banner") === "on";
    const use_decoration = formData.get("use_decoration") === "on";
    const display_public = formData.get("display_public") === "on";

    if (user!.discord_profile) {
      await prisma.discordProfile.update({
        where: { userId: user!.id },
        data: { use_avatar, use_banner, use_decoration, display_public },
      });
      updated = true;
    }
  }

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) return json({ ok: updated });
  return redirect("/dashboard/settings");
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "w-4 h-4"}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function ToggleRow({
  id,
  name,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={id}
          name={name}
          value="on"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-[#5865F2] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

export default function Settings() {
  const data = useAppLoaderData()!;
  const avatarFetcher = useFetcher();
  const usernameFetcher = useFetcher();
  const discordFetcher = useFetcher();
  const purgeFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const { showToast } = useToast();
  const [username, setUsername] = useState(data.user.username);
  const [editingUsername, setEditingUsername] = useState(false);

  const changedAt = Date.parse(data!.user.username_changed_at);
  const sevenDaysAgo = Date.parse(
    new Date(data!.now - 7 * 24 * 60 * 60 * 1000).toString(),
  );
  const canChange = changedAt < sevenDaysAgo;

  const discord = data.user.discord_profile;

  const usage = useMemo(() => {
    const totals = { png: 0, jpeg: 0, gif: 0, webp: 0, other: 0 };
    for (const img of (data.user.images ?? []) as Array<any>) {
      if (img.deleted_at) continue;
      switch (img.type) {
        case "image/png":
          totals.png += img.size;
          break;
        case "image/jpeg":
        case "image/jpg":
          totals.jpeg += img.size;
          break;
        case "image/gif":
          totals.gif += img.size;
          break;
        case "image/webp":
          totals.webp += img.size;
          break;
        default:
          totals.other += img.size;
      }
    }
    return totals;
  }, [data.user.images]);

  const segments: Segment[] = [
    { label: "PNG", value: usage.png, color: "bg-purple-500" },
    { label: "JPEG", value: usage.jpeg, color: "bg-yellow-500" },
    { label: "GIF", value: usage.gif, color: "bg-blue-500" },
    { label: "WEBP", value: usage.webp, color: "bg-green-500" },
  ];

  async function handleImageArchive() {
    showToast("Preparing download…", "info");
    try {
      const res = await fetch("/api/image-archive");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.user.username}-images.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const j = await res
          .json()
          .catch(() => ({ message: "Failed to download" }));
        showToast(j.message ?? "Failed to download", "error");
      }
    } catch {
      showToast("Failed to download", "error");
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center gap-2.5">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — account, discord & storage (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <UserPen className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Account Details</h3>
              </div>
              <div className="p-5 space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={`/avatar/${data.user.id}`} />
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                      {data.user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">Profile picture</p>
                    <avatarFetcher.Form
                      method="post"
                      encType="multipart/form-data"
                      className="flex gap-2"
                      onSubmit={(e) => {
                        const fd = new FormData(e.currentTarget);
                        if (
                          !(fd.get("avatar") instanceof File) ||
                          (fd.get("avatar") as File).size === 0
                        ) {
                          showToast("Select an image to upload", "error");
                          e.preventDefault();
                          return;
                        }
                        showToast("Avatar updated", "success");
                        avatarFetcher.submit(fd, {
                          method: "post",
                          encType: "multipart/form-data",
                        });
                        e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="type" value="update_avatar" />
                      <Input
                        id="avatar"
                        name="avatar"
                        type="file"
                        accept="image/*"
                        className="text-sm h-9"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </avatarFetcher.Form>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Username</Label>
                  {!canChange && (
                    <p className="text-xs text-muted-foreground">
                      You can change your username once every 7 days.
                    </p>
                  )}
                  <usernameFetcher.Form
                    method="post"
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (username === data.user.username) {
                        setEditingUsername(false);
                        showToast(
                          "You can't change to the same username",
                          "error",
                        );
                        return;
                      }
                      const fd = new FormData(e.currentTarget);
                      usernameFetcher.submit(fd, { method: "post" });
                      setEditingUsername(false);
                      showToast("Username updated", "success");
                    }}
                  >
                    <input type="hidden" name="type" value="update_username" />
                    <Input
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      readOnly={!editingUsername}
                      className="font-mono text-sm"
                    />
                    {canChange &&
                      (editingUsername ? (
                        <>
                          <Button type="submit" variant="outline" size="icon">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setUsername(data.user.username);
                              setEditingUsername(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUsername(true)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ))}
                  </usernameFetcher.Form>
                </div>
              </div>
            </div>

            {/* Discord */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <DiscordIcon className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Discord</h3>
              </div>

              {discord ? (
                <div className="p-5 space-y-4">
                  {/* Linked account info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                    {discord.discord_avatar ? (
                      <img
                        src={getDiscordAvatarUrl(
                          discord.discord_id,
                          discord.discord_avatar,
                        )}
                        alt={discord.discord_username}
                        className="h-9 w-9 rounded-full shrink-0"
                      />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#5865F2" }}
                      >
                        <DiscordIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {discord.discord_username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Linked Discord account
                      </p>
                    </div>
                    <Form method="post" action="/auth/discord/unlink">
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                        Unlink
                      </Button>
                    </Form>
                  </div>

                  {/* Discord display settings */}
                  <discordFetcher.Form
                    method="post"
                    onSubmit={(e) => {
                      const fd = new FormData(e.currentTarget);
                      discordFetcher.submit(fd, { method: "post" });
                      showToast("Discord settings saved", "success");
                      e.preventDefault();
                    }}
                  >
                    <input
                      type="hidden"
                      name="type"
                      value="update_discord_settings"
                    />
                    <div className="space-y-0">
                      <ToggleRow
                        id="use_avatar"
                        name="use_avatar"
                        label="Use Discord profile picture"
                        description="Replace your profile picture across the site with your Discord avatar"
                        defaultChecked={discord.use_avatar}
                      />
                      <ToggleRow
                        id="use_banner"
                        name="use_banner"
                        label="Use Discord banner"
                        description="Replace the banner on your profile page with your Discord banner"
                        defaultChecked={discord.use_banner}
                      />
                      <ToggleRow
                        id="use_decoration"
                        name="use_decoration"
                        label="Use Discord avatar decoration"
                        description="Show your Discord avatar decoration frame on your profile page"
                        defaultChecked={discord.use_decoration}
                      />
                      <ToggleRow
                        id="display_public"
                        name="display_public"
                        label="Display Discord publicly"
                        description="Show a Discord tag on your profile page"
                        defaultChecked={discord.display_public}
                      />
                    </div>
                    <div className="pt-4">
                      <Button type="submit" size="sm" variant="outline">
                        Save Discord Settings
                      </Button>
                    </div>
                  </discordFetcher.Form>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Link your Discord account to unlock avatar, banner, and
                    decoration display options on your profile.
                  </p>
                  <a href="/auth/discord/link">
                    <Button
                      type="button"
                      className="gap-2 text-white"
                      style={{ backgroundColor: "#5865F2" }}
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Link Discord Account
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Storage */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Container className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Storage</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap gap-3">
                      {segments.map((seg) => (
                        <div
                          key={seg.label}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-sm ${seg.color}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {seg.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {prettyBytes(data.user.space_used)} of{" "}
                      {prettyBytes(data.user.max_space)} used
                    </span>
                  </div>
                  <SegmentedProgressBar
                    segments={segments}
                    max={data.user.max_space}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: "+500MB (£0.49/mo)", order: "500mb" },
                    { label: "+1GB (£1.99/mo)", order: "1gb" },
                    { label: "+5GB (£3.99/mo)", order: "5gb" },
                  ].map(({ label, order }) => (
                    <Form
                      key={order}
                      method="post"
                      action={`/api/create-checkout-session?order=${order}`}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        {label}
                      </Button>
                    </Form>
                  ))}
                </div>

                {data.user.StorageSubscription.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Active subscriptions
                    </p>
                    {data.user.StorageSubscription.map((sub) => (
                      <Form
                        key={sub.id}
                        method="post"
                        action={`/api/subscription/${sub.id}/cancel`}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">
                          {prettyBytes(sub.storage)} plan
                        </span>
                        <Button type="submit" variant="destructive" size="sm">
                          Cancel
                        </Button>
                      </Form>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* end left col */}

          {/* Right sidebar (1/3) */}
          <div className="space-y-6">
            {/* Data & Exports */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Hammer className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Data & Exports</h3>
              </div>
              <div className="p-5 space-y-2">
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 w-full justify-start"
                  onClick={() => showToast("Preparing download…", "info")}
                >
                  <a href="/api/data-archive" download>
                    <Download className="h-3.5 w-3.5" />
                    Download my data
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 w-full justify-start"
                  onClick={handleImageArchive}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download my images
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-xl border border-destructive/40 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-destructive/20">
                <TriangleAlert className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">
                  Danger Zone
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  These actions are permanent and cannot be undone.
                </p>
                <div className="space-y-2">
                  <ConfirmDialog
                    title="Delete all images"
                    description="Are you sure you want to delete all your images? This action is irreversible."
                    onConfirm={() => {
                      purgeFetcher.submit(null, {
                        method: "post",
                        action: "/account/purge-images",
                      });
                      showToast("Images deleted", "success");
                    }}
                    trigger={
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        Delete all images
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    title="Delete account"
                    description="Delete your account and all images? This cannot be undone."
                    onConfirm={() => {
                      deleteFetcher.submit(null, {
                        method: "post",
                        action: "/account/delete",
                      });
                      showToast("Account deleted", "success");
                    }}
                    trigger={
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        Delete account
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          {/* end right col */}
        </div>
      </div>
    </main>
  );
}
