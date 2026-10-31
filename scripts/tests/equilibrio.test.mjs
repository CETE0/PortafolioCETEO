import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  defaultGrain,
  defaultPalette,
  getPalette,
  getStageColors,
  normalizeGrain,
  sculpturePalettes,
} from "../../src/components/games/equilibrio/appearance.ts";
import { getRenderLayout } from "../../src/components/games/equilibrio/rendering.ts";
import {
  createToy,
  extensionPose,
  frameSummary,
  idleInput,
  spring,
  stepToy,
} from "../../src/components/games/equilibrio/simulation.ts";

const tick = (toy, input, seconds) => {
  for (let i = 0; i < seconds * 60; i++) stepToy(toy, input, 1 / 60);
};

test("extension preserves the authored Godot keyframes and hold at the start", () => {
  assert.deepEqual(extensionPose(0), {
    bodyY: -1.420408,
    tubeRotation: Math.PI / 2,
    tubeScale: 0.1,
  });
  assert.equal(extensionPose(0.03).bodyY, -1.420408);
  assert.equal(extensionPose(0.33333334).bodyY, 0);
  assert.deepEqual(extensionPose(0.4), {
    bodyY: 0,
    tubeRotation: 0,
    tubeScale: 1,
  });
});

test("spring uses the original stiffness 260 and damping 14", () => {
  const result = spring(0.8, 0, 1, 1 / 60);
  assert.ok(Math.abs(result.velocity - 0.8666666666666665) < 1e-12);
  assert.ok(Math.abs(result.x - 0.8144444444444444) < 1e-12);
});

test("one hop follows the original velocity and gravity then lands", () => {
  const toy = createToy();
  const input = { ...idleInput, jump: 1 };
  tick(toy, input, 0.3);
  assert.equal(toy.grounded, false);
  assert.ok(toy.y > 2.5);
  tick(toy, input, 1);
  assert.equal(toy.grounded, true);
  assert.equal(toy.y, 0.96);
  assert.equal(toy.falls, 0);
});

test("holding a jump counter does not repeatedly jump", () => {
  const toy = createToy();
  tick(toy, { ...idleInput, jump: 1 }, 3);
  assert.equal(toy.grounded, true);
  assert.equal(toy.vy, 0);
});

test("walking off the platform tumbles then returns without a game-over", () => {
  const toy = createToy();
  tick(toy, { ...idleInput, x: 1 }, 2.3);
  assert.ok(toy.falls >= 1);
  assert.ok(toy.y >= -14);
  tick(toy, { ...idleInput, reset: 1 }, 1 / 60);
  assert.equal(toy.x, 0);
  assert.equal(toy.y, 0.96);
  assert.equal(toy.grounded, true);
});

test("pause freezes movement, animation, and time", () => {
  const toy = createToy();
  const original = structuredClone(toy);
  tick(toy, { ...idleInput, x: 1, jump: 1, paused: true }, 3);
  assert.deepEqual(toy, original);
});

test("diagonal input is normalized and height transition completes", () => {
  const toy = createToy();
  tick(toy, { ...idleInput, x: 1, z: 1, raised: true }, 0.5);
  assert.ok(Math.abs(Math.hypot(toy.vx, toy.vz) - 7) < 1e-12);
  assert.equal(toy.extensionTime, 0.4);
  tick(toy, { ...idleInput, raised: false }, 0.5);
  assert.equal(toy.extensionTime, 0);
});

test("slow frames cannot explode the original animation spring", () => {
  const toy = createToy();
  for (let i = 0; i < 2000; i++)
    stepToy(toy, { ...idleInput, demo: true }, i % 2 ? 0.5 : 1 / 120);
  assert.ok(toy.scale > 0.5 && toy.scale < 1.5);
  for (const value of Object.values(toy))
    if (typeof value === "number") assert.ok(Number.isFinite(value));
});

test("wide-screen rendering spends the fixed buffer on the sculpture, not empty margins", () => {
  const layout = getRenderLayout(960, 468);
  assert.equal(layout.contentWidth, 624);
  assert.equal(layout.contentHeight, 468);
  assert.equal(layout.renderWidth, 576);
  assert.equal(layout.renderHeight, 432);
  assert.equal(layout.aspect, 4 / 3);
  assert.equal(layout.cameraHeight, 16);
});

test("portrait rendering fills the stage and keeps the original bounded pixel budget", () => {
  for (const [width, height] of [
    [358, 438],
    [280, 900],
    [768, 1024],
  ]) {
    const layout = getRenderLayout(width, height);
    assert.equal(layout.contentWidth, width);
    assert.equal(layout.contentHeight, height);
    assert.ok(layout.renderWidth <= 576);
    assert.ok(layout.renderHeight <= 768);
    assert.ok(
      Math.abs(layout.renderWidth / layout.renderHeight - width / height) <
        0.002,
    );
    assert.ok(Math.abs(layout.cameraHeight * layout.aspect - 16) < 1e-10);
  }
});

test("default print palette uses the site's actual ink token and a two-pixel grain", () => {
  const styles = readFileSync(
    new URL("../../src/styles.css", import.meta.url),
    "utf8",
  );
  const ink = styles.match(/--color-ink:\s*(#[0-9a-f]+);/i)[1];
  assert.equal(getPalette(defaultPalette).dark, ink);
  assert.equal(getPalette(defaultPalette).background, ink);
  assert.equal(idleInput.palette, defaultPalette);
  assert.equal(idleInput.grain, defaultGrain);
  assert.equal(defaultGrain, 2);
});

test("grain always stays on a bounded integer Bayer grid", () => {
  assert.equal(normalizeGrain(NaN), 2);
  assert.equal(normalizeGrain(Infinity), 2);
  assert.equal(normalizeGrain(-2), 1);
  assert.equal(normalizeGrain(1.6), 2);
  assert.equal(normalizeGrain(500), 3);
});

test("all palettes keep the stage and Unshaded backgrounds consistent; Godot stays untouched", () => {
  for (const palette of sculpturePalettes) {
    assert.equal(
      getStageColors(palette.id, "dither").background,
      palette.background,
    );
    assert.equal(
      getStageColors(palette.id, "solid").background,
      palette.sourceBackground,
    );
    assert.notEqual(palette.foreground, palette.background);
  }
  assert.deepEqual(getStageColors("red", "dither", true), {
    background: "#121738",
    foreground: "#f5e8c7",
  });
});

test("palette and grain cannot change the original character simulation", () => {
  const original = createToy();
  const styled = createToy();
  tick(original, { ...idleInput, demo: true }, 5);
  tick(styled, { ...idleInput, demo: true, palette: "red", grain: 3 }, 5);
  assert.deepEqual(styled, original);
});

test("benchmark reports frame intervals, p95 and long frames without inventing GPU timings", () => {
  assert.equal(frameSummary([]), null);
  const summary = frameSummary([10, 20, 30, 60]);
  assert.equal(summary.frameMs, 30);
  assert.equal(summary.p95FrameMs, 60);
  assert.equal(summary.longFrames, 1);
  assert.equal(summary.samples, 4);
});
