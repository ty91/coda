import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

const RULES = [
  {
    scope: '@coda/cli',
    root: path.join(ROOT, 'apps/cli/src'),
    forbidden: ['@coda/desktop', 'apps/desktop/'],
  },
  {
    scope: '@coda/desktop',
    root: path.join(ROOT, 'apps/desktop/src'),
    forbidden: ['@coda/cli', 'apps/cli/'],
  },
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g;

const walkFiles = (entryPath) => {
  const statEntries = readdirSync(entryPath, { withFileTypes: true });
  const files = [];

  for (const statEntry of statEntries) {
    const fullPath = path.join(entryPath, statEntry.name);
    if (statEntry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(statEntry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

const checkRule = (rule) => {
  const failures = [];

  for (const filePath of walkFiles(rule.root)) {
    const contents = readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT, filePath);

    for (const match of contents.matchAll(IMPORT_PATTERN)) {
      const importPath = match[1];
      if (!importPath) {
        continue;
      }

      if (rule.forbidden.some((fragment) => importPath.includes(fragment))) {
        failures.push(`${relativePath} imports forbidden path: ${importPath}`);
      }
    }
  }

  return failures;
};

const failures = RULES.flatMap(checkRule);

if (failures.length > 0) {
  process.stderr.write('Architecture boundary check failed:\n');
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write('Architecture boundary check passed.\n');
}
