# Experimental Shooter — Character Animation Deep Dive

> Research and improvement notes for the procedural low-poly character animation
> system that powers the **experimental art shooter** at `/shooter`.
>
> All file:line references point to
> `src/components/games/experimental/ArtShooterGame.js` (≈2469 lines) unless
> otherwise stated. The Next.js page that mounts the game lives at
> `src/components/games/experimental/ExperimentalShooter.js:7` and is no more
> than a thin React wrapper around the vanilla-Three.js `ArtShooterGame` class.

---

## 1. High-level architecture

The animation system has **no skinned meshes, no GLTF, no `AnimationMixer`,
no keyframes**. Every character is a hand-built skeleton of `THREE.Object3D`
pivots with `THREE.Mesh` cubes parented to each "bone". Animation is purely
procedural: each frame, a switch statement selects one of five
`animateXxx()` routines, which write trigonometric values directly into
`pivot.rotation.{x,y,z}` and `mesh.scale`.

```
ArtShooterGame.spawnSingleTarget()
   └─► createLowPolyHuman(material)        ← builds rig, registers state
          ├─► group (the character root)
          ├─► userData.limbs               ← references to all pivots/meshes
          └─► animationStates.set(group, …) ← phase, speed, type, baseY

ArtShooterGame.animate()  (per frame, requestAnimationFrame)
   └─► for each target m
          ├─► spin (rotationSpeeds)
          ├─► orbit around origin (userData.orbitAngle)
          ├─► advance phases anim.t, anim.t2, anim.t3
          ├─► universal breath scale on torso
          └─► switch (anim.type) → animateWalk / Idle / Dance / Float / Aggressive
```

Three characters spawn at once (lines 982, 1025), spaced 120° apart on a
circle of radius `GAME_CONFIG.orbit.radius = 4.0`. Each gets a random
animation type, a random phase, a random speed jitter, and a random art-
piece texture mapped onto the **shared** standard material clone.

---

## 2. The rig (`createLowPolyHuman`, line 472)

### 2.1 Body proportions (lines 480–488)

| Bone           | Length |
|----------------|--------|
| torso          | 0.70   |
| pelvis         | 0.30   |
| neck           | 0.08   |
| head (radius)  | 0.18   |
| upper arm      | 0.35   |
| lower arm      | 0.35   |
| upper leg      | 0.45   |
| lower leg      | 0.45   |

After construction the whole group is scaled so the bounding box is
**2.6 m tall** (line 628), considerably bigger than a normal humanoid —
the comment says "antes ~1.8" so this was bumped up for visibility.

### 2.2 Bone hierarchy

The skeleton is built from primitive `BoxGeometry` meshes parented to
empty `Object3D` "pivots". Pivots are the things rotated by the
animation routines; the meshes are visual children that inherit the
transform.

```
group  (character root, scaled to height 2.6)
├─ torso       (Box 0.50×0.70×0.25)        — line 491
├─ pelvis      (Box 0.40×0.30×0.22)        — line 496
├─ shoulders   (Box 0.70×0.12×0.18)        — line 501
├─ neck        (Cylinder)                  — line 506
├─ head        (Box headSize³)             — line 512
│
├─ lShoulderPivot                          — line 524
│   ├─ lUpperArm  (Box)
│   └─ lElbowPivot                         — line 530
│       ├─ lLowerArm
│       └─ lWristPivot                     — line 552
│           └─ lHand
├─ rShoulderPivot  …  (mirror)
│
├─ lHipPivot                               — line 574
│   ├─ lUpperLeg
│   └─ lKneePivot                          — line 580
│       ├─ lLowerLeg
│       └─ lAnklePivot                     — line 602
│           └─ lFoot
└─ rHipPivot   …  (mirror)
```

After build:

* The group is centred on XZ via a `Box3` measurement (lines 620–623).
* `targetHeight = 2.6` is enforced by uniform scale (line 628).
* `castShadow = true` is set on every mesh (line 634), but
  `quality.castShadows` is `false` for both desktop and mobile profiles
  (lines 59 and 68), so shadows are never actually rendered.
* Every pivot reference is stashed in `group.userData.limbs` (line 641)
  for the animation routines to grab later.

### 2.3 Per-character animation state (line 666)

```js
this.animationStates.set(group, {
  t:  Math.random() * Math.PI * 2,            // primary phase
  t2: Math.random() * Math.PI * 2,            // breath / secondary
  t3: Math.random() * Math.PI * 2,            // head-look / tertiary
  speed:  1.0 + (Math.random() - 0.5) * 0.8,  // 0.6–1.4
  baseY:  group.position.y,
  type:   <random 'walk'|'idle'|'dance'|'float'|'aggressive'>,
  headLookSpeed: 0.3 + Math.random() * 0.4,
  breathSpeed:   0.8 + Math.random() * 0.4,
  swayPhase:     Math.random() * Math.PI * 2,
});
```

The state is held in a `WeakMap` (line 240) so it's garbage-collected
automatically when the character group is destroyed.

Two important consequences:

1. **Every character starts at a unique point in its cycle**, so the
   three characters never look "in sync" even when they share the same
   animation type.
2. **Animation type is locked at creation time** — there is no state
   machine and the type never changes for the lifetime of a character.

### 2.4 Material model

Characters share **one** `THREE.MeshStandardMaterial` (line 987) that is
**cloned per character** (line 994) and given a different artwork map.
All limbs of a single character share that one cloned material instance.
This means the texture of one of Camilo's portfolio pieces is wrapped
around every cube of the figure (head, torso, hands, feet, …). The
180° rotation in `TextureManager.load` (line 154) is a deliberate fix
for upside-down artwork.

`flatShading` is forced on the shared material the first time
`createLowPolyHuman` is called (lines 475–478). This is the only place
the shared material is mutated, and the `needsUpdate` flag is set.

---

## 3. The five animation routines

All five take the same signature:

```js
animateXxx(anim, amplitudes, limbs, model, baseY)
```

and write absolute values into `pivot.rotation.*`, `mesh.scale.*`,
`mesh.rotation.*`, or `model.position.y`. Because the values are
overwritten each frame, the previous frame's transforms are
discarded (no integration, no easing).

`amplitudes` comes from `GAME_CONFIG.animation.amplitudes` (lines 81–104):

| Key              | Value | Used by |
|------------------|-------|---------|
| arm              | 0.5   | walk |
| leg              | 0.5   | walk |
| elbow            | 0.4   | walk |
| knee             | 0.6   | walk |
| torsoTwist       | 0.12  | walk |
| hipTwist         | 0.10  | walk |
| bob              | 0.02  | walk |
| breath           | 0.015 | universal torso scale |
| headLook         | 0.25  | walk, idle |
| shoulderShrug    | 0.08  | walk |
| sway             | 0.05  | idle |
| danceBounce      | 0.08  | dance |
| danceArm         | 0.8   | dance |
| danceTwist       | 0.3   | dance |
| floatHeight      | 0.15  | float |
| floatSway        | 0.2   | float |
| aggressiveArm    | 0.4   | aggressive |
| aggressiveLean   | 0.15  | aggressive |

### 3.1 `animateWalk` (line 1886)

A symmetric, opposing-limb walk cycle driven by a single `sin(t)`:

* `swingArm = sin(t) * 0.5` rotates left shoulder forward, right
  shoulder back (and inversely for legs — opposing-limb gait).
* Elbows and knees use `Math.max(0, sin(t + π/5))` so they only ever
  bend in the natural direction (clamped to ≥ 0 rad).
* Ankles use `-Math.max(0, …) * 0.35` so the foot only pitches down
  during the rear part of the swing — a poor man's heel/toe.
* Wrists do a small extra `sin(t * 1.2)` flap so the hands feel less
  rigid than the forearms.
* Pelvis twists opposite to the legs, torso twists with the arms (a
  simplified contralateral rotation).
* Head adds an *additional* `sin(t3) * headLook * 0.3` on top of the
  torso twist, so it doesn't lock dead ahead.
* Shoulders shrug ±`shoulderShrug` synced to the gait.
* Vertical bob is `max(0, cos(t)) * 0.02` — a half-rectified cosine, so
  the body only ever lifts (never sinks), simulating a step impact.

### 3.2 `animateIdle` (line 1942)

A near-static pose with low-frequency wobbles:

* Both arms hang forward and slightly out (`rotation.x = 0.1`,
  `rotation.z = ±0.15`) with a tiny `sin(t * 0.5)` wobble.
* Elbows held at `0.2` rad with a small jitter.
* `weightShift = sin(t * 0.3) * 0.08` rocks the hips and knees back
  and forth, simulating shifting weight foot to foot.
* Torso sways laterally with `swayPhase` offset (so different
  characters sway out of phase even with the same speed).
* Head looks around independently using the slower `t3` phase.
* Tiny breath bob `sin(t2) * 0.008` on `model.position.y`.

> ⚠️ **Bug at line 1994**: `shoulders.position.y = (shoulders.position.y || 0) + Math.sin(...)*0.005`.
> The `+=` semantics here are accidental — each frame the
> previous Y is read and a new sine offset is **added**, so the Y
> value drifts cumulatively rather than oscillating around a base.
> See §5.1 for the fix.

### 3.3 `animateDance` (line 2003)

* `beat = t * 2` is the master "BPM" multiplier.
* Both shoulders are pre-pitched up (`-π * 0.4` ≈ –72°) so the arms
  start above shoulder line, then sway in opposing phase.
* Elbows oscillate between 0.1 and 0.9 rad, wrists rotate on
  *both* X and Z axes for a hand-flick.
* Hip "bounce" is `sin(beat) * 0.15` — opposite legs going up/down
  (like marching in place).
* Pelvis adds an `x` rotation on every beat so the hips don't just
  twist horizontally.
* Vertical bounce is `|sin(beat)| * 0.08` — full-rectified, so it
  always travels upward like a real bounce-on-the-balls landing.

### 3.4 `animateFloat` (line 2074)

* `floatT = t * 0.5` — runs at half speed.
* Shoulders held up & out: `rotation.x = -π * 0.15` (slightly back),
  `rotation.z = ±π * 0.25` (T-pose-ish), then a `sin(floatT * 0.7) * floatSway`
  drift.
* Hips, knees and ankles all hold a small forward bend so the legs
  dangle as if hanging from a marionette.
* Vertical position is offset by `+0.1` units **on top** of `baseY`,
  so floating characters ride above their orbit baseline.
* Float height oscillates `sin(floatT) * 0.15`.

### 3.5 `animateAggressive` (line 2144)

* `aggroT = t * 1.5` — fastest of the five.
* `pulse = sin(aggroT * 3) * 0.5 + 0.5` is a 0..1 envelope used as
  micro-tension on shoulders, knees and shoulder block.
* Both shoulders held high (`-0.8` rad) with arms angled in (`±0.4` rad)
  + small pulse offset, elbows tightly flexed at `1.2` rad — the
  classic "guard up" boxing stance.
* Wrists locked at `0.3` (no jitter — fists are deliberately stiff).
* Hips angled inward like a wide stance (`±0.1` z-rotation).
* Torso leans **forward** by `aggressiveLean = 0.15` rad with a
  small `sin(aggroT * 2)` oscillation, pelvis counter-leans by half.
* Head pitched down slightly (`0.2` rad) with two small high-frequency
  jitters on `y` and `z` — labelled "tremor" in the comments. This is
  the only place a character "trembles".

---

## 4. The main loop (`animate`, line 2209)

The loop's character section (lines 2214–2292) is the **only** thing
that calls the `animateXxx` routines:

```js
this.targets.forEach((m) => {
  // 1. Spin in place: m.rotation += rotationSpeeds.get(m) * scale
  // 2. Orbit around origin: m.position.{x,z} from cos/sin(orbitAngle)
  // 3. Advance phases: t, t2, t3 += delta * (speed, breathSpeed, headLookSpeed)
  // 4. Universal breath: torso.scale.x / .z = 1 + sin(t2) * 0.015
  // 5. switch(anim.type) → call animateXxx(anim, amplitudes, limbs, m, baseY)
});
```

Important details:

* **`scale = 60 * delta`** (line 2213) is used **only for** the
  `rotationSpeeds` step, so the spin is frame-rate-independent. The
  animation phases use `delta * speed` directly, so they too are
  frame-rate-independent.
* **`baseY` is cached twice**: once on `userData.baseY` inside the
  orbit branch (line 2231), once on `anim.baseY` inside the
  animation branch (line 2262). The animation routines read from
  `anim.baseY` only, so the `userData.baseY` is dead weight.
* **Universal breath** scales only `torso.scale.x` and `torso.scale.z`
  (lines 2266–2269). `torso.scale.y` is never touched, so the chest
  widens/deepens but doesn't lift. This runs every frame for every
  character regardless of animation type — a global "always alive"
  signal.
* **Adaptive frame skip** (line 2334): on touch devices, when
  `delta > 0.035` (≈ < 28 fps), there's a 33 % chance the frame is
  *not rendered*. Note that the **animation phases still advance** —
  it's a render skip, not an update skip — so characters don't slow
  down on bad mobiles, they just visibly stutter less.

### 4.1 Render path

```
animate()
  └─► (composer && (crt.enabled || dither.enabled))
        ? this.composer.render()        // CRT + dithering passes
        : this.renderer.render(scene, camera)
```

CRT/dither uniforms are updated by the same loop (line 2329) so the
shader effects are time-driven.

---

## 5. Bugs and quirks

### 5.1 ⚠ Idle shoulders Y drift  (line 1994)

```js
shoulders.position.y = (shoulders.position.y || 0) + Math.sin(anim.t2) * 0.005;
```

This is meant to be a breathing rise/fall on the shoulder block but it
**accumulates** every frame instead of oscillating around the rest
position. Over time, the shoulders slowly drift away from the torso
(usually upward, since `sin` averages slightly positive once the phase
moves around the unit circle). The fix is to capture the rest Y at
build time and write the offset off that:

```js
// at build (line 503-ish)
shoulders.userData.baseY = shoulders.position.y;
// in animateIdle (line 1994)
shoulders.position.y = shoulders.userData.baseY + Math.sin(anim.t2) * 0.005;
```

### 5.2 ⚠ `dispose()` may trigger navigation

`dispose()` (line 2369) calls `this.targets.forEach(mesh => this.destroyTarget(mesh))`.
`destroyTarget` (line 1335) ends with:

```js
if (projectInfo && this.onNavigate && !this.isNavigating && this.redirectEnabled) {
  this.isNavigating = true;
  this.isActive = false;
  this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
}
```

It only checks `redirectEnabled`, **not** any "is being torn down" flag.
On desktop, `redirectEnabled` becomes `true` when pointer-lock is
acquired (line 721) and stays `true` until ESC. So if the user
navigates away from the page **while pointer-lock is active**, the
React `useEffect` cleanup in
`ExperimentalShooter.js:28` calls `dispose()`, which calls
`destroyTarget` on the first remaining model, which then calls
`onNavigate` to a *random* project page — competing with the actual
navigation the user just initiated.

Fix: set a `this.isDisposing = true` at the top of `dispose()` and add
an early-return in `destroyTarget`:

```js
if (this.isDisposing) {
  // skip explosion + navigation; just unhook & free
}
```

### 5.3 Stale animation state if type ever switched

The `animateXxx` routines only set the rotation channels they care
about; e.g. `animateWalk` writes `lShoulderPivot.rotation.x` but
never touches `.z`. Today this is fine because `anim.type` is fixed
for the lifetime of the character. If you ever introduce live type
switching, you'll see leftover rotations from the previous routine
stuck on the limbs.

Cheap fix: have a `resetPose(limbs)` helper that zeros all pivots,
called once on every type switch. Or rework all routines to write
all 3 axes on every limb every frame.

### 5.4 `userData.baseY` vs `anim.baseY`

Both are cached and one is unused after the first frame (line 2231 vs
2262). Pick one, delete the other.

### 5.5 Decoupled walking gait

The walking characters move via `userData.orbitAngle` (constant 0.25
rad/sec), but their **leg cycle** is driven by `anim.t * speed` with
no relation to the orbit speed. So:

* On screen, the character's feet swing at a different cadence than
  the body's translation.
* The feet sweep through the air; there's no foot-plant or
  ground-friction illusion.
* The character also spins around its own Y axis from `rotationSpeeds`
  (≈ 0.008–0.014 rad/frame at line 1039), so the figure rotates
  *while* it orbits *while* its legs flap. None of these three
  rotations are correlated.

The result reads as deliberate dreamlike weirdness, not as locomotion —
which fits the "ghost characters of the artwork" vibe but is worth
flagging if anyone ever wants the walk to read as actual walking.

### 5.6 Universal breath ignores Y scale

`torso.scale.x` and `torso.scale.z` get the breath value (lines
2266–2269), but `torso.scale.y` is left at 1. So the chest gets wider
and deeper but never taller — anatomically odd. A one-liner could fix
it.

### 5.7 Cast-shadow flag is set but never used

Every limb mesh gets `castShadow = true` (line 634) but
`quality.castShadows` is false in both quality profiles (lines 59 and
68). This is dead work — three.js still iterates the shadow-cast
list even with the directional light's `castShadow = false`.

### 5.8 Hard-coded magic numbers in routines

Several values inside the routines aren't in the amplitudes config:

* `0.35` foot pitch in walk (line 1916)
* `0.15` flap multiplier on wrists in walk (line 1904)
* `-π * 0.4` shoulder pre-tilt in dance (line 2014)
* `1.2` elbow lock in aggressive (line 2164)
* `0.5 + 0.5` pulse envelope in aggressive (line 2151)

If you ever want to tweak the look without redeploying code, hoisting
these into `GAME_CONFIG.animation.amplitudes` or per-routine config
objects would help.

---

## 6. Performance notes

* **Draw calls**: each character is ~16 separate `Mesh` instances
  (torso, pelvis, shoulders, neck, head, 2 hands, 2 feet, 4 upper-arms/
  legs, 4 lower-arms/legs). With 3 simultaneous characters that's
  ~48 limb draw calls per frame, plus environment, sky, sprite, etc.
  Three.js can sort these into a single draw call only if they share
  geometry **and** material — they share the material, but not
  geometry (each `BoxGeometry` is created fresh inside
  `createLowPolyHuman`).
* **No InstancedMesh, no merged buffers, no geometry sharing.** The
  same `upperArmGeo`/`lowerArmGeo`/`upperLegGeo`/`lowerLegGeo` are
  re-instantiated for every character; the torso/pelvis/shoulders/
  head/foot/hand geometries are also created fresh per character.
* **Animation phase update is O(targets × constant)** every frame.
  At 3 targets this is trivial.
* **Mobile frame skip is render-only** — animation phases keep
  advancing during a skipped frame, so phase consistency is preserved
  but rendering work isn't fully halved (the scene still goes through
  the full traversal for the *next* render).
* **`new THREE.Vector3()` allocations per frame**: none in the
  character path (the routines only mutate existing rotations and
  scales), so GC pressure is low. ✅
* **`getDelta`** is called once per frame and the result reused —
  good practice. ✅

---

## 7. Suggested improvements

Roughly ordered from highest payoff to lowest.

### 7.1 Fix the two real bugs (high priority)

* **§5.1** — switch the idle shoulder Y drift to a base-Y reference.
  One-line fix.
* **§5.2** — add an `isDisposing` flag and skip the
  `onNavigate`/explosion path in `destroyTarget` when set. Prevents
  spurious navigation when the React component unmounts during
  pointer-lock.

### 7.2 Make characters "look at the player" (medium effort, big payoff)

The single biggest readability win for a shooter is making the
characters acknowledge the camera. Right now they look around blindly
(`anim.t3 * headLookSpeed`). A small per-frame `head.lookAt(camera.position)`
blended with the existing wander would dramatically increase the
"alive" feeling — and on a portfolio site, eye contact with the
artwork-skinned humanoids is thematically rich.

Simple sketch:

```js
// in animate(), after the type switch
const camWorld = new THREE.Vector3();
this.camera.getWorldPosition(camWorld);
const headWorld = new THREE.Vector3();
limbs.head.getWorldPosition(headWorld);
const desired = new THREE.Quaternion();
const m = new THREE.Matrix4().lookAt(headWorld, camWorld, limbs.head.up);
desired.setFromRotationMatrix(m);
limbs.head.quaternion.slerp(desired, 0.05);  // gentle blend
```

(Allocate the temporaries once at construction time to avoid GC.)

### 7.3 Hit reaction (cheap, high payoff)

`shoot()` currently destroys the character immediately on raycast hit.
A 200 ms "flinch" or pose-jolt before the explosion would feel much
better:

* Capture `pivot.rotation.*` on hit, blend toward an exaggerated
  rear-leaning pose for a few frames, *then* trigger the explosion.
* Or simply scale the model briefly (`scale.multiplyScalar(1.05)`)
  and play the explosion next frame.

### 7.4 Geometry sharing (performance)

`createLowPolyHuman` creates ~16 fresh `BoxGeometry` instances per
character. Hoist them to module level (or to the class) and share:

```js
// at module level
const HUMAN_GEOMETRY = {
  torso:    new THREE.BoxGeometry(0.5, 0.7, 0.25),
  pelvis:   new THREE.BoxGeometry(0.4, 0.3, 0.22),
  shoulders:new THREE.BoxGeometry(0.7, 0.12, 0.18),
  // …
};
```

That cuts geometry allocation per character to zero, halves GPU buffer
churn, and lets three.js batch better. Geometries don't carry world
state so this is safe.

### 7.5 Consolidate state

Either move `animationStates` onto `group.userData` or the other way
around — pick one home for `{ anim, limbs }`. Right now you have:

* `userData.limbs`              (object refs)
* `userData.orbitAngle`         (number)
* `userData.baseY`              (number, written once, never read)
* `userData.projectInfo`        (object)
* `animationStates.get(group)`  (anim phases, type, baseY)

A single `group.userData.character = { limbs, anim, orbitAngle, projectInfo }`
would be tidier and one fewer indirection per frame.

### 7.6 Hoist magic numbers into the amplitudes config

See §5.8. The point is not "less magic" but "tweakability" — if the
debug GUI (`DEBUG_POST_PROCESSING` flag, line 16) is ever extended to
character config, the routine numbers should be GUI-controllable.

### 7.7 Vary type over time

Right now each character is born with a type and wears it forever. A
smooth way to add life would be to schedule a type switch every
6–12 s, with a half-second crossfade between two routines. This
requires §5.3 to be fixed first (otherwise stale rotations leak).
Crossfading is straightforward when both routines write absolute
values:

```js
const a = computePose(typeA, anim);
const b = computePose(typeB, anim);
applyPose(blend(a, b, easeInOut(t)));
```

### 7.8 Tie walk cadence to orbital velocity

If you want the walking type to look like actual walking, tie
`anim.speed` to the orbit speed and step length:

```js
// roughly: cadence ∝ groundSpeed / strideLength
const groundSpeed = GAME_CONFIG.orbit.speed * GAME_CONFIG.orbit.radius;
const strideLen = (upperLegLength + lowerLegLength) * 0.6;
anim.speed = groundSpeed / strideLen;
```

…and orient the character to face along the orbit tangent rather
than spinning freely. Currently the spin (`rotationSpeeds`) and the
orbit are unrelated, which is why the walk reads as dreamlike rather
than locomotive (see §5.5).

### 7.9 Add a `breath.y` channel

Trivial change, more anatomically convincing:

```js
const breathScale = 1 + Math.sin(anim.t2) * amplitudes.breath;
torso.scale.set(breathScale, 1 + Math.sin(anim.t2) * amplitudes.breath * 0.4, breathScale);
```

### 7.10 Optional: cap `headLook` so heads can't snap unrealistically

In `animateWalk` line 1927 the head Y rotation is the sum of the torso
twist contribution + the wander phase. There's no clamp, so the head
can momentarily face up to ~45° off centre for a single frame. Wrap
in a `THREE.MathUtils.clamp(value, -0.5, 0.5)` if you want a tighter
cone.

---

## 8. What's *good* about the system (worth preserving)

* **Per-character random phase + speed** is the cheapest possible
  trick to break the symmetry of three identical models — it works.
* **WeakMap state storage** means GC handles teardown for free; no
  leak risk on `destroyTarget`.
* **All animation values are frame-rate-independent** (multiplied by
  `delta`). The game looks the same at 30 fps and 144 fps.
* **`flatShading` + low-poly cube limbs + portfolio textures wrapped
  on every cube** is a wonderfully ugly aesthetic that makes the
  characters feel like they belong inside the artworks they're
  carrying. Don't lose this if you ever consider GLTF.
* **`requestAnimationFrame` is stored as an arrow** binding `this`
  via `() => this.animate()` — clean, no `bind` ceremony.
* **Adaptive frame skip on mobile** is hand-rolled but simple and
  effective.
* **The `Math.max(0, sin(...))` knee/elbow clamps** are a clever way
  to make joints flex only in the natural direction without writing
  any IK.

---

## 9. Quick reference: where to find what

| What | File:line |
|------|-----------|
| React entry point | `src/components/games/experimental/ExperimentalShooter.js:7` |
| Page route | `src/app/shooter/page.js:1` |
| Game class | `ArtShooterGame.js:180` |
| Character config (types + amplitudes) | `ArtShooterGame.js:76` |
| Rig builder | `ArtShooterGame.js:472` |
| Per-character state init | `ArtShooterGame.js:666` |
| Spawn 3 characters | `ArtShooterGame.js:939` |
| Main animation loop | `ArtShooterGame.js:2209` |
| `animateWalk` | `ArtShooterGame.js:1886` |
| `animateIdle` | `ArtShooterGame.js:1942` |
| `animateDance` | `ArtShooterGame.js:2003` |
| `animateFloat` | `ArtShooterGame.js:2074` |
| `animateAggressive` | `ArtShooterGame.js:2144` |
| Hit / destroy | `ArtShooterGame.js:1284` |
| Dispose | `ArtShooterGame.js:2346` |

> Note: there is a separate **legacy** sprite-based shooter at
> `src/app/shooter/page.js` (`ShooterLegacy`) that uses 14-frame leg
> animations (`/images/game/leg/{1..14}.png`), 5-frame plinth and
> object animations, and a glitch-effect background. It is unrelated
> to the procedural rig described above and is not currently routed
> from the experimental shooter — it appears to be the older
> implementation kept for reference.
