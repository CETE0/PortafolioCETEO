const interval = 1000 / 60;

export function createRenderClock() {
  return { next: null as number | null, previous: null as number | null };
}

// requestAnimationFrame may run at 120/144/240 Hz. Keep a 60 Hz deadline without
// accumulating drift, and report actual elapsed time only for frames we paint.
export function advanceRenderClock(
  clock: ReturnType<typeof createRenderClock>,
  now: number,
) {
  if (clock.next !== null && now + 0.15 < clock.next) return null;
  const elapsed =
    clock.previous === null
      ? 1 / 60
      : Math.min(0.1, Math.max(0, (now - clock.previous) / 1000));
  clock.previous = now;
  clock.next =
    clock.next === null || now - clock.next > interval
      ? now + interval
      : clock.next + interval;
  return elapsed;
}
