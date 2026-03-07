import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CreditCard } from "lucide-react";
import prettyBytes from "pretty-bytes";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { prisma } from "~/services/database.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const count = await prisma.storageSubscription.count();
  const raw = await prisma.storageSubscription.findMany({
    include: { user: { select: { id: true, username: true } } },
    orderBy: { created_at: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const subs = raw.map((sub) => ({ ...sub, storage: Number(sub.storage) }));

  return { count, subs, page };
}

export default function AdminSubscriptions() {
  const { count, subs, page } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {count} storage subscription{count !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Storage Subscriptions</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {count}
          </span>
        </div>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No subscriptions
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {subs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Link
                    to={`/admin/user/${sub.user.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {sub.user.username}
                  </Link>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium border ${
                      sub.cancelled_at
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {sub.cancelled_at ? "Cancelled" : "Active"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {prettyBytes(sub.storage)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(sub.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        path="/admin/subscriptions"
        currentPage={page}
        totalCount={count}
      />
    </div>
  );
}
