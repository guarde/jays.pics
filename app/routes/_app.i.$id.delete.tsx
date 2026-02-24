import { ActionFunctionArgs, json } from "@remix-run/node";

import { prisma } from "~/services/database.server";
import { del } from "~/services/s3.server";

export async function action({ params }: ActionFunctionArgs) {
  const image = await prisma.image.findFirst({
    where: { id: params.id },
    select: { uploader: true, id: true, size: true },
  });
  await prisma.image.delete({ where: { id: params.id } });

  const user = await prisma.user.findFirst({
    where: {
      id: image?.uploader.id,
    },
  });

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      space_used: user!.space_used - BigInt(image!.size),
    },
  });

  del(`${image?.uploader.id}/${image?.id}`);
  return json({ ok: true });
}
