import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const packagesDir = resolve(workspaceRoot, 'packages');

if (!existsSync(packagesDir)) {
  console.log('[deps:check] no packages directory found, skipping');
  process.exit(0);
}

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(packagesDir, entry.name));

const INTERNAL_SCOPE = '@miinded/';
const ALLOWED_WORKSPACE_DEPS = new Set(['@miinded/nestjs-storage-core']);
let hasError = false;

for (const dir of packageDirs) {
  const packageJsonPath = resolve(dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    continue;
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

  for (const section of sections) {
    const deps = pkg[section] ?? {};
    for (const [name, version] of Object.entries(deps)) {
      if (!name.startsWith(INTERNAL_SCOPE)) {
        continue;
      }

      if (String(version).startsWith('workspace:') && !ALLOWED_WORKSPACE_DEPS.has(name)) {
        console.error(
          `[deps:check] ${pkg.name}: avoid workspace protocol for published internal dependency ${name} (${section})`,
        );
        hasError = true;
      }
    }
  }

  const runtimeDeps = pkg.dependencies ?? {};
  for (const name of Object.keys(runtimeDeps)) {
    if (name.startsWith('@nestjs/') || name === 'rxjs') {
      console.error(
        `[deps:check] ${pkg.name}: move ${name} from dependencies to peerDependencies for publishable libs`,
      );
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('[deps:check] dependency policy passed');
