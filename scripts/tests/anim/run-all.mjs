import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entries = await readdir(here);
const tests = entries
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

if (tests.length === 0) {
  console.log('No tests found in', here);
  process.exit(0);
}

let failed = 0;
for (const t of tests) {
  console.log(`\n=== ${t} ===`);
  try {
    await import(pathToFileURL(join(here, t)).href);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${t} FAILED:`, err.message);
    if (process.env.VERBOSE) console.error(err.stack);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} test files passed`);
process.exit(failed === 0 ? 0 : 1);
