import { Inject } from '@nestjs/common';
import { DEFAULT_CONNECTION_NAME } from '../s3.constants';
import { getS3ConnectionToken } from './s3.utils';

export const InjectS3 = (connection: string = DEFAULT_CONNECTION_NAME): ReturnType<typeof Inject> =>
  Inject(getS3ConnectionToken(connection));
