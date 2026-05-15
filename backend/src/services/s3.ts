import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const LOCAL_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

const hasS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const s3 = hasS3
  ? new S3Client({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadImage(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!s3) {
    const filename = `${randomUUID()}.jpg`;
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buffer);
    return `/uploads/${filename}`;
  }
  const key = `coins/${randomUUID()}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return key;
}

export async function getPresignedUrl(key: string): Promise<string> {
  if (!s3) return '';
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}
