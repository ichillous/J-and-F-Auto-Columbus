import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3 } from './clients';
import { awsEnv } from './env';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 50 * 1024 * 1024;

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export async function presignUpload(input: {
  contentType: string;
  contentLength: number;
  filename: string;
  carId?: string;
}): Promise<PresignResult> {
  if (!ALLOWED_TYPES.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (!Number.isFinite(input.contentLength) || input.contentLength <= 0 || input.contentLength > MAX_BYTES) {
    throw new Error('File too large or invalid size (50MB max)');
  }
  if (input.carId && !/^[a-zA-Z0-9-]{1,64}$/.test(input.carId)) {
    throw new Error('Invalid carId');
  }

  const safeName = input.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const folder = input.carId ? `cars/${input.carId}` : 'cars/temp';
  const key = `${folder}/${Date.now()}-${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: awsEnv.s3Bucket(),
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(s3(), cmd, { expiresIn: 300 });
  return { uploadUrl, publicUrl: `${awsEnv.s3PublicBaseUrl()}/${key}`, key };
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: awsEnv.s3Bucket(), Key: key }));
}
