import { ActionFunctionArgs, json, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { Ban } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { prisma } from '~/services/database.server';
import { uploadToS3 } from '~/services/s3.server';
import { destroySession, getSession, getUserBySession, getClientIP } from '~/services/session.server';

const schema = z.object({
  image: z.instanceof(File),
  display_name: z.string().min(1).max(256).optional(),
});

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
  const displayName = result.data.display_name ?? image.name;

  const url = new URL(request.url);
  const paramEntries = Object.fromEntries(url.searchParams.entries());

  if (!paramEntries.upload_key)
    return json({
      success: false,
      message: 'Upload key is not set',
    });

  const user = await prisma.user.findFirst({
    where: { upload_key: paramEntries.upload_key },
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
      display_name: displayName,
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
    return redirect(`/dashboard/images?generate_link=${dbImage.id}`);
  }

  return json({
    success: false,
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  if (!session.has('userID')) return redirect('/');

  const user = await getUserBySession(session);

  if (user === null)
    return redirect('/', {
      headers: {
        'Set-Cookie': await destroySession(session),
      },
    });

  const site = await prisma.site.findFirst();

  return { user, uploads_blocked: site!.is_upload_blocked };
}

export default function Upload() {
  const { user, uploads_blocked } = useLoaderData<typeof loader>();
  const [preview, setPreview] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setPreview(URL.createObjectURL(file));
    setDisplayName(file.name);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload New Image</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            method="POST"
            action={uploads_blocked ? `` : `?upload_key=${user.upload_key}`}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer p-4"
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {preview ?
                <img src={preview} alt="Preview" className="max-h-48 object-contain mb-2" />
              : <p className="text-sm text-muted-foreground">Click or drop image here</p>}
            </div>
            <input
              title="image"
              id="img-field"
              ref={fileInputRef}
              type="file"
              name="image"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                name="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
              />
            </div>
            {uploads_blocked ?
              <Button className="w-full bg-destructive hover:bg-destructive text-destructive-foreground">
                <Ban className="mr-2 h-4 w-4" />
                Uploading Disabled
              </Button>
            : <Button type="submit" className="w-full">
                Upload
              </Button>
            }
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
