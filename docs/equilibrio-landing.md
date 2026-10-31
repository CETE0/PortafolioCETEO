# Equilibrio: the native landing toy

The homepage `/` now uses **Three.js Equilibrio**, not the art shooter. The approved original Pícaro meshes, procedural animation, Carbon palette and 2× Bayer grain are preserved. `/experimental/equilibrio` remains the renderer/palette reference study, with its original flat reference physics; no Godot runtime or study dashboard is mounted on the homepage.

## Behavior

An endless physical toy, not a survival challenge: no timer, score, winning, game-over screen or navigation unlocked through play.

- A lightweight two-axis spring platform reacts to the character's weight and angular momentum.
- The slope accelerates the character downhill; walking has inertia rather than instantaneous velocity changes.
- Foot contact is solved against the same rotated top plane that is drawn. This is an analytic toy simulation, **not** a full rigid-body engine.
- Hopping unloads the platform. Landing adds a position-dependent impulse and uses the original landing squash/stretch.
- Raising the original mechanism moves its center-of-gravity proxy higher, increasing leverage and instability.
- An edge fall tumbles out of view, then the character drops back into the center. The unloaded platform keeps settling instead of snapping flat. Manual Recenter deliberately resets it.
- The plank rests tipped (`restTilt` in `balance.ts`), so an idle Pícaro slides off an edge within a few seconds; visits need no interaction or sensor permission.

## Controls and minimal UI

| Input | Behavior |
| --- | --- |
| Arrows / WASD | Screen-relative balance/movement, only while the stage is focused |
| Space / mouse click on stage | Hop |
| E / touch tap / Raise–Lower | Original height mechanism, now with physical leverage; a tap does not erase active tilt calibration |
| Drag and hold | Directional movement, with bounded analog strength |
| Enable tilt | Optional secure-context sensor permission, comfortable-pose calibration, deadzone, smoothing and orientation mapping |
| Pause / Play–Resume | Explicit user choice, including reduced-motion users |
| Recenter | Reset position/rocking and recalibrate active tilt |

The visible homepage has a small title, one terse controls line and four utility buttons. It has no palette/renderer switcher, FPS readout, benchmark controls or scoreboard. Text is localized in English and Spanish. Loading/WebGL/asset failures leave the portfolio navigation usable and offer a retry.

Desktop camera directions, touch drags and tilt all share the same camera-relative screen-to-world mapping. Keyboard events outside the stage are not trapped. Pointer cancellation, capture loss, focus loss and navigation clear movement. Sensor permission is never requested automatically, and denied/unavailable/no-reading cases retain drag/keyboard play.

## Performance and lifecycle

- A deadline-based render clock budgets **at most approximately 60 paints/second on average**, even on 90/120/144/240 Hz displays. This is a ceiling, not a claim of sustained 60 FPS on all phones.
- Physics remains fixed at 60 Hz with bounded catch-up. Pause/resume resets the clock rather than fast-forwarding the toy after a hidden interval.
- Actual WebGL draws stop when hidden, window-blurred, offscreen, explicitly paused, behind mobile navigation, or leaving the route.
- Pause reasons compose: closing a menu or returning onscreen cannot override an explicit pause/reduced-motion choice.
- A paused visible scene may redraw **once** when its size or appearance changes; it does not restart animation. Offscreen dirty buffers are refreshed on return, not repeatedly rendered in the background.
- Model/renderer loading is abortable. Navigation cancels pending sensor intent at **router navigation start**, rather than waiting for a slow destination to unmount the old page.
- GPU resources, observers, listeners, timers and sensor listeners are disposed on unmount. A late permission result cannot attach a listener to a departed page.
- Original scene resolution bounds, 512 px shadow map, one combined dither/output pass and authored geometry are retained. No physics package or new visual-effect dependency was added.

`npm run equilibrio:sizes` follows actual compiled renderer imports, including shared appearance/simulation chunks. It also reports `landing`, adding the landing/controls module while excluding the common portfolio/React/router shell. Stored/estimated compressed sizes are not promises about HTTP transfer encoding. The optional Godot export may be absent without affecting the homepage.

## Implementation changes

| Before | After |
| --- | --- |
| `src/routes/index.tsx`: art shooter inside GameFrame | Lazy client-only Equilibrio landing, themed SSR/loading placeholder; shooter remains available through its existing experimental route |
| `simulation.ts`: animation and flat reference motion intertwined | Original extension and procedural animation helpers shared unchanged by flat-reference and physical adapters |
| Cosmetic rocking over a horizontal contact plane | `balance.ts`: weight torque, angular inertia, downhill gravity, actual rotated-plane contact, hop/landing impulses, raised center of gravity, tumble and continuous-platform return |
| Display-rate painting and visual-only pause state | `render-clock.ts` plus renderer visibility/lifecycle handling; pure high-refresh tests and browser-level GPU draw assertions |
| Reference-only renderer | `ThreeStudy.ts` accepts `{ balance: true }` for production; reference defaults preserve Godot comparisons; diagnostics report contact/phase/inputs without adding visible HUD |
| Large development dashboard | `landing/EquilibrioLanding.tsx`: minimal Carbon UI, stage-scoped interactions, small-viewport height and selectable portfolio navigation |
| Separate prototype input handling | `landing/useLandingControls.ts` and `controls.ts`: screen-relative controls, sensor opt-in/fallback, composed pauses, navigation-start cancellation and cleanup |
| Homepage copy only for shooter | `src/i18n/dict.ts`: English/Spanish Equilibrio instructions, controls and failure notices |
| Size report guessed dependency chunk names | Recursive emitted-import accounting, landing-only additions and support for a missing optional Godot export |
| Prototype-only test coverage | Physical invariants, render deadlines, controls, homepage play/failure/navigation/sensor/performance tests; existing reference and animation checks retained |

## Verification

Local production validation: **37 unit tests and 17 browser tests passed**, including all nine homepage cases. Typecheck, scoped formatting, build, existing animation tests and route/asset smoke checks passed. Adversarial browser play also found no normal-play console errors. Screenshots: [desktop](images/equilibrio/landing-desktop.png) · [mobile](images/equilibrio/landing-mobile.png).

```sh
npm run check
npm run test:equilibrio
npm run test:anim
npm run format:equilibrio
npm run format:check:equilibrio
npm run build
npm run preview -- --port 3028 --strictPort
# Native homepage checks do not require a Godot export:
EXPECT_BASE_URL=http://localhost:3028 npm run test:equilibrio:landing
# Full suite, if the optional Godot reference export has been built:
EXPECT_BASE_URL=http://localhost:3028 npm run test:equilibrio:browser
npm run smoke -- http://localhost:3028
npm run equilibrio:sizes
```

The pure tests cover stable idle, weight/height leverage, matching plane geometry, inertia, jumping and landing, tumble/return, explicit reset, pause, long/adversarial inputs, and high-refresh render deadlines. Shared control tests cover axis mapping, diagonal normalization, deadzone/orientation and all pause combinations.

Browser coverage includes: one native canvas and no shooter/Godot fetches on the homepage; real weight/hop/fall/return interaction; actual draw-call cessation; paused offscreen resizing; mobile footer/menu and breakpoint transitions; reduced motion; translated controls; motion denial/no-readings/synthetic readings; tilt-preserving taps; late permission during client navigation; failed assets/WebGL and retry; canvas cleanup after navigation. The reference study's appearance/palette/benchmark checks still run.

**The automated browser is Chromium with SwiftShader software rendering.** It verifies behavior and draw cessation, not physical-phone GPU speed, thermals, battery usage or sensor feel. No deployment was performed. No project-wide ESLint script is configured; add one separately rather than calling typechecking a lint pass.

## Still requires a physical phone over HTTPS

1. iOS Safari permission prompt, decline, enable, disable, recenter, background and return.
2. Android Chrome and iOS portrait/landscape calibration, small tilts and comfortable deadzone.
3. Hold a tilt while tapping: hopping must keep steering and must not redefine neutral.
4. Toggle Raise/Lower and judge weight, recovery hops, edge behavior and the drop-back pacing.
5. Browser toolbar/safe-area fit, navigation accessibility and reduced-motion behavior.
6. Repeat on a high-refresh device, then play for several minutes to inspect sustained frame rate, heating and battery draw. Adjust the render ceiling/resolution only from those measurements.

HTTP on a LAN address is generally not a secure motion-sensor context; localhost desktop automation does not establish this phone pass. Use an authorized HTTPS staging deployment for it.
