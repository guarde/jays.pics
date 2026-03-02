import { Progress } from "@prisma/client";
import { Link, useLoaderData } from "@remix-run/react";
import { Globe, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { prisma } from "~/services/database.server";

export async function loader() {
  return prisma.uRL.findMany({
    where: { progress: Progress.DONE },
    select: {
      url: true,
      public: true,
      created_at: true,
      last_checked_at: true,
      donator: { select: { username: true } },
    },
    orderBy: { created_at: "desc" },
  });
}

export default function Domain() {
  const urls = useLoaderData<typeof loader>();

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Domains</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {urls.length} active domain{urls.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 text-white">
          <Link to="/dashboard/domain/add">
            <Plus className="h-3.5 w-3.5" />
            Add domain
          </Link>
        </Button>
      </div>

      <div className="p-8 space-y-5">
        {/* Domain selector link */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Manage your active domains</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which domains to use when generating image links
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/domain-selector">Configure</Link>
          </Button>
        </div>

        {/* All domains table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold">All Domains</p>
          </div>
          {urls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No domains yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {urls.map((url) => (
                <div
                  key={url.url}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{url.url}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {url.donator.username}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      url.public
                        ? "bg-green-500/10 text-green-400"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {url.public ? "Public" : "Private"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Added {new Date(url.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
