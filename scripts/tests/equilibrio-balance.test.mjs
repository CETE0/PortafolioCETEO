import test from "node:test";
import assert from "node:assert/strict";
import {
  createBalanceToy,
  platformSurface,
  restTilt,
  stepBalanceToy,
} from "../../src/components/games/equilibrio/balance.ts";
import { idleInput } from "../../src/components/games/equilibrio/simulation.ts";
import {
  createRenderClock,
  advanceRenderClock,
} from "../../src/components/games/equilibrio/render-clock.ts";

// Mechanics tests use a level plank; the shipped default rests tipped.
const flat = { x: 0, z: 0 };
const tick = (toy, input, seconds) => {
  for (let i = 0; i < seconds * 60; i++) stepBalanceToy(toy, input, 1 / 60);
};

test("the default plank rests tipped and slides an idle Pícaro off within seconds", () => {
  const toy = createBalanceToy();
  assert.equal(toy.platformX, restTilt.x);
  assert.equal(toy.platformZ, restTilt.z);
  tick(toy, idleInput, 5);
  assert.ok(toy.falls >= 1);
});

test("a level plank keeps an idle Pícaro balanced indefinitely", () => {
  const toy = createBalanceToy(flat);
  tick(toy, idleInput, 60);
  assert.equal(toy.falls, 0);
  assert.equal(toy.grounded, true);
  assert.ok(Math.abs(toy.x) < 1e-8 && Math.abs(toy.z) < 1e-8);
  assert.ok(Math.abs(toy.y - 0.96) < 1e-8);
  assert.ok(Math.abs(toy.platformX) < 1e-8 && Math.abs(toy.platformZ) < 1e-8);
});

test("off-center weight produces angular inertia and real downhill drift", () => {
  const toy = createBalanceToy(flat);
  toy.x = 3;
  tick(toy, idleInput, 1);
  assert.ok(toy.platformZ < -0.03);
  assert.ok(toy.platformVelocityZ !== 0);
  assert.ok(toy.x > 3);
  assert.ok(toy.y < 0.96);
  assert.ok(
    Math.abs(
      toy.y -
        0.96 -
        platformSurface(toy.x, toy.z, toy.platformX, toy.platformZ).height,
    ) < 1e-8,
  );
});

test("contact is on the rendered rotated top plane, not an invisible flat floor", () => {
  const surface = platformSurface(2, 1, 0.15, -0.18);
  const distance =
    surface.normalX * 2 +
    surface.normalY * (surface.height + 0.35) +
    surface.normalZ;
  assert.ok(Math.abs(distance - 0.35) < 1e-10);
  assert.equal(surface.supported, true);
  const toy = createBalanceToy(flat);
  Object.assign(toy, {
    x: 2,
    z: 1,
    y: surface.height + 0.96,
    platformX: 0.15,
    platformZ: -0.18,
  });
  tick(toy, idleInput, 0.1);
  assert.equal(toy.grounded, true);
  const actual = platformSurface(toy.x, toy.z, toy.platformX, toy.platformZ);
  assert.ok(Math.abs(toy.y - 0.96 - actual.height) < 1e-8);
});

test("hopping unloads the platform without snapping its angle and lands again", () => {
  const toy = createBalanceToy(flat);
  toy.x = 2;
  tick(toy, idleInput, 0.5);
  const angle = toy.platformZ;
  tick(toy, { ...idleInput, jump: 1 }, 1 / 60);
  assert.equal(toy.grounded, false);
  assert.ok(toy.vy > 0);
  assert.ok(Math.abs(toy.platformZ - angle) < 0.03);
  tick(toy, { ...idleInput, jump: 1, x: -0.1 }, 1.5);
  assert.ok(toy.landings >= 1);
  assert.ok(toy.lastLandingSpeed > 0);
  assert.equal(toy.falls, 0);
});

test("raising the original mechanism increases its center-of-gravity leverage", () => {
  const low = createBalanceToy(flat);
  const high = createBalanceToy(flat);
  low.x = high.x = 2;
  tick(low, idleInput, 0.9);
  tick(high, { ...idleInput, raised: true }, 0.9);
  assert.ok(Math.abs(high.platformZ) > Math.abs(low.platformZ) + 0.0001);
  assert.equal(high.extensionTime, 0.4);
});

test("an edge fall tumbles and returns to play without a game-over", () => {
  const toy = createBalanceToy(flat);
  let tumble = false;
  for (let i = 0; i < 210; i++) {
    stepBalanceToy(toy, { ...idleInput, x: 1 }, 1 / 60);
    tumble ||= Math.abs(toy.tumbleX) + Math.abs(toy.tumbleZ) > 0.2;
  }
  tick(toy, idleInput, 5);
  assert.ok(tumble);
  assert.ok(toy.falls >= 1);
  assert.equal(toy.balancePhase, "playing");
  assert.equal(toy.grounded, true);
  assert.ok(Math.abs(toy.x) < 1 && Math.abs(toy.z) < 1);
});

test("automatic return keeps the unloaded platform's angular momentum instead of snapping it flat", () => {
  const toy = createBalanceToy(flat);
  Object.assign(toy, {
    y: -12.2,
    vy: -8,
    grounded: false,
    balancePhase: "falling",
    platformX: 0.12,
    platformZ: -0.08,
    platformVelocityX: 0.15,
    platformVelocityZ: 0.1,
  });
  tick(toy, idleInput, 1 / 60);
  assert.equal(toy.balancePhase, "returning");
  assert.ok(Math.abs(toy.platformX) > 0.05);
  assert.ok(Math.abs(toy.platformZ) > 0.03);
  assert.ok(Math.hypot(toy.platformVelocityX, toy.platformVelocityZ) > 0);
  assert.ok(toy.y > 3);
});

test("pause freezes all balance, animation and return state", () => {
  const toy = createBalanceToy(flat);
  tick(toy, { ...idleInput, x: 0.4 }, 0.5);
  const before = structuredClone(toy);
  tick(toy, { ...idleInput, paused: true, jump: 1, reset: 1 }, 3);
  assert.deepEqual(toy, before);
});

test("reset recenters and restores the resting tilt without phantom jumps", () => {
  const toy = createBalanceToy();
  tick(toy, { ...idleInput, z: 1 }, 0.6);
  tick(toy, { ...idleInput, reset: 1, jump: 1 }, 1 / 60);
  assert.equal(toy.x, 0);
  assert.equal(toy.z, 0);
  assert.equal(toy.platformX, restTilt.x);
  assert.equal(toy.platformZ, restTilt.z);
  assert.equal(toy.grounded, true);
  tick(toy, { ...idleInput, reset: 1, jump: 1 }, 0.1);
  assert.equal(toy.grounded, true);
});

test("long and adversarial input remains finite and angle-limited", () => {
  const toy = createBalanceToy(flat);
  for (let i = 0; i < 6000; i++) {
    stepBalanceToy(
      toy,
      {
        ...idleInput,
        x: Math.sin(i * 0.021),
        z: Math.cos(i * 0.017),
        jump: Math.floor(i / 80),
        raised: i % 300 < 150,
      },
      i % 11 ? 1 / 60 : 0.5,
    );
    assert.ok(Math.hypot(toy.platformX, toy.platformZ) <= 0.280001);
    assert.ok(toy.scale > 0.5 && toy.scale < 1.5);
    for (const value of Object.values(toy))
      if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
});

test("render clock caps high-refresh displays at 60 paints per second", () => {
  for (const hz of [60, 90, 120, 144, 240]) {
    const clock = createRenderClock();
    let frames = 0;
    for (let i = 0; i < hz * 2; i++)
      if (advanceRenderClock(clock, (i * 1000) / hz) !== null) frames++;
    assert.ok(frames <= 121, `${hz} Hz painted ${frames} frames`);
    assert.ok(
      frames >= 118,
      `${hz} Hz unnecessarily dropped to ${frames} frames`,
    );
  }
});

test("render clock does not fast-forward physics after a long gap", () => {
  const clock = createRenderClock();
  assert.equal(advanceRenderClock(clock, 0), 1 / 60);
  assert.equal(advanceRenderClock(clock, 4), null);
  assert.equal(advanceRenderClock(clock, 5000), 0.1);
});
