import { section, withinBand } from './_assert.mjs';

section('breath scales: x, z full amplitude; y at 40 % amplitude');

const ampBreath = 0.015;
const yScale = 0.4;
const FRAMES = 600;
const dt = 1 / 60;
const breathSpeed = 1.0;

let t2 = 0;
let minY = Infinity, maxY = -Infinity;
let minX = Infinity, maxX = -Infinity;

for (let i = 0; i < FRAMES; i++) {
  t2 += dt * breathSpeed;
  const breathScale = 1 + Math.sin(t2) * ampBreath;
  const breathScaleY = 1 + Math.sin(t2) * ampBreath * yScale;
  const sx = breathScale, sy = breathScaleY;
  if (sx < minX) minX = sx;
  if (sx > maxX) maxX = sx;
  if (sy < minY) minY = sy;
  if (sy > maxY) maxY = sy;
}

withinBand(maxX - 1, ampBreath - 1e-6, ampBreath + 1e-6, 'x amplitude is ~ampBreath');
withinBand(1 - minX, ampBreath - 1e-6, ampBreath + 1e-6, 'x bottoms out at ~-ampBreath');
withinBand(maxY - 1, ampBreath * yScale - 1e-6, ampBreath * yScale + 1e-6, 'y amplitude is ~ampBreath * 0.4');
