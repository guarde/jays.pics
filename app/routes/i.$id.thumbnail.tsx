import { LoaderFunctionArgs } from "@remix-run/node";
import sharp from "sharp";

import { prisma } from "~/services/database.server";
import { get } from "~/services/s3.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({ where: { id: params.id } });
  if (!image) return new Response("Not found", { status: 404 });
  const user = await prisma.user.findFirst({
    where: { id: image.uploader_id },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  let size = url.searchParams.get("size");
  if (!size) size = "256";

  const intSize = parseInt(size);

  const data = await get(`${user.id}/${image.id}`);
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let resized: Buffer;
  let contentType = image.type;

  try {
    if (image.type === "image/gif") {
      try {
        resized = await sharp(buffer, { animated: true })
          .resize({ width: intSize, height: intSize, fit: "inside" })
          .gif()
          .toBuffer();
      } catch {
        // Animated GIF output not supported; fall back to first-frame WebP
        resized = await sharp(buffer)
          .resize({ width: intSize, height: intSize, fit: "inside" })
          .webp()
          .toBuffer();
        contentType = "image/webp";
      }
    } else {
      resized = await sharp(buffer)
        .resize({ width: intSize, height: intSize, fit: "inside" })
        .toBuffer();
    }
  } catch {
    return new Response(buffer, {
      headers: {
        "Content-Type": image.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response(resized, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
