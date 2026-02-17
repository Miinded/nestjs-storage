# @miinded/nestjs-s3

[![npm version](https://badge.fury.io/js/@miinded%2Fnestjs-s3.svg)](https://badge.fury.io/js/@miinded%2Fnestjs-s3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready NestJS module for AWS S3, MinIO, and S3-compatible object storage. Features automatic bucket creation, presigned URLs, streaming uploads, and full TypeScript support.

## Features

- 🚀 **Easy Integration** - Simple module registration with sync and async configuration
- 🔒 **Public & Private Files** - Built-in support for public and private file uploads
- 🔗 **Presigned URLs** - Generate secure time-limited download links
- 📦 **Streaming Support** - Memory-efficient streaming for large files
- 🪣 **Auto Bucket Creation** - Automatically creates buckets if they don't exist
- 📝 **Full TypeScript** - Complete type definitions for excellent DX
- ✅ **Well Tested** - Unit, integration, and E2E tests

## Installation

```bash
npm install @miinded/nestjs-s3
# or
pnpm add @miinded/nestjs-s3
# or
yarn add @miinded/nestjs-s3
```

## Quick Start

### AWS S3

```typescript
import { Module } from '@nestjs/common';
import { S3Module, S3Service } from '@miinded/nestjs-s3';

@Module({
  imports: [
    S3Module.register({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: 'https://s3.amazonaws.com',
      region: process.env.AWS_REGION,
      bucket: process.env.S3_BUCKET,
    }),
  ],
  providers: [FileService],
})
export class AppModule {}
```

### MinIO (Self-hosted)

```typescript
import { S3Module } from '@miinded/nestjs-s3';

@Module({
  imports: [
    S3Module.register({
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'my-app-bucket',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
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
        endpoint: config.get('S3_ENDPOINT', 'https://s3.amazonaws.com'),
        region: config.getOrThrow('AWS_REGION'),
        bucket: config.getOrThrow('S3_BUCKET'),
      }),
    }),
  ],
})
export class AppModule {}
```

## Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { InjectS3, S3Service } from '@miinded/nestjs-s3';

@Injectable()
export class FileService {
  constructor(@InjectS3() private readonly s3: S3Service) {}

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const key = `avatars/${userId}/${file.originalname}`;
    await this.s3.uploadPrivateFile(key, file.buffer, file.mimetype);
    return key;
  }

  async getAvatarUrl(userId: string, filename: string) {
    return this.s3.getLink(`avatars/${userId}/${filename}`);
  }

  async deleteAvatar(userId: string, filename: string) {
    await this.s3.delete(`avatars/${userId}/${filename}`);
  }
}
```

## API Reference

| Method                                         | Description           | Returns                        |
| ---------------------------------------------- | --------------------- | ------------------------------ |
| `uploadFile(key, buffer, mimeType, isPublic?)` | Upload a file         | `Promise<UploadResult>`        |
| `uploadPublicFile(key, buffer, mimeType)`      | Upload a public file  | `Promise<UploadResult>`        |
| `uploadPrivateFile(key, buffer, mimeType)`     | Upload a private file | `Promise<UploadResult>`        |
| `download(key)`                                | Download file content | `Promise<Uint8Array>`          |
| `getStream(key)`                               | Get readable stream   | `Promise<Readable>`            |
| `exists(key)`                                  | Check if file exists  | `Promise<boolean>`             |
| `getLink(key)`                                 | Get presigned URL     | `Promise<string>`              |
| `listFiles(path)`                              | List files in path    | `Promise<{name, size, key}[]>` |
| `delete(key)`                                  | Delete a file         | `Promise<void>`                |

## Configuration Options

| Option            | Type     | Required | Description           |
| ----------------- | -------- | -------- | --------------------- |
| `accessKeyId`     | `string` | ✅       | AWS access key ID     |
| `secretAccessKey` | `string` | ✅       | AWS secret access key |
| `endpoint`        | `string` | ✅       | S3 endpoint URL       |
| `region`          | `string` | ✅       | AWS region            |
| `bucket`          | `string` | ✅       | Bucket name           |

## Compatible Services

- AWS S3
- MinIO
- DigitalOcean Spaces
- Wasabi
- Cloudflare R2
- Any S3-compatible storage

## License

MIT © [Miinded](https://github.com/miinded)
