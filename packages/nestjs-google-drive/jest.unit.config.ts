import { unitJestConfig } from '../../config/jest-presets.mjs';

const googleDriveUnitJestConfig: Record<string, unknown> = {
  ...unitJestConfig,
  collectCoverageFrom: [
    ...(unitJestConfig.collectCoverageFrom ?? []),
    '!src/common/google-drive.decorator.ts',
    '!src/common/google-drive.utils.ts',
    '!src/google-drive.constants.ts',
  ],
};

export default googleDriveUnitJestConfig;
