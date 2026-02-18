import * as publicApi from './index';

describe('public api contract', () => {
  it('exposes the expected runtime symbols', () => {
    const exportedKeys = Object.keys(publicApi).sort();
    expect(exportedKeys).toMatchInlineSnapshot(`
      [
        "DEFAULT_CONNECTION_NAME",
        "GOOGLE_DRIVE_MODULE_OPTIONS",
        "GoogleDriveModule",
        "GoogleDriveProviderError",
        "GoogleDriveService",
        "InjectDrive",
        "createGoogleDriveConnection",
        "escapeDriveQueryValue",
        "getDriveConfig",
        "getGoogleDriveConnectionToken",
        "mapGoogleDriveError",
        "requireEnv",
        "sanitizeKey",
        "validateStorageKey",
      ]
    `);
  });
});
