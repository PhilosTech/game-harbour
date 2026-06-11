import {
  HeadBucketCommand,
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
  return (value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\r/g, '');
}

function validateStorageEndpoint(endpoint: string, publicUrl: string | undefined): void {
  const lower = endpoint.toLowerCase();

  if (lower.includes('.r2.dev') || lower.includes('pub-')) {
    throw new StorageConfigError(
      'S3_ENDPOINT must be the R2 API host (https://<ACCOUNT_ID>.r2.cloudflarestorage.com), not the public bucket URL (S3_PUBLIC_URL)',
    );
  }

  if (publicUrl && endpoint.replace(/\/$/, '') === publicUrl.replace(/\/$/, '')) {
    throw new StorageConfigError(
      'S3_ENDPOINT and S3_PUBLIC_URL must differ: endpoint is for API calls, public URL is for browser access',
    );
  }

  if (isR2Endpoint(endpoint)) {
    try {
      const host = new URL(endpoint).hostname;
      if (!host.endsWith('.r2.cloudflarestorage.com')) {
        throw new StorageConfigError('S3_ENDPOINT host must end with .r2.cloudflarestorage.com');
      }
    } catch {
      throw new StorageConfigError('S3_ENDPOINT must be a valid URL');
    }
  }
}

export type StorageDiagnostics = {
  endpointHost: string;
  bucket: string;
  region: string;
  isR2: boolean;
  warnings: string[];
};

export function getStorageDiagnostics(): StorageDiagnostics {
  const endpoint = sanitizeEnv(process.env.S3_ENDPOINT);
  const bucket = sanitizeEnv(process.env.S3_BUCKET);
  const publicUrl = sanitizeEnv(process.env.S3_PUBLIC_URL);
  const warnings: string[] = [];

  let endpointHost = '';
  try {
    endpointHost = endpoint ? new URL(endpoint).hostname : '';
  } catch {
    warnings.push('S3_ENDPOINT is not a valid URL');
  }

  const isR2 = isR2Endpoint(endpoint);
  const region = isR2 ? 'auto' : sanitizeEnv(process.env.S3_REGION) || 'us-east-1';

  if (!endpoint) {
    warnings.push('S3_ENDPOINT is missing');
  } else if (!isR2 && publicUrl && publicUrl.includes('r2.dev')) {
    warnings.push('S3_PUBLIC_URL looks like R2 but S3_ENDPOINT is not an r2.cloudflarestorage.com host');
  }

  if (!bucket) {
    warnings.push('S3_BUCKET is missing');
  }

  if (!sanitizeEnv(process.env.S3_ACCESS_KEY_ID) || !sanitizeEnv(process.env.S3_SECRET_ACCESS_KEY)) {
    warnings.push('S3 credentials are missing');
  }

  return { endpointHost, bucket, region, isR2, warnings };
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

  validateStorageEndpoint(endpoint, sanitizeEnv(process.env.S3_PUBLIC_URL));

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
    if (
      awsCode === 'Unauthorized' ||
      awsCode === 'InvalidAccessKeyId' ||
      awsCode === 'SignatureDoesNotMatch'
    ) {
      return {
        code: 'STORAGE_CREDENTIALS',
        message:
          'R2 rejected credentials. Check S3_ENDPOINT (account API host), access key, secret, and token permissions (Object Read & Write).',
        awsCode,
      };
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

export async function probeStorageAccess(): Promise<
  { ok: true } | { ok: false; error: string; code: string; awsCode?: string }
> {
  try {
    const { bucket } = assertStorageEnv();
    const client = getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return { ok: false, code: 'STORAGE_UNAVAILABLE', error: error.message };
    }
    const mapped = mapStorageUploadError(error);
    if (mapped) {
      return { ok: false, code: mapped.code, error: mapped.message, awsCode: mapped.awsCode };
    }
    return {
      ok: false,
      code: 'STORAGE_ERROR',
      error: formatStorageErrorForLog(error),
    };
  }
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
