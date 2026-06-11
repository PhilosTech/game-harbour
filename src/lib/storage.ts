import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigError';
  }
}

function isR2Endpoint(endpoint: string): boolean {
  return endpoint.includes('r2.cloudflarestorage.com');
}

/** R2 API calls should use the account endpoint, not bucket.account. */
function normalizeS3Endpoint(endpoint: string, bucket: string): string {
  if (!isR2Endpoint(endpoint)) {
    return endpoint.replace(/\/$/, '');
  }

  const trimmed = endpoint.replace(/\/$/, '');
  const bucketHostPrefix = `${bucket}.`;

  if (trimmed.includes(bucketHostPrefix) && trimmed.includes('r2.cloudflarestorage.com')) {
    return trimmed.replace(bucketHostPrefix, '');
  }

  return trimmed;
}

function assertStorageEnv(): {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!endpoint) {
    throw new StorageConfigError('S3_ENDPOINT is not configured');
  }
  if (!bucket) {
    throw new StorageConfigError('S3_BUCKET is not configured');
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new StorageConfigError('S3 credentials are not configured');
  }

  const region = process.env.S3_REGION?.trim() || (isR2Endpoint(endpoint) ? 'auto' : 'us-east-1');

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function getS3Client() {
  const { endpoint, region, bucket, accessKeyId, secretAccessKey } = assertStorageEnv();
  const normalizedEndpoint = normalizeS3Endpoint(endpoint, bucket);
  const isLocalMinio = normalizedEndpoint.includes('localhost');

  return new S3Client({
    region,
    endpoint: normalizedEndpoint,
    forcePathStyle: isLocalMinio || isR2Endpoint(normalizedEndpoint),
    credentials: {
      accessKeyId,
      secretAccessKey,
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

export async function uploadObject(
  storageKey: string,
  contentType: string,
  body: Uint8Array,
): Promise<void> {
  const { bucket } = assertStorageEnv();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
      Body: body,
    }),
  );
}
