import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { LogType } from "@prisma/client";

import { prisma } from "./database.server";

const { STORAGE_ACCESS_KEY, STORAGE_SECRET, STORAGE_REGION, STORAGE_BUCKET } =
  process.env;

if (
  !(STORAGE_ACCESS_KEY && STORAGE_SECRET && STORAGE_REGION && STORAGE_BUCKET)
) {
  throw new Error(`Storage is missing required configuration.`);
}

const S3 = new S3Client({
  credentials: {
    secretAccessKey: STORAGE_SECRET,
    accessKeyId: STORAGE_ACCESS_KEY,
  },
  region: STORAGE_REGION,
});

export async function uploadToS3(file: File, filename: string) {
  try {
    const upload = new Upload({
      client: S3,
      leavePartsOnError: false,
      params: {
        Bucket: STORAGE_BUCKET,
        Key: filename,
        Body: file.stream(),
      },
    });

    const res = await upload.done();
    return res;
  } catch (err) {
    await prisma.log.create({
      data: {
        message: "S3 failed with err " + err,
        type: LogType.ERROR,
      },
    });
  }
}

export async function get(key: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://s3.${STORAGE_REGION}.amazonaws.com/${STORAGE_BUCKET}/${key}`,
      { signal: controller.signal },
    );
    return await res.blob();
  } finally {
    clearTimeout(timeout);
  }
}

export async function del(key: string) {
  await S3.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
}
