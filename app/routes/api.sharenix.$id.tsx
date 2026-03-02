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
    DefaultImageUploader: siteName,
    DefaultUrlShortener: siteName,
    DefaultFileUploader: siteName,
    ClipboardTime: 5,
    Services: [
      {
        Name: siteName,
        RequestType: "POST",
        RequestURL: `https://${baseDomain}/upload?upload_key=${user.upload_key}`,
        FileFormName: "image",
        ResponseType: "Text",
        URL: "$json.url$",
      },
    ],
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Disposition": `attachment; filename="sharenix.json"`,
      "Content-Type": "application/json",
    },
  });
}
