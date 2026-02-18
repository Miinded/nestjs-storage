import { Inject } from '@nestjs/common';
import { DEFAULT_CONNECTION_NAME } from '../google-drive.constants';
import { getGoogleDriveConnectionToken } from './google-drive.utils';

export const InjectDrive = (connection: string = DEFAULT_CONNECTION_NAME): ReturnType<typeof Inject> =>
  Inject(getGoogleDriveConnectionToken(connection));
