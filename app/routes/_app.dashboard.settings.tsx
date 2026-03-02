import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useFetcher } from "@remix-run/react";
import {
  Check,
  Container,
  Download,
  Hammer,
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
import { prisma } from "~/services/database.server";
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

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) return json({ ok: updated });
  return redirect("/dashboard/settings");
}

export default function Settings() {
  const data = useAppLoaderData()!;
  const avatarFetcher = useFetcher();
  const usernameFetcher = useFetcher();
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
          {/* Left — account & storage (2/3) */}
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
                    <AvatarImage
                      src={
                        data.user.avatar_url
                          ? `/avatar/${data.user.id}`
                          : `https://api.dicebear.com/6.x/initials/svg?seed=${data.user.username}`
                      }
                    />
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
