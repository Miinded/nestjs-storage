import type { Config } from 'jest';

export const baseJestConfig: Config = {
  verbose: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  rootDir: '.',
  roots: ['src'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        sourceMaps: 'inline',
        module: {
          type: 'commonjs',
        },
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  resetModules: false,
};

export const unitJestConfig: Config = {
  ...baseJestConfig,
  testRegex: '.*\\.unit\\.spec\\.ts$',
  collectCoverage: false,
  coverageReporters: ['json', 'html'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/index.ts', '!src/interface/**/*'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};

export const intJestConfig: Config = {
  ...baseJestConfig,
  testRegex: '.*\\.int\\.spec\\.ts$',
  collectCoverage: false,
};

export const e2eJestConfig: Config = {
  ...baseJestConfig,
  testRegex: '.*\\.e2e\\.spec\\.ts$',
  collectCoverage: false,
};
