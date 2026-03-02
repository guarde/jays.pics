import { ImageReportReason } from "@prisma/client";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import {
  Form,
  MetaFunction,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import prettyBytes from "pretty-bytes";
import { useState } from "react";
import { z } from "zod";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { ReportImageDialog } from "~/components/report-image-dialog";
import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Sidebar } from "~/components/ui/sidebar";
import { SidebarGuest } from "~/components/ui/sidebar-guest";
import { Textarea } from "~/components/ui/textarea";
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
      is_admin: false,
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
      !user!.is_admin
    )
      return redirect(`/i/${params.id}`);
    await prisma.imageComment.delete({ where: { id: commentId } });
  }

  if (type === "report_image") {
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

export default function Image() {
  const { data, user, comments, tags, version, siteName } =
    useLoaderData<typeof loader>();
  const [editingName, setEditingName] = useState(false);
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const [commentList, setCommentList] = useState(comments);

  return (
    <div className="flex h-screen overflow-hidden">
      {user!.id !== "" ? (
        <Sidebar
          user={{
            username: user!.username,
            is_admin: user!.is_admin,
            notifications: user!.notifications,
            images: user!.images,
          }}
          version={version}
          siteName={siteName}
          className="border-r"
        />
      ) : (
        <SidebarGuest className="border-r" />
      )}
      <div className="flex flex-1 overflow-auto p-4 gap-4">
        <div className="flex w-full max-w-md flex-col space-y-4">
          <Card>
            <CardHeader>
              {editingName && user!.id === data.image.uploader_id ? (
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
                    className="flex-1"
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingName(false)}
                  >
                    Cancel
                  </Button>
                </Form>
              ) : (
                <CardTitle
                  onClick={() => {
                    if (user!.id === data.image.uploader_id)
                      setEditingName(true);
                  }}
                  className={
                    user!.id === data.image.uploader_id ? "cursor-pointer" : ""
                  }
                >
                  {data.image.display_name}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Uploaded by {data.uploader?.username}</p>
              <p>
                Uploaded on{" "}
                {new Date(data.image.created_at).toLocaleDateString()}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) =>
                    user!.id === data.image.uploader_id ? (
                      <Form method="POST" key={t.id} className="flex">
                        <Input type="hidden" name="type" value="remove_tag" />
                        <Input type="hidden" name="tag_id" value={t.id} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-1 py-0"
                        >
                          {t.name} ✕
                        </Button>
                      </Form>
                    ) : (
                      <Badge key={t.id} className="px-1 py-0">
                        {t.name}
                      </Badge>
                    ),
                  )}
                </div>
              )}
              {user!.id === data.image.uploader_id && (
                <Form method="POST" className="flex gap-2 mt-2">
                  <Input type="hidden" name="type" value="add_tag" />
                  <Input name="tag" placeholder="Add tag" className="flex-1" />
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </Form>
              )}
            </CardContent>
            <CardFooter>
              <ReportImageDialog imageId={data.image.id} />
            </CardFooter>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Comments ({commentList.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-auto">
              {commentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {commentList.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start space-x-2 text-sm"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            c.commenter.avatar_url
                              ? `/avatar/${c.commenter_id}`
                              : `https://api.dicebear.com/6.x/initials/svg?seed=${c.commenter.username}`
                          }
                          alt={c.commenter.username}
                        />
                        <AvatarFallback>
                          {c.commenter.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{c.commenter.username}</p>
                        <p className="text-muted-foreground break-words">
                          {c.content}
                        </p>
                      </div>
                      {(user!.id === c.commenter_id ||
                        user!.id === data.image.uploader_id ||
                        user!.is_admin) && (
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
                            <Button variant="ghost" size="icon">
                              ✕
                            </Button>
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {user!.id !== "" && (
              <CardFooter>
                <fetcher.Form
                  method="POST"
                  className="w-full space-y-2"
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
                          commenter: { username: user!.username },
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
                    placeholder="Add a comment"
                    required
                  />
                  <Button type="submit" className="w-full">
                    Post
                  </Button>
                </fetcher.Form>
              </CardFooter>
            )}
          </Card>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="aspect-square w-full max-w-lg bg-muted flex items-center justify-center overflow-hidden">
            <img
              src={`/i/${data.image.id}/raw`}
              title={data.image.display_name}
              className="object-contain h-full w-full"
            />
          </div>
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

  const { siteName, baseDomain } = data;
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

  const title = templateReplacer(
    data.data.uploader?.upload_preferences?.embed_title ?? "",
    dictionary,
  );

  return [
    { title: data.data.image?.display_name },
    { property: "og:title", content: title },
    { property: "og:description", content: "" },
    { property: "og:type", content: "website" },
    {
      property: "og:url",
      content: `https://${baseDomain}/i/${data.data.image?.id}`,
    },
    {
      property: "og:image",
      content: `https://${baseDomain}/i/${data.data.image?.id}/raw${data.data.image.type === "image/gif" ? ".gif" : ""}`,
    },
    {
      name: "theme-color",
      content: data.data.uploader?.upload_preferences?.embed_colour,
    },
    {
      tagName: "link",
      type: "application/json+oembed",
      href: `https://${baseDomain}/i/${data.data.image!.id}/oembed.json`,
    },
    { name: "twitter:card", content: "summary_large_image" },
  ];
};
