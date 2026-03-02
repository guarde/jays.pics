import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

import { prisma } from "~/services/database.server";
import { get } from "~/services/s3.server";

export const meta: MetaFunction = ({ matches }) => {
  const rootData = matches.find((m) => m.id === "root")?.data as
    | { siteName?: string }
    | undefined;
  const siteName = rootData?.siteName ?? "jays.pics";
  return [
    { title: `Image | ${siteName}` },
    { name: "description", content: "Administration Dashboard" },
    {
      name: "theme-color",
      content: "#e05cd9",
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({ where: { id: params.id } });
  if (!image) return json({ success: false, message: "Image does not exist" });
  const user = await prisma.user.findFirst({
    where: { id: image.uploader_id },
  });

  try {
    const s3Image = await get(`${user!.id}/${image.id}`);

    return new Response(s3Image, {
      headers: {
        "Content-Type": image.type,
        "Cache-Control":
          "public, immutable, no-transform, s-maxage=31536000, max-age=31536000",
      },
    });
  } catch {}

  return null;
}
