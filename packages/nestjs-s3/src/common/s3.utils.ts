import { requireEnv } from '@miinded/nestjs-storage-core';
import { DEFAULT_CONNECTION_NAME } from '../s3.constants';
import { S3ConnectionConfig } from '../s3.module';
import { S3Service } from '../service';

export function getS3ConnectionToken(connection: string): string {
  return `${connection || DEFAULT_CONNECTION_NAME}_S3Source`;
}

export function createS3Connection(options: S3ConnectionConfig): S3Service {
  const service = new S3Service();
  service.setConnection(options.accessKeyId, options.secretAccessKey, options.endpoint, options.region, options.bucket);
  return service;
}

/**
 * Build an {@link S3ConnectionConfig} from environment variables.
 *
 * The following variables are read (where `{PREFIX}` is the value of `_prefix`):
 * - `{PREFIX}_ACCESS_KEY_ID`
 * - `{PREFIX}_SECRET_ACCESS_KEY`
 * - `{PREFIX}_ENDPOINT_URL`
 * - `{PREFIX}_REGION`
 * - `{PREFIX}_BUCKET`
 *
 * @param _prefix - Environment variable prefix (e.g. `'S3'`)
 * @throws Error if any required variable is missing or empty
 */
export const getS3Config = (_prefix = ''): S3ConnectionConfig => {
  const prefix = _prefix !== '' ? `${_prefix}_` : '';
  return {
    accessKeyId: requireEnv(`${prefix}ACCESS_KEY_ID`),
    secretAccessKey: requireEnv(`${prefix}SECRET_ACCESS_KEY`),
    endpoint: requireEnv(`${prefix}ENDPOINT_URL`),
    region: requireEnv(`${prefix}REGION`),
    bucket: requireEnv(`${prefix}BUCKET`),
  };
};
