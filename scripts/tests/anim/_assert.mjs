import assert from 'node:assert/strict';

export function section(name) {
  console.log(`\n── ${name} ──`);
}

export function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

export function approxEqual(actual, expected, eps, msg) {
  const ok = Math.abs(actual - expected) <= eps;
  assert.ok(
    ok,
    `${msg}: expected ${expected} ± ${eps}, got ${actual}`
  );
  pass(`${msg} (got ${actual.toFixed(6)})`);
}

export function withinBand(actual, low, high, msg) {
  assert.ok(
    actual >= low && actual <= high,
    `${msg}: expected within [${low}, ${high}], got ${actual}`
  );
  pass(`${msg} (got ${actual.toFixed(6)})`);
}

export { assert };
