import { json, LoaderFunctionArgs } from "@remix-run/node";

import { prisma } from "~/services/database.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await prisma.user.findFirst({ where: { id: params.id } });

  if (!user) {
    return json({
      success: false,
      message: "Invalid user",
    });
  }

  const siteName = process.env.SITE_NAME ?? "jays.pics";
  const baseDomain = process.env.BASE_DOMAIN ?? "jays.pics";

  const config = {
    Version: "16.1.0",
    Name: siteName,
    DestinationType: "ImageUploader, FileUploader",
    RequestMethod: "POST",
    Parameters: {
      upload_key: user.upload_key,
    },
    Body: "MultipartFormData",
    FileFormName: "image",
    RequestURL: `https://${baseDomain}/upload`,
    URL: "{json:url}",
    ErrorMessage: "{json:message}",
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Disposition": `attachment; filename="${user.username}.sxcu"`,
      "Content-Type": "application/json",
    },
  });
}
