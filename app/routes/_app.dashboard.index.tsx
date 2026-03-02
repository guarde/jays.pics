import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Ban,
  ExternalLink,
  HardDrive,
  ImageIcon,
  Link as LinkIcon,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { generateInvisibleURL } from "~/lib/utils";
import { prisma } from "~/services/database.server";
import {
  destroySession,
  getAllReferrals,
  getSession,
  getUserBySession,
} from "~/services/session.server";

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

  const referrals = await getAllReferrals(user!.referrer_profile!.id);

  const images = await prisma.image.findMany({
    where: { uploader_id: user.id },
  });

  const announcement = await prisma.announcement.findMany({
    select: {
      content: true,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 1,
  });

  const siteData = await prisma.site.findFirst();

  const url = new URL(request.url);
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

  return {
    user,
    referrals,
    images,
    announcement,
    siteData,
    clipboard,
  };
}

export default function Dashboard() {
  const { user, referrals, images, announcement, siteData, clipboard } =
    useLoaderData<typeof loader>();

  if (clipboard) {
    navigator.clipboard.writeText(clipboard);
    window.location.href = "/dashboard/index";
  }

  const [totalStorage, setTotalStorage] = useState(0);
  const [storageLimit] = useState(user.max_space);

  useEffect(() => {
    const calculatedStorage = images.reduce(
      (acc, image) => acc + image.size,
      0,
    );
    setTotalStorage(calculatedStorage);
  }, [user.images]);

  const activeImages = images.filter((img) => !img.deleted_at);
  const storagePercent = Math.min((totalStorage / storageLimit) * 100, 100);
  const recentImages = images.slice(Math.max(images.length - 15, 0)).reverse();

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header bar */}
      <div className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {user.username}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeImages.length} image{activeImages.length !== 1 ? "s" : ""}{" "}
            uploaded
          </p>
        </div>
        {siteData?.is_upload_blocked ? (
          <Button variant="destructive" size="sm" className="gap-2" disabled>
            <Ban className="h-4 w-4" />
            Uploading Disabled
          </Button>
        ) : (
          <Button asChild size="sm" className="gap-2 text-white">
            <Link to="/dashboard/upload">
              <Upload className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        )}
      </div>

      <div className="p-8 space-y-8">
        {/* Announcement */}
        {announcement[0] && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
              Announcement
            </p>
            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{announcement[0].content}</Markdown>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Total Images
                  </p>
                  <p className="text-3xl font-bold">{images.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeImages.length} active
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Storage Used
                  </p>
                  <p className="text-3xl font-bold">
                    {prettyBytes(totalStorage)}
                  </p>
                  <Progress value={storagePercent} className="mt-2 h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {storagePercent.toFixed(1)}% of {prettyBytes(storageLimit)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Referrals
                  </p>
                  <p className="text-3xl font-bold">{referrals.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total referred users
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Recent Uploads</h2>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/dashboard/images">
                <Plus className="h-3.5 w-3.5" />
                View all
              </Link>
            </Button>
          </div>

          {recentImages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-16 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No uploads yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upload your first image to get started
              </p>
              <Button asChild size="sm" className="mt-4 gap-2 text-white">
                <Link to="/dashboard/upload">
                  <Upload className="h-3.5 w-3.5" />
                  Upload image
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/40 transition-all duration-200"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={`/i/${image.id}/raw`}
                      alt={image.display_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end">
                    <div className="w-full p-2 flex items-center justify-between gap-1">
                      <p className="text-xs text-white font-medium truncate flex-1">
                        {image.display_name}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`/i/${image.id}`}
                          title="View image"
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Link
                          to={`?generate_link=${image.id}`}
                          title="Copy link"
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                          <LinkIcon className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
