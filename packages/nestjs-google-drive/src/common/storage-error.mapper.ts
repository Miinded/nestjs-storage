import { StorageProviderError, StorageErrorCategory } from '@miinded/nestjs-storage-core';

export type { StorageErrorCategory };

export class GoogleDriveProviderError extends StorageProviderError {
  readonly provider = 'google_drive';

  constructor(operation: string, category: StorageErrorCategory, originalError: unknown) {
    super(operation, category, originalError);
    this.name = 'GoogleDriveProviderError';
  }
}

function classifyGoogleDriveError(error: unknown): StorageErrorCategory {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const status = Number((error as any)?.response?.status ?? (error as any)?.status ?? (error as any)?.code ?? 0);
  const code = String((error as any)?.code ?? '').toLowerCase();
  const reason = String(
    (error as any)?.errors?.[0]?.reason ?? (error as any)?.response?.data?.error?.status ?? '',
  ).toLowerCase();
  const message = String((error as any)?.message ?? '').toLowerCase();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (status === 404 || reason.includes('notfound') || code.includes('notfound')) {
    return 'not_found';
  }

  if (
    status === 401 ||
    status === 403 ||
    reason.includes('forbidden') ||
    reason.includes('permission') ||
    code.includes('forbidden')
  ) {
    return 'permission';
  }

  if (
    status === 408 ||
    status === 504 ||
    code.includes('timeout') ||
    message.includes('timeout') ||
    reason.includes('deadline')
  ) {
    return 'timeout';
  }

  if (
    status === 429 ||
    reason.includes('ratelimit') ||
    reason.includes('userratelimitexceeded') ||
    reason.includes('dailylimitexceeded') ||
    code.includes('ratelimit')
  ) {
    return 'rate_limit';
  }

  if (status === 400 || reason.includes('invalid') || reason.includes('badrequest') || message.includes('invalid')) {
    return 'validation';
  }

  return 'unavailable';
}

export function mapGoogleDriveError(operation: string, error: unknown): GoogleDriveProviderError {
  if (error instanceof GoogleDriveProviderError) {
    return error;
  }
  return new GoogleDriveProviderError(operation, classifyGoogleDriveError(error), error);
}
