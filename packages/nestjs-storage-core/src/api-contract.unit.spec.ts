import * as publicApi from './index';

describe('public api contract', () => {
  it('exposes the expected runtime symbols', () => {
    const exportedKeys = Object.keys(publicApi).sort();
    expect(exportedKeys).toMatchInlineSnapshot(`
      [
        "StorageProviderError",
        "escapeDriveQueryValue",
        "requireEnv",
        "sanitizeKey",
        "validateStorageKey",
      ]
    `);
  });
});
