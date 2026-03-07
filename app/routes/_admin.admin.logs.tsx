import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ScrollText } from "lucide-react";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const LOG_TYPE_STYLE: Record<string, string> = {
  ERROR: "bg-red-500/10 text-red-400 border border-red-500/20",
  DOMAIN_CHECK: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanSeeErrors))
    throw new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const count = await prisma.log.count();
  const logs = await prisma.log.findMany({
    orderBy: { created_at: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return { count, logs, page };
}

export default function AdminLogs() {
  const { count, logs, page } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{count} entries</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ScrollText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Log Entries</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {count}
          </span>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No logs
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${LOG_TYPE_STYLE[log.type] ?? "bg-secondary text-secondary-foreground"}`}
                  >
                    {log.type}
                  </span>
                  <span className="text-sm truncate">{log.message}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination path="/admin/logs" currentPage={page} totalCount={count} />
    </div>
  );
}
