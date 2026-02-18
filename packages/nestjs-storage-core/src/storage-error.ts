/**
 * Categories used to classify storage errors across all adapters.
 */
export type StorageErrorCategory = 'not_found' | 'permission' | 'timeout' | 'rate_limit' | 'validation' | 'unavailable';

/**
 * Base error class for all storage adapter errors.
 *
 * Each adapter extends this class with a provider-specific name
 * (e.g. `S3ProviderError`, `GoogleDriveProviderError`).
 */
export abstract class StorageProviderError extends Error {
  /** Identifier of the storage backend (e.g. `'s3'`, `'google_drive'`). */
  abstract readonly provider: string;

  /**
   * @param operation - The adapter method that failed (e.g. `'download'`)
   * @param category - Classified error category
   * @param originalError - The raw error thrown by the underlying SDK
   */
  constructor(
    public readonly operation: string,
    public readonly category: StorageErrorCategory,
    public readonly originalError: unknown,
  ) {
    super(`Storage ${operation} failed (${category})`);
    this.name = 'StorageProviderError';
  }
}
