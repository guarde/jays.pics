import { ImageReportReason } from "@prisma/client";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import {
  Form,
  Link,
  MetaFunction,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { Calendar, FileType, HardDrive, Pencil, Tag, X } from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useState } from "react";
import { z } from "zod";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { ReportImageDialog } from "~/components/report-image-dialog";
import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Sidebar } from "~/components/ui/sidebar";
import { SidebarGuest } from "~/components/ui/sidebar-guest";
import { Textarea } from "~/components/ui/textarea";
import { can, perms } from "~/lib/permissions";
import { templateReplacer } from "~/lib/utils";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const nameSchema = z.object({
  display_name: z.string().min(1).max(256),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({
    where: { id: params.id },
    include: { tags: { include: { tag: true } } },
  });
  if (!image) return redirect("/");

  const uploaderData = await prisma.user.findFirst({
    where: { id: image!.uploader_id },
    select: {
      username: true,
      upload_preferences: true,
      space_used: true,
      max_space: true,
      avatar_url: true,
    },
  });

  const uploader = uploaderData
    ? {
        ...uploaderData,
        space_used: Number(uploaderData.space_used),
        max_space: Number(uploaderData.max_space),
      }
    : null;

  const comments = await prisma.imageComment.findMany({
    where: { image_id: params.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      commenter_id: true,
      commenter: { select: { username: true, avatar_url: true } },
    },
  });

  const session = await getSession(request.headers.get("Cookie"));
  let user;
  if (session.has("userID")) {
    const u = await getUserBySession(session);
    user = {
      ...u!,
      notifications:
        u?.notifications?.map((n) => ({
          id: n.id,
          content: n.content,
          created_at: new Date(n.created_at).toISOString(),
        })) ?? [],
    };
  } else {
    user = {
      id: "",
      username: "Guest",
      permissions: "0",
      notifications: [],
      images: [],
    };
  }

  return {
    data: { image: image, uploader: uploader },
    user,
    comments,
    tags: image.tags.map((t) => t.tag),
    version: process.env.VERSION ?? "0.0.0",
    siteName: process.env.SITE_NAME ?? "jays.pics",
    baseDomain: process.env.BASE_DOMAIN ?? "jays.pics",
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect(`/login`);
  const user = await getUserBySession(session);

  const formData = await request.formData();
  const type = formData.get("type");

  if (type === "create_comment") {
    if (!can(user!.permissions, perms.bits.CanComment))
      return redirect(`/i/${params.id}`);
    const content = formData.get("content");
    if (typeof content !== "string" || content.length === 0) {
      return redirect(`/i/${params.id}`);
    }
    await prisma.imageComment.create({
      data: {
        commenter_id: user!.id,
        image_id: params.id!,
        content,
        hidden: false,
        flagged: false,
      },
    });
  }

  if (type === "delete_comment") {
    const commentId = formData.get("comment_id");
    if (typeof commentId !== "string") return redirect(`/i/${params.id}`);
    const comment = await prisma.imageComment.findFirst({
      where: { id: commentId },
      select: { commenter_id: true, image: { select: { uploader_id: true } } },
    });
    if (!comment) return redirect(`/i/${params.id}`);
    if (
      comment.commenter_id !== user!.id &&
      comment.image.uploader_id !== user!.id &&
      !can(user!.permissions, perms.bits.CanViewReports)
    )
      return redirect(`/i/${params.id}`);
    await prisma.imageComment.delete({ where: { id: commentId } });
  }

  if (type === "report_image") {
    if (!can(user!.permissions, perms.bits.CanMakeReport))
      return redirect(`/i/${params.id}`);
    const reasonType = formData.get("reason_type");
    const detail = formData.get("detail");
    if (typeof reasonType !== "string") return redirect(`/i/${params.id}`);
    await prisma.imageReport.create({
      data: {
        reporter_id: user!.id,
        image_id: params.id!,
        reason_type: reasonType as ImageReportReason,
        detail: typeof detail === "string" ? detail : null,
      },
    });
  }

  if (type === "add_tag") {
    const tagName = formData.get("tag");
    if (typeof tagName !== "string" || tagName.trim().length === 0)
      return redirect(`/i/${params.id}`);

    const tag = await prisma.tag.upsert({
      where: { user_id_name: { user_id: user!.id, name: tagName } },
      update: {},
      create: { name: tagName, user_id: user!.id },
    });

    await prisma.imageTag.upsert({
      where: { image_id_tag_id: { image_id: params.id!, tag_id: tag.id } },
      update: {},
      create: { image_id: params.id!, tag_id: tag.id },
    });
  }

  if (type === "remove_tag") {
    const tagId = formData.get("tag_id");
    if (typeof tagId === "string") {
      const image = await prisma.image.findUnique({
        where: { id: params.id! },
        select: { uploader_id: true },
      });
      if (image && image.uploader_id === user!.id) {
        await prisma.imageTag
          .delete({
            where: { image_id_tag_id: { image_id: params.id!, tag_id: tagId } },
          })
          .catch(() => {});
      }
    }
  }

  if (type === "update_display_name") {
    const name = formData.get("display_name");
    const result = nameSchema.safeParse({ display_name: name });
    if (!result.success) return redirect(`/i/${params.id}`);
    const image = await prisma.image.findUnique({
      where: { id: params.id! },
      select: { uploader_id: true },
    });
    if (image && image.uploader_id === user!.id) {
      await prisma.image.update({
        where: { id: params.id! },
        data: { display_name: result.data.display_name },
      });
    }
  }

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) {
    return json({ ok: true });
  }
  return redirect(`/i/${params.id}`);
}

export default function ImagePage() {
  const { data, user, comments, tags, version, siteName } =
    useLoaderData<typeof loader>();
  const [editingName, setEditingName] = useState(false);
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const [commentList, setCommentList] = useState(comments);

  const isOwner = user!.id === data.image.uploader_id;
  const isLoggedIn = user!.id !== "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {isLoggedIn ? (
        <Sidebar
          user={{
            id: user!.id,
            username: user!.username,
            permissions: user!.permissions,
            notifications: user!.notifications,
            images: user!.images,
          }}
          version={version}
          siteName={siteName}
          className="border-r hidden md:flex"
        />
      ) : (
        <SidebarGuest className="border-r hidden md:block" />
      )}

      {/* Main layout */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Image area — dark background makes any image pop */}
        <div className="flex-1 flex items-center justify-center bg-zinc-950 min-h-[40vh] lg:min-h-0 overflow-hidden">
          <img
            src={`/i/${data.image.id}/raw`}
            alt={data.image.display_name}
            className="max-h-full max-w-full object-contain drop-shadow-2xl"
          />
        </div>

        {/* Info panel */}
        <div className="w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l bg-background flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Name / title */}
            <div className="px-5 py-4 border-b border-border">
              {editingName && isOwner ? (
                <Form
                  method="POST"
                  className="flex gap-2"
                  onSubmit={() => setEditingName(false)}
                >
                  <Input
                    type="hidden"
                    name="type"
                    value="update_display_name"
                  />
                  <Input
                    name="display_name"
                    defaultValue={data.image.display_name}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="h-8">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setEditingName(false)}
                  >
                    Cancel
                  </Button>
                </Form>
              ) : (
                <div className="flex items-start gap-2">
                  <h1
                    className="flex-1 min-w-0 text-base font-semibold leading-snug truncate"
                    title={data.image.display_name}
                  >
                    {data.image.display_name}
                  </h1>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0 mt-0.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Uploader */}
            {data.uploader && (
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage
                    src={`/avatar/${data.image.uploader_id}`}
                    alt={data.uploader.username}
                  />
                  <AvatarFallback>
                    {data.uploader.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    to={`/profile/${data.uploader.username}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {data.uploader.username}
                  </Link>
                  <p className="text-xs text-muted-foreground">Uploader</p>
                </div>
              </div>
            )}

            {/* File info */}
            <div className="px-5 py-4 border-b border-border grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                  <p className="text-sm font-medium">
                    {new Date(data.image.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">
                    {prettyBytes(data.image.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <FileType className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium font-mono">
                    {data.image.type}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="px-5 py-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tags
                </span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) =>
                    isOwner ? (
                      <Form method="POST" key={t.id} className="flex">
                        <Input type="hidden" name="type" value="remove_tag" />
                        <Input type="hidden" name="tag_id" value={t.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          {t.name}
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Form>
                    ) : (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        {t.name}
                      </Badge>
                    ),
                  )}
                </div>
              )}
              {isOwner && (
                <Form method="POST" className="flex gap-2">
                  <Input type="hidden" name="type" value="add_tag" />
                  <Input
                    name="tag"
                    placeholder="Add a tag…"
                    className="flex-1 h-8 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-8">
                    Add
                  </Button>
                </Form>
              )}
              {tags.length === 0 && !isOwner && (
                <p className="text-xs text-muted-foreground">No tags</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-b border-border">
              <ReportImageDialog imageId={data.image.id} />
            </div>

            {/* Comments */}
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Comments
                </span>
                {commentList.length > 0 && (
                  <span className="text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
                    {commentList.length}
                  </span>
                )}
              </div>

              {commentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {commentList.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage
                          src={`/avatar/${c.commenter_id}`}
                          alt={c.commenter.username}
                        />
                        <AvatarFallback>
                          {c.commenter.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold mb-0.5">
                          {c.commenter.username}
                        </p>
                        <p className="text-sm text-muted-foreground break-words leading-snug">
                          {c.content}
                        </p>
                      </div>
                      {(user!.id === c.commenter_id ||
                        isOwner ||
                        can(user!.permissions, perms.bits.CanViewReports)) && (
                        <ConfirmDialog
                          onConfirm={() => {
                            const fd = new FormData();
                            fd.append("type", "delete_comment");
                            fd.append("comment_id", c.id);
                            fetcher.submit(fd, { method: "post" });
                            setCommentList((prev) =>
                              prev.filter((cm) => cm.id !== c.id),
                            );
                            showToast("Comment deleted", "success");
                          }}
                          trigger={
                            <button
                              type="button"
                              className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comment form — pinned at bottom */}
          {isLoggedIn && (
            <div className="shrink-0 border-t border-border p-4">
              <fetcher.Form
                method="POST"
                className="space-y-2"
                onSubmit={(e: {
                  currentTarget: any;
                  preventDefault: () => void;
                }) => {
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  fetcher.submit(fd, { method: "post" });
                  const content = fd.get("content");
                  if (typeof content === "string" && content.length > 0) {
                    setCommentList((prev) => [
                      {
                        id: "temp-" + Date.now(),
                        content,
                        commenter_id: user!.id,
                        commenter: {
                          username: user!.username,
                          avatar_url: null,
                        },
                      } as any,
                      ...prev,
                    ]);
                    showToast("Comment posted", "success");
                    form.reset();
                  }
                  e.preventDefault();
                }}
              >
                <Input type="hidden" name="type" value="create_comment" />
                <Textarea
                  name="content"
                  placeholder="Add a comment…"
                  required
                  className="text-sm resize-none"
                  rows={2}
                />
                <Button type="submit" size="sm" className="w-full text-white">
                  Post comment
                </Button>
              </fetcher.Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const rootData = matches.find((m) => m.id === "root")?.data as
    | { siteName?: string }
    | undefined;
  const fallbackSiteName = rootData?.siteName ?? "jays.pics";

  if (!data) return [{ title: `Image | ${fallbackSiteName}` }];

  const { baseDomain } = data;
  const dictionary = {
    "image.name": data.data.image?.display_name,
    "image.size_bytes": data.data.image?.size,
    "image.size": prettyBytes(data.data.image!.size),
    "image.created_at": data.data.image?.created_at,

    "uploader.name": data.data.uploader?.username,
    "uploader.storage_used_bytes": data.data.uploader?.space_used,
    "uploader.storage_used": prettyBytes(data.data.uploader!.space_used),
    "uploader.total_storage_bytes": data.data.uploader?.max_space,
    "uploader.total_storage": prettyBytes(data.data.uploader!.max_space),
  };

  const titleTemplate = templateReplacer(
    data.data.uploader?.upload_preferences?.embed_title ?? "",
    dictionary,
  );
  const ogTitle = titleTemplate || data.data.image?.display_name || "";

  return [
    { title: data.data.image?.display_name },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: "" },
    { property: "og:type", content: "website" },
    {
      property: "og:url",
      content: `https://webp.gay/i/${data.data.image?.id}`,
    },
    {
      property: "og:image",
      content: `https://webp.gay/i/${data.data.image?.id}/raw${data.data.image.type === "image/gif" ? ".gif" : ""}`,
    },
    {
      name: "theme-color",
      content: data.data.uploader?.upload_preferences?.embed_colour,
    },
    {
      tagName: "link",
      rel: "alternate",
      type: "application/json+oembed",
      href: `https://webp.gay/i/${data.data.image!.id}/oembed.json`,
    },
    { name: "twitter:card", content: "summary_large_image" },
  ];
};
