import * as publicApi from './index';

describe('public api contract', () => {
  it('exposes the expected runtime symbols', () => {
    const exportedKeys = Object.keys(publicApi).sort();
    expect(exportedKeys).toMatchInlineSnapshot(`
      [
        "DEFAULT_CONNECTION_NAME",
        "InjectS3",
        "S3Module",
        "S3ProviderError",
        "S3Service",
        "S3_MODULE_OPTIONS",
        "createS3Connection",
        "getS3Config",
        "getS3ConnectionToken",
        "mapS3Error",
        "requireEnv",
        "sanitizeKey",
        "validateStorageKey",
      ]
    `);
  });
});
