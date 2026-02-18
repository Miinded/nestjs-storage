import { S3_MODULE_OPTIONS } from './s3.constants';
import { S3Module, type S3ConnectionConfig } from './s3.module';
import { getS3ConnectionToken } from './common';
import { S3Service } from './service/s3.service';

describe('S3Module', () => {
  const validConfig: S3ConnectionConfig = {
    accessKeyId: 'ak',
    secretAccessKey: 'sk',
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    bucket: 'bucket',
  };

  it('throws when useFactory is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => S3Module.registerAsync({} as any)).toThrow('[S3Module] registerAsync requires a useFactory function');
  });

  it('builds dynamic module with default global=true and expected providers', () => {
    const useFactory = jest.fn(() => validConfig);
    const connectionName = 'tenant-a';
    const moduleDef = S3Module.registerAsync({
      name: connectionName,
      useFactory,
      inject: ['CONFIG_TOKEN'],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers = moduleDef.providers as any[];
    const optionsProvider = providers.find((provider) => provider?.provide === S3_MODULE_OPTIONS);
    const connectionProvider = providers.find((provider) => provider?.provide === getS3ConnectionToken(connectionName));

    expect(moduleDef.module).toBe(S3Module);
    expect(moduleDef.global).toBe(true);
    expect(moduleDef.imports).toEqual([]);
    expect(optionsProvider).toMatchObject({
      provide: S3_MODULE_OPTIONS,
      useFactory,
      inject: ['CONFIG_TOKEN'],
    });
    expect(connectionProvider).toMatchObject({
      provide: getS3ConnectionToken(connectionName),
      inject: [S3_MODULE_OPTIONS],
    });
    expect(moduleDef.exports).toEqual([getS3ConnectionToken(connectionName)]);
    expect(moduleDef.exports).not.toContain(S3_MODULE_OPTIONS);
  });

  it('builds dynamic module with custom global/imports values', () => {
    const importedModule = class ImportedModule {};

    const moduleDef = S3Module.registerAsync({
      useFactory: () => validConfig,
      isGlobal: false,
      imports: [importedModule],
    });

    expect(moduleDef.global).toBe(false);
    expect(moduleDef.imports).toEqual([importedModule]);
  });

  it('connection provider factory returns a configured S3Service', async () => {
    const connectionName = 'tenant-b';
    const moduleDef = S3Module.registerAsync({
      name: connectionName,
      useFactory: () => validConfig,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers = moduleDef.providers as any[];
    const connectionProvider = providers.find((provider) => provider?.provide === getS3ConnectionToken(connectionName));

    const service = await connectionProvider.useFactory(validConfig);

    expect(service).toBeInstanceOf(S3Service);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).bucket).toBe(validConfig.bucket);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).s3).toBeDefined();
  });
});
