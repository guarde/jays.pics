import { CommentReportReason } from "@prisma/client";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData, useFetcher } from "@remix-run/react";
import { Calendar, ImageIcon, MessageCircle, Users, X } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { ReportCommentDialog } from "~/components/report-comment-dialog";
import { useToast } from "~/components/toast";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { prisma } from "~/services/database.server";
import {
  getDiscordBannerUrl,
  getDiscordDecorationUrl,
} from "~/services/discord";
import {
  getAllReferrals,
  getSession,
  getUserBySession,
} from "~/services/session.server";

async function findProfileUser(slug: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: slug }, { id: slug }] },
    select: {
      id: true,
      username: true,
      images: true,
      created_at: true,
      badges: true,
      referrer_profile: true,
      pinned_images: true,
      avatar_url: true,
      discord_profile: true,
    },
  });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (params.id === "me") {
    if (!session.has("userID")) return redirect("/login");
    const me = await getUserBySession(session);
    return redirect(`/profile/${me?.username ?? session.get("userID")}`);
  }

  const slug = params.id ?? session.get("userID");
  const user = await findProfileUser(slug);
  if (!user) return redirect("/");

  const viewer = session.has("userID")
    ? await getUserBySession(session)
    : { id: "", username: "Guest", is_admin: false };

  if (!viewer) return redirect("/");

  const referrals = await getAllReferrals(user.referrer_profile!.id);

  const images = await prisma.image.findMany({
    where: { uploader_id: user.id },
  });

  const pinnedImagesRaw = user.pinned_images.length
    ? await prisma.image.findMany({ where: { id: { in: user.pinned_images } } })
    : [];
  const pinnedMap = new Map(pinnedImagesRaw.map((i) => [i.id, i]));
  const pinnedImages = user.pinned_images
    .slice(0, 4)
    .map((id) => pinnedMap.get(id) ?? null);
  while (pinnedImages.length < 4) pinnedImages.push(null);

  const comments = await prisma.comment.findMany({
    where: { receiver_id: user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      commenter_id: true,
      commenter: { select: { username: true, avatar_url: true } },
    },
  });

  return json({ user, viewer, referrals, images, pinnedImages, comments });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/login");
  const viewer = await getUserBySession(session);

  const slug = params.id!;
  const profileUser = await findProfileUser(slug);
  if (!profileUser) return redirect("/");

  const formData = await request.formData();
  const type = formData.get("type");

  if (type === "create_comment") {
    const content = formData.get("content");
    if (typeof content === "string" && content.length > 0) {
      await prisma.comment.create({
        data: {
          commenter_id: viewer!.id,
          receiver_id: profileUser.id,
          content,
          hidden: false,
          flagged: false,
        },
      });
    }
  }

  if (type === "delete_comment") {
    const commentId = formData.get("comment_id");
    if (typeof commentId === "string") {
      const comment = await prisma.comment.findFirst({
        where: { id: commentId },
        select: { commenter_id: true },
      });
      if (
        comment &&
        (comment.commenter_id === viewer!.id ||
          viewer!.id === profileUser.id ||
          viewer!.is_admin)
      ) {
        await prisma.comment.delete({ where: { id: commentId } });
      }
    }
  }

  if (type === "report_comment") {
    const commentId = formData.get("comment_id");
    const reasonType = formData.get("reason_type");
    const detail = formData.get("detail");
    if (typeof commentId === "string" && typeof reasonType === "string") {
      await prisma.commentReport.create({
        data: {
          reporter_id: viewer!.id,
          comment_id: commentId,
          reason_type: reasonType as CommentReportReason,
          detail: typeof detail === "string" ? detail : null,
        },
      });
    }
  }

  if (type === "set_pin") {
    const imageId = formData.get("image_id");
    const indexStr = formData.get("index");
    if (
      typeof imageId === "string" &&
      typeof indexStr === "string" &&
      viewer!.id === profileUser.id
    ) {
      const index = parseInt(indexStr, 10);
      if (index >= 0 && index < 4) {
        const current = await prisma.user.findUnique({
          where: { id: viewer!.id },
          select: { pinned_images: true },
        });
        if (current) {
          const pins = [...current.pinned_images];
          pins[index] = imageId;
          await prisma.user.update({
            where: { id: viewer!.id },
            data: { pinned_images: { set: pins.slice(0, 4) } },
          });
        }
      }
    }
  }

  if (type === "remove_pin") {
    const imageId = formData.get("image_id");
    if (typeof imageId === "string" && viewer!.id === profileUser.id) {
      const current = await prisma.user.findUnique({
        where: { id: viewer!.id },
        select: { pinned_images: true },
      });
      if (current) {
        await prisma.user.update({
          where: { id: viewer!.id },
          data: {
            pinned_images: {
              set: current.pinned_images.filter((i) => i !== imageId),
            },
          },
        });
      }
    }
  }

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) {
    return json({ ok: true });
  }

  return redirect(`/profile/${params.id}`);
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

export default function Profile() {
  const { user, viewer, referrals, images, comments, pinnedImages } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const [commentList, setCommentList] = useState(comments);

  const isOwner = viewer.id === user.id;
  const isLoggedIn = viewer.id !== "";
  const initials = user.username.slice(0, 2).toUpperCase();
  const badges: { text: string; colour: string }[] = JSON.parse(user.badges);

  const discord = user.discord_profile;

  // Avatar route handles the full priority chain: Discord → uploaded → 404 (AvatarFallback shows initials)
  const avatarSrc = `/avatar/${user.id}`;

  // Resolve banner
  const discordBannerUrl =
    discord?.use_banner && discord.discord_banner
      ? getDiscordBannerUrl(discord.discord_id, discord.discord_banner)
      : null;

  // Resolve decoration
  const decorationUrl =
    discord?.use_decoration && discord.discord_avatar_decoration
      ? getDiscordDecorationUrl(discord.discord_avatar_decoration)
      : null;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-5">
        {/* Banner + avatar wrapper */}
        <div className="relative">
          <div className="h-48 rounded-xl relative overflow-hidden">
            {discordBannerUrl ? (
              <img
                src={discordBannerUrl}
                alt="Discord banner"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-indigo-700" />
                <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
                <div className="absolute top-8 right-40 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute -bottom-16 left-1/3 w-72 h-72 rounded-full bg-black/10" />
              </>
            )}
          </div>

          {/* Avatar — half below the banner, left-aligned */}
          <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                <AvatarImage src={avatarSrc} alt={user.username} />
                <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Discord decoration overlay */}
              {decorationUrl && (
                <img
                  src={decorationUrl}
                  alt="Discord decoration"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: "scale(1.2)" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Profile info row */}
        <div className="pt-14 pb-5 border-b border-border flex flex-wrap items-end justify-between gap-4">
          <div className="pl-6">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
              {discord?.display_public && (
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: "#5865F2" }}
                >
                  <DiscordIcon className="h-3 w-3" />
                  {discord.discord_username}
                </span>
              )}
            </div>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge, i) => (
                <Badge
                  key={i}
                  style={
                    badge.colour ? { backgroundColor: badge.colour } : undefined
                  }
                  className="text-white text-xs px-2 py-0.5"
                >
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content below info row */}
        <div className="space-y-5">
          {/* Top row: Introduction + Pinned Images */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Introduction */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold">Introduction</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-primary/70 shrink-0" />
                  <span>
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4 text-primary/70 shrink-0" />
                  <span>
                    {images.length} image{images.length !== 1 ? "s" : ""}{" "}
                    uploaded
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-primary/70 shrink-0" />
                  <span>
                    {referrals.length} referral
                    {referrals.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {discord?.display_public && (
                  <div className="flex items-center gap-2.5">
                    <DiscordIcon className="h-4 w-4 text-primary/70 shrink-0" />
                    <span>{discord.discord_username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Images */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pinned Images</h3>
                {isOwner && (
                  <span className="text-[10px] text-muted-foreground">
                    Click slot to change
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((idx) => {
                  const img = pinnedImages[idx];
                  return (
                    <div
                      key={idx}
                      className="group relative rounded-lg overflow-hidden aspect-square border border-border/50 hover:border-primary/30 transition-all duration-200"
                    >
                      {img ? (
                        <>
                          <a
                            href={`/i/${img.id}`}
                            className="block w-full h-full"
                          >
                            <img
                              src={`/i/${img.id}/thumbnail`}
                              alt={img.display_name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1.5">
                              <p
                                className="text-white text-[9px] font-medium truncate w-full"
                                title={img.display_name}
                              >
                                {img.display_name}
                              </p>
                            </div>
                          </a>
                          {isOwner && (
                            <Form
                              method="POST"
                              className="absolute top-1 right-1 z-20"
                            >
                              <Input
                                type="hidden"
                                name="type"
                                value="remove_pin"
                              />
                              <Input
                                type="hidden"
                                name="image_id"
                                value={img.id}
                              />
                              <button
                                type="submit"
                                title="Remove pin"
                                className="p-0.5 rounded bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Form>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/30">
                          <div className="h-7 w-7 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center">
                            <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
                          </div>
                          {isOwner && (
                            <p className="text-[8px] text-muted-foreground/40">
                              Pin
                            </p>
                          )}
                        </div>
                      )}
                      {isOwner && (
                        <Form method="POST" className="absolute inset-0 z-10">
                          <Input type="hidden" name="type" value="set_pin" />
                          <Input
                            type="hidden"
                            name="index"
                            value={idx.toString()}
                          />
                          <select
                            title="Select image to pin"
                            name="image_id"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => e.currentTarget.form?.submit()}
                          >
                            <option value="">Select image</option>
                            {images.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.display_name}
                              </option>
                            ))}
                          </select>
                        </Form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comments — full width */}
          <div className="space-y-4">
            {/* Comment form */}
            {isLoggedIn && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">
                  Share your thoughts
                </h3>
                <fetcher.Form
                  method="POST"
                  onSubmit={(e) => {
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    fetcher.submit(fd, { method: "post" });
                    const content = fd.get("content");
                    if (typeof content === "string" && content.length > 0) {
                      setCommentList((prev) => [
                        {
                          id: "temp-" + Date.now(),
                          content,
                          commenter_id: viewer.id,
                          commenter: {
                            username: viewer.username,
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
                  className="space-y-3"
                >
                  <Input type="hidden" name="type" value="create_comment" />
                  <Textarea
                    name="content"
                    placeholder={`Leave a comment on ${user.username}'s profile…`}
                    required
                    className="text-sm resize-none bg-muted/30 border-border/60 focus-visible:ring-1"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" className="text-white">
                      Post
                    </Button>
                  </div>
                </fetcher.Form>
              </div>
            )}

            {/* Comments list */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Comments</h3>
                {commentList.length > 0 && (
                  <span className="text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
                    {commentList.length}
                  </span>
                )}
              </div>

              {commentList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No comments yet
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {commentList.map((c) => (
                    <div
                      key={c.id}
                      className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage
                          src={`/avatar/${c.commenter_id}`}
                          alt={c.commenter.username}
                        />
                        <AvatarFallback className="text-xs">
                          {c.commenter.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-none mb-1.5">
                          {c.commenter.username}
                        </p>
                        <p className="text-sm text-muted-foreground break-words leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity">
                        {(viewer.id === c.commenter_id ||
                          isOwner ||
                          viewer.is_admin) && (
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
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                        )}
                        <ReportCommentDialog commentId={c.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
