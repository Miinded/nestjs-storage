import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? 'unit';

const isDebugMode = mode === 'debug' || mode.endsWith(':debug');
const baseMode = mode === 'debug' ? 'unit' : mode.replace(':debug', '');

const configs = {
  unit: 'jest.unit.config.mjs',
  int: 'jest.int.config.mjs',
  e2e: 'jest.e2e.config.mjs',
};

const resolvedMode = baseMode === 'watch' || baseMode === 'coverage' ? 'unit' : baseMode;
const configFile = configs[resolvedMode];

if (!configFile) {
  console.error(`[run-jest] unsupported mode: ${mode}`);
  process.exit(1);
}

const args = ['exec', 'jest', `--config=./${configFile}`, '--passWithNoTests'];

if (isDebugMode) {
  args.push('--no-cache', '--detectOpenHandles');
}

if (baseMode === 'watch') {
  args.push('--watch');
}

if (baseMode === 'coverage') {
  args.push('--coverage');
}

const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  console.error(`[run-jest] failed: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
