import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';

const repoRoot = process.cwd();
const packagesRoot = resolve(repoRoot, 'packages');

const IGNORED_FILE_SUFFIXES = ['.spec.ts', '.test.ts', '.d.ts'];

function isIgnoredTsFile(filename) {
  return IGNORED_FILE_SUFFIXES.some((suffix) => filename.endsWith(suffix));
}

function readDirSafe(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).map((name) => resolve(dir, name));
}

function hasTsContentRecursive(dir) {
  const entries = readDirSafe(dir);
  for (const entry of entries) {
    const st = statSync(entry);
    if (st.isDirectory()) {
      if (hasTsContentRecursive(entry)) {
        return true;
      }
      continue;
    }
    if (extname(entry) === '.ts' && basename(entry) !== 'index.ts' && !isIgnoredTsFile(basename(entry))) {
      return true;
    }
  }
  return false;
}

function parseIndexExports(indexPath) {
  const content = readFileSync(indexPath, 'utf8');
  const exportRegex = /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]\.\/([^'"]+)['"];?/g;
  const exportsSet = new Set();
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exportsSet.add(match[1]);
  }
  return exportsSet;
}

function expectedExportsForDirectory(dir) {
  const entries = readDirSafe(dir);
  const expected = new Set();
  for (const entry of entries) {
    const st = statSync(entry);
    const name = basename(entry);
    if (st.isDirectory()) {
      const childIndex = resolve(entry, 'index.ts');
      if (existsSync(childIndex) && hasTsContentRecursive(entry)) {
        expected.add(name);
      }
      continue;
    }
    if (extname(name) !== '.ts' || name === 'index.ts' || isIgnoredTsFile(name)) {
      continue;
    }
    expected.add(name.slice(0, -3));
  }
  return expected;
}

function walkDirectories(dir, out = []) {
  out.push(dir);
  for (const entry of readDirSafe(dir)) {
    if (statSync(entry).isDirectory()) {
      walkDirectories(entry, out);
    }
  }
  return out;
}

if (!existsSync(packagesRoot)) {
  console.log('[barrels:check] no packages directory found, skipping');
  process.exit(0);
}

const packageDirs = readdirSync(packagesRoot)
  .map((name) => resolve(packagesRoot, name))
  .filter((dir) => existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'src')));

let hasError = false;

for (const pkgDir of packageDirs) {
  const srcDir = resolve(pkgDir, 'src');
  const allDirs = walkDirectories(srcDir);

  for (const dir of allDirs) {
    const expected = expectedExportsForDirectory(dir);
    if (expected.size === 0) {
      continue;
    }

    const indexPath = resolve(dir, 'index.ts');
    const relativeDir = dir.slice(repoRoot.length + 1).replace(/\\/g, '/');

    if (!existsSync(indexPath)) {
      console.error(`[barrels:check] missing index.ts in ${relativeDir}`);
      hasError = true;
      continue;
    }

    const actual = parseIndexExports(indexPath);
    const missing = [...expected].filter((item) => !actual.has(item));
    const unexpected = [...actual].filter((item) => !expected.has(item));

    if (missing.length || unexpected.length) {
      hasError = true;
      if (missing.length) {
        console.error(`[barrels:check] ${relativeDir}: missing exports -> ${missing.join(', ')}`);
      }
      if (unexpected.length) {
        console.error(`[barrels:check] ${relativeDir}: unexpected exports -> ${unexpected.join(', ')}`);
      }
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('[barrels:check] all barrel files are in sync');
