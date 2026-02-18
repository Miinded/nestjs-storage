# @miinded/nestjs-storage-core

Shared types, interfaces, and utilities for the [`@miinded/nestjs-storage`](https://github.com/miinded/nestjs-storage) adapter ecosystem.

## Installation

```bash
npm install @miinded/nestjs-storage-core
yarn add @miinded/nestjs-storage-core
pnpm add @miinded/nestjs-storage-core
```

> **Note:** You typically do not need to install this package directly. It is automatically included as a dependency of adapter packages like `@miinded/nestjs-s3` and `@miinded/nestjs-google-drive`.

## What's inside

### `StorageAdapter` interface

The contract that every storage adapter implements:

```typescript
import { StorageAdapter } from '@miinded/nestjs-storage-core';
```

| Method                                         | Returns                   | Description                     |
| ---------------------------------------------- | ------------------------- | ------------------------------- |
| `uploadFile(key, buffer, mimeType, isPublic?)` | `Promise<UploadResult>`   | Upload with explicit visibility |
| `uploadPublicFile(key, buffer, mimeType)`      | `Promise<UploadResult>`   | Upload as publicly readable     |
| `uploadPrivateFile(key, buffer, mimeType)`     | `Promise<UploadResult>`   | Upload as private               |
| `download(key)`                                | `Promise<Uint8Array>`     | Download file content as bytes  |
| `getStream(key)`                               | `Promise<Readable>`       | Get a Node.js readable stream   |
| `exists(key)`                                  | `Promise<boolean>`        | Check whether a file exists     |
| `getLink(key)`                                 | `Promise<string>`         | Get a signed/shared URL         |
| `listFiles(path)`                              | `Promise<FileMetadata[]>` | List files under a path         |
| `delete(key)`                                  | `Promise<void>`           | Delete a file                   |

### Shared types

- `UploadResult` — Metadata returned after a successful upload
- `FileMetadata` — File entry returned by `listFiles`
- `StorageErrorCategory` — Union type for classified error categories
- `StorageProviderError` — Abstract base class for adapter-specific errors

### Security utilities

- `validateStorageKey(key)` — Blocks path traversal, control characters, and home directory access
- `sanitizeKey(key)` — Validates and normalizes a storage key
- `escapeDriveQueryValue(value)` — Escapes values for Google Drive API queries
- `requireEnv(name)` — Reads a required environment variable or throws

## License

[MIT](../../LICENSE)
