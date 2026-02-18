import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { GoogleDriveService } from './service/google-drive.service';
import { GOOGLE_DRIVE_MODULE_OPTIONS } from './google-drive.constants';
import { getGoogleDriveConnectionToken } from './common';

export type GoogleDriveConnectionConfig = {
  clientEmail: string;
  privateKey: string;
};

export type GoogleDriveConnectionAsyncConfig = {
  isGlobal?: boolean;
  name?: string;
  useFactory: (...args: unknown[]) => Promise<GoogleDriveConnectionConfig> | GoogleDriveConnectionConfig;
  inject?: FactoryProvider['inject'];
} & Pick<ModuleMetadata, 'imports'>;

@Module({})
export class GoogleDriveModule {
  static register(options: GoogleDriveConnectionConfig & { name?: string; isGlobal?: boolean }): DynamicModule {
    const { name, isGlobal, ...config } = options;
    return GoogleDriveModule.registerAsync({
      name,
      isGlobal,
      useFactory: () => config,
    });
  }

  static registerAsync(options: GoogleDriveConnectionAsyncConfig): DynamicModule {
    if (!options || typeof options.useFactory !== 'function') {
      throw new Error('[GoogleDriveModule] registerAsync requires a useFactory function');
    }

    const connectionToken = getGoogleDriveConnectionToken(options.name ?? '');

    const providers: Provider[] = [
      {
        provide: GOOGLE_DRIVE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: connectionToken,
        useFactory: async (config: GoogleDriveConnectionConfig) => {
          const service = new GoogleDriveService();
          service.setConnection(config.clientEmail, config.privateKey);
          return service;
        },
        inject: [GOOGLE_DRIVE_MODULE_OPTIONS],
      },
    ];
    return {
      module: GoogleDriveModule,
      global: options?.isGlobal ?? true,
      imports: [...(options?.imports || [])],
      providers,
      exports: [connectionToken],
    };
  }
}
