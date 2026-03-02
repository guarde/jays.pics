import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import sharp from "sharp";

import { prisma } from "~/services/database.server";
import { get } from "~/services/s3.server";

export const meta: MetaFunction = ({ matches }) => {
  const rootData = matches.find((m) => m.id === "root")?.data as
    | { siteName?: string }
    | undefined;
  const siteName = rootData?.siteName ?? "jays.pics";
  return [
    { title: `Image | ${siteName}` },
    { name: "description", content: "Image" },
    {
      name: "theme-color",
      content: "#e05cd9",
    },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({ where: { id: params.id } });
  if (!image) return json({ success: false, message: "Image does not exist" });
  const user = await prisma.user.findFirst({
    where: { id: image.uploader_id },
    include: { upload_preferences: true },
  });

  try {
    const s3Image = await get(`${user!.id}/${image.id}`);
    const arrayBuffer = await s3Image.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    let pipeline = sharp(buffer, { animated: image.type === "image/gif" });

    const prefs = user!.upload_preferences;
    if (prefs) {
      if (prefs.effect === "grayscale") pipeline = pipeline.grayscale();
      if (prefs.effect === "invert") pipeline = pipeline.negate();
      if (prefs.effect === "sepia")
        pipeline = pipeline.modulate({ saturation: 0.5 }).tint("#704214");

      if (prefs.effect_overlay) {
        const overlay = await get(prefs.effect_overlay);
        const overlayBuffer = Buffer.from(await overlay.arrayBuffer());
        pipeline = pipeline.composite([{ input: overlayBuffer }]);
      }
    }

    buffer = await pipeline.toBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": image.type,
        "Cache-Control":
          "public, immutable, no-transform, s-maxage=31536000, max-age=31536000",
      },
    });
  } catch {}

  return null;
}
