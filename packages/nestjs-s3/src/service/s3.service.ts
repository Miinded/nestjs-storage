import { Injectable } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { mapS3Error } from '../common/storage-error.mapper';
import { UploadResult, FileMetadata, StorageAdapter } from '../common/storage.types';
import { validateStorageKey } from '../common/security.utils';

@Injectable()
export class S3Service implements StorageAdapter {
  private s3!: S3Client;
  private bucket!: string;
  private endpoint!: string;

  /**
   * Configure the underlying S3 client.
   * Must be called before any storage operation.
   * @param accessKeyId - AWS access key ID
   * @param secretAccessKey - AWS secret access key
   * @param endpoint - S3-compatible endpoint URL
   * @param region - AWS region (e.g. `'eu-west-1'`)
   * @param bucket - Target bucket name (default `'private-bucket'`)
   */
  setConnection(
    accessKeyId: string,
    secretAccessKey: string,
    endpoint: string,
    region: string,
    bucket = 'private-bucket',
  ): void {
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
      forcePathStyle: true,
    });

    this.bucket = bucket;
    this.endpoint = endpoint;
  }

  /**
   * Ensure the configured bucket exists, creating it if necessary.
   * Silently succeeds if the bucket already exists.
   */
  async checkBucket(): Promise<void> {
    try {
      await this.s3.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
          ACL: 'private',
        }),
      );
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = String((error as any)?.code ?? (error as any)?.name ?? '');
      if (code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists') {
        return;
      }
      throw mapS3Error('checkBucket', error);
    }
  }

  /** {@inheritDoc StorageAdapter.uploadFile} */
  async uploadFile(key: string, buffer: Buffer, mimeType: string, isPublic: boolean = false): Promise<UploadResult> {
    validateStorageKey(key);
    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: isPublic ? 'public-read' : 'private',
        },
      });
      await upload.done();
      return {
        id: key,
        key: key,
        publicUrl: isPublic ? `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}` : null,
      };
    } catch (error) {
      throw mapS3Error('uploadFile', error);
    }
  }

  /** {@inheritDoc StorageAdapter.uploadPublicFile} */
  async uploadPublicFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    return this.uploadFile(key, buffer, mimeType, true);
  }

  /** {@inheritDoc StorageAdapter.uploadPrivateFile} */
  async uploadPrivateFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    return this.uploadFile(key, buffer, mimeType, false);
  }

  /** {@inheritDoc StorageAdapter.download} */
  async download(key: string): Promise<Uint8Array> {
    validateStorageKey(key);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3.send(command);
      if (!response.Body) {
        throw new Error(`S3 object body is empty for key: ${key}`);
      }
      return await response.Body.transformToByteArray();
    } catch (error) {
      throw mapS3Error('download', error);
    }
  }

  /** {@inheritDoc StorageAdapter.getStream} */
  public async getStream(key: string): Promise<Readable> {
    validateStorageKey(key);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3.send(command);
      if (!response.Body) {
        throw new Error(`S3 object body is empty for key: ${key}`);
      }
      return response.Body as Readable;
    } catch (error) {
      throw mapS3Error('getStream', error);
    }
  }

  /** {@inheritDoc StorageAdapter.exists} */
  public async exists(key: string): Promise<boolean> {
    validateStorageKey(key);
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
      return true;
    } catch (error) {
      const mapped = mapS3Error('exists', error);
      if (mapped.category === 'not_found') {
        return false;
      }
      throw mapped;
    }
  }

  /**
   * {@inheritDoc StorageAdapter.getLink}
   * Returns a pre-signed URL valid for 1 hour.
   */
  public async getLink(key: string): Promise<string> {
    validateStorageKey(key);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
      return getSignedUrl(this.s3, command, { expiresIn: 3600 });
    } catch (error) {
      throw mapS3Error('getLink', error);
    }
  }

  /** {@inheritDoc StorageAdapter.listFiles} */
  public async listFiles(key: string): Promise<FileMetadata[]> {
    validateStorageKey(key);
    const formatKey = key === '' || key.endsWith('/') ? key : `${key}/`;
    const files: { name: string; size: number; key: string }[] = [];
    try {
      let continuationToken: string | undefined;
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: formatKey,
          ContinuationToken: continuationToken,
        });
        const response = await this.s3.send(command);
        response.Contents?.forEach((object) => {
          if (!object.Key) {
            return;
          }
          const filename = object.Key.replace(formatKey, '');
          if (filename === '') {
            return;
          }
          files.push({ name: filename, size: Number(object.Size ?? 0), key: object.Key });
        });
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
      return files;
    } catch (err) {
      throw mapS3Error('listFiles', err);
    }
  }

  /** {@inheritDoc StorageAdapter.delete} */
  async delete(key: string): Promise<void> {
    validateStorageKey(key);
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
    } catch (error) {
      throw mapS3Error('delete', error);
    }
  }
}
