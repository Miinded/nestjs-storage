import { validateStorageKey, sanitizeKey, escapeDriveQueryValue, requireEnv } from './security.utils';

describe('security.utils', () => {
  describe('validateStorageKey', () => {
    it('accepts valid keys', () => {
      expect(() => validateStorageKey('path/to/file.txt')).not.toThrow();
      expect(() => validateStorageKey('file.txt')).not.toThrow();
      expect(() => validateStorageKey('folder/subfolder/file.jpg')).not.toThrow();
      expect(() => validateStorageKey('/path/to/file.txt')).not.toThrow();
    });

    it('rejects path traversal with ..', () => {
      expect(() => validateStorageKey('../etc/passwd')).toThrow('path traversal');
      expect(() => validateStorageKey('path/../../../etc/passwd')).toThrow('path traversal');
      expect(() => validateStorageKey('..\\windows\\system32')).toThrow('path traversal');
    });

    it('rejects home directory paths', () => {
      expect(() => validateStorageKey('~/secret')).toThrow('home directory');
    });

    it('rejects null bytes', () => {
      expect(() => validateStorageKey('file\0.txt')).toThrow('control characters');
    });

    it('rejects control characters', () => {
      expect(() => validateStorageKey('file\x01.txt')).toThrow('control characters');
      expect(() => validateStorageKey('file\x1f.txt')).toThrow('control characters');
    });
  });

  describe('sanitizeKey', () => {
    it('normalizes slashes', () => {
      expect(sanitizeKey('path//to///file')).toBe('path/to/file');
    });

    it('removes leading and trailing slashes', () => {
      expect(sanitizeKey('/path/to/file/')).toBe('path/to/file');
    });

    it('throws for invalid keys', () => {
      expect(() => sanitizeKey('../etc/passwd')).toThrow('path traversal');
    });
  });

  describe('escapeDriveQueryValue', () => {
    it('escapes single quotes', () => {
      expect(escapeDriveQueryValue("file'name")).toBe("file\\'name");
    });

    it('escapes backslashes', () => {
      expect(escapeDriveQueryValue('file\\name')).toBe('file\\\\name');
    });

    it('escapes both quotes and backslashes', () => {
      expect(escapeDriveQueryValue("file\\'name")).toBe("file\\\\\\'name");
    });

    it('returns unchanged string if no special chars', () => {
      expect(escapeDriveQueryValue('normal-folder-id')).toBe('normal-folder-id');
    });
  });

  describe('requireEnv', () => {
    const ENV_KEY = '__TEST_REQUIRE_ENV__';

    afterEach(() => {
      delete process.env[ENV_KEY];
    });

    it('returns the value when set', () => {
      process.env[ENV_KEY] = 'some-value';
      expect(requireEnv(ENV_KEY)).toBe('some-value');
    });

    it('throws when variable is undefined', () => {
      delete process.env[ENV_KEY];
      expect(() => requireEnv(ENV_KEY)).toThrow('Missing required environment variable');
    });

    it('throws when variable is empty string', () => {
      process.env[ENV_KEY] = '';
      expect(() => requireEnv(ENV_KEY)).toThrow('Missing required environment variable');
    });
  });
});
