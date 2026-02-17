import { requireEnv } from '@miinded/nestjs-storage-core';
import { DEFAULT_CONNECTION_NAME } from '../google-drive.constants';
import { GoogleDriveConnectionConfig } from '../google-drive.module';
import { GoogleDriveService } from '../service';

export function getGoogleDriveConnectionToken(connection: string): string {
  return `${connection || DEFAULT_CONNECTION_NAME}_GDSource`;
}

export function createGoogleDriveConnection(options: GoogleDriveConnectionConfig): GoogleDriveService {
  const service = new GoogleDriveService();
  service.setConnection(options.clientEmail, options.privateKey);
  return service;
}

/**
 * Build a {@link GoogleDriveConnectionConfig} from environment variables.
 *
 * The following variables are read (where `{PREFIX}` is the value of `_prefix`):
 * - `{PREFIX}_GOOGLE_CLIENT_EMAIL`
 * - `{PREFIX}_GOOGLE_PRIVATE_KEY`
 *
 * @param _prefix - Environment variable prefix (e.g. `'GDRIVE'`)
 * @throws Error if any required variable is missing or empty
 */
export const getDriveConfig = (_prefix = ''): GoogleDriveConnectionConfig => {
  const prefix = _prefix !== '' ? `${_prefix}_` : '';
  return {
    clientEmail: requireEnv(`${prefix}GOOGLE_CLIENT_EMAIL`),
    privateKey: requireEnv(`${prefix}GOOGLE_PRIVATE_KEY`).split('\\n').join('\n'),
  };
};
