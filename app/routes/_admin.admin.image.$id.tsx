import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import {
  ArrowLeft,
  EyeOff,
  FileImage,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react";
import prettyBytes from "pretty-bytes";
import { useState } from "react";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { prisma } from "~/services/database.server";

import { useAdminLoader } from "./_admin";

export async function loader({ params }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({
    where: { id: params.id },
    include: {
      uploader: { select: { id: true, username: true } },
      ImageReport: {
        select: {
          id: true,
          reason_type: true,
          detail: true,
          created_at: true,
          reporter: { select: { id: true, username: true } },
        },
      },
    },
  });
  if (!image) return redirect("/admin/images");
  return { image };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const type = formData.get("type");

  if (type === "rename_image") {
    const name = formData.get("display_name");
    if (typeof name === "string" && name.length > 0) {
      await prisma.image.update({
        where: { id: params.id },
        data: { display_name: name },
      });
    }
  } else if (type === "make_private") {
    await prisma.image.update({
      where: { id: params.id },
      data: { privacy: "PRIVATE" },
    });
  } else if (type === "soft_delete_image") {
    await prisma.image.delete({ where: { id: params.id } });
    return redirect("/admin/images");
  }

  return redirect(`/admin/image/${params.id}`);
}

const REASON_STYLE: Record<string, string> = {
  SPAM: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  COPYRIGHT: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  INAPPROPRIATE: "bg-red-500/10 text-red-400 border border-red-500/20",
  OTHER: "bg-muted text-muted-foreground border border-border",
};

export default function AdminImage() {
  useAdminLoader();
  const { image } = useLoaderData<typeof loader>();
  const [blur, setBlur] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/images"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All images
        </Link>
        <h1 className="text-xl font-semibold truncate">{image.display_name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Uploaded by{" "}
          <Link
            to={`/admin/user/${image.uploader.id}`}
            className="text-foreground hover:underline"
          >
            {image.uploader.username}
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card className="flex items-center justify-center">
          <CardContent className="p-4 w-full flex justify-center">
            <button
              type="button"
              onClick={() => setBlur((b) => !b)}
              className="p-0 border-0 bg-transparent"
              title={blur ? "Click to reveal" : "Click to blur"}
            >
              <img
                src={`/i/${image.id}/raw`}
                alt={image.display_name}
                className={cn(
                  "max-h-80 max-w-full object-contain rounded-lg transition-all cursor-pointer",
                  blur && "blur-md",
                )}
              />
            </button>
            {blur && (
              <p className="text-xs text-muted-foreground text-center mt-2 absolute">
                Click to reveal
              </p>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                ["Name", image.display_name],
                ["Type", image.type],
                ["Size", prettyBytes(image.size)],
                ["Uploader IP", image.uploader_ip ?? "unknown"],
                ["Reports", image.ImageReport.length.toString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Form method="post" className="flex gap-2">
                <Input type="hidden" name="type" value="rename_image" />
                <Input
                  name="display_name"
                  defaultValue={image.display_name}
                  className="flex-1 h-9"
                />
                <Button type="submit" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </Button>
              </Form>
              <div className="flex flex-wrap gap-2">
                <Form method="post">
                  <Input type="hidden" name="type" value="make_private" />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Make Private
                  </Button>
                </Form>
                <ConfirmDialog
                  title={`Delete "${image.display_name}"?`}
                  description="This will permanently delete the image. This cannot be undone."
                  onConfirm={() => {
                    const fd = new FormData();
                    fd.append("type", "soft_delete_image");
                    fetch(window.location.pathname, {
                      method: "POST",
                      body: fd,
                    }).then(() => (window.location.href = "/admin/images"));
                  }}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reports */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Flag className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Reports</h2>
          {image.ImageReport.length > 0 && (
            <span className="ml-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-md px-1.5 py-0.5 font-medium">
              {image.ImageReport.length}
            </span>
          )}
        </div>
        {image.ImageReport.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-8 text-center">
            No reports
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {image.ImageReport.map((report) => (
              <div
                key={report.id}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/user/${report.reporter.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {report.reporter.username}
                    </Link>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${REASON_STYLE[report.reason_type] ?? REASON_STYLE.OTHER}`}
                    >
                      {report.reason_type}
                    </span>
                  </div>
                  {report.detail && (
                    <p className="text-sm text-muted-foreground">
                      {report.detail}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
