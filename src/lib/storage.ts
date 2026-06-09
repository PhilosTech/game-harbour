import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? 'us-east-1';

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint?.includes('localhost')),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });
}

export function getPublicAssetUrl(storageKey: string): string {
  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, '');
  if (!base) {
    return storageKey;
  }
  return `${base}/${storageKey}`;
}

export async function createUploadUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }

  const commandInput: PutObjectCommandInput = {
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(commandInput);
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}
