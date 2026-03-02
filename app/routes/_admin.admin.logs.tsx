import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
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
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer || !can(viewer.permissions, perms.bits.CanSeeErrors))
    throw new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);

  const page = Number(url.searchParams.get("page")) || 1;
  const count = await prisma.log.count();
  const logs = await prisma.log.findMany({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return { count, logs, page };
}

export default function Users() {
  const { count, logs, page } = useLoaderData<typeof loader>();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Logs</CardTitle>
        <CardDescription>There are {count} logs</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="max-w-96">Message</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Date of Creation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .map((log) => {
                return (
                  <TableRow>
                    <TableCell className="font-medium">{log.message}</TableCell>
                    <TableCell>{log.type}</TableCell>
                    <TableCell className="text-right">
                      {new Date(log.created_at).toLocaleDateString()} @{" "}
                      {new Date(log.created_at).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <Pagination path="/admin/logs" currentPage={page} totalCount={count} />
      </CardContent>
    </Card>
  );
}
