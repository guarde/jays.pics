import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { ErrorStatus } from "@prisma/client";

import { PAGE_SIZE, Pagination } from "~/components/pagination";
import { Button } from "~/components/ui/button";
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

export async function loader({ request }: LoaderFunctionArgs) {
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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Errors</CardTitle>
        <CardDescription>There are {count} tracked errors</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Error ID</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((err) => (
              <TableRow key={err.id}>
                <TableCell className="font-medium">{err.code}</TableCell>
                <TableCell className="max-w-96 truncate">
                  {err.message}
                </TableCell>
                <TableCell>{err.user_ids.length}</TableCell>
                <TableCell>{err.status}</TableCell>
                <TableCell className="text-right">
                  <Form method="post" className="flex gap-2">
                    <input type="hidden" name="id" value={err.id} />
                    <Button
                      type="submit"
                      name="status"
                      value="INVESTIGATING"
                      variant="outline"
                    >
                      Investigating
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="RESOLVED"
                      variant="outline"
                    >
                      Resolved
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="NOT_RELEVANT"
                      variant="outline"
                    >
                      Not Relevant
                    </Button>
                  </Form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination
          path="/admin/errors"
          currentPage={page}
          totalCount={count}
        />
      </CardContent>
    </Card>
  );
}
