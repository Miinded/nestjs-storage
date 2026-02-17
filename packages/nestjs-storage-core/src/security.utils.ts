/**
 * Validates a storage key to prevent path traversal attacks.
 * @param key - The key to validate
 * @throws Error if the key contains path traversal patterns
 */
export function validateStorageKey(key: string): void {
  // Block path traversal patterns
  if (key.includes('..') || key.includes('\\')) {
    throw new Error('Invalid key: path traversal detected');
  }

  // Block home directory access
  if (key.startsWith('~')) {
    throw new Error('Invalid key: home directory path not allowed');
  }

  // Block null bytes and control characters (0x00-0x1F and 0x7F)
  if (/[\x00-\x1f\x7f]/.test(key)) {
    throw new Error('Invalid key: control characters detected');
  }
}

/**
 * Sanitizes a key by removing dangerous patterns.
 * Returns a safe key or throws if the key cannot be sanitized.
 * @param key - The key to sanitize
 * @returns A normalized key with deduplicated slashes and no leading/trailing slashes
 */
export function sanitizeKey(key: string): string {
  validateStorageKey(key);
  // Normalize slashes and remove leading/trailing slashes
  return key.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
}

/**
 * Escapes a value for use in Google Drive API queries.
 * Prevents query injection attacks.
 * @param value - The value to escape
 * @returns The escaped value safe for use in Drive query strings
 */
export function escapeDriveQueryValue(value: string): string {
  // Escape backslashes and single quotes
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Reads a required environment variable and throws if it is missing or empty.
 * @param name - The environment variable name
 * @returns The environment variable value
 * @throws Error if the variable is not set or is an empty string
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
