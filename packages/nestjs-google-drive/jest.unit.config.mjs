import { unitJestConfig } from '../../config/jest-presets.mjs';

export default {
  ...unitJestConfig,
  collectCoverageFrom: [
    ...(unitJestConfig.collectCoverageFrom ?? []),
    '!src/common/google-drive.decorator.ts',
    '!src/common/google-drive.utils.ts',
    '!src/google-drive.constants.ts',
  ],
};
