import { StorageProviderError, StorageErrorCategory } from '@miinded/nestjs-storage-core';

export type { StorageErrorCategory };

export class S3ProviderError extends StorageProviderError {
  readonly provider = 's3';

  constructor(operation: string, category: StorageErrorCategory, originalError: unknown) {
    super(operation, category, originalError);
    this.name = 'S3ProviderError';
  }
}

function classifyS3Error(error: unknown): StorageErrorCategory {
  const status = Number(
    (error as any)?.$metadata?.httpStatusCode ?? (error as any)?.statusCode ?? (error as any)?.status ?? 0,
  );
  const code = String((error as any)?.code ?? (error as any)?.name ?? '').toLowerCase();

  if (status === 404 || code.includes('notfound') || code.includes('nosuchkey')) {
    return 'not_found';
  }

  if (status === 401 || status === 403 || code.includes('accessdenied') || code.includes('forbidden')) {
    return 'permission';
  }

  if (status === 408 || status === 504 || code.includes('timeout') || code.includes('timedout')) {
    return 'timeout';
  }

  if (status === 429 || code.includes('throttl') || code.includes('toomanyrequests') || code.includes('ratelimit')) {
    return 'rate_limit';
  }

  if (status === 400 || code.includes('invalid') || code.includes('validation')) {
    return 'validation';
  }

  return 'unavailable';
}

export function mapS3Error(operation: string, error: unknown): S3ProviderError {
  if (error instanceof S3ProviderError) {
    return error;
  }
  return new S3ProviderError(operation, classifyS3Error(error), error);
}
