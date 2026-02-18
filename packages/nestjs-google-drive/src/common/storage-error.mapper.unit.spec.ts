import { GoogleDriveProviderError, mapGoogleDriveError } from './storage-error.mapper';

describe('mapGoogleDriveError', () => {
  it('returns the same instance when already mapped', () => {
    const mapped = new GoogleDriveProviderError('download', 'not_found', new Error('x'));

    expect(mapGoogleDriveError('download', mapped)).toBe(mapped);
  });

  it('maps not found errors', () => {
    const error = { response: { status: 404 } };

    const mapped = mapGoogleDriveError('download', error);

    expect(mapped).toMatchObject({
      name: 'GoogleDriveProviderError',
      provider: 'google_drive',
      operation: 'download',
      category: 'not_found',
    });
  });

  it('maps permission errors', () => {
    const error = { response: { status: 403 } };

    const mapped = mapGoogleDriveError('uploadFile', error);

    expect(mapped.category).toBe('permission');
  });

  it('maps rate limit errors', () => {
    const error = {
      response: { status: 429 },
      errors: [{ reason: 'userRateLimitExceeded' }],
    };

    const mapped = mapGoogleDriveError('listFiles', error);

    expect(mapped.category).toBe('rate_limit');
  });

  it('falls back to unavailable', () => {
    const mapped = mapGoogleDriveError('getStream', new Error('boom'));

    expect(mapped.category).toBe('unavailable');
  });
});
