# @miinded/nestjs-storage

A unified storage abstraction layer for NestJS applications, providing a consistent API surface across pluggable storage backends.

<p align="center">
  <a href="https://github.com/miinded/nestjs-storage/actions/workflows/quality.yml"><img src="https://github.com/miinded/nestjs-storage/actions/workflows/quality.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://codecov.io/gh/miinded/nestjs-storage"><img src="https://codecov.io/gh/miinded/nestjs-storage/branch/main/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@miinded/nestjs-s3"><img src="https://img.shields.io/npm/v/@miinded/nestjs-s3.svg?label=nestjs-s3" alt="npm nestjs-s3" /></a>
  <a href="https://www.npmjs.com/package/@miinded/nestjs-google-drive"><img src="https://img.shields.io/npm/v/@miinded/nestjs-google-drive.svg?label=nestjs-google-drive" alt="npm nestjs-google-drive" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js >= 20" />
  <img src="https://img.shields.io/badge/NestJS-10.x%20%7C%2011.x-ea2845" alt="NestJS 10.x | 11.x" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript 5.x" />
  <img src="https://img.shields.io/badge/pnpm-monorepo-f69220" alt="pnpm monorepo" />
</p>

## Compatibility

| Dependency | Supported versions |
| ---------- | ------------------ |
| Node.js    | `>= 20`            |
| NestJS     | `10.x` · `11.x`    |
| TypeScript | `5.x`              |
| RxJS       | `7.x`              |

## Packages

| Package                                                          | Description                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| [`@miinded/nestjs-storage-core`](./packages/nestjs-storage-core) | Shared types, `StorageAdapter` interface, security utils |
| [`@miinded/nestjs-s3`](./packages/nestjs-s3)                     | S3-compatible storage (AWS, MinIO, DigitalOcean Spaces…) |
| [`@miinded/nestjs-google-drive`](./packages/nestjs-google-drive) | Google Drive storage                                     |

## Installation

```bash
# S3 adapter
npm install @miinded/nestjs-s3
yarn add @miinded/nestjs-s3
pnpm add @miinded/nestjs-s3

# Google Drive adapter
npm install @miinded/nestjs-google-drive
yarn add @miinded/nestjs-google-drive
pnpm add @miinded/nestjs-google-drive
```

## Features

- **Unified API** — `StorageAdapter` interface enforced across all backends
- **Multi-instance** — Register multiple connections with named tokens
- **Async configuration** — `registerAsync` with factory injection
- **Custom decorators** — `@InjectS3()` / `@InjectDrive()` for clean DI
- **Environment helpers** — `getS3Config()` / `getDriveConfig()` for env-based setup (throws on missing vars)
- **TypeScript first** — Strongly typed with exported `UploadResult`, `FileMetadata`, and `StorageAdapter`
- **Dual CJS/ESM** — Both CommonJS and ES module builds included
- **Security built-in** — Key validation, path traversal protection, query escaping

---

## S3 Adapter

### Static setup with `register`

```typescript
import { Module } from '@nestjs/common';
import { S3Module } from '@miinded/nestjs-s3';

@Module({
  imports: [
    S3Module.register({
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key',
      endpoint: 'https://s3.amazonaws.com',
      region: 'eu-west-1',
      bucket: 'my-bucket',
    }),
  ],
})
export class AppModule {}
```

### Environment helper with `register`

```typescript
import { Module } from '@nestjs/common';
import { S3Module, getS3Config } from '@miinded/nestjs-s3';

@Module({
  imports: [
    S3Module.register(getS3Config('S3')),
    // reads S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
    //       S3_ENDPOINT_URL, S3_REGION, S3_BUCKET
  ],
})
export class AppModule {}
```

### Async setup with ConfigService

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Module } from '@miinded/nestjs-s3';

@Module({
  imports: [
    ConfigModule.forRoot(),
    S3Module.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
        endpoint: config.getOrThrow('S3_ENDPOINT'),
        region: config.getOrThrow('AWS_REGION'),
        bucket: config.getOrThrow('S3_BUCKET'),
      }),
    }),
  ],
})
export class AppModule {}
```

### Injecting the service

Use the `@InjectS3()` decorator to inject a configured `S3Service` instance:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectS3, S3Service, UploadResult } from '@miinded/nestjs-s3';

@Injectable()
export class FileService {
  constructor(@InjectS3() private readonly s3: S3Service) {}

  async upload(key: string, file: Express.Multer.File): Promise<UploadResult> {
    return this.s3.uploadPrivateFile(key, file.buffer, file.mimetype);
  }

  async download(key: string): Promise<Uint8Array> {
    return this.s3.download(key);
  }

  async remove(key: string): Promise<void> {
    return this.s3.delete(key);
  }
}
```

### Multiple S3 connections

Register several named connections (e.g. public assets + private backups):

```typescript
import { Module } from '@nestjs/common';
import { S3Module, getS3Config } from '@miinded/nestjs-s3';

@Module({
  imports: [
    S3Module.registerAsync({
      name: 'assets',
      useFactory: () => getS3Config('ASSETS'),
      // reads ASSETS_ACCESS_KEY_ID, ASSETS_SECRET_ACCESS_KEY, …
    }),
    S3Module.registerAsync({
      name: 'backups',
      useFactory: () => getS3Config('BACKUPS'),
      // reads BACKUPS_ACCESS_KEY_ID, BACKUPS_SECRET_ACCESS_KEY, …
    }),
  ],
})
export class AppModule {}
```

Then inject each connection by name:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectS3, S3Service } from '@miinded/nestjs-s3';

@Injectable()
export class StorageService {
  constructor(
    @InjectS3('assets') private readonly assets: S3Service,
    @InjectS3('backups') private readonly backups: S3Service,
  ) {}

  async backupFile(key: string) {
    const data = await this.assets.download(key);
    await this.backups.uploadPrivateFile(`backup/${key}`, Buffer.from(data), 'application/octet-stream');
  }
}
```

---

## Google Drive Adapter

### Static setup with `register`

```typescript
import { Module } from '@nestjs/common';
import { GoogleDriveModule } from '@miinded/nestjs-google-drive';

@Module({
  imports: [
    GoogleDriveModule.register({
      clientEmail: 'service-account@project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\n...',
    }),
  ],
})
export class AppModule {}
```

### Environment helper with `register`

```typescript
import { Module } from '@nestjs/common';
import { GoogleDriveModule, getDriveConfig } from '@miinded/nestjs-google-drive';

@Module({
  imports: [
    GoogleDriveModule.register(getDriveConfig('GDRIVE')),
    // reads GDRIVE_GOOGLE_CLIENT_EMAIL, GDRIVE_GOOGLE_PRIVATE_KEY
  ],
})
export class AppModule {}
```

### Async setup with ConfigService

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleDriveModule } from '@miinded/nestjs-google-drive';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GoogleDriveModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clientEmail: config.getOrThrow('GOOGLE_CLIENT_EMAIL'),
        privateKey: config.getOrThrow('GOOGLE_PRIVATE_KEY'),
      }),
    }),
  ],
})
export class AppModule {}
```

### Injecting the service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDrive, GoogleDriveService, UploadResult } from '@miinded/nestjs-google-drive';

@Injectable()
export class DocumentService {
  constructor(@InjectDrive() private readonly drive: GoogleDriveService) {}

  async upload(key: string, content: Buffer): Promise<UploadResult> {
    return this.drive.uploadPrivateFile(key, content, 'application/pdf');
  }

  async share(fileId: string): Promise<string> {
    return this.drive.getLink(fileId);
  }
}
```

### Multiple Google Drive connections

```typescript
import { Module } from '@nestjs/common';
import { GoogleDriveModule, getDriveConfig } from '@miinded/nestjs-google-drive';

@Module({
  imports: [
    GoogleDriveModule.registerAsync({
      name: 'internal',
      useFactory: () => getDriveConfig('INTERNAL_GDRIVE'),
    }),
    GoogleDriveModule.registerAsync({
      name: 'shared',
      useFactory: () => getDriveConfig('SHARED_GDRIVE'),
    }),
  ],
})
export class AppModule {}
```

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDrive, GoogleDriveService } from '@miinded/nestjs-google-drive';

@Injectable()
export class SyncService {
  constructor(
    @InjectDrive('internal') private readonly internal: GoogleDriveService,
    @InjectDrive('shared') private readonly shared: GoogleDriveService,
  ) {}
}
```

---

## API Reference

### Shared types

```typescript
interface UploadResult {
  /** Unique identifier for the uploaded file */
  id: string;
  /** Storage key/path of the file */
  key: string;
  /** Public URL if file is public, null otherwise */
  publicUrl?: string | null;
}

interface FileMetadata {
  /** File name relative to the listed path */
  name: string;
  /** File size in bytes */
  size: number;
  /** Full storage key/identifier */
  key: string;
}
```

### Service methods

Both `S3Service` and `GoogleDriveService` expose the same public API:

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

### Module options

**S3Module.registerAsync(options)**

| Property     | Type                              | Default     | Description                         |
| ------------ | --------------------------------- | ----------- | ----------------------------------- |
| `name`       | `string`                          | `'default'` | Connection name for multi-instance  |
| `isGlobal`   | `boolean`                         | `true`      | Register as global module           |
| `useFactory` | `(...args) => S3ConnectionConfig` | _required_  | Factory returning connection config |
| `inject`     | `InjectionToken[]`                | `[]`        | Tokens to inject into the factory   |
| `imports`    | `ModuleMetadata['imports']`       | `[]`        | Modules to import                   |

**GoogleDriveModule.registerAsync(options)** — Same shape with `GoogleDriveConnectionConfig`.

### Environment helpers

```typescript
// S3 — reads {PREFIX}_ACCESS_KEY_ID, {PREFIX}_SECRET_ACCESS_KEY,
//            {PREFIX}_ENDPOINT_URL, {PREFIX}_REGION, {PREFIX}_BUCKET
getS3Config('S3');

// Google Drive — reads {PREFIX}_GOOGLE_CLIENT_EMAIL, {PREFIX}_GOOGLE_PRIVATE_KEY
getDriveConfig('GDRIVE');
```

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test:unit        # Run unit tests
pnpm test:int         # Run integration tests
pnpm test:e2e         # Run end-to-end tests
pnpm test:coverage    # Run tests with coverage report
pnpm lint             # Lint all packages
pnpm format:check     # Check formatting
pnpm ci:quality       # Run full CI quality pipeline locally
```

### Test conventions

Tests are separated by type and enforced by per-type Jest configs:

| Type        | Pattern          | Command          |
| ----------- | ---------------- | ---------------- |
| Unit        | `*.unit.spec.ts` | `pnpm test:unit` |
| Integration | `*.int.spec.ts`  | `pnpm test:int`  |
| E2E         | `*.e2e.spec.ts`  | `pnpm test:e2e`  |

Public API stability is verified through `api-contract.unit.spec.ts` files that check exported runtime keys to catch accidental breaking changes.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, …)
4. Add or update tests for your changes
5. Run `pnpm ci:quality` to validate locally
6. Open a pull request against `main`

## Changelog

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation. See the release history in each package:

- [`@miinded/nestjs-s3` changelog](./packages/nestjs-s3/CHANGELOG.md)
- [`@miinded/nestjs-google-drive` changelog](./packages/nestjs-google-drive/CHANGELOG.md)

## Security

If you discover a security vulnerability, please report it responsibly. See our [Security Policy](SECURITY.md) for details.

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/miinded">Miinded</a>
</p>
