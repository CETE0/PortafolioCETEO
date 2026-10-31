import * as THREE from "three";
import { defaultPalette, getPalette, normalizeGrain } from "./appearance";
import {
  createBalanceToy,
  platformGeometry,
  stepBalanceToy,
  type BalancePhase,
} from "./balance";
import { advanceRenderClock, createRenderClock } from "./render-clock";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import {
  createGlyphs,
  createSculptureMaterial,
  getRenderLayout,
  sculptureShading,
} from "./rendering";
import {
  extensionPose,
  frameSummary,
  idleInput,
  stepToy,
  type ToyInput,
} from "./simulation";

export type StudyStats = {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  fallCount: number;
  x: number;
  y: number;
  z: number;
  grounded: boolean;
  platformX: number;
  platformZ: number;
  phase: BalancePhase;
  renderFrames: number;
  simulationSteps: number;
  inputX: number;
  inputZ: number;
};

export async function createThreeStudy(
  container: HTMLElement,
  onStats: (stats: StudyStats) => void,
  onFrame: (milliseconds: number) => void,
  signal: AbortSignal,
  options: { balance?: boolean } = {},
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  renderer.domElement.style.cssText =
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:block;image-rendering:pixelated";
  renderer.domElement.setAttribute(
    "aria-label",
    "Pícaro balancing on a wooden platform, rendered in Three.js",
  );
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const background = new THREE.Color(
    getPalette(defaultPalette).sourceBackground,
  );
  scene.background = background;
  const camera = new THREE.OrthographicCamera();
  camera.position.set(19, 16, 23);
  camera.lookAt(0, 2, 0);
  camera.near = 0.1;
  camera.far = 100;
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.25));
  const light = new THREE.DirectionalLight(0xffffff, Math.PI);
  light.position.set(-10, 18, 12);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  Object.assign(light.shadow.camera, {
    left: -10,
    right: 10,
    top: 12,
    bottom: -10,
    near: 1,
    far: 50,
  });
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = 0.02;
  scene.add(light);
  const highlightCeiling = {
    value: getPalette(defaultPalette).highlightCeiling,
  };
  const material = createSculptureMaterial("#b8b8b8", highlightCeiling);
  const platformMaterial = createSculptureMaterial("#8f8f8f", highlightCeiling);
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(
      platformGeometry.width,
      platformGeometry.thickness,
      platformGeometry.depth,
    ),
    platformMaterial,
  );
  platform.position.y = -platformGeometry.thickness / 2;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);
  const support = new THREE.Group();
  const character = new THREE.Group();
  const footPivot = new THREE.Group();
  const visual = new THREE.Group();
  // pose() in the original animator: T(feet + bob) * rotation * scale * T(-feet).
  visual.position.y = 0.96;
  footPivot.add(visual);
  character.add(footPivot);
  support.add(character);
  scene.add(support);
  const glyphs = createGlyphs();
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const pass = new ShaderPass(sculptureShading);
  pass.uniforms.glyphs.value = glyphs;
  composer.addPass(pass);
  const loading = new AbortController();
  let frame = 0;
  let disposed = false;
  let clock = createRenderClock();
  let previousPaint = 0;
  let statsTime = performance.now();
  let renderFrames = 0;
  let simulationSteps = 0;
  let inView = true;
  let loaded = false;
  let dirty = true;
  let redraw = () => {};
  let requestFrame = () => {};
  let accumulator = 0;
  let input = { ...idleInput };
  const toy = createBalanceToy();
  const step = options.balance ? stepBalanceToy : stepToy;
  const samples: number[] = [];
  const suspended = () => input.paused || document.hidden || !inView;
  const snapshot = (fps = 0, frameMs = 0) => ({
    fps,
    frameMs,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    fallCount: toy.falls,
    x: toy.x,
    y: toy.y,
    z: toy.z,
    grounded: toy.grounded,
    platformX: toy.platformX,
    platformZ: toy.platformZ,
    phase: toy.balancePhase,
    renderFrames,
    simulationSteps,
    inputX: input.x,
    inputZ: input.z,
  });
  const syncLoop = () => {
    if (disposed) return;
    if (suspended()) {
      cancelAnimationFrame(frame);
      frame = 0;
      clock = createRenderClock();
      previousPaint = 0;
      accumulator = 0;
      samples.length = 0;
      statsTime = performance.now();
      if (loaded) {
        if (dirty && inView && !document.hidden) redraw();
        onStats(snapshot());
      }
    } else requestFrame();
  };
  const visibilityObserver =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          syncLoop();
        });
  visibilityObserver?.observe(container);
  document.addEventListener("visibilitychange", syncLoop);
  const geometries = new Set<THREE.BufferGeometry>([platform.geometry]);
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    dirty = true;
    const layout = getRenderLayout(width, height);
    const { aspect, renderWidth, renderHeight, cameraHeight: size } = layout;
    renderer.domElement.style.width = `${layout.contentWidth}px`;
    renderer.domElement.style.height = `${layout.contentHeight}px`;
    renderer.setSize(renderWidth, renderHeight, false);
    composer.setSize(renderWidth, renderHeight);
    pass.uniforms.resolution.value.set(renderWidth, renderHeight);
    camera.left = (-size * aspect) / 2;
    camera.right = (size * aspect) / 2;
    camera.top = size / 2;
    camera.bottom = -size / 2;
    camera.updateProjectionMatrix();
    if (input.paused && inView && !document.hidden) redraw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loading.abort();
    cancelAnimationFrame(frame);
    observer.disconnect();
    visibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", syncLoop);
    geometries.forEach((geometry) => geometry.dispose());
    material.dispose();
    platformMaterial.dispose();
    glyphs.dispose();
    composer.passes.forEach((postprocess) => postprocess.dispose());
    composer.dispose();
    light.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  try {
    const loader = new OBJLoader();
    const models = await Promise.all(
      ["Base", "Caja", "Tubo"].map(async (name) => {
        const response = await fetch(`/equilibrio/models/${name}.obj`, {
          signal: loading.signal,
        });
        if (!response.ok)
          throw new Error(`Could not load ${name}: HTTP ${response.status}`);
        const object = loader.parse(await response.text());
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            geometries.add(child.geometry);
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((old) => old.dispose());
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        return object;
      }),
    );
    if (disposed || signal.aborted) {
      geometries.forEach((geometry) => geometry.dispose());
      throw new DOMException("Study disposed", "AbortError");
    }
    const [base, body, tube] = models;
    visual.add(base, body, tube);
    const renderFrame = () => {
      if (options.balance) {
        support.position.set(toy.x, toy.y - 0.96, toy.z);
        support.rotation.set(
          toy.bodyTiltX + toy.tumbleX,
          0,
          toy.bodyTiltZ + toy.tumbleZ,
        );
        character.position.set(0, 0.96, 0);
        character.rotation.y = toy.yaw + toy.tumbleY;
      } else {
        character.position.set(toy.x, toy.y, toy.z);
        character.rotation.y = toy.yaw;
      }
      footPivot.position.y = -0.96 + toy.bob;
      footPivot.rotation.set(toy.lean, 0, toy.sway, "YXZ");
      footPivot.scale.set(
        1 / Math.sqrt(toy.scale),
        toy.scale,
        1 / Math.sqrt(toy.scale),
      );
      const extension = extensionPose(toy.extensionTime);
      body.position.y = extension.bodyY;
      tube.rotation.x = extension.tubeRotation;
      tube.scale.setScalar(extension.tubeScale);
      platform.rotation.set(toy.platformX, 0, toy.platformZ);
      pass.uniforms.mode.value =
        input.mode === "dither" ? 0 : input.mode === "ascii" ? 1 : 2;
      renderer.info.reset();
      composer.render();
      dirty = false;
      renderFrames++;
    };
    redraw = renderFrame;
    const animate = (now: number) => {
      frame = 0;
      if (disposed || suspended()) return;
      const delta = advanceRenderClock(clock, now);
      if (delta !== null) {
        if (previousPaint && now - previousPaint < 1000) {
          samples.push(now - previousPaint);
          onFrame(now - previousPaint);
        }
        previousPaint = now;
        const groundedBefore = toy.grounded;
        const phaseBefore = toy.balancePhase;
        const fallsBefore = toy.falls;
        const resetBefore = toy.resetSeen;
        accumulator += delta;
        while (accumulator >= 1 / 60) {
          step(toy, input, 1 / 60);
          simulationSteps++;
          accumulator -= 1 / 60;
        }
        renderFrame();
        if (
          options.balance &&
          (groundedBefore !== toy.grounded ||
            phaseBefore !== toy.balancePhase ||
            fallsBefore !== toy.falls ||
            resetBefore !== toy.resetSeen)
        ) {
          const recent = frameSummary(samples);
          onStats(snapshot(recent?.fps ?? 0, recent?.frameMs ?? 0));
        }
        if (now - statsTime >= 1000) {
          const summary = frameSummary(samples);
          if (summary) onStats(snapshot(summary.fps, summary.frameMs));
          samples.length = 0;
          statsTime = now;
        }
      }
      requestFrame();
    };
    requestFrame = () => {
      if (!disposed && !suspended() && frame === 0)
        frame = requestAnimationFrame(animate);
    };
    loaded = true;
    renderFrame();
    onStats(snapshot());
    syncLoop();
    return {
      setInput(next: ToyInput) {
        if (disposed) return;
        const appearanceChanged =
          input.palette !== next.palette ||
          input.grain !== next.grain ||
          input.mode !== next.mode;
        input = { ...next };
        if (appearanceChanged) {
          dirty = true;
          const palette = getPalette(input.palette);
          background.set(palette.sourceBackground);
          highlightCeiling.value = palette.highlightCeiling;
          pass.uniforms.dark.value.set(palette.dark);
          pass.uniforms.light.value.set(palette.light);
          pass.uniforms.grain.value = normalizeGrain(input.grain);
        }
        syncLoop();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
