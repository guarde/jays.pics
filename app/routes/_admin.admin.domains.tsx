import { Link, useLoaderData } from "@remix-run/react";
import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { prisma } from "~/services/database.server";

export async function loader() {
  const count = await prisma.uRL.count();
  const urls = await prisma.uRL.findMany({
    select: {
      id: true,
      url: true,
      public: true,
      progress: true,
      zone_id: true,
      donator: {
        select: {
          id: true,
          username: true,
        },
      },
      created_at: true,
    },
  });

  return { count, urls };
}

export default function AdminDomains() {
  const { count, urls } = useLoaderData<typeof loader>();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Domains</CardTitle>
        <CardDescription>There are {count} domains</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Donator</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {urls.map((url) => (
              <TableRow key={url.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/domain/${url.id}`}
                      className="font-mono hover:text-primary transition-colors"
                    >
                      {url.url}
                    </Link>
                    <a
                      href={`https://${url.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TableCell>
                <TableCell>{url.public ? "Yes" : "No"}</TableCell>
                <TableCell>{url.progress}</TableCell>
                <TableCell className="font-mono text-xs">
                  {url.zone_id || "—"}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/user/${url.donator!.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {url.donator!.username}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {new Date(url.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
