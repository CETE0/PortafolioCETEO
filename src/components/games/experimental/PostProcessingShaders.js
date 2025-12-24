/**
 * Post-Processing Shaders para efectos CRT y Dithering
 * Modo Debug - Ajustable en tiempo real
 */

// Shader CRT completo con múltiples efectos
export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: null },
    
    // Scanlines
    scanlineEnabled: { value: true },
    scanlineIntensity: { value: 0.15 },
    scanlineCount: { value: 400.0 },
    scanlineSpeed: { value: 0.0 }, // Para efecto de rolling
    
    // Chromatic Aberration
    chromaticEnabled: { value: true },
    chromaticIntensity: { value: 0.003 },
    
    // Barrel Distortion (curvatura CRT)
    distortionEnabled: { value: true },
    distortionAmount: { value: 0.1 },
    
    // Vignette
    vignetteEnabled: { value: true },
    vignetteIntensity: { value: 0.4 },
    vignetteRoundness: { value: 0.5 },
    
    // Phosphor/RGB Grid
    phosphorEnabled: { value: false },
    phosphorIntensity: { value: 0.3 },
    
    // Flicker
    flickerEnabled: { value: false },
    flickerIntensity: { value: 0.03 },
    
    // Noise
    noiseEnabled: { value: false },
    noiseIntensity: { value: 0.08 },
    
    // Color adjustments
    brightness: { value: 1.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    
    // Glow/Bloom simple
    glowEnabled: { value: false },
    glowIntensity: { value: 0.2 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    
    // Scanlines
    uniform bool scanlineEnabled;
    uniform float scanlineIntensity;
    uniform float scanlineCount;
    uniform float scanlineSpeed;
    
    // Chromatic Aberration
    uniform bool chromaticEnabled;
    uniform float chromaticIntensity;
    
    // Barrel Distortion
    uniform bool distortionEnabled;
    uniform float distortionAmount;
    
    // Vignette
    uniform bool vignetteEnabled;
    uniform float vignetteIntensity;
    uniform float vignetteRoundness;
    
    // Phosphor
    uniform bool phosphorEnabled;
    uniform float phosphorIntensity;
    
    // Flicker
    uniform bool flickerEnabled;
    uniform float flickerIntensity;
    
    // Noise
    uniform bool noiseEnabled;
    uniform float noiseIntensity;
    
    // Color
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    
    // Glow
    uniform bool glowEnabled;
    uniform float glowIntensity;
    
    varying vec2 vUv;
    
    // Funciones auxiliares
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    // Barrel distortion
    vec2 barrelDistort(vec2 uv, float amount) {
      vec2 cc = uv - 0.5;
      float dist = dot(cc, cc);
      return uv + cc * dist * amount;
    }
    
    // RGB phosphor pattern
    vec3 phosphorMask(vec2 uv, float intensity) {
      vec2 pixel = uv * resolution;
      int px = int(mod(pixel.x, 3.0));
      vec3 mask = vec3(0.0);
      if (px == 0) mask = vec3(1.0, 0.0, 0.0);
      else if (px == 1) mask = vec3(0.0, 1.0, 0.0);
      else mask = vec3(0.0, 0.0, 1.0);
      return mix(vec3(1.0), mask, intensity);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Barrel Distortion
      if (distortionEnabled) {
        uv = barrelDistort(uv, distortionAmount);
      }
      
      // Check if UV is out of bounds after distortion
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Blanco para coincidir con el fondo de la web
        return;
      }
      
      vec3 color;
      
      // Chromatic Aberration
      if (chromaticEnabled) {
        vec2 offset = (uv - 0.5) * chromaticIntensity;
        color.r = texture2D(tDiffuse, uv + offset).r;
        color.g = texture2D(tDiffuse, uv).g;
        color.b = texture2D(tDiffuse, uv - offset).b;
      } else {
        color = texture2D(tDiffuse, uv).rgb;
      }
      
      // Simple Glow (blur aproximado)
      if (glowEnabled) {
        vec2 texelSize = 1.0 / resolution;
        vec3 glow = vec3(0.0);
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            glow += texture2D(tDiffuse, uv + vec2(float(x), float(y)) * texelSize * 2.0).rgb;
          }
        }
        glow /= 25.0;
        color = mix(color, max(color, glow), glowIntensity);
      }
      
      // Phosphor RGB mask
      if (phosphorEnabled) {
        color *= phosphorMask(uv, phosphorIntensity);
      }
      
      // Scanlines
      if (scanlineEnabled) {
        float scanline = sin((uv.y + time * scanlineSpeed) * scanlineCount * 3.14159) * 0.5 + 0.5;
        scanline = pow(scanline, 1.5);
        color *= 1.0 - (scanline * scanlineIntensity);
      }
      
      // Flicker
      if (flickerEnabled) {
        float flicker = 1.0 - flickerIntensity * random(vec2(time * 50.0, 0.0));
        color *= flicker;
      }
      
      // Noise
      if (noiseEnabled) {
        float noise = random(uv + time) * noiseIntensity;
        color += noise - noiseIntensity * 0.5;
      }
      
      // Color adjustments
      // Brightness
      color *= brightness;
      
      // Contrast
      color = (color - 0.5) * contrast + 0.5;
      
      // Saturation
      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luminance), color, saturation);
      
      // Vignette
      if (vignetteEnabled) {
        vec2 vigUv = uv * (1.0 - uv);
        float vig = vigUv.x * vigUv.y * 15.0;
        vig = pow(vig, vignetteRoundness);
        color *= mix(1.0 - vignetteIntensity, 1.0, vig);
      }
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// Shader de Dithering
export const DitheringShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: null },
    
    // Dithering
    ditheringEnabled: { value: true },
    ditheringType: { value: 0 }, // 0: Bayer 4x4, 1: Bayer 8x8, 2: Blue noise approx
    colorLevels: { value: 4.0 }, // Niveles de color por canal (2-256)
    ditherStrength: { value: 1.0 },
    
    // Palette reduction
    paletteEnabled: { value: false },
    paletteSize: { value: 8.0 }, // Colores en la paleta
    
    // Pixelation
    pixelateEnabled: { value: false },
    pixelSize: { value: 4.0 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    
    uniform bool ditheringEnabled;
    uniform int ditheringType;
    uniform float colorLevels;
    uniform float ditherStrength;
    
    uniform bool paletteEnabled;
    uniform float paletteSize;
    
    uniform bool pixelateEnabled;
    uniform float pixelSize;
    
    varying vec2 vUv;
    
    // Bayer 4x4 matrix
    const mat4 bayerMatrix4 = mat4(
       0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
      12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
       3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
      15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
    );
    
    // Bayer 8x8 approximation usando la 4x4
    float bayer8(vec2 pos) {
      vec2 posmod = mod(pos, 8.0);
      float coarse = bayerMatrix4[int(posmod.x / 2.0)][int(posmod.y / 2.0)];
      float fine = bayerMatrix4[int(mod(posmod.x, 2.0)) * 2][int(mod(posmod.y, 2.0)) * 2];
      return (coarse * 4.0 + fine) / 4.0;
    }
    
    float bayer4(vec2 pos) {
      vec2 posmod = mod(pos, 4.0);
      return bayerMatrix4[int(posmod.x)][int(posmod.y)];
    }
    
    // Blue noise approximation
    float blueNoise(vec2 pos) {
      return fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453 + 
                   sin(dot(pos * 0.7, vec2(45.233, 97.113))) * 23421.6312);
    }
    
    vec3 quantize(vec3 color, float levels) {
      return floor(color * levels + 0.5) / levels;
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Pixelation
      if (pixelateEnabled) {
        vec2 pixelUv = floor(uv * resolution / pixelSize) * pixelSize / resolution;
        uv = pixelUv;
      }
      
      vec3 color = texture2D(tDiffuse, uv).rgb;
      
      if (ditheringEnabled) {
        vec2 pixel = uv * resolution;
        float threshold;
        
        if (ditheringType == 0) {
          threshold = bayer4(pixel) - 0.5;
        } else if (ditheringType == 1) {
          threshold = bayer8(pixel) - 0.5;
        } else {
          threshold = blueNoise(pixel) - 0.5;
        }
        
        threshold *= ditherStrength / colorLevels;
        
        color += threshold;
        color = quantize(color, colorLevels);
      }
      
      // Palette reduction (simple nearest color)
      if (paletteEnabled) {
        color = floor(color * paletteSize + 0.5) / paletteSize;
      }
      
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `
};

// Configuración por defecto para producción
export const defaultCRTConfig = {
  // Master
  enabled: true,
  
  // Scanlines
  scanlineEnabled: false,
  scanlineIntensity: 0.15,
  scanlineCount: 400,
  scanlineSpeed: 0.0,
  
  // Chromatic Aberration
  chromaticEnabled: true,
  chromaticIntensity: 0.011,
  
  // Barrel Distortion
  distortionEnabled: true,
  distortionAmount: 0.4,
  
  // Vignette
  vignetteEnabled: true,
  vignetteIntensity: 0.15,
  vignetteRoundness: 0.2,
  
  // Phosphor
  phosphorEnabled: false,
  phosphorIntensity: 0.3,
  
  // Flicker
  flickerEnabled: false,
  flickerIntensity: 0.03,
  
  // Noise
  noiseEnabled: true,
  noiseIntensity: 0.2,
  
  // Color
  brightness: 1.5,
  contrast: 1.0,
  saturation: 1.65,
  
  // Glow
  glowEnabled: false,
  glowIntensity: 0.2,
};

export const defaultDitheringConfig = {
  enabled: false,
  
  ditheringEnabled: true,
  ditheringType: 0, // 0: Bayer4x4, 1: Bayer8x8, 2: BlueNoise
  colorLevels: 4,
  ditherStrength: 1.0,
  
  paletteEnabled: false,
  paletteSize: 8,
  
  pixelateEnabled: false,
  pixelSize: 4,
};

// Presets para probar rápidamente
export const presets = {
  'Desactivado': {
    crt: { enabled: false },
    dithering: { enabled: false }
  },
  'CRT Suave': {
    crt: {
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.1,
      chromaticEnabled: true,
      chromaticIntensity: 0.002,
      distortionEnabled: true,
      distortionAmount: 0.05,
      vignetteEnabled: true,
      vignetteIntensity: 0.3,
    },
    dithering: { enabled: false }
  },
  'CRT Intenso': {
    crt: {
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.25,
      scanlineCount: 300,
      chromaticEnabled: true,
      chromaticIntensity: 0.005,
      distortionEnabled: true,
      distortionAmount: 0.15,
      vignetteEnabled: true,
      vignetteIntensity: 0.5,
      phosphorEnabled: true,
      phosphorIntensity: 0.2,
      flickerEnabled: true,
      flickerIntensity: 0.02,
    },
    dithering: { enabled: false }
  },
  'CRT Arcade': {
    crt: {
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.2,
      scanlineCount: 240,
      chromaticEnabled: false,
      distortionEnabled: true,
      distortionAmount: 0.08,
      vignetteEnabled: true,
      vignetteIntensity: 0.35,
      phosphorEnabled: true,
      phosphorIntensity: 0.4,
      glowEnabled: true,
      glowIntensity: 0.15,
      contrast: 1.1,
      saturation: 1.2,
    },
    dithering: { enabled: false }
  },
  'Retro 8-bit': {
    crt: { enabled: false },
    dithering: {
      enabled: true,
      ditheringEnabled: true,
      ditheringType: 0,
      colorLevels: 4,
      ditherStrength: 1.0,
      pixelateEnabled: true,
      pixelSize: 3,
    }
  },
  'Game Boy': {
    crt: { 
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.08,
      chromaticEnabled: false,
      distortionEnabled: false,
      vignetteEnabled: false,
      brightness: 1.1,
      saturation: 0.0, // Blanco y negro / verde
    },
    dithering: {
      enabled: true,
      ditheringEnabled: true,
      ditheringType: 0,
      colorLevels: 4,
      pixelateEnabled: true,
      pixelSize: 2,
    }
  },
  'VHS Glitch': {
    crt: {
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.12,
      scanlineSpeed: 0.5,
      chromaticEnabled: true,
      chromaticIntensity: 0.008,
      distortionEnabled: true,
      distortionAmount: 0.03,
      vignetteEnabled: true,
      vignetteIntensity: 0.25,
      noiseEnabled: true,
      noiseIntensity: 0.1,
      flickerEnabled: true,
      flickerIntensity: 0.04,
    },
    dithering: { enabled: false }
  },
  'CRT + Dithering': {
    crt: {
      enabled: true,
      scanlineEnabled: true,
      scanlineIntensity: 0.12,
      chromaticEnabled: true,
      chromaticIntensity: 0.002,
      distortionEnabled: true,
      distortionAmount: 0.06,
      vignetteEnabled: true,
      vignetteIntensity: 0.3,
    },
    dithering: {
      enabled: true,
      ditheringEnabled: true,
      ditheringType: 1,
      colorLevels: 8,
      ditherStrength: 0.8,
    }
  },
};

