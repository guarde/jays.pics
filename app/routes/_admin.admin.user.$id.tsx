import { AvatarImage } from "@radix-ui/react-avatar";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import {
  ArrowLeft,
  Globe,
  Image as ImageIcon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  User,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useState, useEffect } from "react";
import { z } from "zod";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  can,
  perms,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
} from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const FLAG_NAMES = Object.keys(perms.bits) as Array<keyof typeof perms.bits>;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanManageUsers))
    return redirect("/admin/index");

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const search = url.searchParams.get("search") ?? "";
  const sort = url.searchParams.get("sort") ?? "desc";

  const userData = await prisma.user.findFirst({
    where: { id: params.id },
    select: {
      username: true,
      created_at: true,
      badges: true,
      upload_preferences: true,
      space_used: true,
      max_space: true,
      avatar_url: true,
      last_login_ip: true,
      locked: true,
      permissions: true,
    },
  });

  const publicDomains = await prisma.uRL.findMany({
    where: { public: true, progress: "DONE" },
    select: { url: true },
  });

  if (userData === null) return redirect("/admin/index");

  const user = {
    ...userData,
    space_used: Number(userData.space_used),
    max_space: Number(userData.max_space),
    permissions: userData.permissions.toString(),
  };

  const where = {
    uploader_id: params.id as string,
    display_name: { contains: search, mode: "insensitive" as const },
  };

  const images = await prisma.image.findMany({
    where,
    select: {
      id: true,
      display_name: true,
      created_at: true,
      _count: { select: { ImageReport: true } },
    },
    orderBy: {
      ImageReport: { _count: sort === "asc" ? "asc" : "desc" },
    },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const imageCount = await prisma.image.count({ where });

  return {
    user,
    images,
    page,
    imageCount,
    search,
    sort,
    id: params.id,
    publicDomains,
    viewerPermissions: viewer.permissions,
  };
}

export default function AdminProfile() {
  const {
    user,
    images,
    page,
    imageCount,
    search,
    sort,
    id,
    publicDomains,
    viewerPermissions,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [templates, setTemplates] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/get-templates")
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setTemplates(Object.keys(d.data));
      })
      .catch(() => {});
  }, []);

  const canUpdatePerms = can(
    viewerPermissions,
    perms.bits.CanUpdatePermissions,
  );
  const targetPerms = BigInt(user.permissions);
  const badges: { text: string; colour?: string }[] = JSON.parse(
    user.badges ?? "[]",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All users
        </Link>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`/avatar/${id}`} alt={user.username} />
            <AvatarFallback>
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{user.username}</h1>
              {user.locked && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  Locked
                </span>
              )}
              {badges.map((badge, idx) => (
                <Badge
                  key={idx}
                  style={{ backgroundColor: badge.colour ?? undefined }}
                >
                  {badge.text}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Joined {new Date(user.created_at).toLocaleDateString()} · Last IP:{" "}
              {user.last_login_ip ?? "unknown"}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Permissions</CardTitle>
          </div>
          <CardDescription>
            {canUpdatePerms
              ? "Check or uncheck flags to change what this user can do."
              : "You don't have permission to edit permissions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="type" value="update_permissions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {FLAG_NAMES.map((flag) => {
                const hasFlag = can(targetPerms, perms.bits[flag]);
                return (
                  <label
                    key={flag}
                    className={`flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors ${
                      canUpdatePerms
                        ? "cursor-pointer hover:bg-accent/30"
                        : "opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={flag}
                      value="on"
                      defaultChecked={hasFlag}
                      disabled={!canUpdatePerms}
                      className="mt-0.5 accent-primary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none mb-0.5">
                        {PERMISSION_LABELS[flag]}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {PERMISSION_DESCRIPTIONS[flag]}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {canUpdatePerms && (
              <Button type="submit" size="sm">
                Save Permissions
              </Button>
            )}
          </Form>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Account Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Form method="post" className="flex gap-2">
              <Input type="hidden" name="type" value="force_username" />
              <Input
                name="username"
                defaultValue={user.username}
                className="flex-1 h-9"
              />
              <Button type="submit" size="sm">
                Update
              </Button>
            </Form>
          </div>

          <div className="space-y-1.5">
            <Label>Badges</Label>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {badges.map((badge, idx) => (
                  <Form
                    method="post"
                    key={idx}
                    className="flex items-center gap-1"
                  >
                    <Input type="hidden" name="type" value="remove_badge" />
                    <Input type="hidden" name="index" value={idx.toString()} />
                    <Badge
                      style={{ backgroundColor: badge.colour ?? undefined }}
                    >
                      {badge.text}
                    </Badge>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-muted-foreground"
                    >
                      ✕
                    </Button>
                  </Form>
                ))}
              </div>
            )}
            <Form method="post" className="flex gap-2">
              <Input type="hidden" name="type" value="add_badge" />
              <Input name="text" placeholder="Text" className="flex-1 h-9" />
              <Input name="colour" placeholder="#ffffff" className="w-24 h-9" />
              <Button type="submit" size="sm">
                Add
              </Button>
            </Form>
          </div>

          <div className="space-y-1.5">
            <Label>Storage Limit</Label>
            <p className="text-sm text-muted-foreground">
              {prettyBytes(user.space_used)} used of{" "}
              {prettyBytes(user.max_space)}
            </p>
            <Form method="post" className="flex gap-2">
              <Input type="hidden" name="type" value="update_space" />
              <Input
                name="max_space"
                type="number"
                className="w-36 h-9"
                defaultValue={user.max_space}
              />
              <Button type="submit" size="sm">
                Update
              </Button>
            </Form>
          </div>
        </CardContent>
      </Card>

      {/* Uploader Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Uploader Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-3">
            <Input
              className="hidden"
              value="update_embed"
              name="type"
              readOnly
            />
            <datalist id="embed-templates">
              {templates.map((t) => (
                <option key={t} value={`{{${t}}}`} />
              ))}
            </datalist>
            <div className="space-y-1.5">
              <Label htmlFor="embed_title">Title</Label>
              <Input
                id="embed_title"
                name="embed_title"
                defaultValue={user.upload_preferences?.embed_title}
                list="embed-templates"
                className="h-9"
              />
              {actionData?.fieldErrors.embed_title && (
                <p className="text-xs text-destructive">
                  {actionData.fieldErrors.embed_title}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="embed_author">Author</Label>
              <Input
                id="embed_author"
                name="embed_author"
                defaultValue={user.upload_preferences?.embed_author}
                list="embed-templates"
                className="h-9"
              />
              {actionData?.fieldErrors.embed_author && (
                <p className="text-xs text-destructive">
                  {actionData.fieldErrors.embed_author}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="embed_colour">Colour</Label>
              <Input
                id="embed_colour"
                name="embed_colour"
                defaultValue={user.upload_preferences?.embed_colour}
                className="h-9"
              />
              {actionData?.fieldErrors.embed_colour && (
                <p className="text-xs text-destructive">
                  {actionData.fieldErrors.embed_colour}
                </p>
              )}
            </div>
            <Button type="submit" size="sm">
              Save Preferences
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Domain Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Domain Selection</CardTitle>
          </div>
          <CardDescription>
            Domains this user uploads to. Overrides their own selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-3">
            <Input type="hidden" name="type" value="update_user_domains" />
            <div className="flex flex-wrap gap-3">
              {publicDomains.map((d) => {
                const isSelected = (
                  user.upload_preferences?.urls ?? []
                ).includes(d.url);
                return (
                  <label
                    key={d.url}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="domains"
                      value={d.url}
                      defaultChecked={isSelected}
                      className="accent-primary"
                    />
                    <span className="text-sm font-mono">{d.url}</span>
                  </label>
                );
              })}
              {publicDomains.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No public domains configured.
                </p>
              )}
            </div>
            <Button type="submit" size="sm">
              Save Domains
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Images */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Images</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {imageCount}
          </span>
        </div>
        <div className="px-5 py-4 space-y-4">
          <Form method="get" className="flex items-center gap-2">
            <Input
              type="text"
              name="search"
              placeholder="Search by name"
              defaultValue={search}
              className="flex-1 h-9"
            />
            <Select name="sort" defaultValue={sort}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Most Reports</SelectItem>
                <SelectItem value="asc">Least Reports</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </Form>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No images uploaded
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={(e) =>
                      e.currentTarget
                        .querySelector("img")
                        ?.classList.toggle("blur-xl")
                    }
                    className="w-full p-0 border-0 bg-transparent"
                  >
                    <img
                      src={`/i/${image.id}/raw`}
                      alt={image.display_name}
                      className="aspect-square w-full object-cover blur-xl cursor-pointer"
                    />
                  </button>
                  <div className="p-2 space-y-1">
                    <p className="truncate text-xs font-medium">
                      <Link
                        to={`/admin/image/${image.id}`}
                        className="hover:text-primary"
                      >
                        {image.display_name}
                      </Link>
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(image.created_at).toLocaleDateString()}
                      </span>
                      {image._count.ImageReport > 0 && (
                        <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1 py-0.5 shrink-0">
                          {image._count.ImageReport} report
                          {image._count.ImageReport !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-4">
          <Pagination
            path={`/admin/user/${id}`}
            currentPage={page}
            totalCount={imageCount}
            query={`search=${search}&sort=${sort}`}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm text-destructive">
              Danger Zone
            </CardTitle>
          </div>
          <CardDescription>
            These actions affect this user's account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Form method="post">
            <Input
              type="hidden"
              name="type"
              value={user.locked ? "unlock_account" : "lock_account"}
            />
            <Button
              type="submit"
              size="sm"
              variant={user.locked ? "outline" : "destructive"}
            >
              {user.locked ? "Unlock Account" : "Lock Account"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

const embedUpdateSchema = z.object({
  embed_title: z.string(),
  embed_author: z.string(),
  embed_colour: z
    .string()
    .length(7, { message: "Must be 7 characters long" })
    .regex(/^#/, { message: "Must be a valid hex colour" }),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanManageUsers))
    return redirect("/admin/index");

  const user = await prisma.user.findFirst({ where: { id: params.id } });
  if (user === null)
    return {
      undefined,
      formErrors: [],
      fieldErrors: {
        embed_title: "",
        embed_author: "",
        embed_colour: "",
      },
    };

  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  let result;

  const requestType = formData.get("type");
  formData.delete("type");

  if (requestType === "update_permissions") {
    if (!can(viewer.permissions, perms.bits.CanUpdatePermissions))
      return redirect(`/admin/user/${params.id}`);

    const flagNames = Object.keys(perms.bits) as Array<keyof typeof perms.bits>;
    let newPermissions = 0n;
    for (const flag of flagNames) {
      if (formData.get(flag) === "on") {
        newPermissions |= perms.bits[flag];
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { permissions: newPermissions },
    });
    await prisma.notification.create({
      data: {
        receiver_id: user.id,
        content: "Your permissions were updated by an admin.",
      },
    });
    return null;
  } else if (requestType === "update_embed") {
    result = embedUpdateSchema.safeParse(payload);
    if (!result.success) {
      const error = result.error.flatten();
      return {
        payload,
        formErrors: error.formErrors,
        fieldErrors: error.fieldErrors,
      };
    }
    await prisma.uploaderPreferences.update({
      where: {
        userId: user!.id,
      },
      data: {
        embed_author: result.data.embed_author,
        embed_title: result.data.embed_title,
        embed_colour: result.data.embed_colour,
      },
    });
    await prisma.notification.create({
      data: {
        receiver_id: user!.id,
        content: "Your embed configuration was updated by an admin",
      },
    });
  } else if (requestType === "force_username") {
    if (!can(viewer.permissions, perms.bits.CanForceUpdateUsername))
      return redirect(`/admin/user/${params.id}`);
    const username = formData.get("username");
    if (typeof username === "string" && username.length > 0) {
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
      await prisma.notification.create({
        data: {
          receiver_id: user!.id,
          content: "Your username was changed by an admin",
        },
      });
    }
    return null;
  } else if (requestType === "add_badge") {
    const text = formData.get("text");
    const colour = formData.get("colour");
    if (typeof text === "string" && typeof colour === "string") {
      const badges = JSON.parse(user!.badges ?? "[]");
      badges.push({ text, colour });
      await prisma.user.update({
        where: { id: user!.id },
        data: { badges: JSON.stringify(badges) },
      });
    }
    return null;
  } else if (requestType === "remove_badge") {
    const index = Number(formData.get("index"));
    const badges = JSON.parse(user!.badges ?? "[]");
    if (!isNaN(index)) {
      badges.splice(index, 1);
      await prisma.user.update({
        where: { id: user!.id },
        data: { badges: JSON.stringify(badges) },
      });
    }
    return null;
  } else if (requestType === "update_space") {
    if (!can(viewer.permissions, perms.bits.CanUpdateStorageLimit))
      return redirect(`/admin/user/${params.id}`);
    const maxSpaceRaw = formData.get("max_space");
    const maxSpace = maxSpaceRaw ? BigInt(maxSpaceRaw.toString()) : 0n;
    if (maxSpace > 0) {
      await prisma.user.update({
        where: { id: user!.id },
        data: { max_space: maxSpace },
      });
      await prisma.notification.create({
        data: {
          receiver_id: user!.id,
          content: "Your storage limit was changed by an admin",
        },
      });
    }
    return null;
  } else if (requestType === "soft_delete_image") {
    const imageId = formData.get("image_id");
    if (typeof imageId === "string") {
      await prisma.image.delete({ where: { id: imageId } });
    }
    return null;
  } else if (requestType === "lock_account") {
    await prisma.user.update({
      where: { id: user!.id },
      data: { locked: true },
    });
    await prisma.notification.create({
      data: {
        receiver_id: user!.id,
        content: "Your account has been locked by an admin.",
      },
    });
    return null;
  } else if (requestType === "unlock_account") {
    await prisma.user.update({
      where: { id: user!.id },
      data: { locked: false },
    });
    await prisma.notification.create({
      data: {
        receiver_id: user!.id,
        content: "Your account has been unlocked by an admin.",
      },
    });
    return null;
  } else if (requestType === "update_user_domains") {
    const domains = formData.getAll("domains").map(String);
    await prisma.uploaderPreferences.update({
      where: { userId: user!.id },
      data: { urls: domains },
    });
    return null;
  }
}
