import * as THREE from "three";
import { defaultGrain, defaultPalette, getPalette } from "./appearance.ts";

// Concentrate the 576 px scene buffer on the sculpture instead of rendering
// empty widescreen margins. Portrait remains responsive, without letterboxing.
export function getRenderLayout(width: number, height: number) {
  const contentWidth = Math.min(width, height * (4 / 3));
  const aspect = contentWidth / height;
  const renderHeight = Math.min(768, Math.round(576 / aspect));
  return {
    contentWidth,
    contentHeight: height,
    renderWidth: Math.min(576, Math.round(renderHeight * aspect)),
    renderHeight,
    aspect,
    cameraHeight: aspect < 1 ? 16 / aspect : 16,
  };
}

export function createSculptureMaterial(
  color: string,
  highlightCeiling = { value: 1 },
) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
  });
  // Godot 4.5 Compatibility adds its shadowed directional pass to its base
  // lighting after encoding each contribution. Reproduce that composition
  // locally, then return to linear RGB for the Three render-target contract.
  // This is intentionally scoped to our gray, non-emissive, one-key-light scene.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.printHighlightCeiling = highlightCeiling;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float printHighlightCeiling;
      vec3 picaroEncode(vec3 value) {
        return max(1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, vec3(0.0));
      }`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 picaroBase = reflectedLight.indirectDiffuse;
      vec3 picaroDirect = reflectedLight.directDiffuse + 0.5 * reflectedLight.directSpecular;
      // Leave a little ink in highlights on paper, so the silhouette never washes out.
      vec3 picaroDisplay = min(clamp(picaroEncode(picaroBase) + picaroEncode(picaroDirect), 0.0, 1.0), vec3(printHighlightCeiling));
      outgoingLight = sRGBTransferEOTF(vec4(picaroDisplay, 1.0)).rgb;
      #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "picaro-compatibility-lighting-v2";
  return material;
}

// Fused dither + output conversion: every mode gets exactly one linear -> sRGB
// conversion, without another full-screen pass or extra render target.
export const sculptureShading = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(576, 432) },
    mode: { value: 0 },
    grain: { value: defaultGrain },
    glyphs: { value: null as THREE.Texture | null },
    dark: { value: new THREE.Color(getPalette(defaultPalette).dark) },
    light: { value: new THREE.Color(getPalette(defaultPalette).light) },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D glyphs;
    uniform vec2 resolution;
    uniform int mode;
    uniform float grain;
    uniform vec3 dark;
    uniform vec3 light;
    varying vec2 vUv;
    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
      if (y == 0) { if(x==0)return 0.0; if(x==1)return 8.0; if(x==2)return 2.0; return 10.0; }
      if (y == 1) { if(x==0)return 12.0; if(x==1)return 4.0; if(x==2)return 14.0; return 6.0; }
      if (y == 2) { if(x==0)return 3.0; if(x==1)return 11.0; if(x==2)return 1.0; return 9.0; }
      if(x==0)return 15.0; if(x==1)return 7.0; if(x==2)return 13.0; return 5.0;
    }
    void main() {
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      vec3 color = src;
      if (mode == 0) {
        // Godot measures its finished, clipped sRGB image with a 2.2 power.
        // src is already linear: encoding first avoids double-darkening it.
        vec3 displayRGB = clamp(sRGBTransferOETF(vec4(max(src, vec3(0.0)), 1.0)).rgb, 0.0, 1.0);
        float brightness = dot(pow(displayRGB, vec3(2.2)), vec3(0.299, 0.587, 0.114));
        vec2 pixel = floor(vUv * resolution);
        pixel.y = resolution.y - 1.0 - pixel.y;
        // Larger threshold cells, not a lower-resolution model or a noise overlay.
        vec2 ditherCell = floor(pixel / max(grain, 1.0));
        float mask = brightness < 0.1 ? 0.0 : step(bayer(ditherCell) / 16.0, brightness);
        color = mix(dark, light, mask);
      } else if (mode == 1) {
        vec2 cell = floor(vUv * resolution / 3.0);
        vec2 local = fract(vUv * resolution / 3.0);
        vec3 sampleColor = texture2D(tDiffuse, (cell + 0.5) * 3.0 / resolution).rgb;
        float lum = sqrt(clamp(dot(sampleColor, vec3(0.299, 0.587, 0.114)), 0.0, 1.0));
        float index = floor(lum * 9.0 + 0.5);
        float ink = texture2D(glyphs, vec2((index + local.x) / 10.0, local.y)).r;
        color = mix(dark, light, ink);
      }
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }`,
};

export function createGlyphs() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create the ASCII glyph atlas.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, 320, 32);
  context.fillStyle = "#fff";
  context.font = "bold 28px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  [..." .:-=+*#%@"].forEach((glyph, i) =>
    context.fillText(glyph, i * 32 + 16, 17),
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
