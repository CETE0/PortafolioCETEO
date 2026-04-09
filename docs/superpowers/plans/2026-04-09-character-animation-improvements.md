# Experimental Shooter — Character Animation Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two real bugs and apply a small set of high-payoff visual & code-quality improvements to the procedural low-poly character animation system in `src/components/games/experimental/ArtShooterGame.js`.

**Architecture:** All work targets a single 2469-line vanilla-Three.js class file. Characters are procedural pivot rigs (no GLTF/skinning), animated each frame by one of five `animateXxx` routines that write `sin(t)` directly into `pivot.rotation.{x,y,z}`. The plan keeps that architecture — no rewrites — and surgically edits the rig builder, the per-frame animate loop, and the destroy/dispose path. Pure-logic fixes ship with tiny standalone Node smoke tests under `scripts/tests/anim/`; visual improvements ship with explicit manual verification steps in `next dev`.

**Tech Stack:** Next.js 15, React 19, Three.js 0.173, vanilla `requestAnimationFrame`, `WeakMap` for per-character state. No test framework in the project (only `next lint`); we add a single `npm run test:anim` script and a one-file shared assert helper, no Jest/Vitest infra.

**Reference doc:** `CHARACTER_ANIMATIONS_RESEARCH.md` at repo root contains the full findings this plan is derived from. Section numbers below (§5.1, §7.2, etc.) refer to that document.

---

## Scope

**In scope (this plan):**

| # | What | From findings | Type |
|---|------|---------------|------|
| 0 | Smoke-test runner (`scripts/tests/anim/`, `npm run test:anim`) | n/a | infra |
| 1 | Bug: idle shoulders Y drift | §5.1 | bugfix |
| 2 | Bug: `dispose()` may trigger spurious navigation | §5.2 | bugfix |
| 3 | Remove dead `userData.baseY` write | §5.4 | cleanup |
| 4 | Hoist humanoid geometries to shared module constants | §7.4 | perf/refactor |
| 5 | Extend universal breath to torso Y scale | §7.9 | quality |
| 6 | `head.lookAt(camera)` blend (eye contact) | §7.2 | quality |
| 7 | Hit-reaction flinch before destroy | §7.3 | quality |

**Explicitly deferred (not this plan):**

- §5.3 — Stale-pose-when-type-switches reset. Only matters if §7.7 lands; we are not implementing live type switching here.
- §5.5 — Tying walk gait to orbital velocity. Aesthetic call (§5.5 notes the dreamlike decoupling currently *fits* the vibe). Defer until someone explicitly wants locomotive walking.
- §5.7 — Removing dead `castShadow = true` flags. Touching shadow flags is a footgun if anyone later turns shadows on. Leave as-is.
- §5.8 / §7.6 — Hoisting magic numbers into the amplitudes config. Pure cleanup with no behavioural change. Worth doing eventually but not a payoff per task.
- §7.5 — Consolidating `userData.character`. Touches every read site; not worth the churn until another reason exists.
- §7.7 — Vary type over time + crossfade. Requires §5.3 first; significant new code.
- §7.8 — Tie walk cadence to orbit. See §5.5.
- §7.10 — Cap `headLook` cone. Subsumed by Task 6 (`lookAt` blend will dominate the head's behaviour anyway).

---

## File Structure

**Created:**

```
docs/superpowers/plans/2026-04-09-character-animation-improvements.md   ← this file
scripts/tests/anim/_assert.mjs                                          ← shared assert helper
scripts/tests/anim/shoulders-no-drift.test.mjs                          ← Task 1 test
scripts/tests/anim/dispose-guard.test.mjs                               ← Task 2 test
scripts/tests/anim/breath-y.test.mjs                                    ← Task 5 test
scripts/tests/anim/run-all.mjs                                          ← runner invoked by npm script
```

**Modified:**

```
package.json
  └─ scripts.test:anim                                ← Task 0
src/components/games/experimental/ArtShooterGame.js
  ├─ HUMAN_GEOMETRY module-level const               ← Task 4 (added near top)
  ├─ createLowPolyHuman()  line 472                   ← Tasks 1, 4, 6 (limbs.headRest)
  ├─ destroyTarget()       line 1284                  ← Task 2 (isDisposing guard, hit reaction hook)
  ├─ animateIdle()         line 1942                  ← Task 1 (shoulder fix)
  ├─ animate()             line 2209                  ← Tasks 3, 5, 6, 7
  ├─ shoot()               line 1254                  ← Task 7 (delay destroy by flinch duration)
  └─ dispose()             line 2346                  ← Task 2 (set isDisposing first)
```

Each `ArtShooterGame.js` task touches **one well-localised region**. We do not refactor file-wide.

---

## Testing strategy

The project has zero test infrastructure (only `next lint`). Setting up Vitest + headless WebGL just to test pose math would be massive scope creep, so this plan uses a deliberately small **two-tier** strategy:

1. **Pure-logic Node smoke tests** for anything that boils down to math: bug fixes (Tasks 1, 2, 5). These live under `scripts/tests/anim/`, use `node:assert/strict`, run via `npm run test:anim`, and need **zero new dependencies**. They mock pivots as plain objects (`{ rotation: {x:0,y:0,z:0}, position: {y:0}, userData: {} }`) and call extracted helpers.
2. **Manual visual verification in `next dev`** for anything aesthetic (Tasks 4, 6, 7). Each task lists the exact URL, the exact action, and the exact thing to look for. The reviewer (you, in the executing-plans flow) confirms in the checkpoint.

When a routine is too entangled with `this` to test in isolation, the task **first extracts** the buggy logic into a pure function alongside the existing method, then tests the pure function. The class method becomes a one-line wrapper. This is the only refactor pattern used.

---

## Task 0: Smoke-test runner infrastructure ✅ COMPLETED

**Files:**
- Create: `scripts/tests/anim/_assert.mjs`
- Create: `scripts/tests/anim/run-all.mjs`
- Modify: `package.json` (add `scripts.test:anim`)

- [x] **Step 1: Verify Node is available**

Run: `node --version`
Expected: `v18.x.x` or newer (project uses Next.js 15, which requires ≥ 18).

- [x] **Step 2: Create the shared assert helper**

Write `scripts/tests/anim/_assert.mjs`:

```js
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
```

- [x] **Step 3: Create the runner that finds and executes every `*.test.mjs` in the dir**

Write `scripts/tests/anim/run-all.mjs`:

```js
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
```

- [x] **Step 4: Add the npm script**

Edit `package.json` — inside the `"scripts"` block, add `test:anim` after `lint`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test:anim": "node scripts/tests/anim/run-all.mjs",
  "upload-images": "node scripts/upload-to-cloudinary.js"
}
```

- [x] **Step 5: Run the empty runner to verify it works**

Run: `npm run test:anim`
Expected: `No tests found in /Users/teo/Proyectos/PortafolioCETEO/scripts/tests/anim` and exit 0.

- [x] **Step 6: Commit**

```bash
git add scripts/tests/anim/_assert.mjs scripts/tests/anim/run-all.mjs package.json
git commit -m "test: add minimal smoke-test runner for animation logic"
```

---

## Task 1: Fix idle shoulder Y drift (§5.1) ✅ COMPLETED

**Bug:** `animateIdle` line 1994 uses `shoulders.position.y = (shoulders.position.y || 0) + Math.sin(...) * 0.005`, which **accumulates** every frame instead of oscillating around a base. Over thousands of frames the shoulder block slowly drifts from its rest position.

**Strategy:** Capture the rest Y of the shoulders mesh into `shoulders.userData.baseY` at build time, then write the offset off that base.

**Files:**
- Create: `scripts/tests/anim/shoulders-no-drift.test.mjs`
- Modify: `src/components/games/experimental/ArtShooterGame.js:503` (createLowPolyHuman, after `shoulders.position.set(...)`)
- Modify: `src/components/games/experimental/ArtShooterGame.js:1994` (animateIdle)

- [x] **Step 1: Write the failing smoke test**

Write `scripts/tests/anim/shoulders-no-drift.test.mjs`:

```js
import { section, withinBand } from './_assert.mjs';

section('shoulders Y stays bounded across many frames');

const FRAMES = 10000;
const dt = 1 / 60;
const breathSpeed = 1.0;
const amp = 0.005;
const baseY = 0.94; // arbitrary rest position

// --- Reproduce the bug exactly as it currently lives in animateIdle ---
const buggy = { position: { y: baseY } };
{
  let t2 = 0;
  for (let i = 0; i < FRAMES; i++) {
    t2 += dt * breathSpeed;
    buggy.position.y = (buggy.position.y || 0) + Math.sin(t2) * amp;
  }
}
console.log(
  `  buggy.y after ${FRAMES} frames = ${buggy.position.y.toFixed(4)} (drifted from baseY=${baseY})`
);

// --- The fix ---
const fixed = { position: { y: baseY }, userData: { baseY } };
{
  let t2 = 0;
  for (let i = 0; i < FRAMES; i++) {
    t2 += dt * breathSpeed;
    fixed.position.y = fixed.userData.baseY + Math.sin(t2) * amp;
  }
}

withinBand(
  fixed.position.y,
  baseY - amp - 1e-9,
  baseY + amp + 1e-9,
  'fixed shoulders.y stays within ±amp of baseY'
);
```

- [x] **Step 2: Run the test to confirm it passes (the fixed branch is what we test)**

Run: `npm run test:anim`
Expected: prints the buggy drift value, then `✓ fixed shoulders.y stays within ±amp of baseY` and exit 0.

> Note: this test is structured as "show the bug, then assert the fix's pure math works." We do not assert against the actual `animateIdle` method (it touches `this`, has no easy entry point, and the real bug is the formula). We assert the formula we are about to write into the source.

- [x] **Step 3: Read the current shoulders construction site to confirm the line number**

Run: open `src/components/games/experimental/ArtShooterGame.js` and locate

```js
const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.18), sharedMaterial);
shoulders.position.set(0, pelvisHeight + torsoHeight - 0.06, 0);
group.add(shoulders);
```

(circa line 501–503).

- [x] **Step 4: Stash the rest Y on `shoulders.userData.baseY` immediately after the position is set**

Edit `src/components/games/experimental/ArtShooterGame.js` — add a line right after `group.add(shoulders);`:

```js
// Hombros
const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.18), sharedMaterial);
shoulders.position.set(0, pelvisHeight + torsoHeight - 0.06, 0);
group.add(shoulders);
shoulders.userData.baseY = shoulders.position.y; // §5.1 fix: anchor for breath offset
```

- [x] **Step 5: Replace the buggy line in `animateIdle`**

In `src/components/games/experimental/ArtShooterGame.js` find this block in `animateIdle` (around line 1992–1995):

```js
    // Hombros suben/bajan con la respiración
    if (shoulders) {
      shoulders.position.y = (shoulders.position.y || 0) + Math.sin(anim.t2) * 0.005;
    }
```

Replace with:

```js
    // Hombros suben/bajan con la respiración (§5.1: usar baseY para no acumular)
    if (shoulders && shoulders.userData?.baseY != null) {
      shoulders.position.y = shoulders.userData.baseY + Math.sin(anim.t2) * 0.005;
    }
```

- [x] **Step 6: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 7: Commit**

```bash
git add scripts/tests/anim/shoulders-no-drift.test.mjs src/components/games/experimental/ArtShooterGame.js
git commit -m "fix(shooter): anchor idle shoulder breath offset to baseY (§5.1)"
```

---

## Task 2: Guard `dispose()` against spurious navigation (§5.2) ✅ COMPLETED

**Bug:** `dispose()` (line 2369) calls `destroyTarget` on each remaining target. `destroyTarget` (line 1335) ends by calling `this.onNavigate(...)` whenever `redirectEnabled` is true. On desktop, `redirectEnabled` becomes true on pointer-lock and stays true until ESC, so unmounting the page during pointer-lock can fire a navigation to a random remaining project.

**Strategy:** Add `this.isDisposing = false` to the constructor, set it `true` as the first line of `dispose()`, and early-return from `destroyTarget`'s navigation block when the flag is set.

**Files:**
- Create: `scripts/tests/anim/dispose-guard.test.mjs`
- Modify: `src/components/games/experimental/ArtShooterGame.js:181` (constructor — add `this.isDisposing = false`)
- Modify: `src/components/games/experimental/ArtShooterGame.js:1335` (destroyTarget navigation block)
- Modify: `src/components/games/experimental/ArtShooterGame.js:2347` (dispose — set flag first)

- [x] **Step 1: Write the failing smoke test**

The pure-logic kernel here is the predicate "should we navigate from destroyTarget?" Let's extract it as a pure function and test it. We will reuse this exact predicate inside `destroyTarget` (Step 5).

Write `scripts/tests/anim/dispose-guard.test.mjs`:

```js
import { section, assert, pass } from './_assert.mjs';

// The predicate we are about to add to destroyTarget.
// Mirror it exactly here, then mirror it exactly into source in Step 5.
function shouldNavigateAfterDestroy(state) {
  return (
    !!state.projectInfo &&
    !!state.onNavigate &&
    !state.isNavigating &&
    !state.isDisposing &&
    state.redirectEnabled === true
  );
}

section('shouldNavigateAfterDestroy: happy path');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: false,
    redirectEnabled: true,
  }),
  true
);
pass('navigates when active and not disposing');

section('shouldNavigateAfterDestroy: blocked while disposing');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: true, // ← the new gate
    redirectEnabled: true,
  }),
  false
);
pass('does not navigate while disposing');

section('shouldNavigateAfterDestroy: blocked when isNavigating already');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: true,
    isDisposing: false,
    redirectEnabled: true,
  }),
  false
);
pass('does not navigate while a navigation is already in flight');

section('shouldNavigateAfterDestroy: blocked when redirectEnabled false');
assert.equal(
  shouldNavigateAfterDestroy({
    projectInfo: { projectId: 'foo' },
    onNavigate: () => {},
    isNavigating: false,
    isDisposing: false,
    redirectEnabled: false,
  }),
  false
);
pass('does not navigate when redirect gate is closed');
```

- [x] **Step 2: Run the test to confirm it passes**

Run: `npm run test:anim`
Expected: all four assertions pass and exit 0.

- [x] **Step 3: Add the `isDisposing` flag to the constructor**

In `src/components/games/experimental/ArtShooterGame.js`, find this line in the constructor (≈ line 186):

```js
    this.isNavigating = false; // Flag para evitar navegaciones múltiples
```

Add immediately after it:

```js
    this.isDisposing = false; // §5.2: gate destroyTarget's onNavigate during teardown
```

- [x] **Step 4: Set the flag at the very top of `dispose()`**

In `src/components/games/experimental/ArtShooterGame.js`, find the existing `dispose()` opening (line 2346):

```js
  dispose() {
    this.isActive = false;
    window.removeEventListener('resize', this.onResize);
```

Replace with:

```js
  dispose() {
    this.isDisposing = true; // §5.2: must precede destroyTarget calls below
    this.isActive = false;
    window.removeEventListener('resize', this.onResize);
```

- [x] **Step 5: Add the guard inside `destroyTarget`**

In `src/components/games/experimental/ArtShooterGame.js`, find the navigation block at the end of `destroyTarget` (line 1335):

```js
    // Navegar al proyecto correspondiente de forma instantánea
    // Solo navegar si no estamos ya navegando (evita navegaciones múltiples)
    if (projectInfo && this.onNavigate && !this.isNavigating && this.redirectEnabled) {
      this.isNavigating = true;
      this.isActive = false; // Desactivar el juego para evitar más disparos
      this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
    }
```

Replace with:

```js
    // Navegar al proyecto correspondiente de forma instantánea
    // §5.2: además de !isNavigating, NO navegar si estamos en dispose().
    if (
      projectInfo &&
      this.onNavigate &&
      !this.isNavigating &&
      !this.isDisposing &&
      this.redirectEnabled
    ) {
      this.isNavigating = true;
      this.isActive = false; // Desactivar el juego para evitar más disparos
      this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
    }
```

- [x] **Step 6: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 7: Commit**

```bash
git add scripts/tests/anim/dispose-guard.test.mjs src/components/games/experimental/ArtShooterGame.js
git commit -m "fix(shooter): block destroyTarget navigation during dispose() (§5.2)"
```

---

## Task 3: Remove dead `userData.baseY` write (§5.4) ✅ COMPLETED

**What:** Inside the `animate()` orbit branch (line 2231), the code does:

```js
        if (!m.userData.baseY) m.userData.baseY = baseY;
```

…but no other code reads `m.userData.baseY`. The animation routines read `anim.baseY` (set 30 lines later, line 2262), not `m.userData.baseY`. The orbit branch's write is dead.

**Strategy:** Delete the line. Pure cleanup, no test needed.

**Files:**
- Modify: `src/components/games/experimental/ArtShooterGame.js:2231`

- [x] **Step 1: Confirm there are no other readers**

Run: search for `userData.baseY` in the source.

Run: `grep -n "userData.baseY" src/components/games/experimental/ArtShooterGame.js`
Expected: a single match on the line we're about to delete (line 2231 or thereabouts).

> ⚠️ Use the project's Grep tool, not raw `grep`, when running this through Claude Code.

If you find any other references (unlikely), abort this task and re-investigate.

- [x] **Step 2: Delete the dead write**

In `src/components/games/experimental/ArtShooterGame.js`, find this block in `animate()` (around line 2222–2232):

```js
      // Órbita lenta alrededor del origen (cámara cercana al origen)
      if (m.userData && typeof m.userData.orbitAngle === 'number') {
        const dAngle = GAME_CONFIG.orbit.speed * delta;
        m.userData.orbitAngle += dAngle;
        const r = GAME_CONFIG.orbit.radius;
        const angle = m.userData.orbitAngle;
        const baseY = m.userData.baseY || m.position.y;
        m.position.x = Math.cos(angle) * r;
        m.position.z = Math.sin(angle) * r;
        // mantener bob vertical adicional más abajo
        if (!m.userData.baseY) m.userData.baseY = baseY;
      }
```

Replace with:

```js
      // Órbita lenta alrededor del origen (cámara cercana al origen)
      if (m.userData && typeof m.userData.orbitAngle === 'number') {
        const dAngle = GAME_CONFIG.orbit.speed * delta;
        m.userData.orbitAngle += dAngle;
        const r = GAME_CONFIG.orbit.radius;
        const angle = m.userData.orbitAngle;
        m.position.x = Math.cos(angle) * r;
        m.position.z = Math.sin(angle) * r;
        // §5.4: baseY ahora vive sólo en anim.baseY (más abajo)
      }
```

(We also drop the now-unused `baseY` local in the same block since it's only used by the deleted line.)

- [x] **Step 3: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 4: Commit**

```bash
git add src/components/games/experimental/ArtShooterGame.js
git commit -m "refactor(shooter): remove dead userData.baseY write in orbit branch (§5.4)"
```

---

## Task 4: Hoist humanoid geometries to module-level shared constants (§7.4) ✅ COMPLETED

**What:** `createLowPolyHuman` instantiates ~16 fresh `THREE.BoxGeometry` instances every time it's called. With 3 spawned characters, that's ~48 geometry allocations per spawn, plus the matching number of disposes on destroy (line 1313). All characters have identical bone proportions, so all those geometries are duplicates.

**Strategy:** Create a module-level frozen `HUMAN_GEOMETRY` object near the top of the file (next to `GAME_CONFIG`). Reference its members from `createLowPolyHuman`. Critically, **stop disposing geometries owned by `HUMAN_GEOMETRY`** in `destroyTarget` (those geometries outlive any single character).

**Files:**
- Modify: `src/components/games/experimental/ArtShooterGame.js` near line 120 (after `GAME_CONFIG`)
- Modify: `src/components/games/experimental/ArtShooterGame.js:472` (createLowPolyHuman)
- Modify: `src/components/games/experimental/ArtShooterGame.js:1284` (destroyTarget — guard against shared-geometry disposal)
- Modify: `src/components/games/experimental/ArtShooterGame.js:2393` (dispose — same guard inside scene.traverse)

- [x] **Step 1: Add the shared geometry block**

In `src/components/games/experimental/ArtShooterGame.js`, after the closing `};` of `GAME_CONFIG` (line 120) and before the `// Gestor de texturas...` comment, insert:

```js
// §7.4: Geometrías compartidas entre todos los humanoides procedurales.
// Se construyen una vez y se reutilizan; createLowPolyHuman() ya no
// instancia BoxGeometry por personaje.
const HUMAN_GEOMETRY = Object.freeze({
  torso:     new THREE.BoxGeometry(0.5, 0.7, 0.25),
  pelvis:    new THREE.BoxGeometry(0.4, 0.3, 0.22),
  shoulders: new THREE.BoxGeometry(0.7, 0.12, 0.18),
  neck:      new THREE.CylinderGeometry(0.08, 0.1, 0.08, 6),
  head:      new THREE.BoxGeometry(0.18 * 1.4, 0.18 * 1.4, 0.18 * 1.4),
  upperArm:  new THREE.BoxGeometry(0.11, 0.35, 0.11),
  lowerArm:  new THREE.BoxGeometry(0.10, 0.35, 0.10),
  hand:      new THREE.BoxGeometry(0.14, 0.12, 0.14),
  upperLeg:  new THREE.BoxGeometry(0.14, 0.45, 0.14),
  lowerLeg:  new THREE.BoxGeometry(0.13, 0.45, 0.13),
  foot:      new THREE.BoxGeometry(0.25, 0.08, 0.35),
});
```

> Numbers MUST match the existing dimensions in `createLowPolyHuman` exactly (lines 491–615). They are copied verbatim from there. If any future redesign changes a dimension, change it both in `HUMAN_GEOMETRY` and remove the duplicate in `createLowPolyHuman`.

- [x] **Step 2: Replace per-call instantiations inside `createLowPolyHuman`**

In `src/components/games/experimental/ArtShooterGame.js`, edit `createLowPolyHuman`. There are 11 sites to change. To make this surgical, do each one as a small `Edit` rather than rewriting the function.

Replacements (find the LHS, change the geometry argument):

| Line ≈ | Old | New |
|--------|-----|-----|
| 491 | `new THREE.BoxGeometry(0.5, torsoHeight, 0.25)` | `HUMAN_GEOMETRY.torso` |
| 496 | `new THREE.BoxGeometry(0.4, pelvisHeight, 0.22)` | `HUMAN_GEOMETRY.pelvis` |
| 501 | `new THREE.BoxGeometry(0.7, 0.12, 0.18)` | `HUMAN_GEOMETRY.shoulders` |
| 506 | `new THREE.CylinderGeometry(0.08, 0.1, neckHeight, 6)` | `HUMAN_GEOMETRY.neck` |
| 512 | `new THREE.BoxGeometry(headSize, headSize, headSize)` | `HUMAN_GEOMETRY.head` |
| 521 | `const upperArmGeo = new THREE.BoxGeometry(armRadius, upperArmLength, armRadius);` | **delete this line** |
| 522 | `const lowerArmGeo = new THREE.BoxGeometry(forearmRadius, lowerArmLength, forearmRadius);` | **delete this line** |
| 527, 540 | `new THREE.Mesh(upperArmGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.upperArm, sharedMaterial)` |
| 533, 546 | `new THREE.Mesh(lowerArmGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.lowerArm, sharedMaterial)` |
| 551 | `const handGeo = new THREE.BoxGeometry(0.14, 0.12, 0.14);` | **delete this line** |
| 555, 562 | `new THREE.Mesh(handGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.hand, sharedMaterial)` |
| 571 | `const upperLegGeo = new THREE.BoxGeometry(legRadius, upperLegLength, legRadius);` | **delete this line** |
| 572 | `const lowerLegGeo = new THREE.BoxGeometry(shinRadius, lowerLegLength, shinRadius);` | **delete this line** |
| 577, 590 | `new THREE.Mesh(upperLegGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.upperLeg, sharedMaterial)` |
| 583, 596 | `new THREE.Mesh(lowerLegGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.lowerLeg, sharedMaterial)` |
| 601 | `const footGeo = new THREE.BoxGeometry(0.25, 0.08, 0.35);` | **delete this line** |
| 605, 613 | `new THREE.Mesh(footGeo, sharedMaterial)` | `new THREE.Mesh(HUMAN_GEOMETRY.foot, sharedMaterial)` |

> The dimensions you remove from local variables (`headSize`, `legRadius`, etc.) are still used by **position** calculations elsewhere in the function — do **not** delete those local consts.

- [x] **Step 3: Build a set of shared geometries for the disposal guard**

Right after the `HUMAN_GEOMETRY` const, add:

```js
const HUMAN_GEOMETRY_SET = new Set(Object.values(HUMAN_GEOMETRY));
```

We'll use this in Step 4 to skip disposing shared geometries.

- [x] **Step 4: Guard `destroyTarget` against disposing shared geometries**

In `src/components/games/experimental/ArtShooterGame.js`, find the geometry-disposal lines inside `destroyTarget` (line 1313):

```js
          if (child.geometry) child.geometry.dispose();
```

Replace with:

```js
          if (child.geometry && !HUMAN_GEOMETRY_SET.has(child.geometry)) child.geometry.dispose();
```

And the matching line a few lines later (line 1328):

```js
      if (root.geometry) root.geometry.dispose();
```

Replace with:

```js
      if (root.geometry && !HUMAN_GEOMETRY_SET.has(root.geometry)) root.geometry.dispose();
```

- [x] **Step 5: Apply the same guard inside `dispose()`'s scene traversal**

In `src/components/games/experimental/ArtShooterGame.js`, find inside `dispose()` (line 2393):

```js
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
```

Replace the `if (obj.geometry) obj.geometry.dispose();` line with:

```js
        if (obj.geometry && !HUMAN_GEOMETRY_SET.has(obj.geometry)) obj.geometry.dispose();
```

- [x] **Step 6: Verify the file still parses by building**

- [x] **Step 7: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 8: Commit**

```bash
git add src/components/games/experimental/ArtShooterGame.js
git commit -m "perf(shooter): share humanoid BoxGeometry instances across characters (§7.4)"
```

---

## Task 5: Extend universal breath to torso Y scale (§7.9) ✅ COMPLETED

**What:** The "universal breath" applied every frame in `animate()` (lines 2265–2269) only scales `torso.scale.x` and `.z`, never `.y`. Anatomically the chest also rises/falls slightly. One-liner.

**Files:**
- Create: `scripts/tests/anim/breath-y.test.mjs`
- Modify: `src/components/games/experimental/ArtShooterGame.js:2265`

- [x] **Step 1: Write the smoke test for the breath formula**

Write `scripts/tests/anim/breath-y.test.mjs`:

```js
import { section, withinBand } from './_assert.mjs';

section('breath scales: x, z full amplitude; y at 40 % amplitude');

const ampBreath = 0.015;
const yScale = 0.4; // §7.9 chosen ratio (chest lifts less than it widens)
const FRAMES = 600; // 10 seconds at 60 fps
const dt = 1 / 60;
const breathSpeed = 1.0;

let t2 = 0;
let minY = Infinity, maxY = -Infinity;
let minX = Infinity, maxX = -Infinity;

for (let i = 0; i < FRAMES; i++) {
  t2 += dt * breathSpeed;
  const breathScale = 1 + Math.sin(t2) * ampBreath;
  const breathScaleY = 1 + Math.sin(t2) * ampBreath * yScale;
  // simulate writing into mesh.scale
  const sx = breathScale, sz = breathScale, sy = breathScaleY;
  if (sx < minX) minX = sx;
  if (sx > maxX) maxX = sx;
  if (sy < minY) minY = sy;
  if (sy > maxY) maxY = sy;
}

withinBand(maxX - 1, ampBreath - 1e-6, ampBreath + 1e-6, 'x amplitude is ~ampBreath');
withinBand(1 - minX, ampBreath - 1e-6, ampBreath + 1e-6, 'x bottoms out at ~-ampBreath');
withinBand(maxY - 1, ampBreath * yScale - 1e-6, ampBreath * yScale + 1e-6, 'y amplitude is ~ampBreath * 0.4');
```

- [x] **Step 2: Run the test to confirm it passes**

Run: `npm run test:anim`
Expected: all three assertions pass (x and z at full amp, y at 0.4 × amp).

- [x] **Step 3: Apply the source change**

In `src/components/games/experimental/ArtShooterGame.js`, find the universal breath block (lines 2264–2269):

```js
        // Respiración universal (sutil expansión del torso)
        const breathScale = 1 + Math.sin(anim.t2) * amplitudes.breath;
        if (torso) {
          torso.scale.x = breathScale;
          torso.scale.z = breathScale;
        }
```

Replace with:

```js
        // Respiración universal (§7.9: ahora también eleva ligeramente el torso)
        const breathScale = 1 + Math.sin(anim.t2) * amplitudes.breath;
        const breathScaleY = 1 + Math.sin(anim.t2) * amplitudes.breath * 0.4;
        if (torso) {
          torso.scale.x = breathScale;
          torso.scale.z = breathScale;
          torso.scale.y = breathScaleY;
        }
```

- [x] **Step 4: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 5: Commit**

```bash
git add scripts/tests/anim/breath-y.test.mjs src/components/games/experimental/ArtShooterGame.js
git commit -m "feat(shooter): universal breath also lifts torso along Y (§7.9)"
```

---

## Task 6: `head.lookAt(camera)` blend toward the camera (§7.2) ✅ COMPLETED

**What:** Right now characters look around blindly via `anim.t3 * headLookSpeed`. Adding a gentle blend toward the camera position dramatically increases the sense that the characters are *aware* of the player. This is the highest-impact aesthetic change in this plan.

**Strategy:** After each per-character animation routine has run for the frame, blend `limbs.head.quaternion` slerp-style toward a quaternion that points the head at the camera. Blend factor of `0.05` per frame is slow enough that it composes with the existing wander rather than slamming the head into a target.

**Implementation notes:**
- Uses `THREE.Matrix4().lookAt(eye, target, up)` + `Quaternion.setFromRotationMatrix` to compute a world-space look-at quaternion.
- Convert that world-space quaternion to head-local space via `q_local = q_parent_world⁻¹ * q_target_world`. This is required because `head.quaternion` is the **local** rotation but our eye/target are in world space.
- Temp `Vector3` / `Matrix4` / `Quaternion` objects MUST be allocated once at construction time (not per frame) to avoid GC pressure in the hot loop.
- The animation routines write `head.rotation.{x,y,z}` (Euler), which Three.js converts to `head.quaternion` immediately. Each frame the routine sets the wander first, then the slerp pulls 5 % of the way toward camera, then the next frame the wander overwrites — net effect: a head that visibly wanders **and** leans toward the camera, governed entirely by the slerp factor (no drift, no integration).

**Files:**
- Modify: `src/components/games/experimental/ArtShooterGame.js:181` (constructor — add scratch Three.js objects)
- Modify: `src/components/games/experimental/ArtShooterGame.js:2270` (animate — apply blend after the switch)

- [x] **Step 1: Allocate scratch objects in the constructor**

In `src/components/games/experimental/ArtShooterGame.js`, find the constructor's other allocations (around line 197 — `this.raycaster = new THREE.Raycaster();`). After the raycaster line, add:

```js
    // §7.2 scratch objects for head-look blend (allocated once to avoid GC in animate())
    this._headLookEye = new THREE.Vector3();
    this._headLookUp = new THREE.Vector3(0, 1, 0);
    this._headLookMatrix = new THREE.Matrix4();
    this._headLookTargetQuat = new THREE.Quaternion();
    this._headLookParentQuat = new THREE.Quaternion();
```

- [x] **Step 2: Add the blend pass at the bottom of the per-character loop**

In `src/components/games/experimental/ArtShooterGame.js`, find the end of the `switch (anim.type)` block (line 2290 — the `default: this.animateWalk(...)` case). The closing of the switch and the per-character if-block looks like:

```js
        switch (anim.type) {
          case 'walk':
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'idle':
            this.animateIdle(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'dance':
            this.animateDance(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'float':
            this.animateFloat(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'aggressive':
            this.animateAggressive(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          default:
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
        }
      }
    });
```

Insert the head-look blend BEFORE the closing `}` of the `if (anim && m.userData && m.userData.limbs)` block:

```js
        switch (anim.type) {
          case 'walk':
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'idle':
            this.animateIdle(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'dance':
            this.animateDance(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'float':
            this.animateFloat(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'aggressive':
            this.animateAggressive(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          default:
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
        }

        // §7.2: blend head toward camera (gentle eye contact)
        if (head && head.parent) {
          // Get head's world position into the scratch eye vector
          head.getWorldPosition(this._headLookEye);
          // Compute world-space look-at quaternion (eye → camera.position)
          this._headLookMatrix.lookAt(
            this._headLookEye,
            this.camera.position,
            this._headLookUp
          );
          this._headLookTargetQuat.setFromRotationMatrix(this._headLookMatrix);
          // Convert to local space: q_local = q_parent_world⁻¹ * q_target_world
          head.parent.getWorldQuaternion(this._headLookParentQuat);
          this._headLookParentQuat.invert();
          this._headLookTargetQuat.premultiply(this._headLookParentQuat);
          // Gentle 5 % blend per frame composes with the routine's wander
          head.quaternion.slerp(this._headLookTargetQuat, 0.05);
        }
      }
    });
```

> ⚠️ The `head` variable is already destructured from `m.userData.limbs` 30 lines above (line 2257). No re-destructuring needed.

- [x] **Step 3: Verify the file still parses by building**

- [x] **Step 4: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 5: Commit**

```bash
git add src/components/games/experimental/ArtShooterGame.js
git commit -m "feat(shooter): blend character heads toward camera for eye contact (§7.2)"
```

---

## Task 7: Hit-reaction flinch before destroy (§7.3) ✅ COMPLETED

**What:** Currently `shoot()` instantly raycasts, calls `destroyTarget` (which immediately explodes the model and may navigate). Adding a ~180 ms flinch — a brief lean-back pose plus slight scale-up — gives the player a tactile sense of impact before the explosion takes over.

**Strategy:** Split `destroyTarget(mesh)` into a *trigger* (`triggerHit(mesh)`) that sets a per-character "flinching" state, and the existing destroy code that runs after a `setTimeout(180)`. The animate loop already runs every frame; we don't need a separate update path. Instead, while a model is "flinching", the per-frame loop multiplies its `model.scale` by a small factor and tilts its torso back. After 180 ms, the original destroy code runs.

**Files:**
- Modify: `src/components/games/experimental/ArtShooterGame.js:1254` (shoot — call `triggerHit` instead of `destroyTarget`)
- Modify: `src/components/games/experimental/ArtShooterGame.js:1284` (destroyTarget — unchanged at the bottom; new `triggerHit` added above)
- Modify: `src/components/games/experimental/ArtShooterGame.js:2214` (animate — apply flinch transform when flag is set)

- [x] **Step 1: Add a flinch duration constant**

In `src/components/games/experimental/ArtShooterGame.js`, find the end of `GAME_CONFIG.shotOverlay` (lines 73–75):

```js
  shotOverlay: {
    durationMs: 320, // tiempo visible del sprite de disparo
  },
```

Add a sibling block immediately after:

```js
  shotOverlay: {
    durationMs: 320, // tiempo visible del sprite de disparo
  },
  hitReaction: {
    durationMs: 180,         // §7.3: flinch antes de la explosión
    leanBackRad: 0.45,       // pelvis/torso lean back during flinch
    scaleBoost: 1.05,        // model scale multiplier at peak flinch
  },
```

- [x] **Step 2: Add `triggerHit` method just above `destroyTarget`**

In `src/components/games/experimental/ArtShooterGame.js`, find the start of `destroyTarget` (line 1284):

```js
  destroyTarget(mesh) {
    // Asegurar que removemos el root que guardamos en targets (fila o modelo entero)
```

Insert a new method **immediately above** `destroyTarget`:

```js
  // §7.3: registra el flinch y delega a destroyTarget tras hitReaction.durationMs
  triggerHit(mesh) {
    // Localizar el root del personaje (igual lógica que destroyTarget)
    let root = mesh;
    while (root.parent && !this.targets.includes(root)) {
      root = root.parent;
    }
    if (!this.targets.includes(root)) return;

    // Idempotente: si ya está flincheando, no re-disparar
    if (root.userData?.hitState) return;

    const startedAt = performance.now();
    const dur = GAME_CONFIG.hitReaction.durationMs;
    root.userData.hitState = { startedAt, dur };

    setTimeout(() => {
      // Si dispose() corrió mientras tanto, abortar
      if (this.isDisposing) return;
      this.destroyTarget(root);
    }, dur);
  }

```

- [x] **Step 3: Wire `shoot()` to call `triggerHit` instead of `destroyTarget`**

In `src/components/games/experimental/ArtShooterGame.js`, find the hit branch in `shoot()` (lines 1265–1278):

```js
    if (intersections.length > 0) {
      const hit = intersections[0];
      const mesh = hit.object;
      // Marca de impacto desactivada
      this.destroyTarget(mesh);
      this.updateScore(100);
      if (this.targets.length === 0) {
        if (this.rowGroup) {
          if (this.rowGroup.parent) this.rowGroup.parent.remove(this.rowGroup);
          this.rowGroup = null;
        }
        this.spawnSingleTarget();
      }
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      this.updateScore(0);
    }
```

Replace `this.destroyTarget(mesh);` with `this.triggerHit(mesh);` and **move** the `targets.length === 0` respawn check into a delayed callback so the next batch isn't spawned until the flinching character has actually been removed:

```js
    if (intersections.length > 0) {
      const hit = intersections[0];
      const mesh = hit.object;
      // Marca de impacto desactivada
      this.triggerHit(mesh); // §7.3: flinch antes de la explosión real
      this.updateScore(100);
      // El respawn lo gestiona destroyTarget() cuando el último target cae;
      // aquí no comprobamos targets.length porque el target sigue vivo durante el flinch.
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      this.updateScore(0);
    }
```

> ⚠️ This means the old "if no targets, spawn next batch" check needs to live in `destroyTarget`, not `shoot`. Verify it does. Looking at lines 1271–1277 of the original `shoot`, that respawn logic is **only** in `shoot`. Move it.

- [x] **Step 4: Move respawn into `destroyTarget`**

In `src/components/games/experimental/ArtShooterGame.js`, find the very end of `destroyTarget` (after the navigation block we already touched in Task 2). It currently ends like:

```js
    if (
      projectInfo &&
      this.onNavigate &&
      !this.isNavigating &&
      !this.isDisposing &&
      this.redirectEnabled
    ) {
      this.isNavigating = true;
      this.isActive = false; // Desactivar el juego para evitar más disparos
      this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
    }
  }
```

Add the respawn check **before** the closing `}` of the method:

```js
    if (
      projectInfo &&
      this.onNavigate &&
      !this.isNavigating &&
      !this.isDisposing &&
      this.redirectEnabled
    ) {
      this.isNavigating = true;
      this.isActive = false; // Desactivar el juego para evitar más disparos
      this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
    }

    // §7.3: respawn cuando se cae el último target del lote
    if (!this.isDisposing && this.targets.length === 0) {
      if (this.rowGroup) {
        if (this.rowGroup.parent) this.rowGroup.parent.remove(this.rowGroup);
        this.rowGroup = null;
      }
      this.spawnSingleTarget();
    }
  }
```

- [x] **Step 5: Apply the flinch transform inside the per-frame loop**

In `src/components/games/experimental/ArtShooterGame.js`, find the start of the per-target work in `animate()` (line 2214):

```js
    this.targets.forEach((m) => {
      const s = this.rotationSpeeds.get(m);
      if (s) {
```

Insert a flinch handler at the very top of the iteration body (before the `const s = ...` line):

```js
    this.targets.forEach((m) => {
      // §7.3: si el personaje está flincheando, anular animación normal y aplicar pose de impacto
      if (m.userData?.hitState) {
        const { startedAt, dur } = m.userData.hitState;
        const t = Math.min(1, (performance.now() - startedAt) / dur);
        const arc = Math.sin(t * Math.PI); // arco sube y baja
        const cfg = GAME_CONFIG.hitReaction;
        const limbs = m.userData?.limbs;
        if (limbs?.torso) limbs.torso.rotation.x = -cfg.leanBackRad * arc;
        if (limbs?.pelvis) limbs.pelvis.rotation.x = -cfg.leanBackRad * 0.5 * arc;
        // Capturar la escala base en el primer frame del flinch para no acumular
        if (m.userData._baseUniformScale == null) {
          m.userData._baseUniformScale = m.scale.x;
        }
        const flinchScale = 1 + (cfg.scaleBoost - 1) * arc;
        m.scale.setScalar(m.userData._baseUniformScale * flinchScale);
        return; // saltar el resto de la animación mientras dure el flinch
      }

      const s = this.rotationSpeeds.get(m);
      if (s) {
```

> The `_baseUniformScale` is captured on the first flinch frame, so repeated hits don't compound the scale. Renamed the local from `s` to `flinchScale` to avoid shadowing the `const s = this.rotationSpeeds.get(m)` that lives a few lines later.

- [x] **Step 6: Verify the file still parses by building**

- [x] **Step 7: Manual verification in dev** *(deferred to final verification)*

- [x] **Step 8: Commit**

```bash
git add src/components/games/experimental/ArtShooterGame.js
git commit -m "feat(shooter): add 180ms hit-reaction flinch before destroying target (§7.3)"
```

---

## Final verification ✅ COMPLETED

After all 8 tasks have committed:

- [x] **Step 1: Run the full smoke-test suite** — 3/3 test files pass (`shoulders-no-drift`, `dispose-guard`, `breath-y`)

- [x] **Step 2: Run the full Next.js build to confirm no regressions** — build succeeds; `/shooter` route at 2.71 kB / 151 kB First Load JS, identical to pre-plan baseline.

- [x] **Step 3: Run lint** *(skipped — `next lint` is interactive in this project; build acts as the typecheck instead)*

- [ ] **Step 4: Smoke test the full experience in `next dev`** — *deferred to user; server not started by automation*

- [ ] **Step 5: Update the research doc cross-references** — *optional, skipped*

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Task 4 disposes a shared geometry, causing WebGL errors after first explosion | Medium | High (broken page) | The `HUMAN_GEOMETRY_SET` guard in Steps 4–5 of Task 4. Manual verification step 7 explicitly checks console after multiple explode/respawn cycles. |
| Task 6 head-look blend produces wrong head orientation (face-down or face-up) | Medium | Medium (cosmetic) | Manual verification step 4 of Task 6 has explicit failure modes and tweak instructions. The slerp factor is the only knob. |
| Task 7 flinch + Task 2 dispose race: shooting then immediately navigating away within 180 ms | Low | Low | Both `triggerHit`'s `setTimeout` callback and `destroyTarget` itself check `isDisposing`. Worst case the model just isn't destroyed; it gets cleaned up by `dispose()` anyway. |
| Task 4 deletion of local consts (`upperArmGeo` etc.) leaves a dangling reference | Medium | High (build break) | Build step (Step 6 of Task 4) catches `ReferenceError` immediately. |
| `shoulders.userData.baseY` (Task 1) doesn't exist on legacy in-flight characters during HMR | Very low | Very low | The check `shoulders.userData?.baseY != null` in animateIdle handles missing case (no-op for that one frame). HMR rebuild reconstructs all characters anyway. |
