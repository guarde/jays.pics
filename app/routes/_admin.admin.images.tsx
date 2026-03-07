import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { ImageIcon, Search } from "lucide-react";

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
  const count = await prisma.image.count();
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const search = url.searchParams.get("search") ?? "";
  const sort = url.searchParams.get("sort") ?? "desc";

  const images = await prisma.image.findMany({
    where: { display_name: { contains: search, mode: "insensitive" } },
    select: { id: true, display_name: true, ImageReport: true },
    orderBy: { ImageReport: { _count: sort === "asc" ? "asc" : "desc" } },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return { count, images, page, search, sort };
}

export default function AdminImages() {
  const { count, images, page, search, sort } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Images</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{count} total</p>
      </div>

      <Form method="get" className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search by name…"
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
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Images</h2>
          <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5 font-medium">
            {count}
          </span>
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No images found
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {images.map((image) => (
              <div
                key={image.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {image.display_name}
                  </span>
                  {image.ImageReport.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0 bg-red-500/10 text-red-400 border border-red-500/20">
                      {image.ImageReport.length} report
                      {image.ImageReport.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <Link
                  to={`/admin/image/${image.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-4"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        path="/admin/images"
        currentPage={page}
        totalCount={count}
        query={`search=${search}&sort=${sort}`}
      />
    </div>
  );
}
