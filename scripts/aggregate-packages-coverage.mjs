import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const REPORTS_DIR_NAME = '.nyc_output';
const PACKAGES_DIR_NAME = 'packages';
const PROJECT_ROOT = process.cwd();
const PACKAGE_PATH = resolve(PROJECT_ROOT, PACKAGES_DIR_NAME);
const REPORTS_DIR_PATH = resolve(PROJECT_ROOT, REPORTS_DIR_NAME);
const BLUE = '\x1b[34m%s\x1b[0m';
const GREEN = '\x1b[32m%s\x1b[0m';
const YELLOW = '\x1b[33m%s\x1b[0m';

const mode = process.argv[2];

if (mode === 'patch') {
  const reportDir = resolve(PROJECT_ROOT, 'coverage');
  console.log(BLUE, 'Patching HTML coverage report...');
  patchHtmlReport(reportDir);
  console.log(GREEN, 'Patch complete!');
} else {
  aggregateReports();
}

function aggregateReports() {
  createTempDir();
  copyReports();
}

/**
 * Post-processes the HTML coverage report to fix intermediate index.html pages.
 * Istanbul/nyc does not add sub-directory links in intermediate pages when a folder
 * contains both files and sub-directories. This function patches those pages.
 */
function patchHtmlReport(reportDir) {
  if (!existsSync(reportDir)) return;

  const walk = (dir) => {
    const indexPath = join(dir, 'index.html');
    if (!existsSync(indexPath)) return;

    const subDirs = readdirSync(dir).filter((entry) => {
      const fullPath = join(dir, entry);
      return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'index.html'));
    });

    if (subDirs.length === 0) return;

    let html = readFileSync(indexPath, 'utf-8');

    const missingDirs = subDirs.filter((d) => !html.includes(`href="${d}/index.html"`));

    if (missingDirs.length > 0) {
      const rows = missingDirs
        .map(
          (d) =>
            `<tr>\n\t<td class="file" data-value="${d}"><a href="${d}/index.html">${d}/</a></td>\n` +
            `\t<td data-value="" class="pic"><div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div></td>\n` +
            `\t<td data-value="" class="pct"></td><td data-value="" class="abs"></td>\n` +
            `\t<td data-value="" class="pct"></td><td data-value="" class="abs"></td>\n` +
            `\t<td data-value="" class="pct"></td><td data-value="" class="abs"></td>\n` +
            `\t<td data-value="" class="pct"></td><td data-value="" class="abs"></td>\n` +
            `</tr>\n`,
        )
        .join('');

      html = html.replace('</tbody>', `${rows}</tbody>`);
      writeFileSync(indexPath, html, 'utf-8');
      console.log(BLUE, `  Patched ${indexPath} with links to: ${missingDirs.join(', ')}`);
    }

    subDirs.forEach((d) => walk(join(dir, d)));
  };

  walk(reportDir);
}

function createTempDir() {
  console.log(BLUE, `Creating a temp ${REPORTS_DIR_NAME} directory...`);
  if (!existsSync(REPORTS_DIR_PATH)) {
    mkdirSync(REPORTS_DIR_PATH, { recursive: true });
  }
  console.log(GREEN, 'Done!');
}

/**
 * Extracts the relative path from an absolute coverage path by locating
 * the 'packages/' segment, which is always relative to the project root.
 * Works with both WSL (/mnt/c/...) and Windows (C:/...) absolute paths.
 */
function toRelativePath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  const marker = `/${PACKAGES_DIR_NAME}/`;
  const idx = normalized.indexOf(marker);
  if (idx !== -1) {
    return normalized.substring(idx + marker.length);
  }
  return absolutePath;
}

/**
 * Remaps absolute paths in a coverage JSON so they are relative to the project root.
 * This ensures nyc report can resolve source files for HTML report links.
 */
function remapCoveragePaths(coverageJson) {
  const remapped = {};

  for (const [absoluteKey, entry] of Object.entries(coverageJson)) {
    const relativeKey = toRelativePath(absoluteKey);
    const relativePath = toRelativePath(entry.path);

    remapped[relativeKey] = {
      ...entry,
      path: relativePath,
    };
  }

  return remapped;
}

function copyReports() {
  if (!existsSync(PACKAGE_PATH)) {
    console.error(`Packages directory not found: ${PACKAGE_PATH}`);
    return;
  }

  const items = readdirSync(PACKAGE_PATH);
  let copiedCount = 0;

  items.forEach((item) => {
    const itemPath = resolve(PACKAGE_PATH, item);

    try {
      const stats = statSync(itemPath);

      if (stats.isDirectory()) {
        const targetFilePath = resolve(itemPath, 'coverage', 'coverage-final.json');

        if (existsSync(targetFilePath)) {
          console.log(BLUE, `Processing coverage report for ${item}...`);
          const raw = readFileSync(targetFilePath, 'utf-8');
          const coverageData = JSON.parse(raw);
          const remapped = remapCoveragePaths(coverageData);
          const destFilePath = resolve(REPORTS_DIR_PATH, `${item}.json`);
          writeFileSync(destFilePath, JSON.stringify(remapped), 'utf-8');
          console.log(GREEN, `  -> Remapped and saved ${Object.keys(remapped).length} file(s)`);
          copiedCount++;
        } else {
          console.log(YELLOW, `  No coverage report found for ${item}, skipping.`);
        }
      }
    } catch (error) {
      console.error(`Failed to process ${item}:`, error.message);
    }
  });

  console.log(GREEN, `Aggregated ${copiedCount} coverage report(s)`);
}

aggregateReports();
