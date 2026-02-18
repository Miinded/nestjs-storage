import { validateStorageKey, sanitizeKey, escapeDriveQueryValue, requireEnv } from './security.utils';

describe('security.utils re-exports', () => {
  it('re-exports validateStorageKey from core', () => {
    expect(typeof validateStorageKey).toBe('function');
    expect(() => validateStorageKey('../etc/passwd')).toThrow('path traversal');
  });

  it('re-exports sanitizeKey from core', () => {
    expect(typeof sanitizeKey).toBe('function');
    expect(sanitizeKey('path//to///file')).toBe('path/to/file');
  });

  it('re-exports escapeDriveQueryValue from core', () => {
    expect(typeof escapeDriveQueryValue).toBe('function');
    expect(escapeDriveQueryValue("file'name")).toBe("file\\'name");
  });

  it('re-exports requireEnv from core', () => {
    expect(typeof requireEnv).toBe('function');
  });
});
