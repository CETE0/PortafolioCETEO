import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultGrain,
  defaultPalette,
  getStageColors,
  normalizeGrain,
  sculpturePalettes,
  type SculpturePalette,
} from "./appearance";
import {
  clamp,
  frameSummary,
  idleInput,
  type RenderMode,
  type ToyInput,
} from "./simulation";
import type { StudyStats } from "./ThreeStudy";

type Engine = "three" | "godot";
type Result = {
  engine: Engine;
  mode: RenderMode;
  palette: SculpturePalette | "godot-reference";
  grain: number;
  readyMs: number | null;
  measuredAt: string;
  durationSeconds: number;
  frames: ReturnType<typeof frameSummary>;
  resources: {
    url: string;
    encodedBytes: number;
    transferredBytes: number;
    durationMs: number;
  }[];
};
type MotionPermissionEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

const label = { three: "Three.js", godot: "Godot web" };
const button =
  "min-h-10 border border-rule px-3 py-2 text-xs transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40";

export default function EquilibrioStudy() {
  const [engine, setEngine] = useState<Engine>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("engine") === "godot"
      ? "godot"
      : "three",
  );
  const [mode, setMode] = useState<RenderMode>("dither");
  const [palette, setPalette] = useState<SculpturePalette>(defaultPalette);
  const [grain, setGrain] = useState(defaultGrain);
  const [demo, setDemo] = useState(false);
  const [raised, setRaised] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [motion, setMotion] = useState<"off" | "calibrating" | "on">("off");
  const [notice, setNotice] = useState("");
  const [measuring, setMeasuring] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [restart, setRestart] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const input = useRef<ToyInput>({ ...idleInput });
  const controller = useRef<{
    setInput: (input: ToyInput) => void;
    dispose: () => void;
  } | null>(null);
  const onFrame = useRef<(ms: number) => void>(() => {});
  const measurement = useRef<{
    start: number;
    frames: number[];
    engine: Engine;
    mode: RenderMode;
    palette: SculpturePalette | "godot-reference";
    grain: number;
  } | null>(null);
  const loadStart = useRef(0);
  const orientation = useRef<{ beta: number; gamma: number } | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const keys = useRef(new Set<string>());

  const send = useCallback((patch: Partial<ToyInput> = {}) => {
    Object.assign(input.current, patch);
    controller.current?.setInput(input.current);
    iframe.current?.contentWindow?.postMessage(
      { source: "equilibrio-host", type: "input", ...input.current },
      window.location.origin,
    );
  }, []);

  const cancelMeasurement = useCallback(() => {
    measurement.current = null;
    setMeasuring(false);
  }, []);

  useEffect(() => {
    send({ mode, demo, raised, palette, grain });
  }, [mode, demo, raised, palette, grain, send]);

  useEffect(cancelMeasurement, [
    mode,
    raised,
    palette,
    grain,
    cancelMeasurement,
  ]);

  useEffect(() => {
    let alive = true;
    const abort = new AbortController();
    setReady(false);
    setReadyMs(null);
    setStats(null);
    setError("");
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setDemo(false);
    setRaised(false);
    setMotion("off");
    orientation.current = null;
    keys.current.clear();
    cancelMeasurement();
    input.current = {
      ...idleInput,
      mode: input.current.mode,
      palette: input.current.palette,
      grain: input.current.grain,
      paused: document.hidden,
    };
    loadStart.current = performance.now();
    if (engine === "three" && container.current) {
      const element = container.current;
      import("./ThreeStudy")
        .then(({ createThreeStudy }) => {
          if (!alive) return null;
          return createThreeStudy(
            element,
            (value) => {
              if (alive) setStats(value);
            },
            (ms) => onFrame.current(ms),
            abort.signal,
          );
        })
        .then((value) => {
          if (!alive || !value) {
            value?.dispose();
            return;
          }
          controller.current = value;
          value.setInput(input.current);
          setReadyMs(performance.now() - loadStart.current);
          setReady(true);
        })
        .catch((reason: unknown) => {
          if (alive)
            setError(
              reason instanceof Error
                ? reason.message
                : "Three.js could not start.",
            );
        });
    }
    return () => {
      alive = false;
      abort.abort();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [engine, restart, cancelMeasurement]);

  useEffect(() => {
    if (engine !== "godot") return;
    const timeout = window.setTimeout(() => {
      setError(
        "Godot has not started. Build its web export with npm run equilibrio:godot, then retry. Check the network panel for blocked WebAssembly.",
      );
    }, 60000);
    const listener = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      const data = event.data;
      if (!data || data.source !== "equilibrio-godot") return;
      if (data.type === "ready") {
        clearTimeout(timeout);
        setError("");
        setReady(true);
        setReadyMs(performance.now() - loadStart.current);
        send();
      } else if (
        data.type === "stats" &&
        Number.isFinite(data.fps) &&
        Number.isFinite(data.frameMs)
      ) {
        setStats(data);
        if (Array.isArray(data.frameSamples))
          for (const ms of data.frameSamples) {
            if (Number.isFinite(ms)) onFrame.current(ms);
          }
      } else if (data.type === "error") {
        clearTimeout(timeout);
        setError(
          typeof data.message === "string"
            ? data.message
            : "Godot could not start.",
        );
      }
    };
    window.addEventListener("message", listener);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", listener);
    };
  }, [engine, restart, send]);

  useEffect(() => {
    let menuOpen = false;
    const update = () => {
      if (document.hidden || menuOpen) cancelMeasurement();
      if (paused || document.hidden || menuOpen) {
        keys.current.clear();
        pointer.current = null;
        send({ x: 0, z: 0 });
      }
      send({ paused: paused || document.hidden || menuOpen });
    };
    const menu = (event: Event) => {
      menuOpen = Boolean(
        (event as CustomEvent<{ isOpen: boolean }>).detail?.isOpen,
      );
      keys.current.clear();
      send({ x: 0, z: 0 });
      update();
    };
    const blur = () => {
      keys.current.clear();
      pointer.current = null;
      send({ x: 0, z: 0 });
    };
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("mobileMenuState", menu);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("mobileMenuState", menu);
      window.removeEventListener("blur", blur);
    };
  }, [paused, engine, ready, send, cancelMeasurement]);

  useEffect(() => {
    const move = (event: KeyboardEvent, down: boolean) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !stage.current?.contains(target))
        return;
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "a",
          "d",
          "w",
          "s",
          " ",
          "e",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      // A held key can repeat after blur without a new intentional key press.
      if (
        down &&
        (input.current.paused || (event.repeat && !keys.current.has(event.key)))
      )
        return;
      if (down && !event.repeat && event.key === " ")
        send({ jump: input.current.jump + 1 });
      if (down && !event.repeat && event.key === "e")
        setRaised((value) => !value);
      if (down) keys.current.add(event.key);
      else keys.current.delete(event.key);
      send({
        x:
          Number(keys.current.has("ArrowRight") || keys.current.has("d")) -
          Number(keys.current.has("ArrowLeft") || keys.current.has("a")),
        z:
          Number(keys.current.has("ArrowDown") || keys.current.has("s")) -
          Number(keys.current.has("ArrowUp") || keys.current.has("w")),
      });
    };
    const down = (event: KeyboardEvent) => move(event, true);
    const up = (event: KeyboardEvent) => move(event, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [send]);

  useEffect(() => {
    if (motion === "off") return;
    const listener = (event: DeviceOrientationEvent) => {
      if (input.current.paused || event.beta === null || event.gamma === null)
        return;
      if (!orientation.current) {
        orientation.current = { beta: event.beta, gamma: event.gamma };
        setMotion("on");
        setNotice(
          "Tilt calibrated. Hold comfortably; recalibrate after rotating the screen.",
        );
      }
      const baseline = orientation.current;
      let x = clamp((event.gamma - baseline.gamma) / 22, -1, 1);
      let z = clamp((event.beta - baseline.beta) / 22, -1, 1);
      const angle = ((screen.orientation?.angle ?? 0) * Math.PI) / 180;
      [x, z] = [
        x * Math.cos(angle) + z * Math.sin(angle),
        -x * Math.sin(angle) + z * Math.cos(angle),
      ];
      const deadZone = (value: number) =>
        Math.abs(value) < 0.1
          ? 0
          : (Math.sign(value) * (Math.abs(value) - 0.1)) / 0.9;
      send({
        x: input.current.x + (deadZone(x) - input.current.x) * 0.2,
        z: input.current.z + (deadZone(z) - input.current.z) * 0.2,
      });
    };
    const recalibrate = () => {
      orientation.current = null;
      send({ x: 0, z: 0 });
      setMotion("calibrating");
    };
    const timeout = window.setTimeout(() => {
      if (!orientation.current) {
        setMotion("off");
        setNotice(
          "No motion readings received. Drag to move and tap to jump instead.",
        );
      }
    }, 5000);
    window.addEventListener("deviceorientation", listener);
    screen.orientation?.addEventListener("change", recalibrate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("deviceorientation", listener);
      screen.orientation?.removeEventListener("change", recalibrate);
    };
  }, [motion !== "off", send]);

  const enableMotion = async () => {
    if (motion !== "off") {
      setMotion("off");
      orientation.current = null;
      send({ x: 0, z: 0 });
      return;
    }
    if (!window.isSecureContext || !("DeviceOrientationEvent" in window)) {
      setNotice(
        "Motion is unavailable here. Drag to move and tap to jump; HTTPS is required on a phone.",
      );
      return;
    }
    try {
      const permission = (DeviceOrientationEvent as MotionPermissionEvent)
        .requestPermission;
      if (
        permission &&
        (await permission.call(DeviceOrientationEvent)) !== "granted"
      ) {
        setNotice(
          "Motion permission was not granted. Drag and tap still work.",
        );
        return;
      }
      orientation.current = null;
      setMotion("calibrating");
      setNotice("Hold your phone comfortably while tilt calibrates…");
    } catch {
      setNotice("Motion could not be enabled. Drag and tap still work.");
    }
  };

  useEffect(() => {
    onFrame.current = (ms) => {
      if (measurement.current && !input.current.paused && ms > 0 && ms < 1000)
        measurement.current.frames.push(ms);
    };
    if (!measuring) return;
    const timeout = window.setTimeout(() => {
      const current = measurement.current;
      if (!current) return;
      const timelines = [{ timeline: performance, start: loadStart.current }];
      const childPerformance = iframe.current?.contentWindow?.performance;
      if (current.engine === "godot" && childPerformance)
        timelines.push({ timeline: childPerformance, start: 0 });
      const resources = timelines.flatMap(({ timeline, start }) =>
        timeline
          .getEntriesByType("resource")
          .filter((entry) => entry.startTime >= start)
          .filter(
            (entry) =>
              entry.name.includes("/equilibrio/") ||
              /ThreeStudy|three[._-]|OBJLoader|EffectComposer|ShaderPass|RenderPass|OutputPass/.test(
                entry.name,
              ),
          )
          .map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              url: new URL(entry.name).pathname,
              encodedBytes: resource.encodedBodySize,
              transferredBytes: resource.transferSize,
              durationMs: entry.duration,
            };
          }),
      );
      setResults((previous) => [
        ...previous,
        {
          engine: current.engine,
          mode: current.mode,
          palette: current.palette,
          grain: current.grain,
          readyMs,
          measuredAt: new Date().toISOString(),
          durationSeconds: (performance.now() - current.start) / 1000,
          frames: frameSummary(current.frames),
          resources,
        },
      ]);
      cancelMeasurement();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [measuring, readyMs, cancelMeasurement]);

  const benchmark = () => {
    setPaused(false);
    setDemo(true);
    send({ demo: true, paused: false, reset: input.current.reset + 1 });
    measurement.current = {
      start: performance.now(),
      frames: [],
      engine,
      mode,
      palette: engine === "three" ? palette : "godot-reference",
      grain: engine === "three" ? grain : 1,
    };
    setMeasuring(true);
  };
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            note: "Frame intervals are not GPU timings. Run one engine at a time in the same browser; startup is cache-sensitive. Compare production builds on physical phones before selecting a homepage engine.",
            userAgent: navigator.userAgent,
            viewport: {
              width: innerWidth,
              height: innerHeight,
              dpr: devicePixelRatio,
            },
            results,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "equilibrio-comparison.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const changeEngine = (next: Engine) => {
    if (next === engine) return;
    cancelMeasurement();
    setEngine(next);
  };
  const stopPointer = (jump: boolean) => {
    if (pointer.current && jump && !pointer.current.moved)
      send({ jump: input.current.jump + 1 });
    pointer.current = null;
    send({ x: 0, z: 0 });
  };

  const stageColors = getStageColors(palette, mode, engine === "godot");

  return (
    <div className="h-full overflow-y-auto bg-white text-ink">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-muted">
              PLAYABLE SCULPTURE / THREE.JS DEVELOPMENT
            </p>
            <h1 className="font-display text-5xl font-bold tracking-tight">
              EQUILIBRIO
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Built in Three.js with the original Pícaro meshes and motion. Godot
            stays here as the visual reference. No score, no winning.
          </p>
        </header>

        <section
          aria-label="Renderer comparison controls"
          className="flex flex-wrap justify-between gap-3 border-t border-rule py-3"
        >
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Engine"
          >
            {(["three", "godot"] as const).map((value) => (
              <button
                key={value}
                className={`${button} ${engine === value ? "border-ink bg-ink text-white" : ""}`}
                aria-pressed={engine === value}
                onClick={() => changeEngine(value)}
              >
                {label[value]}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Shading"
          >
            {(["dither", "ascii", "solid"] as const).map((value) => (
              <button
                key={value}
                className={`${button} ${mode === value ? "border-ink bg-ink text-white" : ""}`}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === "ascii"
                  ? "ASCII"
                  : value === "dither"
                    ? "Dither"
                    : "Unshaded"}
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label="Native appearance"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pb-3 pt-3"
        >
          <div
            role="group"
            aria-label="Palette"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted">
              Palette
            </span>
            {sculpturePalettes.map((option) => (
              <button
                key={option.id}
                className={`${button} flex items-center gap-2 ${palette === option.id ? "border-ink" : ""}`}
                title={option.description}
                aria-pressed={palette === option.id}
                disabled={engine !== "three"}
                onClick={() => setPalette(option.id)}
              >
                <span
                  aria-hidden="true"
                  className="flex h-4 w-6 overflow-hidden border border-black/10"
                >
                  <span
                    className="w-1/2"
                    style={{ backgroundColor: option.dark }}
                  />
                  <span
                    className="w-1/2"
                    style={{ backgroundColor: option.light }}
                  />
                </span>
                {option.name}
              </button>
            ))}
          </div>
          <label
            htmlFor="equilibrio-grain"
            className="flex min-h-10 items-center gap-3 font-mono text-[10px] text-muted"
          >
            Dither grain
            <input
              id="equilibrio-grain"
              type="range"
              min="1"
              max="3"
              step="1"
              value={grain}
              disabled={engine !== "three" || mode !== "dither"}
              onChange={(event) =>
                setGrain(normalizeGrain(event.currentTarget.valueAsNumber))
              }
              className="h-10 w-24 accent-red-600 disabled:opacity-40"
            />
            <output
              htmlFor="equilibrio-grain"
              className="w-5 tabular-nums text-ink"
            >
              {grain}×
            </output>
          </label>
          {engine === "godot" && (
            <p className="w-full text-xs text-muted">
              Godot keeps its original reference palette and grain.
            </p>
          )}
        </section>

        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-label="Interactive Equilibrio stage. Drag to move, tap to jump, or use arrow keys and space. E raises or lowers the character."
          className="relative h-[52vh] min-h-[300px] max-h-[600px] touch-none overflow-hidden outline-offset-4 focus-visible:outline-2 focus-visible:outline-red-600"
          style={{
            backgroundColor: stageColors.background,
            color: stageColors.foreground,
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (!start || start.id !== event.pointerId) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.hypot(dx, dy) > 7) start.moved = true;
            if (start.moved)
              send({ x: clamp(dx / 90, -1, 1), z: clamp(dy / 90, -1, 1) });
          }}
          onPointerUp={() => stopPointer(true)}
          onPointerCancel={() => stopPointer(false)}
          onLostPointerCapture={() => stopPointer(false)}
          onBlur={() => {
            keys.current.clear();
            send({ x: 0, z: 0 });
          }}
        >
          {engine === "three" ? (
            <div ref={container} className="absolute inset-0" />
          ) : (
            <iframe
              key={restart}
              ref={iframe}
              src="/equilibrio/godot/index.html"
              title="Equilibrio Godot web renderer"
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full w-full border-0"
              onLoad={(event) => {
                if (
                  !event.currentTarget.contentDocument?.getElementById("canvas")
                )
                  setError(
                    "Godot web export is missing. Run npm run equilibrio:godot, then retry.",
                  );
              }}
            />
          )}
          {!ready && !error && (
            <div
              role="status"
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs text-current"
            >
              Loading {label[engine]}…
            </div>
          )}
          {paused && ready && (
            <div
              className="pointer-events-none absolute left-4 top-4 px-3 py-2 font-mono text-xs text-current"
              style={{ backgroundColor: stageColors.background }}
            >
              PAUSED
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-sm text-current"
              style={{ backgroundColor: stageColors.background }}
            >
              <p className="max-w-md">{error}</p>
              <button
                className="min-h-10 border border-current px-4 py-2"
                onClick={(event) => {
                  event.stopPropagation();
                  setRestart((value) => value + 1);
                }}
              >
                Retry renderer
              </button>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] tracking-wider text-current opacity-70">
            DRAG / ARROWS TO MOVE · TAP / SPACE TO HOP
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-rule py-3">
          <button
            className={button}
            disabled={!ready}
            onClick={() => send({ jump: input.current.jump + 1 })}
          >
            Hop
          </button>
          <button
            className={button}
            disabled={!ready}
            aria-pressed={raised}
            onClick={() => setRaised((value) => !value)}
          >
            {raised ? "Lower" : "Raise"}
          </button>
          <button
            className={button}
            disabled={!ready}
            aria-pressed={demo}
            onClick={() => {
              cancelMeasurement();
              setDemo((value) => !value);
            }}
          >
            Motion demo
          </button>
          <button
            className={button}
            disabled={!ready}
            aria-pressed={paused}
            onClick={() => {
              cancelMeasurement();
              setPaused((value) => !value);
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className={button}
            disabled={!ready}
            onClick={() => send({ reset: input.current.reset + 1 })}
          >
            Recenter
          </button>
          <button
            className={button}
            disabled={!ready}
            aria-pressed={motion !== "off"}
            onClick={enableMotion}
          >
            {motion === "off"
              ? "Enable tilt"
              : motion === "calibrating"
                ? "Calibrating tilt…"
                : "Disable tilt"}
          </button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-xs text-muted">
          {notice ||
            "Motion access is optional. This is the reference study; the homepage runs the balance toy."}
        </p>

        <section
          aria-label="Live renderer measurements"
          className="mt-6 grid grid-cols-2 gap-4 font-mono text-xs md:grid-cols-4"
        >
          <Metric
            title="Scene ready"
            value={readyMs === null ? "—" : `${Math.round(readyMs)} ms`}
          />
          <Metric
            title="Frame rate"
            value={!stats ? "—" : `${stats.fps.toFixed(1)} fps`}
          />
          <Metric
            title="Frame interval"
            value={!stats ? "—" : `${stats.frameMs.toFixed(2)} ms`}
          />
          <Metric
            title="Draw calls / triangles"
            value={
              !stats
                ? "—"
                : `${stats.drawCalls} / ${stats.triangles.toLocaleString()}`
            }
          />
        </section>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Only the selected engine runs. Three.js concentrates its 576 px scene
          buffer on the sculpture on wide screens, and adapts to portrait
          (height capped at 768 px). Frame interval is not GPU execution time;
          startup depends on cache. Platform rocking is still visual, with a
          level collision surface.
        </p>

        <section
          aria-label="Benchmark results"
          className="mt-6 border-t border-rule pt-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`${button} border-ink`}
              disabled={!ready || measuring || Boolean(error)}
              onClick={benchmark}
            >
              {measuring
                ? "Measuring for 15 seconds…"
                : "Measure 15-second demo"}
            </button>
            <button
              className={button}
              disabled={!results.length}
              onClick={download}
            >
              Download results
            </button>
            {measuring && (
              <button className={button} onClick={cancelMeasurement}>
                Cancel measurement
              </button>
            )}
          </div>
          <div aria-live="polite" className="mt-4 overflow-x-auto">
            {results.length > 0 && (
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-rule text-muted">
                    <th className="py-2">Engine / shading</th>
                    <th>Ready</th>
                    <th>FPS</th>
                    <th>p95 interval</th>
                    <th>Frames &gt;50 ms</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-rule">
                      <td className="py-3">
                        {label[result.engine]} / {result.mode}
                        {result.engine === "three" && (
                          <span className="ml-2 text-muted">
                            {result.palette} · {result.grain}×
                          </span>
                        )}
                      </td>
                      <td>
                        {result.readyMs === null
                          ? "—"
                          : `${Math.round(result.readyMs)} ms`}
                      </td>
                      <td>
                        {result.frames
                          ? result.frames.fps.toFixed(1)
                          : "No samples"}
                      </td>
                      <td>
                        {result.frames
                          ? `${result.frames.p95FrameMs.toFixed(2)} ms`
                          : "—"}
                      </td>
                      <td>{result.frames?.longFrames ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Palette and grain are saved with each result. For a renderer
            comparison, use the same shading, 1× grain, and window size. For
            download and cold-start comparisons, use a production build and
            fresh browser contexts. Desktop results do not establish phone
            battery use or sensor feel.
          </p>
          <output id="equilibrio-diagnostics" className="sr-only">
            {JSON.stringify({
              engine,
              mode,
              palette,
              grain,
              ready,
              paused,
              demo,
              raised,
              readyMs,
              stats,
              measuring,
              results,
            })}
          </output>
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">
        {title}
      </p>
      <p className="tabular-nums">{value}</p>
    </div>
  );
}
