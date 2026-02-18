import { unitJestConfig } from '../../config/jest-presets.mjs';

export default {
  ...unitJestConfig,
  collectCoverageFrom: [
    ...(unitJestConfig.collectCoverageFrom ?? []),
    '!src/common/s3.decorator.ts',
    '!src/common/s3.utils.ts',
    '!src/s3.constants.ts',
  ],
};
