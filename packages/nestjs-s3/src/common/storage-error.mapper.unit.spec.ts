import { S3ProviderError, mapS3Error } from './storage-error.mapper';

describe('mapS3Error', () => {
  it('returns the same instance when already mapped', () => {
    const mapped = new S3ProviderError('download', 'not_found', new Error('x'));

    expect(mapS3Error('download', mapped)).toBe(mapped);
  });

  it('maps not found errors', () => {
    const error = { $metadata: { httpStatusCode: 404 }, name: 'NoSuchKey' };

    const mapped = mapS3Error('download', error);

    expect(mapped).toMatchObject({
      name: 'S3ProviderError',
      provider: 's3',
      operation: 'download',
      category: 'not_found',
    });
  });

  it('maps permission errors', () => {
    const error = { $metadata: { httpStatusCode: 403 }, name: 'AccessDenied' };

    const mapped = mapS3Error('uploadFile', error);

    expect(mapped.category).toBe('permission');
  });

  it('maps rate limit errors', () => {
    const error = { $metadata: { httpStatusCode: 429 }, name: 'ThrottlingException' };

    const mapped = mapS3Error('listFiles', error);

    expect(mapped.category).toBe('rate_limit');
  });

  it('falls back to unavailable', () => {
    const mapped = mapS3Error('getStream', new Error('boom'));

    expect(mapped.category).toBe('unavailable');
  });
});
