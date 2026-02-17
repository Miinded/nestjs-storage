import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { resolve } from 'path';

const REPORTS_DIR_NAME = '.nyc_output';
const PACKAGES_DIR_NAME = 'packages';
const PACKAGE_PATH = resolve(process.cwd(), PACKAGES_DIR_NAME);
const REPORTS_DIR_PATH = resolve(process.cwd(), REPORTS_DIR_NAME);
const BLUE = '\x1b[34m%s\x1b[0m';
const GREEN = '\x1b[32m%s\x1b[0m';

function aggregateReports() {
  createTempDir();
  copyReports();
}

function createTempDir() {
  console.log(BLUE, `Creating a temp ${REPORTS_DIR_NAME} directory...`);
  if (!existsSync(REPORTS_DIR_PATH)) {
    mkdirSync(REPORTS_DIR_PATH, { recursive: true });
  }
  console.log(GREEN, 'Done!');
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
          console.log(BLUE, `Copying coverage report for ${item}...`);
          const destFilePath = resolve(REPORTS_DIR_PATH, `${item}.json`);
          copyFileSync(targetFilePath, destFilePath);
          copiedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to process ${item}:`, error.message);
    }
  });

  console.log(GREEN, `Copied ${copiedCount} coverage report(s)`);
}

aggregateReports();
