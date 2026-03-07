import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useFetcher } from "@remix-run/react";
import {
  ExternalLink,
  ImageIcon,
  Link as LinkIcon,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { useToast } from "~/components/toast";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { generateInvisibleURL } from "~/lib/utils";
import { prisma } from "~/services/database.server";
import {
  destroySession,
  getSession,
  getUserBySession,
} from "~/services/session.server";

import { useAppLoaderData } from "./_app";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));

  if (!session.has("userID")) return redirect("/");

  const user = await getUserBySession(session);

  if (user === null)
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const search = url.searchParams.get("search") ?? "";
  const sort = url.searchParams.get("sort") ?? "desc";
  let tag = url.searchParams.get("tag") ?? "";

  if (tag == "none") tag = "";

  const tags = await prisma.tag.findMany({ where: { user_id: user.id } });

  const images = await prisma.image.findMany({
    where: {
      uploader_id: user.id,
      deleted_at: null,
      display_name: { contains: search, mode: "insensitive" },
      tags: tag ? { some: { tag_id: tag } } : undefined,
    },
    orderBy: { created_at: sort === "asc" ? "asc" : "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: { tags: { include: { tag: true } } },
  });
  const imageCount = await prisma.image.count({
    where: {
      uploader_id: user.id,
      deleted_at: null,
      display_name: { contains: search, mode: "insensitive" },
      tags: tag ? { some: { tag_id: tag } } : undefined,
    },
  });

  const query = url.searchParams.get("generate_link");

  let clipboard;
  if (query !== null) {
    const urls = user.upload_preferences!.urls;
    let url;
    if (urls.length === 1) url = urls[0];
    else url = urls[Math.floor(Math.random() * urls.length)];

    const subdomains = user.upload_preferences?.subdomains as
      | Record<string, string>
      | undefined;
    const sub = subdomains?.[url];
    const domain = sub ? `${sub}.${url}` : url;
    const formedURL = `https://${domain}/i/${query}/`;
    let returnableURL = formedURL;

    if (user.upload_preferences?.domain_hack) {
      returnableURL = generateInvisibleURL(returnableURL);
    }

    clipboard = returnableURL;
  }

  return { images, clipboard, page, imageCount, search, sort, tags, tag };
}

export default function Images() {
  const { images, clipboard, page, imageCount, search, sort, tags, tag } =
    useLoaderData<typeof loader>();
  const appData = useAppLoaderData();
  const gifAutoplay = (appData?.user as any)?.gif_autoplay ?? true;
  const fetcher = useFetcher();
  const { showToast } = useToast();
  const [imageList, setImageList] = useState(images);

  useEffect(() => {
    if (clipboard) {
      navigator.clipboard.writeText(clipboard);
      showToast("Link copied to clipboard", "success");
    }
  }, [clipboard, showToast]);

  useEffect(() => {
    setImageList(images);
  }, [images]);

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Images</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {imageCount} image{imageCount !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 text-white">
          <Link to="/dashboard/upload">
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Filters */}
        <Form method="get" className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              name="search"
              placeholder="Search by name…"
              defaultValue={search}
              className="pl-9 h-9"
            />
          </div>
          <Select name="sort" defaultValue={sort}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
          {tags.length > 0 && (
            <Select name="tag" defaultValue={tag || "none"}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" size="sm" variant="outline" className="h-9">
            Apply
          </Button>
        </Form>

        {/* Grid or empty */}
        {imageList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || tag ? "No images match your filters" : "No images yet"}
            </p>
            {!search && !tag && (
              <Button asChild size="sm" className="mt-4 gap-2 text-white">
                <Link to="/dashboard/upload">
                  <Upload className="h-3.5 w-3.5" />
                  Upload your first image
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {imageList.map((image) => (
              <div
                key={image.id}
                className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/40 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={`/i/${image.id}/thumbnail${!gifAutoplay && image.type === "image/gif" ? "?freeze=1" : ""}`}
                    alt={image.display_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {image.tags.length > 0 ? (
                      image.tags.slice(0, 3).map((tl) => (
                        <span
                          key={tl.tag.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/90"
                        >
                          {tl.tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        Untagged
                      </span>
                    )}
                  </div>

                  {/* Bottom: name + actions */}
                  <div className="space-y-1.5">
                    <p
                      className="text-xs text-white font-medium truncate"
                      title={image.display_name}
                    >
                      {image.display_name}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {new Date(image.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5">
                      <a
                        href={`/i/${image.id}`}
                        title="View image"
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                      <Link
                        to={`?generate_link=${image.id}`}
                        title="Copy link"
                        className="flex items-center justify-center p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        <LinkIcon className="h-3 w-3" />
                      </Link>
                      <ConfirmDialog
                        title={`Delete '${image.display_name}'`}
                        description="This action is irreversible."
                        onConfirm={() => {
                          fetcher.submit(null, {
                            method: "post",
                            action: `/i/${image.id}/delete`,
                          });
                          setImageList((prev) =>
                            prev.filter((img) => img.id !== image.id),
                          );
                          showToast("Image deleted", "success");
                        }}
                        trigger={
                          <button
                            type="button"
                            title="Delete"
                            className="flex items-center justify-center p-1 rounded bg-white/10 hover:bg-red-500/60 text-white transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          path="/dashboard/images"
          currentPage={page}
          totalCount={imageCount}
          query={`search=${search}&sort=${sort}&tag=${tag}`}
        />
      </div>
    </main>
  );
}
