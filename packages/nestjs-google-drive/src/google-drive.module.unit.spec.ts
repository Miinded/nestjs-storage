import { GOOGLE_DRIVE_MODULE_OPTIONS } from './google-drive.constants';
import {
  GoogleDriveModule,
  type GoogleDriveConnectionAsyncConfig,
  type GoogleDriveConnectionConfig,
} from './google-drive.module';
import { getGoogleDriveConnectionToken } from './common';
import { GoogleDriveService } from './service/google-drive.service';

type TestProvider = {
  provide?: unknown;
  inject?: unknown;
  useFactory?: unknown;
};

describe('GoogleDriveModule', () => {
  const validConfig: GoogleDriveConnectionConfig = {
    clientEmail: 'client@example.iam.gserviceaccount.com',
    privateKey: 'private-key-content',
  };

  it('throws when useFactory is missing', () => {
    expect(() => GoogleDriveModule.registerAsync({} as unknown as GoogleDriveConnectionAsyncConfig)).toThrow(
      '[GoogleDriveModule] registerAsync requires a useFactory function',
    );
  });

  it('builds dynamic module with default global=true and expected providers', () => {
    const useFactory = jest.fn(() => validConfig);
    const connectionName = 'tenant-a';

    const moduleDef = GoogleDriveModule.registerAsync({
      name: connectionName,
      useFactory,
      inject: ['CONFIG_TOKEN'],
    });

    const providers = moduleDef.providers as unknown as TestProvider[];
    const optionsProvider = providers.find((provider) => provider.provide === GOOGLE_DRIVE_MODULE_OPTIONS);
    const connectionProvider = providers.find(
      (provider) => provider.provide === getGoogleDriveConnectionToken(connectionName),
    );

    expect(moduleDef.module).toBe(GoogleDriveModule);
    expect(moduleDef.global).toBe(true);
    expect(moduleDef.imports).toEqual([]);
    expect(optionsProvider).toMatchObject({
      provide: GOOGLE_DRIVE_MODULE_OPTIONS,
      useFactory,
      inject: ['CONFIG_TOKEN'],
    });
    expect(connectionProvider).toMatchObject({
      provide: getGoogleDriveConnectionToken(connectionName),
      inject: [GOOGLE_DRIVE_MODULE_OPTIONS],
    });
    expect(moduleDef.exports).toEqual([getGoogleDriveConnectionToken(connectionName)]);
    expect(moduleDef.exports).not.toContain(GOOGLE_DRIVE_MODULE_OPTIONS);
  });

  it('builds dynamic module with custom global/imports values', () => {
    const importedModule = class ImportedModule {};

    const moduleDef = GoogleDriveModule.registerAsync({
      useFactory: () => validConfig,
      isGlobal: false,
      imports: [importedModule],
    });

    expect(moduleDef.global).toBe(false);
    expect(moduleDef.imports).toEqual([importedModule]);
  });

  it('connection provider factory returns a configured GoogleDriveService', async () => {
    const connectionName = 'tenant-b';
    const moduleDef = GoogleDriveModule.registerAsync({
      name: connectionName,
      useFactory: () => validConfig,
    });

    const providers = moduleDef.providers as unknown as TestProvider[];
    const connectionProvider = providers.find(
      (provider) => provider.provide === getGoogleDriveConnectionToken(connectionName),
    );

    expect(connectionProvider).toBeDefined();

    const serviceFactory = connectionProvider?.useFactory as (
      config: GoogleDriveConnectionConfig,
    ) => Promise<GoogleDriveService>;
    const service = await serviceFactory(validConfig);

    expect(service).toBeInstanceOf(GoogleDriveService);
    expect((service as unknown as { driveClient: unknown }).driveClient).toBeDefined();
  });
});
