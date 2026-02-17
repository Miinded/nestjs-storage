import { Readable } from 'stream';

/**
 * Unified upload result returned by all storage adapters.
 */
export interface UploadResult {
  /** Unique identifier for the uploaded file */
  id: string;
  /** Storage key/path of the file */
  key: string;
  /** Public URL if file is public, null otherwise */
  publicUrl?: string | null;
}

/**
 * File metadata returned by listFiles operations.
 */
export interface FileMetadata {
  /** File name relative to the listed path */
  name: string;
  /** File size in bytes */
  size: number;
  /** Full storage key/identifier */
  key: string;
}

/**
 * Common interface implemented by all storage adapters.
 *
 * Every adapter in the `@miinded/nestjs-storage` ecosystem exposes
 * the same public API so consumers can swap backends without changing
 * application code.
 */
export interface StorageAdapter {
  /**
   * Upload a file with explicit visibility.
   * @param key - Storage key / path for the file
   * @param buffer - File content as a Buffer
   * @param mimeType - MIME type of the file (e.g. `'image/png'`)
   * @param isPublic - Whether the file should be publicly readable (default `false`)
   * @returns Metadata about the uploaded file
   */
  uploadFile(key: string, buffer: Buffer, mimeType: string, isPublic?: boolean): Promise<UploadResult>;

  /**
   * Upload a file as publicly readable.
   * @param key - Storage key / path for the file
   * @param buffer - File content as a Buffer
   * @param mimeType - MIME type of the file
   * @returns Metadata about the uploaded file
   */
  uploadPublicFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;

  /**
   * Upload a file as private (not publicly accessible).
   * @param key - Storage key / path for the file
   * @param buffer - File content as a Buffer
   * @param mimeType - MIME type of the file
   * @returns Metadata about the uploaded file
   */
  uploadPrivateFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;

  /**
   * Download a file and return its content as bytes.
   * @param key - Storage key / identifier of the file
   * @returns File content as a Uint8Array
   */
  download(key: string): Promise<Uint8Array>;

  /**
   * Get a Node.js readable stream for a file.
   * @param key - Storage key / identifier of the file
   * @returns A readable stream of the file content
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Check whether a file exists.
   * @param key - Storage key / identifier of the file
   * @returns `true` if the file exists, `false` otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get a signed or shared URL for a file.
   * @param key - Storage key / identifier of the file
   * @returns A URL string granting access to the file
   */
  getLink(key: string): Promise<string>;

  /**
   * List files under a given path / prefix.
   * @param path - Storage path or prefix to list
   * @returns An array of file metadata entries
   */
  listFiles(path: string): Promise<FileMetadata[]>;

  /**
   * Delete a file.
   * @param key - Storage key / identifier of the file to delete
   */
  delete(key: string): Promise<void>;
}
