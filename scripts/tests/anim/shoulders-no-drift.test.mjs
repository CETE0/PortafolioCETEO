import { section, withinBand } from './_assert.mjs';

section('shoulders Y stays bounded across many frames');

const FRAMES = 10000;
const dt = 1 / 60;
const breathSpeed = 1.0;
const amp = 0.005;
const baseY = 0.94;

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
