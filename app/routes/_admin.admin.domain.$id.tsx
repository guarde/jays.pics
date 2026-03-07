import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";

import { ConfirmDialog } from "~/components/confirm-dialog";
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
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanViewAdminDashboard))
    return redirect("/admin/index");

  const domain = await prisma.uRL.findFirst({
    where: { id: params.id },
    include: { donator: { select: { id: true, username: true } } },
  });

  if (!domain) return redirect("/admin/domains");

  const [userCount, usersWithDomain] = await Promise.all([
    prisma.uploaderPreferences.count({
      where: { urls: { has: domain.url } },
    }),
    prisma.uploaderPreferences.findMany({
      where: { urls: { has: domain.url } },
      include: { user: { select: { id: true, username: true } } },
    }),
  ]);

  return { domain, userCount, usersWithDomain };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanViewAdminDashboard))
    return redirect("/admin/index");

  const domain = await prisma.uRL.findFirst({ where: { id: params.id } });
  if (!domain) return redirect("/admin/domains");

  const formData = await request.formData();
  const type = formData.get("type");

  if (type === "toggle_privacy") {
    await prisma.uRL.update({
      where: { id: params.id },
      data: { public: !domain.public },
    });
    return null;
  }

  if (type === "update_url") {
    const newUrl = (formData.get("url") as string)?.trim();
    if (newUrl && newUrl !== domain.url) {
      await prisma.uRL.update({
        where: { id: params.id },
        data: { url: newUrl },
      });
      const prefs = await prisma.uploaderPreferences.findMany({
        where: { urls: { has: domain.url } },
      });
      for (const pref of prefs) {
        await prisma.uploaderPreferences.update({
          where: { id: pref.id },
          data: { urls: pref.urls.map((u) => (u === domain.url ? newUrl : u)) },
        });
      }
    }
    return redirect(`/admin/domain/${params.id}`);
  }

  if (type === "disconnect") {
    const prefs = await prisma.uploaderPreferences.findMany({
      where: { urls: { has: domain.url } },
    });
    for (const pref of prefs) {
      await prisma.uploaderPreferences.update({
        where: { id: pref.id },
        data: { urls: pref.urls.filter((u) => u !== domain.url) },
      });
    }
    return null;
  }

  if (type === "delete") {
    const prefs = await prisma.uploaderPreferences.findMany({
      where: { urls: { has: domain.url } },
    });
    for (const pref of prefs) {
      await prisma.uploaderPreferences.update({
        where: { id: pref.id },
        data: { urls: pref.urls.filter((u) => u !== domain.url) },
      });
    }
    await prisma.uRL.delete({ where: { id: params.id } });
    return redirect("/admin/domains");
  }

  return null;
}

const PROGRESS_BADGE: Record<string, string> = {
  DONE: "bg-green-500/10 text-green-400 border-green-500/20",
  WAITING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  INPUT: "bg-muted text-muted-foreground border-border",
};

export default function AdminDomainDetail() {
  const { domain, userCount, usersWithDomain } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  function submit(type: string) {
    const fd = new FormData();
    fd.append("type", type);
    fetcher.submit(fd, { method: "POST" });
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          to="/admin/domains"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All domains
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold font-mono">{domain.url}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${PROGRESS_BADGE[domain.progress] ?? PROGRESS_BADGE.INPUT}`}
          >
            {domain.progress}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-md border font-medium ${domain.public ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
          >
            {domain.public ? "Public" : "Private"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Added by{" "}
          <Link
            to={`/admin/user/${domain.donator?.id}`}
            className="text-foreground hover:underline"
          >
            {domain.donator?.username ?? "unknown"}
          </Link>{" "}
          · {new Date(domain.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Domain Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">URL</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono">{domain.url}</span>
                <a
                  href={`https://${domain.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Zone ID</span>
              <span className="font-mono text-xs">{domain.zone_id || "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">
                Nameservers
              </span>
              <div className="text-right text-xs font-mono space-y-0.5">
                {domain.nameservers.filter(Boolean).length > 0
                  ? domain.nameservers
                      .filter(Boolean)
                      .map((ns) => <div key={ns}>{ns}</div>)
                  : "—"}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last checked</span>
              <span>{new Date(domain.last_checked_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(domain.created_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Privacy toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Visibility</CardTitle>
              <CardDescription>
                Public domains are available to all users. Private domains are
                restricted to the donator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="POST">
                <input type="hidden" name="type" value="toggle_privacy" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {domain.public ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      Make Public
                    </>
                  )}
                </Button>
              </Form>
            </CardContent>
          </Card>

          {/* Edit URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Edit Domain URL</CardTitle>
              <CardDescription>
                Renaming will update the domain in all user preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="POST" className="space-y-3">
                <input type="hidden" name="type" value="update_url" />
                <div className="space-y-1.5">
                  <Label htmlFor="url">Domain</Label>
                  <Input
                    id="url"
                    name="url"
                    defaultValue={domain.url}
                    className="font-mono"
                  />
                </div>
                <Button type="submit" size="sm">
                  Save
                </Button>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Users With This Domain</CardTitle>
            <Badge variant="secondary">{userCount}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersWithDomain.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">
              No users have this domain selected.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {usersWithDomain.map((pref) => (
                <div
                  key={pref.userId}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <Link
                    to={`/admin/user/${pref.user.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {pref.user.username}
                  </Link>
                  <Link
                    to={`/profile/${pref.user.username}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm text-destructive">
              Danger Zone
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ConfirmDialog
            title="Disconnect from all users?"
            description={`This removes "${domain.url}" from ${userCount} user preference${userCount !== 1 ? "s" : ""} but keeps the domain record.`}
            onConfirm={() => submit("disconnect")}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-3.5 w-3.5" />
                Disconnect from all users
              </Button>
            }
          />
          <ConfirmDialog
            title={`Delete "${domain.url}"?`}
            description={`This removes the domain from ${userCount} user preference${userCount !== 1 ? "s" : ""} and permanently deletes the record. This cannot be undone.`}
            onConfirm={() => submit("delete")}
            trigger={
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                Delete domain
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
