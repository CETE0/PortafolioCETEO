import {
  defaultGrain,
  defaultPalette,
  type SculpturePalette,
} from "./appearance.ts";

// Faithful transform animation port of Personaje/animador_picaro.gd.
// The toy's movement/platform rules are new; the character's motion is not.
export type RenderMode = "dither" | "ascii" | "solid";
export type ToyInput = {
  x: number;
  z: number;
  jump: number;
  raised: boolean;
  mode: RenderMode;
  palette: SculpturePalette;
  grain: number;
  paused: boolean;
  demo: boolean;
  reset: number;
};

export const idleInput: ToyInput = {
  x: 0,
  z: 0,
  jump: 0,
  raised: false,
  mode: "dither",
  palette: defaultPalette,
  grain: defaultGrain,
  paused: false,
  demo: false,
  reset: 0,
};

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function spring(
  x: number,
  velocity: number,
  target: number,
  dt: number,
) {
  velocity += (-260 * (x - target) - 14 * velocity) * dt;
  return { x: x + velocity * dt, velocity };
}

export function createToy() {
  return {
    x: 0,
    y: 0.96,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    falls: 0,
    time: 0,
    jumpSeen: 0,
    resetSeen: 0,
    demoJumpSeen: 0,
    demoTime: 0,
    demoWas: false,
    raised: false,
    extensionTime: 0,
    scale: 1,
    scaleVelocity: 0,
    phase: 0,
    walk: 0,
    lean: 0,
    sway: 0,
    bob: 0,
    platformX: 0,
    platformZ: 0,
  };
}
export type Toy = ReturnType<typeof createToy>;

export function impulse(toy: Toy, scale: number) {
  toy.scale = scale;
  toy.scaleVelocity = 0;
}

export function resetToy(toy: Toy) {
  const { time, falls, jumpSeen, resetSeen, raised } = toy;
  Object.assign(toy, createToy(), { time, falls, jumpSeen, resetSeen, raised });
  toy.extensionTime = raised ? 0.4 : 0;
}

// Uses the exact times and linear interpolation from Picaro.tscn's `extend`.
export function extensionPose(time: number) {
  return {
    bodyY: mix(
      -1.420408,
      0,
      clamp((time - 0.033333335) / (0.33333334 - 0.033333335), 0, 1),
    ),
    tubeRotation: mix(
      Math.PI / 2,
      0,
      clamp((time - 0.03333334) / (0.39429626 - 0.03333334), 0, 1),
    ),
    tubeScale: mix(
      0.1,
      1,
      clamp((time - 0.03515276) / (0.39267364 - 0.03515276), 0, 1),
    ),
  };
}

// Shared by the flat reference study and the physical landing toy. Keep the
// original authored mechanism and procedural animator independent of physics.
export function updateExtension(toy: Toy, input: ToyInput, dt: number) {
  if (input.raised !== toy.raised) {
    toy.raised = input.raised;
    impulse(toy, toy.raised ? 0.88 : 0.9);
  }
  const previous = toy.extensionTime;
  toy.extensionTime = clamp(
    toy.extensionTime + (toy.raised ? dt : -dt),
    0,
    0.4,
  );
  if (
    previous !== toy.extensionTime &&
    (toy.extensionTime === 0 || toy.extensionTime === 0.4)
  )
    impulse(toy, toy.raised ? 1.07 : 0.94);
}

export function updateAnimation(toy: Toy, dt: number) {
  const horizontal = Math.hypot(toy.vx, toy.vz);
  const speed = clamp(horizontal / 7, 0, 1);
  toy.walk = mix(toy.walk, toy.grounded ? speed : 0, 1 - Math.exp(-12 * dt));
  toy.phase += (horizontal * dt * Math.PI) / 1.6;
  let target = 1;
  if (!toy.grounded) target += clamp(toy.vy * 0.012, -0.06, 0.1);
  else if (toy.walk < 0.05) target += 0.015 * Math.sin(toy.time * 2.2);
  const next = spring(toy.scale, toy.scaleVelocity, target, dt);
  toy.scale = next.x;
  toy.scaleVelocity = next.velocity;
  toy.lean = mix(
    toy.lean,
    toy.grounded ? radians(speed * 6) : 0,
    1 - Math.exp(-10 * dt),
  );
  toy.sway = Math.sin(toy.phase) * radians(7) * toy.walk;
  toy.bob = Math.abs(Math.sin(toy.phase)) * 0.16 * toy.walk;
}

export function stepToy(toy: Toy, input: ToyInput, dt: number) {
  if (input.paused) return;
  dt = clamp(dt, 0, 1 / 60);
  toy.time += dt;
  if (input.reset !== toy.resetSeen) {
    toy.resetSeen = input.reset;
    resetToy(toy);
  }
  updateExtension(toy, input, dt);

  // Identical deterministic demo in both engines: modest walk, hop every 3s.
  if (input.demo !== toy.demoWas) {
    toy.demoTime = 0;
    toy.demoJumpSeen = 0;
    toy.demoWas = input.demo;
  }
  if (input.demo) toy.demoTime += dt;
  let x = input.demo ? Math.sin(toy.demoTime * 1.1) * 0.32 : input.x;
  let z = input.demo ? Math.cos(toy.demoTime * 1.3) * 0.24 : input.z;
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  toy.vx = x * 7;
  toy.vz = z * 7;
  const demoJump = Math.floor(toy.demoTime / 3);
  const jump =
    input.jump !== toy.jumpSeen ||
    (input.demo && demoJump !== toy.demoJumpSeen);
  toy.jumpSeen = input.jump;
  toy.demoJumpSeen = demoJump;
  if (jump && toy.grounded) {
    toy.vy = 10;
    toy.grounded = false;
    impulse(toy, 0.8);
  }
  toy.x += toy.vx * dt;
  toy.z += toy.vz * dt;
  const overPlatform = Math.abs(toy.x) < 6 && Math.abs(toy.z) < 4.5;
  if (!overPlatform) toy.grounded = false;
  const previousY = toy.y;
  if (!toy.grounded) {
    toy.vy -= 24.8 * dt;
    toy.y += toy.vy * dt;
    if (overPlatform && toy.vy <= 0 && previousY >= 0.96 && toy.y <= 0.96) {
      impulse(toy, 1 - clamp(Math.abs(toy.vy) * 0.018, 0.04, 0.22));
      toy.y = 0.96;
      toy.vy = 0;
      toy.grounded = true;
    }
  }
  if (toy.y < -14) {
    toy.falls++;
    resetToy(toy);
  }
  if (length > 0.015) {
    const target = Math.atan2(x, z);
    const difference = Math.atan2(
      Math.sin(target - toy.yaw),
      Math.cos(target - toy.yaw),
    );
    toy.yaw += difference * (1 - Math.exp(-12 * dt));
  }

  updateAnimation(toy, dt);
  // Visual rocking only in this controlled renderer study; collision plane stays level.
  toy.platformX = mix(toy.platformX, toy.z * 0.006, 1 - Math.exp(-5 * dt));
  toy.platformZ = mix(toy.platformZ, -toy.x * 0.006, 1 - Math.exp(-5 * dt));
}

export function frameSummary(samples: number[]) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    samples: samples.length,
    fps: 1000 / mean,
    frameMs: mean,
    p95FrameMs:
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    longFrames: samples.filter((ms) => ms > 50).length,
  };
}
