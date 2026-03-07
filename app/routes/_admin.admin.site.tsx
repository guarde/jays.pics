import { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useSubmit } from "@remix-run/react";
import { Megaphone, ShieldAlert } from "lucide-react";
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
import { Label } from "~/components/ui/label";
import { can, perms } from "~/lib/permissions";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Site Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage global site configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Announcement</CardTitle>
          </div>
          <CardDescription>
            Shown to all users on the dashboard homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-3">
            <input type="hidden" name="type" value="update_annoucement" />
            <div className="space-y-1.5">
              <Label htmlFor="content">Message</Label>
              <Input
                id="content"
                name="content"
                defaultValue={data.announcement[0]?.content ?? ""}
              />
            </div>
            <Button type="submit" size="sm">
              Post Announcement
            </Button>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm text-destructive">
              Danger Zone
            </CardTitle>
          </div>
          <CardDescription>These actions affect all users.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDialog
            title={
              data.siteData?.is_upload_blocked
                ? "Unblock uploads?"
                : "Block uploads?"
            }
            description="This will toggle the ability for users to upload images globally."
            onConfirm={() => {
              submit(
                {
                  type: "toggle_upload_block",
                  value: String(!data.siteData?.is_upload_blocked),
                },
                { method: "post" },
              );
              showToast(
                data.siteData?.is_upload_blocked
                  ? "Uploads unblocked"
                  : "Uploads blocked",
                "success",
              );
            }}
            trigger={
              <Button
                size="sm"
                variant={
                  data.siteData?.is_upload_blocked ? "outline" : "destructive"
                }
              >
                {data.siteData?.is_upload_blocked
                  ? "Unblock Uploads"
                  : "Block Uploads"}
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

const announcementSchema = z.object({
  content: z
    .string({ required_error: "Content is required" })
    .min(1, { message: "Should be at least one character" })
    .max(256, { message: "Should be 256 or less characters" }),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const viewer = await getUserBySession(session);
  if (!viewer) throw new Response("Forbidden", { status: 403 });

  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const requestType = formData.get("type");

  if (requestType === "update_annoucement") {
    if (!can(viewer.permissions, perms.bits.CanMakeAnnouncement))
      throw new Response("Forbidden", { status: 403 });
    const result = announcementSchema.safeParse(payload);
    if (!result.success) {
      const error = result.error.flatten();
      return {
        payload,
        formErrors: error.formErrors,
        fieldErrors: error.fieldErrors,
      };
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
