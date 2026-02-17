import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { S3Service } from './service/s3.service';
import { S3_MODULE_OPTIONS } from './s3.constants';
import { getS3ConnectionToken } from './common';

export type S3ConnectionConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucket: string;
};

export type S3ConnectionAsyncConfig = {
  isGlobal?: boolean;
  name?: string;
  useFactory: (...args: unknown[]) => Promise<S3ConnectionConfig> | S3ConnectionConfig;
  inject?: FactoryProvider['inject'];
} & Pick<ModuleMetadata, 'imports'>;

@Module({})
export class S3Module {
  static register(options: S3ConnectionConfig & { name?: string; isGlobal?: boolean }): DynamicModule {
    const { name, isGlobal, ...config } = options;
    return S3Module.registerAsync({
      name,
      isGlobal,
      useFactory: () => config,
    });
  }

  static registerAsync(options: S3ConnectionAsyncConfig): DynamicModule {
    if (!options || typeof options.useFactory !== 'function') {
      throw new Error('[S3Module] registerAsync requires a useFactory function');
    }

    const connectionToken = getS3ConnectionToken(options.name ?? '');

    const providers: Provider[] = [
      {
        provide: S3_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: connectionToken,
        useFactory: async (s3ConnectionOptions: S3ConnectionConfig) => {
          const service = new S3Service();
          service.setConnection(
            s3ConnectionOptions.accessKeyId,
            s3ConnectionOptions.secretAccessKey,
            s3ConnectionOptions.endpoint,
            s3ConnectionOptions.region,
            s3ConnectionOptions.bucket,
          );
          return service;
        },
        inject: [S3_MODULE_OPTIONS],
      },
    ];
    return {
      module: S3Module,
      global: options?.isGlobal ?? true,
      imports: [...(options?.imports || [])],
      providers,
      exports: [connectionToken],
    };
  }
}
