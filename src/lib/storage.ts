import {
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  RequestChecksumCalculation,
  ResponseChecksumValidation,
} from '@aws-sdk/checksums';

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

function sanitizeEnv(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

function assertStorageEnv(): {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const endpoint = sanitizeEnv(process.env.S3_ENDPOINT);
  const bucket = sanitizeEnv(process.env.S3_BUCKET);
  const accessKeyId = sanitizeEnv(process.env.S3_ACCESS_KEY_ID);
  const secretAccessKey = sanitizeEnv(process.env.S3_SECRET_ACCESS_KEY);

  if (!endpoint) {
    throw new StorageConfigError('S3_ENDPOINT is not configured');
  }
  if (!bucket) {
    throw new StorageConfigError('S3_BUCKET is not configured');
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new StorageConfigError('S3 credentials are not configured');
  }

  // R2 always requires region "auto"; us-east-1 breaks signing.
  const region = isR2Endpoint(endpoint)
    ? 'auto'
    : sanitizeEnv(process.env.S3_REGION) || 'us-east-1';

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function getS3Client() {
  const { endpoint, region, bucket, accessKeyId, secretAccessKey } = assertStorageEnv();
  const normalizedEndpoint = normalizeS3Endpoint(endpoint, bucket);
  const isLocalMinio = normalizedEndpoint.includes('localhost');

  // AWS SDK >=3.729 defaults to WHEN_SUPPORTED and sends x-amz-checksum-crc32 on PutObject.
  // Cloudflare R2 rejects that header (501 NotImplemented). See:
  // https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
  const clientConfig: S3ClientConfig = {
    region,
    endpoint: normalizedEndpoint,
    forcePathStyle: isLocalMinio,
    requestChecksumCalculation: RequestChecksumCalculation.WHEN_REQUIRED,
    responseChecksumValidation: ResponseChecksumValidation.WHEN_REQUIRED,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  return new S3Client(clientConfig);
}

export function mapStorageUploadError(
  error: unknown,
): { code: string; message: string; awsCode?: string } | null {
  if (error instanceof S3ServiceException) {
    const awsCode = error.name;
    if (awsCode === 'AccessDenied' || awsCode === 'Forbidden') {
      return { code: 'STORAGE_ACCESS_DENIED', message: 'Storage access denied', awsCode };
    }
    if (awsCode === 'InvalidAccessKeyId' || awsCode === 'SignatureDoesNotMatch') {
      return { code: 'STORAGE_CREDENTIALS', message: 'Storage credentials are invalid', awsCode };
    }
    if (awsCode === 'NoSuchBucket') {
      return { code: 'STORAGE_BUCKET_NOT_FOUND', message: 'Storage bucket not found', awsCode };
    }
    if (awsCode === 'NotImplemented' || awsCode === 'InvalidRequest') {
      return {
        code: 'STORAGE_INCOMPATIBLE',
        message: 'Storage provider rejected the upload request',
        awsCode,
      };
    }
    return { code: 'STORAGE_PROVIDER_ERROR', message: 'Storage upload failed', awsCode };
  }

  if (!(error instanceof Error)) {
    return null;
  }

  return null;
}

export function formatStorageErrorForLog(error: unknown): string {
  if (error instanceof S3ServiceException) {
    const status = error.$metadata?.httpStatusCode;
    return `${error.name}${status ? ` (HTTP ${status})` : ''}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
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
