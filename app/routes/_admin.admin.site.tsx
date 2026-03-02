import { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useSubmit } from "@remix-run/react";
import { z } from "zod";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { prisma } from "~/services/database.server";

export async function loader() {
  const announcement = await prisma.announcement.findMany({
    select: { content: true },
    orderBy: { created_at: "desc" },
    take: 1,
  });

  const siteData = await prisma.site.findFirst();

  return { announcement, siteData };
}

export default function AdminSite() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const { showToast } = useToast();

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <Input className="hidden" value="update_annoucement" name="type" readOnly />
            <Input
              className="mb-2"
              name="content"
              defaultValue={data.announcement[0].content}
            />
            <Button type="submit">Post</Button>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-red-900">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription className="text-red-700">
            <i>These actions can be catastrophic</i>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <ConfirmDialog
              title={data.siteData?.is_upload_blocked ? "Unblock uploads?" : "Block uploads?"}
              description="This will toggle the ability for users to upload images."
              onConfirm={() => {
                submit(
                  { type: "toggle_upload_block", value: String(!data.siteData?.is_upload_blocked) },
                  { method: "post" }
                );
                showToast(
                  data.siteData?.is_upload_blocked ? "Uploads unblocked" : "Uploads blocked",
                  "success"
                );
              }}
              trigger={
                <Button>
                  {data.siteData?.is_upload_blocked ? "Unblock Uploads" : "Block Uploads"}
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const announcementSchema = z.object({
  content: z
    .string({ required_error: "Content is required" })
    .min(1, { message: "Should be at least one character" })
    .max(256, { message: "Should be 256 or less characters" }),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const requestType = formData.get("type");

  if (requestType === "update_annoucement") {
    const result = announcementSchema.safeParse(payload);
    if (!result.success) {
      const error = result.error.flatten();
      return { payload, formErrors: error.formErrors, fieldErrors: error.fieldErrors };
    }
    await prisma.announcement.create({
      data: { content: result.data.content },
    });
  }

  if (requestType === "toggle_upload_block") {
    const value = formData.get("value") === "true";
    await prisma.site.updateMany({
      data: { is_upload_blocked: value },
    });
  }

  return null;
}
