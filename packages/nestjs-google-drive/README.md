# @miinded/nestjs-google-drive

[![npm version](https://badge.fury.io/js/@miinded%2Fnestjs-google-drive.svg)](https://badge.fury.io/js/@miinded%2Fnestjs-google-drive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready NestJS module for Google Drive integration. Features file uploads, downloads, sharing, folder management, and full TypeScript support with service account authentication.

## Features

- 🚀 **Easy Integration** - Simple module registration with sync and async configuration
- 🔐 **Service Account Auth** - Secure server-to-server authentication
- 📁 **Folder Management** - Create and manage folders programmatically
- 🔗 **Sharing & Permissions** - Generate shareable links and manage access
- 📝 **Full TypeScript** - Complete type definitions for excellent DX
- ✅ **Well Tested** - Unit, integration, and E2E tests

## Installation

```bash
npm install @miinded/nestjs-google-drive
# or
pnpm add @miinded/nestjs-google-drive
# or
yarn add @miinded/nestjs-google-drive
```

## Prerequisites

1. Create a Google Cloud Project
2. Enable Google Drive API
3. Create a Service Account
4. Generate and download the JSON key file
5. Share your Drive folders with the service account email

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { GoogleDriveModule } from '@miinded/nestjs-google-drive';

@Module({
  imports: [
    GoogleDriveModule.register({
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY, // The full private key including \n
    }),
  ],
  providers: [DocumentService],
})
export class AppModule {}
```

### Async Configuration

```typescript
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

## Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDrive, GoogleDriveService, UploadResult } from '@miinded/nestjs-google-drive';

@Injectable()
export class DocumentService {
  constructor(@InjectDrive() private readonly drive: GoogleDriveService) {}

  async uploadReport(reportId: string, content: Buffer): Promise<UploadResult> {
    const key = `reports/${reportId}.pdf`;
    return this.drive.uploadPrivateFile(key, content, 'application/pdf');
  }

  async downloadReport(fileId: string): Promise<Uint8Array> {
    return this.drive.download(fileId);
  }

  async shareReport(fileId: string): Promise<string> {
    return this.drive.getLink(fileId);
  }

  async listReports() {
    return this.drive.listFiles('reports');
  }
}
```

## API Reference

| Method                                         | Description           | Returns                        |
| ---------------------------------------------- | --------------------- | ------------------------------ |
| `uploadFile(key, buffer, mimeType, isPublic?)` | Upload a file         | `Promise<UploadResult>`        |
| `uploadPublicFile(key, buffer, mimeType)`      | Upload a public file  | `Promise<UploadResult>`        |
| `uploadPrivateFile(key, buffer, mimeType)`     | Upload a private file | `Promise<UploadResult>`        |
| `download(fileId)`                             | Download file content | `Promise<Uint8Array>`          |
| `getStream(fileId)`                            | Get readable stream   | `Promise<Readable>`            |
| `exists(key)`                                  | Check if file exists  | `Promise<boolean>`             |
| `getLink(fileId)`                              | Get shareable URL     | `Promise<string>`              |
| `listFiles(path)`                              | List files in path    | `Promise<{name, size, key}[]>` |
| `delete(fileId)`                               | Delete a file         | `Promise<void>`                |

## Configuration Options

| Option        | Type     | Required | Description                                                             |
| ------------- | -------- | -------- | ----------------------------------------------------------------------- |
| `clientEmail` | `string` | ✅       | Service account email (`client_email` from JSON key)                    |
| `privateKey`  | `string` | ✅       | Service account private key (`private_key` from JSON key, include `\n`) |

## Getting Your Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Drive API
4. Go to IAM & Admin > Service Accounts
5. Create a service account
6. Create a key (JSON format)
7. Extract `client_email` and `private_key` from the JSON file

### Environment Variables

```env
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## License

MIT © [Miinded](https://github.com/miinded)
