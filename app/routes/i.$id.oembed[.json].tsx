import { json, LoaderFunctionArgs } from "@remix-run/node";
import prettyBytes from "pretty-bytes";

import { templateReplacer } from "~/lib/utils";
import { prisma } from "~/services/database.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const image = await prisma.image.findFirst({ where: { id: params.id } });
  if (!image) return json({ success: false, message: "Image does not exist" });

  const uploaderData = await prisma.user.findFirst({
    where: { id: image!.uploader_id },
    select: {
      username: true,
      upload_preferences: true,
      space_used: true,
      max_space: true,
      id: true,
    },
  });

  const uploader = uploaderData
    ? {
        ...uploaderData,
        space_used: Number(uploaderData.space_used),
        max_space: Number(uploaderData.max_space),
      }
    : null;

  const dictionary = {
    "image.name": image?.display_name,
    "image.size_bytes": image?.size,
    "image.size": prettyBytes(image!.size),
    "image.created_at": image?.created_at,

    "uploader.name": uploader?.username,
    "uploader.storage_used_bytes": uploader?.space_used,
    "uploader.storage_used": prettyBytes(uploader!.space_used),
    "uploader.total_storage_bytes": uploader?.max_space,
    "uploader.total_storage": prettyBytes(uploader!.max_space),
  };

  const author = templateReplacer(
    uploader?.upload_preferences?.embed_author ?? "",
    dictionary,
  );

  const title = templateReplacer(
    uploader?.upload_preferences?.embed_title ?? "",
    dictionary,
  );

  const siteName = process.env.SITE_NAME ?? "jays.pics";
  const baseDomain = process.env.BASE_DOMAIN ?? "jays.pics";

  const rawUrl = `https://${baseDomain}/i/${image.id}/raw${image.type === "image/gif" ? ".gif" : ""}`;

  return json({
    version: "1.0",
    type: "photo",
    title: title || image.display_name,
    author_name: author || uploader?.username,
    author_url: `https://${baseDomain}/profile/${uploader?.id}`,
    provider_name: siteName,
    provider_url: `https://${baseDomain}`,
    url: rawUrl,
    width: 0,
    height: 0,
  });
}
