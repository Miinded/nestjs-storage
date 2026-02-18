import { StorageProviderError, StorageErrorCategory } from './storage-error';

class TestProviderError extends StorageProviderError {
  readonly provider = 'test';

  constructor(operation: string, category: StorageErrorCategory, originalError: unknown) {
    super(operation, category, originalError);
    this.name = 'TestProviderError';
  }
}

describe('StorageProviderError', () => {
  it('stores operation, category, and original error', () => {
    const original = new Error('boom');
    const error = new TestProviderError('download', 'not_found', original);

    expect(error.operation).toBe('download');
    expect(error.category).toBe('not_found');
    expect(error.originalError).toBe(original);
    expect(error.provider).toBe('test');
    expect(error.name).toBe('TestProviderError');
    expect(error.message).toBe('Storage download failed (not_found)');
  });

  it('is an instance of Error', () => {
    const error = new TestProviderError('upload', 'permission', null);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StorageProviderError);
  });
});
