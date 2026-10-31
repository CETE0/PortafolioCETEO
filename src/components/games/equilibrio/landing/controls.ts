// The fixed camera looks from (19, 16, 23). Inputs are screen-right / screen-down.
const cameraLength = Math.hypot(19, 23);

export function screenToWorld(right: number, down: number) {
  const length = Math.max(1, Math.hypot(right, down));
  right /= length;
  down /= length;
  return {
    x: (right * 23 + down * 19) / cameraLength,
    z: (-right * 19 + down * 23) / cameraLength,
  };
}

export function orientationToScreen(
  beta: number,
  gamma: number,
  angle: number,
) {
  const radians = (angle * Math.PI) / 180;
  return {
    right: gamma * Math.cos(radians) + beta * Math.sin(radians),
    down: beta * Math.cos(radians) - gamma * Math.sin(radians),
  };
}

export function tiltAxis(degrees: number) {
  const deadzone = 2.5;
  return (
    Math.sign(degrees) *
    Math.min(1, Math.max(0, Math.abs(degrees) - deadzone) / 15)
  );
}

export function angleDelta(value: number, baseline: number) {
  return ((value - baseline + 540) % 360) - 180;
}

export function keyboardDirection(keys: ReadonlySet<string>) {
  return {
    right:
      Number(keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(keys.has("ArrowLeft") || keys.has("KeyA")),
    down:
      Number(keys.has("ArrowDown") || keys.has("KeyS")) -
      Number(keys.has("ArrowUp") || keys.has("KeyW")),
  };
}

export function isInputPaused(reasons: {
  user: boolean;
  hidden: boolean;
  blurred: boolean;
  menu: boolean;
  offscreen: boolean;
  navigating?: boolean;
}) {
  return Object.values(reasons).some(Boolean);
}
