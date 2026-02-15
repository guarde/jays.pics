import { ActionFunctionArgs, json, MetaFunction, redirect } from '@remix-run/node';
import { z } from 'zod';

import { generateInvisibleURL } from '~/lib/utils';
import { prisma } from '~/services/database.server';
import { uploadToS3 } from '~/services/s3.server';
import { getClientIP } from '~/services/session.server';

function isFile(value: unknown): value is File {
  return value instanceof File || (typeof value === 'object' && value !== null && 'stream' in value);
}

const schema = z.object({
  image: z.custom<File>(isFile, 'Input not instance of File'),
});

export const meta: MetaFunction = () => {
  return [
    { title: 'Upload | jays.pics' },
    { name: 'description', content: 'Administration Dashboard' },
    {
      name: 'theme-color',
      content: '#e05cd9',
    },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const siteData = await prisma.site.findFirst();
  if (siteData?.is_upload_blocked) return json({ success: false, message: 'Uploading is currently blocked' });

  const formData = await request.formData();
  const payload = Object.fromEntries(formData);
  const result = schema.safeParse(payload);

  if (!result.success) {
    return json({ success: false, errors: result.error });
  }

  const image = result.data.image;
  const url = new URL(request.url);
  const paramEntries = Object.fromEntries(url.searchParams.entries());

  let uploadKey = paramEntries.upload_key;
  if (!uploadKey && typeof payload.upload_key === 'string') {
    uploadKey = payload.upload_key;
  }

  if (!uploadKey)
    return json({
      success: false,
      message: 'Upload key is not set',
    });

  const user = await prisma.user.findFirst({
    where: { upload_key: uploadKey },
    select: {
      id: true,
      space_used: true,
      max_space: true,
      upload_preferences: true,
    },
  });

  if (!user) {
    return json({
      success: false,
      message: 'You are not authorised',
    });
  }

  if (!['image/png', 'image/gif', 'image/jpeg', 'image/webp'].includes(image.type)) {
    return json({
      success: false,
      message: 'Incorrect file type',
    });
  }

  if (user.space_used + BigInt(image.size) > user.max_space) {
    return json({
      success: false,
      message: 'When uploading this image, your allocated space was exceeded.',
    });
  }

  const dbImage = await prisma.image.create({
    data: {
      display_name: image.name,
      uploader_id: user!.id,
      size: image.size,
      type: image.type,
      uploader_ip: getClientIP(request) ?? null,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { space_used: user.space_used + BigInt(image.size) },
  });

  const response = await uploadToS3(result.data.image, `${user.id}/${dbImage.id}`);
  if (response?.$metadata.httpStatusCode === 200) {
    const triggers = await prisma.trigger.findMany({
      where: { user_id: user.id, type: 'image_upload' },
      include: { actions: true },
    });

    for (const trig of triggers) {
      for (const act of trig.actions) {
        const actionData = act.data as { url?: string; tag?: string; name?: string };
        if (act.type === 'webhook' && actionData?.url) {
          try {
            await fetch(actionData.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageId: dbImage.id,
                name: dbImage.display_name,
              }),
            });
          } catch (_) {}
        }
        if (act.type === 'add_tag' && actionData?.tag) {
          const tag = await prisma.tag.upsert({
            where: { user_id_name: { user_id: user.id, name: actionData.tag } },
            update: {},
            create: { name: actionData.tag, user_id: user.id },
          });
          await prisma.imageTag.upsert({
            where: {
              image_id_tag_id: { image_id: dbImage.id, tag_id: tag.id },
            },
            update: {},
            create: { image_id: dbImage.id, tag_id: tag.id },
          });
        }
        if (act.type === 'rename' && actionData?.name) {
          await prisma.image.update({
            where: { id: dbImage.id },
            data: { display_name: actionData.name },
          });
        }
      }
    }

    const urls = user.upload_preferences!.urls;
    let url;
    if (urls.length === 1) url = urls[0];
    else url = urls[Math.floor(Math.random() * urls.length)];

    const subdomains = user.upload_preferences?.subdomains as Record<string, string> | undefined;
    const sub = subdomains?.[url];
    const domain = sub ? `${sub}.${url}` : url;
    const formedURL = `https://${domain}/i/${dbImage.id}/`;
    let returnableURL = formedURL;

    if (user.upload_preferences?.domain_hack) {
      returnableURL = generateInvisibleURL(returnableURL);
    }

    return json({
      success: true,
      url: returnableURL,
    });
  }

  return json({
    success: false,
    message: 'An unknown error occured.',
  });
}

export async function loader() {
  return redirect('/');
}
