import {
  clamp,
  createToy,
  impulse,
  updateAnimation,
  updateExtension,
  type ToyInput,
} from "./simulation.ts";

export type BalancePhase = "playing" | "falling" | "returning";
const footOffset = 0.96;
const gravity = 24.8;
const maxAngle = 0.28;
// The plank rests already tipped, so Pícaro starts sliding toward an edge.
export const restTilt = { x: 0.07, z: -0.2 } as const;
export const platformGeometry = {
  width: 12,
  thickness: 0.7,
  depth: 9,
} as const;
const halfWidth = platformGeometry.width / 2;
const halfDepth = platformGeometry.depth / 2;
const halfThickness = platformGeometry.thickness / 2;

export function createBalanceToy(rest: { x: number; z: number } = restTilt) {
  return {
    ...createToy(),
    platformX: rest.x,
    platformZ: rest.z,
    restX: rest.x,
    restZ: rest.z,
    balancePhase: "playing" as BalancePhase,
    platformVelocityX: 0,
    platformVelocityZ: 0,
    bodyTiltX: 0,
    bodyTiltZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    tumbleZ: 0,
    fallTime: 0,
    landings: 0,
    lastLandingSpeed: 0,
    surfaceVelocity: 0,
  };
}
export type BalanceToy = ReturnType<typeof createBalanceToy>;

// Matches Three's actual platform transform: center=(0,-.35,0), Euler XYZ,
// size=12 x .7 x 9. The rendered top plane and contact plane are the same.
export function platformSurface(
  x: number,
  z: number,
  tiltX: number,
  tiltZ: number,
) {
  const sx = Math.sin(tiltX),
    cx = Math.cos(tiltX);
  const sz = Math.sin(tiltZ),
    cz = Math.cos(tiltZ);
  const normalX = -sz,
    normalY = cx * cz,
    normalZ = sx * cz;
  const height =
    (halfThickness - normalX * x - normalZ * z) / normalY - halfThickness;
  const localX = cz * x + sz * (cx * (height + halfThickness) + sx * z);
  const localZ = -sx * (height + halfThickness) + cx * z;
  return {
    height,
    localX,
    localZ,
    normalX,
    normalY,
    normalZ,
    supported: Math.abs(localX) < halfWidth && Math.abs(localZ) < halfDepth,
  };
}

function resetBalance(toy: BalanceToy, input: ToyInput, returning = false) {
  const { time, falls, landings, restX, restZ } = toy;
  const rocking = {
    platformX: toy.platformX,
    platformZ: toy.platformZ,
    platformVelocityX: toy.platformVelocityX,
    platformVelocityZ: toy.platformVelocityZ,
  };
  Object.assign(toy, createBalanceToy({ x: restX, z: restZ }), {
    time,
    falls,
    landings,
    jumpSeen: input.jump,
    resetSeen: input.reset,
    raised: input.raised,
    extensionTime: input.raised ? 0.4 : 0,
  });
  if (returning) {
    // The character returns; the independent plank continues settling naturally.
    Object.assign(toy, rocking);
    toy.y =
      platformSurface(0, 0, toy.platformX, toy.platformZ).height +
      footOffset +
      3;
    toy.grounded = false;
    toy.balancePhase = "returning";
    impulse(toy, 1.08);
  }
}

function rockPlatform(toy: BalanceToy, dt: number) {
  const surface = platformSurface(toy.x, toy.z, toy.platformX, toy.platformZ);
  const loaded = toy.grounded && toy.balancePhase === "playing";
  // The original up/down mechanism really changes the center of gravity.
  const centerHeight = 2.8 + (toy.extensionTime / 0.4) * 1.2;
  const leverX = toy.x + surface.normalX * centerHeight;
  const leverZ = toy.z + surface.normalZ * centerHeight;
  const torqueX = loaded ? clamp(leverZ / halfDepth, -1.25, 1.25) * 2.1 : 0;
  const torqueZ = loaded ? -clamp(leverX / halfWidth, -1.25, 1.25) * 2.1 : 0;
  toy.platformVelocityX +=
    (torqueX - 9 * (toy.platformX - toy.restX) - 3.7 * toy.platformVelocityX) *
    dt;
  toy.platformVelocityZ +=
    (torqueZ - 9 * (toy.platformZ - toy.restZ) - 3.7 * toy.platformVelocityZ) *
    dt;
  toy.platformX += toy.platformVelocityX * dt;
  toy.platformZ += toy.platformVelocityZ * dt;
  const angle = Math.hypot(toy.platformX, toy.platformZ);
  if (angle > maxAngle) {
    const nx = toy.platformX / angle,
      nz = toy.platformZ / angle;
    toy.platformX = nx * maxAngle;
    toy.platformZ = nz * maxAngle;
    const outward = toy.platformVelocityX * nx + toy.platformVelocityZ * nz;
    if (outward > 0) {
      toy.platformVelocityX -= nx * outward;
      toy.platformVelocityZ -= nz * outward;
    }
  }
}

export function stepBalanceToy(toy: BalanceToy, input: ToyInput, dt: number) {
  if (input.paused) return;
  dt = clamp(dt, 0, 1 / 60);
  toy.time += dt;
  if (input.reset !== toy.resetSeen) {
    resetBalance(toy, input);
    return;
  }
  updateExtension(toy, input, dt);
  const jump = input.jump !== toy.jumpSeen;
  toy.jumpSeen = input.jump;
  const previousX = toy.x,
    previousZ = toy.z,
    previousFootY = toy.y - footOffset;
  const previousTiltX = toy.platformX,
    previousTiltZ = toy.platformZ;
  const previousSurface = platformSurface(
    toy.x,
    toy.z,
    previousTiltX,
    previousTiltZ,
  );
  rockPlatform(toy, dt);

  let x = Number.isFinite(input.x) ? input.x : 0;
  let z = Number.isFinite(input.z) ? input.z : 0;
  if (toy.balancePhase === "returning") x = z = 0;
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  if (toy.grounded && jump && toy.balancePhase === "playing") {
    toy.vy = 10 + clamp(toy.surfaceVelocity, -2, 2);
    toy.grounded = false;
    impulse(toy, 0.8);
  }
  if (toy.grounded) {
    const response = length > 0.02 ? 11 : 3;
    const blend = 1 - Math.exp(-response * dt);
    toy.vx += (x * 7 - toy.vx) * blend;
    toy.vz += (z * 7 - toy.vz) * blend;
    const surface = platformSurface(toy.x, toy.z, toy.platformX, toy.platformZ);
    toy.vx += gravity * surface.normalX * surface.normalY * dt;
    toy.vz += gravity * surface.normalZ * surface.normalY * dt;
  } else {
    // Gentle steering in the air, without deleting the take-off momentum.
    toy.vx = (toy.vx + x * 11 * dt) * Math.exp(-0.4 * dt);
    toy.vz = (toy.vz + z * 11 * dt) * Math.exp(-0.4 * dt);
  }
  const horizontal = Math.hypot(toy.vx, toy.vz);
  if (horizontal > 10) {
    toy.vx *= 10 / horizontal;
    toy.vz *= 10 / horizontal;
  }
  toy.x += toy.vx * dt;
  toy.z += toy.vz * dt;
  const surface = platformSurface(toy.x, toy.z, toy.platformX, toy.platformZ);
  const oldAtNewPosition = platformSurface(
    toy.x,
    toy.z,
    previousTiltX,
    previousTiltZ,
  );
  toy.surfaceVelocity =
    dt > 0 ? clamp((surface.height - oldAtNewPosition.height) / dt, -4, 4) : 0;

  if (toy.grounded && surface.supported) {
    toy.y = surface.height + footOffset;
    toy.vy = dt > 0 ? (toy.y - footOffset - previousFootY) / dt : 0;
  } else {
    if (toy.grounded) {
      toy.grounded = false;
      toy.balancePhase = "falling";
      toy.fallTime = 0;
    }
    toy.vy -= gravity * dt;
    toy.y += toy.vy * dt;
    const wasAbove = previousFootY >= previousSurface.height - 0.025;
    const relativeSpeed = toy.vy - toy.surfaceVelocity;
    if (
      surface.supported &&
      wasAbove &&
      toy.y - footOffset <= surface.height &&
      relativeSpeed <= 0
    ) {
      const impact = Math.abs(relativeSpeed);
      toy.y = surface.height + footOffset;
      toy.vy = toy.surfaceVelocity;
      toy.grounded = true;
      toy.balancePhase = "playing";
      toy.fallTime = 0;
      toy.tumbleX = toy.tumbleY = toy.tumbleZ = 0;
      toy.landings++;
      toy.lastLandingSpeed = impact;
      toy.platformVelocityX += clamp(
        (surface.localZ / halfDepth) * impact * 0.045,
        -0.7,
        0.7,
      );
      toy.platformVelocityZ -= clamp(
        (surface.localX / halfWidth) * impact * 0.045,
        -0.7,
        0.7,
      );
      impulse(toy, 1 - clamp(impact * 0.018, 0.04, 0.22));
    } else if (
      !surface.supported &&
      toy.y < surface.height + footOffset - 0.35 &&
      toy.balancePhase === "playing"
    ) {
      toy.balancePhase = "falling";
      toy.fallTime = 0;
    }
  }
  if (toy.balancePhase === "falling") {
    toy.fallTime += dt;
    const directionX = Math.sign(toy.vz || previousZ || 1);
    const directionZ = -Math.sign(toy.vx || previousX || 1);
    toy.tumbleX += directionX * 2.3 * dt;
    toy.tumbleZ += directionZ * 2.7 * dt;
    toy.tumbleY += 0.7 * dt;
  }
  if (toy.y < -12 || toy.fallTime > 2.3) {
    toy.falls++;
    resetBalance(toy, input, true);
  }
  if (length > 0.015 && toy.balancePhase !== "falling") {
    const target = Math.atan2(x, z);
    const difference = Math.atan2(
      Math.sin(target - toy.yaw),
      Math.cos(target - toy.yaw),
    );
    toy.yaw += difference * (1 - Math.exp(-12 * dt));
  }
  const tiltBlend = 1 - Math.exp(-10 * dt);
  toy.bodyTiltX +=
    ((toy.grounded ? toy.platformX : 0) - toy.bodyTiltX) * tiltBlend;
  toy.bodyTiltZ +=
    ((toy.grounded ? toy.platformZ : 0) - toy.bodyTiltZ) * tiltBlend;
  updateAnimation(toy, dt);
}
