import assert from "node:assert/strict";
import test from "node:test";
import {
  angleDelta,
  isInputPaused,
  keyboardDirection,
  orientationToScreen,
  screenToWorld,
  tiltAxis,
} from "../../src/components/games/equilibrio/landing/controls.ts";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

test("screen right/down follow the fixed camera, not world axes", () => {
  const length = Math.hypot(19, 23);
  const right = screenToWorld(1, 0);
  close(right.x, 23 / length);
  close(right.z, -19 / length);
  const down = screenToWorld(0, 1);
  close(down.x, 19 / length);
  close(down.z, 23 / length);
  close(right.x * down.x + right.z * down.z, 0);
  assert.deepEqual(screenToWorld(0, 0), { x: 0, z: 0 });
});

test("diagonal keys and long drags never exceed unit movement; short drags remain analog", () => {
  for (const [right, down] of [
    [1, 1],
    [-1, 1],
    [12, -40],
  ]) {
    const world = screenToWorld(right, down);
    close(Math.hypot(world.x, world.z), 1);
  }
  const small = screenToWorld(0.1, 0.2);
  close(Math.hypot(small.x, small.z), Math.hypot(0.1, 0.2));
});

test("WASD and arrow keys agree, opposites cancel, aliases do not amplify movement", () => {
  assert.deepEqual(keyboardDirection(new Set(["ArrowRight", "KeyD"])), {
    right: 1,
    down: 0,
  });
  assert.deepEqual(
    keyboardDirection(new Set(["ArrowLeft", "KeyD", "KeyW", "ArrowDown"])),
    { right: 0, down: 0 },
  );
  assert.deepEqual(keyboardDirection(new Set(["KeyW", "KeyA"])), {
    right: -1,
    down: -1,
  });
  assert.deepEqual(keyboardDirection(new Set()), { right: 0, down: 0 });
});

test("tilt maps portrait and both landscape orientations to screen axes", () => {
  for (const [angle, right, down] of [
    [0, 5, 10],
    [90, 10, -5],
    [-90, -10, 5],
    [180, -5, -10],
    [270, -10, 5],
  ]) {
    const value = orientationToScreen(10, 5, angle);
    close(value.right, right);
    close(value.down, down);
  }
});

test("tilt has a comfortable deadzone, symmetric ramp and bounded travel", () => {
  for (const value of [-2.5, -1, 0, 1, 2.5]) close(tiltAxis(value), 0);
  close(tiltAxis(10), 0.5);
  close(tiltAxis(-10), -0.5);
  close(tiltAxis(90), 1);
  close(tiltAxis(-90), -1);
  close(angleDelta(-179, 179), 2);
  close(angleDelta(179, -179), -2);
});

test("pause reasons compose: visibility/focus/menu changes cannot override explicit pause", () => {
  const names = [
    "user",
    "hidden",
    "blurred",
    "menu",
    "offscreen",
    "navigating",
  ];
  for (let mask = 0; mask < 64; mask++) {
    const reasons = Object.fromEntries(
      names.map((name, index) => [name, Boolean(mask & (1 << index))]),
    );
    assert.equal(isInputPaused(reasons), mask !== 0);
  }
  const reasons = {
    user: true,
    hidden: true,
    blurred: true,
    menu: true,
    offscreen: true,
    navigating: true,
  };
  for (const name of names.slice(1)) {
    reasons[name] = false;
    assert.equal(isInputPaused(reasons), true);
  }
  reasons.user = false;
  assert.equal(isInputPaused(reasons), false);
});
