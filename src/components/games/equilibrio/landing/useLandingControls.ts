import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { idleInput, type ToyInput } from "../simulation";
import type { createThreeStudy, StudyStats } from "../ThreeStudy";
import {
  angleDelta,
  isInputPaused,
  keyboardDirection,
  orientationToScreen,
  screenToWorld,
  tiltAxis,
} from "./controls";

type Tilt = "off" | "requesting" | "calibrating" | "on";
type OrientationPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};
const emptyActions = {
  pause: () => {},
  raise: () => {},
  recenter: () => {},
  tilt: () => {},
};

export function useLandingControls() {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<ToyInput>({ ...idleInput, demo: false });
  const userPause = useRef<boolean | null>(null);
  const actions = useRef(emptyActions);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(true);
  const [raised, setRaised] = useState(false);
  const [tilt, setTilt] = useState<Tilt>("off");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StudyStats | null>(null);

  useEffect(() => {
    const element = stage.current;
    const host = container.current;
    if (!element || !host) return;
    let alive = true;
    let controller: Awaited<ReturnType<typeof createThreeStudy>> | null = null;
    const abort = new AbortController();
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const desktop = window.matchMedia("(min-width: 768px)");
    const menuIsOpen = () =>
      !desktop.matches &&
      document.querySelector(
        '[aria-controls="mobile-menu"][aria-expanded="true"]',
      ) !== null;
    const reasons = {
      user: userPause.current ?? motionPreference.matches,
      hidden: document.hidden,
      blurred: !document.hasFocus(),
      menu: menuIsOpen(),
      offscreen: false,
      navigating: false,
    };
    userPause.current = reasons.user;
    input.current = {
      ...idleInput,
      raised: input.current.raised,
      demo: false,
      paused: isInputPaused(reasons),
    };
    const keys = new Set<string>();
    let pointer: {
      id: number;
      x: number;
      y: number;
      time: number;
      moved: boolean;
      touch: boolean;
    } | null = null;
    let drag = { right: 0, down: 0 };
    let sensor = { right: 0, down: 0 };
    let baseline: { beta: number; gamma: number } | null = null;
    let sensorTime = 0;
    let sensorGeneration = 0;
    let sensorAttached = false;
    let sensorWanted = false;
    let sensorTimer: number | undefined;
    let sensorWatchdog: number | undefined;
    let sensorStatus: Tilt = "off";
    let focused = document.activeElement === element;

    setReady(false);
    setStats(null);
    setError("");
    setNotice("");
    setTilt("off");
    setPaused(input.current.paused);

    const send = (patch: Partial<ToyInput> = {}) => {
      Object.assign(input.current, patch);
      // Hand the renderer a snapshot; never mutate a renderer-owned input object.
      controller?.setInput({ ...input.current });
    };
    const setSensorStatus = (next: Tilt) => {
      sensorStatus = next;
      if (alive) setTilt(next);
    };
    const calibrate = () => {
      baseline = null;
      sensorTime = 0;
      sensor = { right: 0, down: 0 };
    };
    const cancelPointer = () => {
      const id = pointer?.id;
      pointer = null;
      drag = { right: 0, down: 0 };
      if (id !== undefined && element.hasPointerCapture?.(id))
        element.releasePointerCapture(id);
    };
    const stop = () => {
      keys.clear();
      cancelPointer();
      calibrate();
      send({ x: 0, z: 0 });
    };
    const updatePause = () => {
      if (!alive) return;
      const next = isInputPaused(reasons);
      if (next !== input.current.paused || next) stop();
      send({ paused: next, ...(next ? { x: 0, z: 0 } : {}) });
      setPaused(next);
    };
    const move = () => {
      if (input.current.paused || !focused || !controller) return;
      const keyboard = keyboardDirection(keys);
      const direction = keys.size ? keyboard : pointer?.moved ? drag : sensor;
      send(screenToWorld(direction.right, direction.down));
    };
    const hop = () => {
      if (!input.current.paused && controller)
        send({ jump: input.current.jump + 1 });
    };
    const raise = () => {
      if (!controller) return;
      const next = !input.current.raised;
      send({ raised: next });
      setRaised(next);
    };
    const disableSensor = (message = "") => {
      sensorWanted = false;
      sensorGeneration++;
      window.clearTimeout(sensorTimer);
      window.clearInterval(sensorWatchdog);
      if (sensorAttached)
        window.removeEventListener("deviceorientation", orientation);
      sensorAttached = false;
      calibrate();
      setSensorStatus("off");
      if (alive) setNotice(message);
      move();
    };
    const orientation = (event: DeviceOrientationEvent) => {
      if (!alive || !sensorWanted || !sensorAttached) return;
      const { beta, gamma } = event;
      if (
        beta === null ||
        gamma === null ||
        !Number.isFinite(beta) ||
        !Number.isFinite(gamma)
      )
        return;
      window.clearTimeout(sensorTimer);
      lastReading = performance.now();
      if (input.current.paused || !focused || pointer?.moved || keys.size) {
        calibrate();
        return;
      }
      if (!baseline) {
        baseline = { beta, gamma };
        sensorTime = lastReading;
        setSensorStatus("on");
        setNotice("");
        return;
      }
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const direction = orientationToScreen(
        angleDelta(beta, baseline.beta),
        angleDelta(gamma, baseline.gamma),
        angle,
      );
      const smoothing =
        1 - Math.exp(-Math.min(100, lastReading - sensorTime) / 100);
      sensorTime = lastReading;
      sensor.right += (tiltAxis(direction.right) - sensor.right) * smoothing;
      sensor.down += (tiltAxis(direction.down) - sensor.down) * smoothing;
      move();
    };
    let lastReading = 0;
    const enableSensor = async () => {
      if (sensorWanted || sensorStatus === "requesting") {
        disableSensor();
        return;
      }
      if (!controller) return;
      const api = window.DeviceOrientationEvent as
        OrientationPermission | undefined;
      if (!window.isSecureContext || !api) {
        setNotice("tiltUnavailable");
        return;
      }
      const generation = ++sensorGeneration;
      sensorWanted = true;
      setNotice("");
      setSensorStatus("requesting");
      try {
        // iOS requires this call to remain in the button's user-gesture stack.
        const permission = api.requestPermission
          ? await api.requestPermission()
          : "granted";
        if (!alive || generation !== sensorGeneration || !sensorWanted) return;
        if (permission !== "granted") {
          disableSensor("tiltDenied");
          return;
        }
        stop();
        // Permission sheets can resolve after the visitor opened navigation.
        if (!reasons.menu && !reasons.hidden && !reasons.blurred)
          element.focus({ preventScroll: true });
        focused = document.activeElement === element;
        sensorAttached = true;
        calibrate();
        setSensorStatus("calibrating");
        window.addEventListener("deviceorientation", orientation);
        lastReading = performance.now();
        sensorTimer = window.setTimeout(
          () => disableSensor("tiltNoReadings"),
          3000,
        );
        // A device can expose the API but silently stop delivering readings.
        sensorWatchdog = window.setInterval(() => {
          if (
            !input.current.paused &&
            focused &&
            performance.now() - lastReading > 3000
          )
            disableSensor("tiltNoReadings");
        }, 1000);
      } catch {
        if (alive && generation === sensorGeneration)
          disableSensor("tiltDenied");
      }
    };

    actions.current = {
      pause: () => {
        reasons.user = !input.current.paused;
        userPause.current = reasons.user;
        updatePause();
      },
      raise,
      recenter: () => {
        if (!controller) return;
        stop();
        send({ reset: input.current.reset + 1 });
      },
      tilt: () => {
        void enableSensor();
      },
    };

    const keydown = (event: KeyboardEvent) => {
      if (
        event.target !== element ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const code = event.code;
      const movement = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
      ].includes(code);
      if (!movement && code !== "Space" && code !== "KeyE") return;
      event.preventDefault();
      if (input.current.paused || !focused || !controller) return;
      // After blur/pause a held key can keep repeating without a fresh keydown.
      if (event.repeat) return;
      if (code === "Space") hop();
      else if (code === "KeyE") raise();
      else {
        keys.add(code);
        calibrate();
        move();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (!keys.delete(event.code)) return;
      event.preventDefault();
      move();
    };
    const pointerdown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      element.focus({ preventScroll: true });
      if (input.current.paused || !controller) return;
      keys.clear();
      cancelPointer();
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        moved: false,
        touch: event.pointerType !== "mouse",
      };
      element.setPointerCapture(event.pointerId);
      move();
    };
    const pointermove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId || input.current.paused)
        return;
      const x = event.clientX - pointer.x;
      const y = event.clientY - pointer.y;
      if (Math.hypot(x, y) > 7) pointer.moved = true;
      if (!pointer.moved) return;
      drag = { right: x / 80, down: y / 80 };
      move();
    };
    const pointerup = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const wasDrag = pointer.moved;
      const tap = !wasDrag && performance.now() - pointer.time < 350;
      const touch = pointer.touch;
      cancelPointer();
      // Tapping must not re-zero the phone's current steering angle.
      if (wasDrag) calibrate();
      move();
      // Touch taps raise/lower; a mouse click still hops.
      if (tap) {
        if (touch) raise();
        else hop();
      }
    };
    const pointercancel = (event: PointerEvent) => {
      // Normal release also emits lostpointercapture. Ignore that after a
      // completed tap, but clear a genuinely interrupted drag.
      if (pointer?.id === event.pointerId) stop();
    };
    const stageFocus = () => {
      focused = true;
      calibrate();
    };
    const stageBlur = () => {
      focused = false;
      stop();
    };
    const windowBlur = () => {
      reasons.blurred = true;
      stop();
      updatePause();
    };
    const windowFocus = () => {
      reasons.blurred = false;
      reasons.menu = menuIsOpen();
      updatePause();
      if (
        sensorWanted &&
        sensorAttached &&
        sensorStatus === "calibrating" &&
        !input.current.paused
      )
        element.focus({ preventScroll: true });
    };
    const visibility = () => {
      reasons.hidden = document.hidden;
      updatePause();
    };
    const menu = (event: Event) => {
      reasons.menu =
        !desktop.matches &&
        Boolean((event as CustomEvent<{ isOpen: boolean }>).detail?.isOpen);
      stop();
      updatePause();
    };
    const navigationLayout = () => {
      reasons.menu = menuIsOpen();
      updatePause();
    };
    const reducedMotion = () => {
      if (!motionPreference.matches) return;
      userPause.current = reasons.user = true;
      updatePause();
    };
    const rotate = () => {
      stop();
      if (sensorAttached) setSensorStatus("calibrating");
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      stop();
      disableSensor();
      abort.abort();
      controller?.dispose();
      controller = null;
      if (alive) {
        setReady(false);
        setError("WebGL context lost");
      }
    };

    // SPA transitions can keep this page mounted while the destination loads.
    // Revoke a pending permission intent at navigation start, not just unmount.
    const unsubscribeNavigation = router.subscribe(
      "onBeforeNavigate",
      ({ toLocation }) => {
        reasons.navigating = toLocation.pathname !== "/";
        if (reasons.navigating) {
          disableSensor();
          stop();
        }
        updatePause();
      },
    );

    element.addEventListener("keydown", keydown);
    element.addEventListener("keyup", keyup);
    element.addEventListener("pointerdown", pointerdown);
    element.addEventListener("pointermove", pointermove);
    element.addEventListener("pointerup", pointerup);
    element.addEventListener("pointercancel", pointercancel);
    element.addEventListener("lostpointercapture", pointercancel);
    element.addEventListener("focus", stageFocus);
    element.addEventListener("blur", stageBlur);
    host.addEventListener("webglcontextlost", contextLost, true);
    window.addEventListener("blur", windowBlur);
    window.addEventListener("focus", windowFocus);
    window.addEventListener("mobileMenuState", menu);
    window.addEventListener("orientationchange", rotate);
    window.screen.orientation?.addEventListener("change", rotate);
    document.addEventListener("visibilitychange", visibility);
    motionPreference.addEventListener("change", reducedMotion);
    desktop.addEventListener("change", navigationLayout);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (!alive) return;
              reasons.offscreen =
                !entry.isIntersecting || entry.intersectionRatio < 0.01;
              updatePause();
            },
            { threshold: [0, 0.01] },
          );
    observer?.observe(element);

    import("../ThreeStudy")
      .then(({ createThreeStudy }) => {
        if (!alive || abort.signal.aborted) return null;
        return createThreeStudy(
          host,
          (value) => {
            if (alive) setStats(value);
          },
          () => {},
          abort.signal,
          { balance: true },
        );
      })
      .then((value) => {
        if (!value) return;
        if (!alive || abort.signal.aborted) {
          value.dispose();
          return;
        }
        controller = value;
        updatePause();
        setReady(true);
      })
      .catch((reason: unknown) => {
        if (!alive || abort.signal.aborted) return;
        stop();
        host.replaceChildren();
        setReady(false);
        setError(
          reason instanceof Error ? reason.message : "Unable to load sculpture",
        );
      });

    return () => {
      alive = false;
      actions.current = emptyActions;
      unsubscribeNavigation();
      disableSensor();
      stop();
      abort.abort();
      controller?.dispose();
      controller = null;
      host.replaceChildren();
      observer?.disconnect();
      element.removeEventListener("keydown", keydown);
      element.removeEventListener("keyup", keyup);
      element.removeEventListener("pointerdown", pointerdown);
      element.removeEventListener("pointermove", pointermove);
      element.removeEventListener("pointerup", pointerup);
      element.removeEventListener("pointercancel", pointercancel);
      element.removeEventListener("lostpointercapture", pointercancel);
      element.removeEventListener("focus", stageFocus);
      element.removeEventListener("blur", stageBlur);
      host.removeEventListener("webglcontextlost", contextLost, true);
      window.removeEventListener("blur", windowBlur);
      window.removeEventListener("focus", windowFocus);
      window.removeEventListener("mobileMenuState", menu);
      window.removeEventListener("orientationchange", rotate);
      window.screen.orientation?.removeEventListener("change", rotate);
      document.removeEventListener("visibilitychange", visibility);
      motionPreference.removeEventListener("change", reducedMotion);
      desktop.removeEventListener("change", navigationLayout);
    };
  }, [attempt, router]);

  return {
    stage,
    container,
    ready,
    paused,
    raised,
    tilt,
    notice,
    error,
    stats,
    retry: () => setAttempt((value) => value + 1),
    togglePause: () => actions.current.pause(),
    toggleRaised: () => actions.current.raise(),
    recenter: () => actions.current.recenter(),
    toggleTilt: () => actions.current.tilt(),
  };
}
