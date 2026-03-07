import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { ErrorStatus } from "@prisma/client";
import { AlertTriangle } from "lucide-react";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { Button } from "~/components/ui/button";
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-red-500/10 text-red-400 border border-red-500/20",
  INVESTIGATING: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  RESOLVED: "bg-green-500/10 text-green-400 border border-green-500/20",
  NOT_RELEVANT: "bg-muted text-muted-foreground border border-border",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanSeeErrors))
    throw new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const count = await prisma.siteError.count();
  const errors = await prisma.siteError.findMany({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    orderBy: { created_at: "desc" },
  });
  return { count, errors, page };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const id = form.get("id") as string | null;
  const status = form.get("status") as string | null;
  if (!id || !status) return json({ success: false }, { status: 400 });
  await prisma.siteError.update({
    where: { id },
    data: { status: status as ErrorStatus },
  });
  return json({ success: true });
}

export default function AdminErrors() {
  const { count, errors, page } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Errors</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {count} tracked error{count !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Site Errors</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {count}
          </span>
        </div>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No errors tracked
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {errors.map((err) => (
              <div key={err.id} className="px-5 py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">
                        {err.code}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_STYLE[err.status] ?? STATUS_STYLE.OPEN}`}
                      >
                        {err.status.replace("_", " ")}
                      </span>
                      {err.user_ids.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {err.user_ids.length} user
                          {err.user_ids.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {err.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(err.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Form method="post" className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={err.id} />
                  <Button
                    type="submit"
                    name="status"
                    value="INVESTIGATING"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    Investigating
                  </Button>
                  <Button
                    type="submit"
                    name="status"
                    value="RESOLVED"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    Resolved
                  </Button>
                  <Button
                    type="submit"
                    name="status"
                    value="NOT_RELEVANT"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                  >
                    Not Relevant
                  </Button>
                </Form>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination path="/admin/errors" currentPage={page} totalCount={count} />
    </div>
  );
}
