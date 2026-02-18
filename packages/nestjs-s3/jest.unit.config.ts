import { unitJestConfig } from '../../config/jest-presets';

const s3UnitJestConfig: Record<string, unknown> = {
  ...unitJestConfig,
  collectCoverageFrom: [
    ...(unitJestConfig.collectCoverageFrom ?? []),
    '!src/common/s3.decorator.ts',
    '!src/common/s3.utils.ts',
    '!src/s3.constants.ts',
  ],
};

export default s3UnitJestConfig;
