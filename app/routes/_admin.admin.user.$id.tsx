import { AvatarImage } from "@radix-ui/react-avatar";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { CalendarIcon, MapPin } from "lucide-react";
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
import { prisma } from "~/services/database.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
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
  };
}

export default function AdminProfile() {
  const { user, images, page, imageCount, search, sort, id, publicDomains } =
    useLoaderData<typeof loader>();
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

  return (
    <>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={`/avatar/${id}`} alt={user?.username} />
              <AvatarFallback>
                {user?.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold">{user?.username}</h1>
              <p className="text-sm text-muted-foreground">
                <CalendarIcon className="mr-1 inline-block h-4 w-4" />
                Joined {new Date(user!.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                <MapPin className="mr-1 inline-block h-4 w-4" />
                Last accessed from{" "}
                {user.last_login_ip ? user.last_login_ip : "not found"}
              </p>
              <div className="mt-2">
                {JSON.parse(user!.badges).map((badge: { text: string }) => (
                  <Badge className="mr-2">{badge.text}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto mb-8">
        <CardHeader>
          <CardTitle>Uploader Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <Input className="hidden" value={"update_embed"} name="type" />
            <Label htmlFor="embed_title">Title</Label>
            <Input
              className="my-2"
              name="embed_title"
              defaultValue={user.upload_preferences?.embed_title}
              list="embed-templates"
            />
            <div className="text-red-500 text-sm">
              {actionData?.fieldErrors.embed_title}
            </div>
            <Label htmlFor="embed_author">Author</Label>
            <Input
              className="my-2"
              name="embed_author"
              defaultValue={user.upload_preferences?.embed_author}
              list="embed-templates"
            />
            <div className="text-red-500 text-sm">
              {actionData?.fieldErrors.embed_author}
            </div>
            <Label htmlFor="embed_colour">Colour</Label>
            <Input
              className="my-2"
              name="embed_colour"
              defaultValue={user.upload_preferences?.embed_colour}
            />
            <datalist id="embed-templates">
              {templates.map((t) => (
                <option key={t} value={`{{${t}}}`} />
              ))}
            </datalist>
            <div className="text-red-500 text-sm">
              {actionData?.fieldErrors.embed_colour}
            </div>
            <Button type="submit">Save</Button>
          </Form>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form method="post" className="flex gap-2">
            <Input type="hidden" name="type" value="force_username" />
            <Input
              name="username"
              defaultValue={user.username}
              className="flex-1"
            />
            <Button type="submit">Update Username</Button>
          </Form>

          <div>
            <h3 className="font-medium">Tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {JSON.parse(user.badges).map((badge: any, idx: number) => (
                <Form
                  method="post"
                  key={idx}
                  className="flex items-center gap-1"
                >
                  <Input type="hidden" name="type" value="remove_badge" />
                  <Input type="hidden" name="index" value={idx.toString()} />
                  <Badge
                    style={{ backgroundColor: badge.colour ?? undefined }}
                    className="mr-1"
                  >
                    {badge.text}
                  </Badge>
                  <Button type="submit" size="sm" variant="ghost">
                    ✕
                  </Button>
                </Form>
              ))}
            </div>
            <Form method="post" className="mt-2 flex gap-2">
              <Input type="hidden" name="type" value="add_badge" />
              <Input name="text" placeholder="Text" className="flex-1" />
              <Input name="colour" placeholder="#ffffff" className="w-24" />
              <Button type="submit" size="sm">
                Add
              </Button>
            </Form>
            <div className="pt-4">
              <h3 className="font-medium">Storage Limit</h3>
              <p className="text-sm text-muted-foreground">
                {prettyBytes(user.space_used)} used of{" "}
                {prettyBytes(user.max_space)}
              </p>
              <Form method="post" className="mt-2 flex gap-2">
                <Input type="hidden" name="type" value="update_space" />
                <Input
                  name="max_space"
                  type="number"
                  className="w-36"
                  defaultValue={user.max_space}
                />
                <Button type="submit" size="sm">
                  Update
                </Button>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 pb-4">
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>Uploaded by this user</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="get" className="mb-4 flex items-end gap-2">
            <Input
              type="text"
              name="search"
              placeholder="Search by name"
              defaultValue={search}
            />
            <Select name="sort" defaultValue={sort}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Most Reports</SelectItem>
                <SelectItem value="asc">Least Reports</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Apply</Button>
          </Form>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No images uploaded</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <Card key={image.id}>
                  <CardContent className="p-2 space-y-2">
                    <button
                      type="button"
                      onClick={(e) =>
                        e.currentTarget
                          .querySelector("img")
                          ?.classList.toggle("blur-xl")
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        e.currentTarget
                          .querySelector("img")
                          ?.classList.toggle("blur-xl")
                      }
                      className="p-0 border-0 bg-transparent"
                    >
                      <img
                        src={`/i/${image.id}/raw`}
                        alt={image.display_name}
                        className="aspect-square w-full rounded-md object-cover blur-xl cursor-pointer"
                      />
                    </button>
                    <p className="truncate text-sm font-medium hover:text-primary">
                      <a href={`/i/${image.id}`}>{image.display_name}</a>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(image.created_at).toLocaleDateString()}
                    </p>
                    <Form method="post">
                      <Input
                        type="hidden"
                        name="type"
                        value="soft_delete_image"
                      />
                      <Input type="hidden" name="image_id" value={image.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="destructive"
                        className="w-full"
                      >
                        Delete
                      </Button>
                    </Form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <Pagination
          path={`/admin/profile/${id}`}
          currentPage={page}
          totalCount={imageCount}
          query={`search=${search}&sort=${sort}`}
        />
      </Card>

      {/* Domain management */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Domain Selection</CardTitle>
          <CardDescription>
            Domains this user uploads to. Overrides their own selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-3">
            <Input type="hidden" name="type" value="update_user_domains" />
            <div className="flex flex-wrap gap-2">
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

      <Card className="mb-8 border-red-900">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription className="text-red-700">
            <i>These actions can be catastrophic</i>
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
              variant={user.locked ? "outline" : "destructive"}
            >
              {user.locked ? "Unlock Account" : "Lock Account"}
            </Button>
          </Form>
          <Button variant="destructive">Purge Images</Button>
        </CardContent>
      </Card>
    </>
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

  if (requestType === "update_embed") {
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
