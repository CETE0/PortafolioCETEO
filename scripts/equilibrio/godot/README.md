# Equilibrio — isolated Godot renderer

Godot 4.5.1 Compatibility, single-threaded web export. No campaign, audio assets, dependencies, PWA, fullscreen prompt, or cross-origin isolation headers. Starts automatically. Output URL: `/equilibrio/godot/index.html`.

## Build / check

From the portfolio root:

```sh
node scripts/equilibrio/export-godot.mjs
node scripts/equilibrio/export-godot.mjs --check-only
node --check scripts/equilibrio/export-godot.mjs
node --check scripts/equilibrio/godot/serve-test.mjs
```

The build creates `scripts/equilibrio/godot/.generated/project`, imports it headlessly, runs 120 demo frames headlessly, checks for script errors (even if Godot exits zero), then exports release files to `public/equilibrio/godot/`. It **never opens the original project in Godot**. The workdir/cache is ignored locally; the host project decides whether to ignore public exports.

Defaults can be overridden with `GODOT_BIN`, `EQUILIBRIO_GODOT_SOURCE`, and `GODOT_WEB_TEMPLATE`. If only desktop templates are installed, the script retrieves just `web_nothreads_release.zip` from the official 4.5.1 template archive using ZIP byte ranges (~9.4 MB), caches it under `.generated/templates`, and uses it as a custom release template. No install/package changes.

Copied verbatim from the original repo:

- `Recursos Imagen/PICARO/{Base,Caja,Tubo}.{obj,mtl,obj.import}`.
- `Personaje/Picaro.tscn`: **all original mesh transforms and AnimationPlayer tracks unchanged**.
- `Personaje/animador_picaro.gd`: **byte-identical original**, with its foot pivot `(0,-0.96,0)` and original spring/gait parameters.
- `Render/dither_2d.gdshader`: original two-color Bayer pass, unchanged; navy `#121738` / cream `#f5e8c7` set as uniforms.

The isolated `Personaje/picaro.gd` replaces only the campaign controller. `indicaciones.gd` is a hidden-label compatibility stub. No other campaign assets are copied. The build verifies scene/animator byte equality after export.

## Scene

- Camera `(19,16,23)`, looks at `(0,2,0)`; orthographic vertical size 16, multiplied by `max(1,1/aspect)` in portrait.
- Internal 3D viewport is 576 pixels wide with aspect-matched height, scaled down if either dimension exceeds 768. Nearest presentation; no MSAA/heavy effects.
- Isolated `12 × 0.7 × 9` plinth, collision top `y=0`; spawn origin `y=0.96`, original neutral visible height ~5.67.
- World-axis movement speed 7, jump 10, gravity -24.8, original yaw interpolation 10. Original animator receives jump, landing, state-change and transition-finished signals.
- Neutral-gray character and plinth, upper-left directional light and basic shadows. Plinth rocking is **visual only**; collision remains horizontal.
- Walk off any edge; falling below `y=-14` increments the cumulative fall counter and recenters. Explicit reset also recenters, retaining the counter and raised state.
- Deterministic demo: `x=sin(t*1.1)*0.32`, `z=cos(t*1.3)*0.24`, hop every 3 seconds; demo clock restarts when toggled or recentered.
- `dither`: original shader. `solid`: unprocessed gray-lit render. `ascii`: inexpensive procedural 5×7 glyphs in 8×10 source-pixel cells, sampled from scene luminance; no font/atlas assets.

## Host protocol (unchanged)

Parent posts to the iframe with `targetOrigin=location.origin`:

```js
{
  source: 'equilibrio-host', type: 'input',
  x: 0, z: 0, jump: 0, raised: false,
  mode: 'dither', // 'ascii' | 'solid'
  paused: false, demo: false, reset: 0
}
```

- Only messages from `window.parent` **and the same origin** are accepted. Numeric axes are finite/clamped; counters are nonnegative integers; unsupported modes are ignored. Partial updates retain prior values.
- Shell stores sanitized state in `window.__equilibrioInput`; GDScript reads it each process frame.
- `x/z` are **world-space**, not camera-relative. Diagonal magnitude is limited to 1.
- `jump/reset` are edge counters: any changed value triggers once, not once per frame. Jump requests while airborne/paused are consumed, not queued.
- The iframe does not poll keyboard/touch/pointer controls. Host owns input and UI.
- Pause stops the scene tree's simulation, the 3D viewport updates, and Godot's render loop. Root message polling and ~1 Hz stats continue, so resume cannot deadlock. One initial frame is always presented before honoring an initially paused host.

Iframe posts to parent, same origin:

```js
{ source: 'equilibrio-godot', type: 'ready' }
{ source: 'equilibrio-godot', type: 'stats',
  fps, frameMs, frameSamples, drawCalls, triangles, fallCount, x, y, z, grounded }
{ source: 'equilibrio-godot', type: 'error', message }
```

`ready` is sent once after the first rendered frame. `fps/frameMs` are average rendered-loop intervals over ~1 second, **not GPU timings**; paused intervals report zero. `frameSamples` contains the individual process-frame intervals for that second, so the host can calculate p95 and long-frame counts without substituting the parent's animation-frame cadence. Godot Performance supplies draw/primitive counters, which include shadow/presentation work and are the last rendered frame's counters while paused. Runtime JS errors, rejected promises, and Godot error output are forwarded.

## Browser verification

```sh
node scripts/equilibrio/godot/serve-test.mjs
# Open http://127.0.0.1:4179 and click “Run adversarial checks”.
```

This dependency-free static server deliberately sends **no COOP/COEP headers**. Test UI is source-only and not shipped in the export. The test runs 13 assertions: first-frame ready, original standing height, movement, pause/resume, hop, edge fall/reset, all render modes/extension playback, bounded demo, wrong-sender rejection, invalid-data sanitization, zero runtime errors. All passed after fixing a late loading-progress callback. Expect browser runs also verified all three modes visually, portrait, and repeated pause/resume. An additional initially-paused startup test passed. Local headless Chromium/SwiftShader example counters were 11 draw calls and 8,474 rendered primitives; do not treat software FPS as production performance.

Artifacts/logs/screenshots are in ignored `.generated/`. Expect metadata is also ignored. No lint/format script currently exists for these source files; add a GDScript formatter/linter if this prototype grows.

## Export sizes / limitations

The stock engine is **38,034,280 bytes uncompressed**, exceeding Cloudflare's 25 MiB per-asset limit. The export script now writes **`index.wasm.gz` (~9.24 MB)** and removes the oversized raw file. A narrow, checked modification to the generated Godot preloader routes its fetch through the shell's `__equilibrioFetch`: it stream-decompresses gzip with `DecompressionStream`, preserving streaming WebAssembly compilation. If the server sends `Content-Encoding: gzip` (Vite does), fetch has already decompressed the body and the helper skips the second decode. Workers serves the stored archive without that header, so the helper decodes it. Regression tests cover both paths. All other fetches remain ordinary fetches. No custom response headers or cross-origin isolation are required.

This is transport compression, **not** a smaller engine in memory. When HTTP has not already decoded gzip, it requires a modern browser with `DecompressionStream`; unsupported browsers receive an error and can use Three.js. The build fails rather than silently patching an unexpected future engine-loader version. The original scene and animator remain unchanged.

`npm run equilibrio:sizes` reports current individual and total raw/gzip sizes after a production build. Current scene export is ~9.88 MB stored, ~9.55 MB with the remaining text/pack resources compressed. The two tiny worklets are stock engine support, not campaign audio. Generated export files and build caches are ignored, not committed. Rebuild them before testing Godot after a fresh checkout.

This is a renderer comparison, not identical physics: Godot keeps the original full box colliders, so edge support extends beyond the character's center and standing origin settles at ~0.9589 from the original collision bounds. Animation is the actual original GDScript at render cadence; Three.js is a port, so exact timing/shading/primitive counts need not match. Visual plinth tilt does not affect collision or impart force. The ASCII mode is a lightweight interpretation, not the original game's renderer.
