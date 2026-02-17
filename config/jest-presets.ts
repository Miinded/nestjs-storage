import type { Config } from 'jest';
import {
  baseJestConfig as runtimeBaseJestConfig,
  e2eJestConfig as runtimeE2eJestConfig,
  intJestConfig as runtimeIntJestConfig,
  unitJestConfig as runtimeUnitJestConfig,
} from './jest-presets.mjs';

export const baseJestConfig: Config = runtimeBaseJestConfig as Config;
export const unitJestConfig: Config = runtimeUnitJestConfig as Config;
export const intJestConfig: Config = runtimeIntJestConfig as Config;
export const e2eJestConfig: Config = runtimeE2eJestConfig as Config;
