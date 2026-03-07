import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Search, Users } from "lucide-react";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { prisma } from "~/services/database.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const search = url.searchParams.get("search") ?? "";
  const sort = url.searchParams.get("sort") ?? "desc";

  const allUsers = await prisma.user.findMany({
    where: { username: { contains: search, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      images: { select: { _count: { select: { ImageReport: true } } } },
    },
  });

  const withCount = allUsers.map((u) => ({
    id: u.id,
    username: u.username,
    reports: u.images.reduce((a, img) => a + img._count.ImageReport, 0),
  }));

  withCount.sort((a, b) =>
    sort === "asc" ? a.reports - b.reports : b.reports - a.reports,
  );

  const count = withCount.length;
  const users = withCount.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { count, users, page, search, sort };
}

export default function AdminUsers() {
  const { count, users, page, search, sort } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{count} total</p>
      </div>

      <Form method="get" className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search by username…"
            defaultValue={search}
            className="pl-9 h-9"
          />
        </div>
        <Select name="sort" defaultValue={sort}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most Reports</SelectItem>
            <SelectItem value="asc">Least Reports</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline" className="h-9">
          Apply
        </Button>
      </Form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Users</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {count}
          </span>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No users found
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{user.username}</span>
                  {user.reports > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      {user.reports} report{user.reports !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <Link
                  to={`/admin/user/${user.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        path="/admin/users"
        currentPage={page}
        totalCount={count}
        query={`search=${search}&sort=${sort}`}
      />
    </div>
  );
}
