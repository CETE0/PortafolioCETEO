import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { projects } from '@/lib/projects';
import { 
  CRTShader, 
  DitheringShader, 
  defaultCRTConfig, 
  defaultDitheringConfig,
  presets 
} from './PostProcessingShaders';

// Debug mode - set to false for production
const DEBUG_POST_PROCESSING = false;

// Parámetros editables del visualizador y escena
const GAME_CONFIG = {
  camera: {
    fov: 80,
    position: { x: 0, y: 1.6, z: 1.2 }, // acerca la cámara al modelo
  },
  lights: {
    ambientIntensity: 0.35,
    hemi: { skyColor: 0xcfe9ff, groundColor: 0x1b1b1b, intensity: 0.7 },
    dir: {
      intensity: 1.25,
      position: { x: 6, y: 12, z: 8 },
      shadow: { mapSize: 2048, near: 0.1, far: 60, left: -30, right: 30, top: 30, bottom: -30, bias: -0.0006 },
    },
    fill: { intensity: 0.35, position: { x: -8, y: 6, z: -6 } },
  },
  floor: {
    color: 0x333333,
    roughness: 0.6,
    metalness: 0.0,
    emissive: 0x111111,
    emissiveIntensity: 0.15,
  },
  plinth: {
    size: { x: 2.6, y: 1.2, z: 2.6 },
    position: { x: 0, z: -3.5, yOffset: 0 },
  },
  model: {
    rotationSpeed: { x: 0, y: 0.01, z: 0 },
    offset: { x: 0, y: 0.02, z: 0 },
  },
  cameraMobile: {
    fov: 75,
    position: { x: 0, y: 1.8, z: 2.6 }, // más lejos en móvil
  },
  quality: {
    desktop: {
      sphereSegments: 28,
      cylinderSegments: 28,
      coneSegments: 28,
      shadowMapSize: 1024,
      castShadows: false,
      maxDpr: 1.75,
      anisotropy: 4,
    },
    mobile: {
      sphereSegments: 24,
      cylinderSegments: 20,
      coneSegments: 20,
      shadowMapSize: 1024,
      castShadows: false,
      maxDpr: 1.5,
      anisotropy: 2,
    },
  },
  shotOverlay: {
    durationMs: 320, // tiempo visible del sprite de disparo
  },
  animation: {
    speedBase: 1.0,
    speedJitter: 0.4,
    // Tipos de animación disponibles con sus configuraciones
    types: ['walk', 'idle', 'dance', 'float', 'aggressive'],
    amplitudes: {
      arm: 0.5, // rad
      leg: 0.5, // rad
      elbow: 0.4, // rad
      knee: 0.6, // rad
      torsoTwist: 0.12, // rad
      hipTwist: 0.10, // rad
      bob: 0.02, // units
      // Nuevas amplitudes
      breath: 0.015, // escala de respiración
      headLook: 0.25, // rad - cabeza mirando alrededor
      shoulderShrug: 0.08, // rad - encogimiento de hombros
      sway: 0.05, // rad - balanceo lateral
      // Baile
      danceBounce: 0.08, // units
      danceArm: 0.8, // rad
      danceTwist: 0.3, // rad
      // Flotante
      floatHeight: 0.15, // units
      floatSway: 0.2, // rad
      // Agresivo
      aggressiveArm: 0.4, // rad
      aggressiveLean: 0.15, // rad
    },
  },
  orbit: {
    radius: 4.0,
    speed: 0.25, // rad/seg
    height: 0.0, // altura del ancla; el modelo se eleva por su propia altura
  },
  explosion: {
    shardsPerModel: 28,
    shardSizeMin: 0.05,
    shardSizeMax: 0.12,
    speed: 2.0,
    upwardBoost: 1.0,
    gravity: 3.0,
    lifetimeMs: 1200,
  },
};

// Gestor de texturas con caché LRU y prefetch utilizando ImageBitmapLoader
class TextureManager {
  constructor(renderer, maxEntries = 10, anisotropy = 2) {
    this.renderer = renderer;
    this.maxEntries = maxEntries;
    this.cache = new Map(); // url -> texture
    this.loading = new Map(); // url -> promise
    this.loader = new THREE.ImageBitmapLoader();
    this.anisotropy = anisotropy;
  }

  async load(url) {
    if (this.cache.has(url)) {
      const tex = this.cache.get(url);
      // move to end (MRU)
      this.cache.delete(url);
      this.cache.set(url, tex);
      return tex;
    }
    if (this.loading.has(url)) return this.loading.get(url);

    const promise = this.loader.loadAsync(url)
      .then((bitmap) => {
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = this.anisotropy;
        // Corregir rotación de 180°
        texture.center.set(0.5, 0.5);
        texture.rotation = Math.PI;
        this._addToCache(url, texture);
        this.loading.delete(url);
        return texture;
      })
      .catch((e) => {
        this.loading.delete(url);
        console.warn('Image load failed', url, e);
        return null;
      });

    this.loading.set(url, promise);
    return promise;
  }

  _addToCache(url, texture) {
    this.cache.set(url, texture);
    if (this.cache.size > this.maxEntries) {
      // delete LRU (first entry)
      const [oldUrl, oldTex] = this.cache.entries().next().value;
      this.cache.delete(oldUrl);
      oldTex.dispose();
    }
  }
}

export class ArtShooterGame {
  constructor(container, options = {}) {
    if (!container) return;

    this.container = container;
    this.onNavigate = options.onNavigate || null; // Callback para navegación al destruir un modelo
    this.isNavigating = false; // Flag para evitar navegaciones múltiples
    this.hasEnteredPointerLockOnce = false; // Para distinguir estado inicial vs salir con ESC
    // Gate general de redirección (se inicializa después de detectar isTouchDevice)
    this.redirectEnabled = true;
    this._onMobileMenuState = null;
    this._wasActiveBeforeMobileMenu = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.textureLoader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.targets = [];
    this.currentTarget = null;
    this.rowGroup = null;
    this.plinthMesh = null;
    this.rotationSpeeds = new WeakMap();
    this.isActive = false;
    this.score = 0;
    this.highScoreKey = 'experimentalShooterHighScore';
    this.highScore = parseInt(localStorage.getItem(this.highScoreKey) || '0');
    this.kickSprite = null; // Reutiliza animación de disparo existente (pie)
    this.kickTexture = null;
    this.impactTexture = null;
    this.audioListener = new THREE.AudioListener();
    this.sounds = new Map();
    this.audioStarted = false;
    this.onResize = () => this.handleResize();
    this.onDocumentClick = this.handlePrimaryClick.bind(this);
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onTouchMove = this.handleTouchMove.bind(this);
    this.onTouchEnd = this.handleTouchEnd.bind(this);
    this.isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    // Gate general de redirección:
    // - Desktop: solo se habilita al entrar en pointer lock (evita redirecciones antes de “entrar al juego”)
    // - Móvil: por defecto habilitado (se deshabilita cuando el menú está abierto)
    this.redirectEnabled = this.isTouchDevice ? true : false;
    this.touchYaw = 0;
    this.touchPitch = 0;
    this.lastTouchX = null;
    this.lastTouchY = null;
    this.startTouchX = null;
    this.startTouchY = null;
    this.startTouchTime = 0;
    this.touchSensitivity = 0.004; // menor = más estable
    this.tapMoveThresholdPx = 8; // umbral para distinguir tap de drag
    this.tapTimeThresholdMs = 350; // tiempo máximo para considerar tap
    this.mobileCrosshairEl = null;
    this.desktopCrosshairEl = null;
    this.desktopClickOverlayEl = null;
    this.desktopEscHintEl = null;
    this.onWindowBlur = null;
    this.onWindowFocus = null;
    this.explosions = [];
    this.animationStates = new WeakMap();
    this.randomMusicPaths = [
      '/game/assets/audio/postfaktisch/gls/mp3/11_affen-abbild.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_amtskoerper.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_diebanalenboesen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_geraeuschpsychologie.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_honeckers-sonne.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_Im Namen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_irrtomlicherweise.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_Leistungstracht.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_muehlberg.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_noichl.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_pfarrerresch.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/11_who that person was.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/19_walk_the_earth.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_ ifbeautyis2014.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_1992.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_200-million-guns.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_always-camelia.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_american_mess.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_another reasonhooba.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_army_now.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_b-lumen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_because-im-drainrops.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_big_freakin_not_speakin.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_blinded_by_da_vinci.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_C-emily-pay.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_carryon.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Clifford_T_tray_ext.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_crowdedwall658.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_dan_the_lion.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_debrawingsoveryourrope.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_dontspeakers.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_down_to_dust.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_dreamonpink.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_dreamtyler.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_drop-in.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_finedoubtyourorderline.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_flies_flies_flies.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_greenb_spirits.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_guten_tag_ilona_christen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_hey_bullfrog.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_how_many_more_stealaway.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Idealshot.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_iris-aigner-crylink.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Lady_Eleanor.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_magnetic360.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_maxicancan.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_mayfly_III.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_me_moria.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Millionaire.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_mio-et-moi.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_muse_spelling_time.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_mystifythem.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Native_451_Tongue.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_new divide.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_nieanderlthalman.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_niederschrift311082.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_no_other_mother.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_nora undercover.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Once_There_Was_a_Hushpuppy.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_opal_Space_Cadet.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_orderline_go_cat.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_peiltreiber.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_peter_und_paul.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_powerbreak.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_prime-mover.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_punch_tumbler.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_race_with_the_raygun.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_ray_of_beacon.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_rettenberg.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_rewarded.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_roolsusall.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_santandergypsierose.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_SCHLOSS_Neuigkeiten.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_shapes_of_bend.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_shout tsue.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_sideways-outro.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_slazenger.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_sleapwalkerJay.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_softlywillemsen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_Stagira.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_status_orange_vertigo.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_straubing.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_strictly-biz-sukerova.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_thankful-white-wall.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_time_of_the_zombies.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_traummesser.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_vitabella_drewblew.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_walkmeoutdobson.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_whambammountain.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/22_won_of_these_days_voodoo_chile.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/2thebridge.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/489_erkenntnisgegenstand.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/911_magic_m_ext.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/antistax.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/bayou.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/bHeat.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/blitzding.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/boydreamdrum.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/Coming_Up_Roses.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/cool-jane-gang.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/do-what-I-please.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/doodumdum.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/dulaledu.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/fasoyma_mono.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/gewinnzahl.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/high5idelity.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/Ifoundout.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/immunity.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/joshkeys.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/judenseife.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/keyponrunning.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/know_well2.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/likecrystral.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/logical.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/mowwow.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/natural_covid.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/NOC.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/nona.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/Panic-in-Pittsburgh.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/privatsphaere.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/reality-conspiracy.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/satanstrick.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/shangrila_stone_temple.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/simulation2theory.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/stardustS6.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/sterben-wie-die-fliegen.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/sundown-shining-in-roger.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/vortrefflichkeit.mp3',
      '/game/assets/audio/postfaktisch/gls/mp3/youngdudes.mp3',
    ];
    this.music = null;
    this._touchMode = null; // 'shoot' | 'look'
    this._touchTapTimer = null;
    this._touchMoved = false;
    this.shotIntervalMs = 220;
    this.lastShotTime = 0;
    this.clock = new THREE.Clock();
    THREE.Cache.enabled = true;

    // Post-processing
    this.composer = null;
    this.crtPass = null;
    this.ditheringPass = null;
    this.crtConfig = { ...defaultCRTConfig };
    this.ditheringConfig = { ...defaultDitheringConfig };
    this.debugGui = null;

    this.init();
  }

  async loadAssets() {
    const [kickTexture, impactTexture] = await Promise.all([
      this.textureLoader.loadAsync('/game/assets/textures/pie.png'),
      this.textureLoader.loadAsync('/game/assets/textures/impact-mark.svg'),
    ]);
    this.kickTexture = kickTexture;
    this.impactTexture = impactTexture;

    // Intentar cargar texturas de entorno
    try {
      this.grassTexture = await this.textureLoader.loadAsync('/game/assets/textures/pasto.jpg');
      this.grassTexture.wrapS = THREE.RepeatWrapping;
      this.grassTexture.wrapT = THREE.RepeatWrapping;
      this.grassTexture.repeat.set(8, 8);
      this.grassTexture.anisotropy = 4;
    } catch {}
    try {
      this.skyTexture = await this.textureLoader.loadAsync('/game/assets/textures/cielo.jpg');
      this.skyTexture.colorSpace = THREE.SRGBColorSpace;
      this.skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    } catch {}
  }

  getArtworkPaths() {
    // Recoger solo la PRIMERA imagen de cada proyecto en artworks
    // Devuelve objetos con { src, category, projectId, priority } para poder navegar al proyecto
    const artworks = [];
    const seenPaths = new Set();
    
    // Proyectos prioritarios (más probabilidad de aparecer)
    const priorityProjects = [
      'donante-universal',
      'medium',
      'santiago-1',
      'te-juro-que-es-primera-vez-que-me-pasa'
    ];
    
    Object.entries(projects).forEach(([categoryKey, category]) => {
      Object.entries(category).forEach(([projectId, project]) => {
        // Solo buscar la primera imagen del proyecto
        const firstImage = (project.content || []).find(item => 
          item.type === 'image' && typeof item.src === 'string'
        );
        
        if (firstImage && !seenPaths.has(firstImage.src)) {
          seenPaths.add(firstImage.src);
          const isPriority = priorityProjects.includes(projectId);
          artworks.push({
            src: firstImage.src,
            category: categoryKey,
            projectId: projectId,
            title: project.title || projectId,
            priority: isPriority
          });
        }
      });
    });
    
    return artworks;
  }

  getRandomGeometry() {
    const isMobile = this.isTouchDevice;
    const q = isMobile ? GAME_CONFIG.quality.mobile : GAME_CONFIG.quality.desktop;
    const choice = Math.floor(Math.random() * 4);
    switch (choice) {
      case 0:
        return new THREE.BoxGeometry(1.6, 1.6, 1.6);
      case 1:
        return new THREE.SphereGeometry(1.2, q.sphereSegments, q.sphereSegments);
      case 2:
        return new THREE.CylinderGeometry(0.9, 0.9, 1.8, q.cylinderSegments);
      case 3:
        return new THREE.ConeGeometry(1.0, 1.8, q.coneSegments);
      default:
        return new THREE.BoxGeometry(1.2, 1.2, 1.2);
    }
  }

  // Modelo humano low poly procedimental usando primitivas
  createLowPolyHuman(sharedMaterial) {
    const group = new THREE.Group();

    if (sharedMaterial && !sharedMaterial.flatShading) {
      sharedMaterial.flatShading = true;
      sharedMaterial.needsUpdate = true;
    }

    // Proporciones básicas (altura objetivo ~1.8)
    const torsoHeight = 0.7;
    const pelvisHeight = 0.3;
    const neckHeight = 0.08;
    const headRadius = 0.18;
    const upperArmLength = 0.35;
    const lowerArmLength = 0.35;
    const upperLegLength = 0.45;
    const lowerLegLength = 0.45;

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, torsoHeight, 0.25), sharedMaterial);
    torso.position.set(0, pelvisHeight + torsoHeight / 2, 0);
    group.add(torso);

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.4, pelvisHeight, 0.22), sharedMaterial);
    pelvis.position.set(0, pelvisHeight / 2, 0);
    group.add(pelvis);

    // Hombros
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.18), sharedMaterial);
    shoulders.position.set(0, pelvisHeight + torsoHeight - 0.06, 0);
    group.add(shoulders);

    // Cuello
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, neckHeight, 6), sharedMaterial);
    neck.position.set(0, pelvisHeight + torsoHeight + neckHeight / 2, 0);
    group.add(neck);

    // Cabeza (cubo)
    const headSize = headRadius * 1.4; // Tamaño del cubo basado en el radio original
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), sharedMaterial);
    head.position.set(0, pelvisHeight + torsoHeight + neckHeight + headSize / 2, 0);
    group.add(head);

    // Brazos con pivotes de articulación (hombro y codo)
    const armRadius = 0.11;
    const forearmRadius = 0.1;
    const armOffsetX = 0.35;
    const shoulderY = shoulders.position.y;
    const upperArmGeo = new THREE.BoxGeometry(armRadius, upperArmLength, armRadius);
    const lowerArmGeo = new THREE.BoxGeometry(forearmRadius, lowerArmLength, forearmRadius);

    const lShoulderPivot = new THREE.Object3D();
    lShoulderPivot.position.set(-armOffsetX, shoulderY, 0);
    group.add(lShoulderPivot);
    const lUpperArm = new THREE.Mesh(upperArmGeo, sharedMaterial);
    lUpperArm.position.set(0, -upperArmLength / 2, 0);
    lShoulderPivot.add(lUpperArm);
    const lElbowPivot = new THREE.Object3D();
    lElbowPivot.position.set(0, -upperArmLength, 0);
    lShoulderPivot.add(lElbowPivot);
    const lLowerArm = new THREE.Mesh(lowerArmGeo, sharedMaterial);
    lLowerArm.position.set(0, -lowerArmLength / 2, 0);
    lElbowPivot.add(lLowerArm);

    const rShoulderPivot = new THREE.Object3D();
    rShoulderPivot.position.set(armOffsetX, shoulderY, 0);
    group.add(rShoulderPivot);
    const rUpperArm = new THREE.Mesh(upperArmGeo, sharedMaterial);
    rUpperArm.position.set(0, -upperArmLength / 2, 0);
    rShoulderPivot.add(rUpperArm);
    const rElbowPivot = new THREE.Object3D();
    rElbowPivot.position.set(0, -upperArmLength, 0);
    rShoulderPivot.add(rElbowPivot);
    const rLowerArm = new THREE.Mesh(lowerArmGeo, sharedMaterial);
    rLowerArm.position.set(0, -lowerArmLength / 2, 0);
    rElbowPivot.add(rLowerArm);

    // Muñecas y manos
    const handGeo = new THREE.BoxGeometry(0.14, 0.12, 0.14);
    const lWristPivot = new THREE.Object3D();
    lWristPivot.position.set(0, -lowerArmLength, 0);
    lElbowPivot.add(lWristPivot);
    const lHand = new THREE.Mesh(handGeo, sharedMaterial);
    lHand.position.set(0, -0.12 / 2, 0.06);
    lWristPivot.add(lHand);

    const rWristPivot = new THREE.Object3D();
    rWristPivot.position.set(0, -lowerArmLength, 0);
    rElbowPivot.add(rWristPivot);
    const rHand = new THREE.Mesh(handGeo, sharedMaterial);
    rHand.position.set(0, -0.12 / 2, 0.06);
    rWristPivot.add(rHand);

    // Piernas
    const legRadius = 0.14;
    const shinRadius = 0.13;
    const hipOffsetX = 0.2;
    const hipY = pelvis.position.y - pelvisHeight / 2;
    const upperLegGeo = new THREE.BoxGeometry(legRadius, upperLegLength, legRadius);
    const lowerLegGeo = new THREE.BoxGeometry(shinRadius, lowerLegLength, shinRadius);

    const lHipPivot = new THREE.Object3D();
    lHipPivot.position.set(-hipOffsetX, hipY, 0);
    group.add(lHipPivot);
    const lUpperLeg = new THREE.Mesh(upperLegGeo, sharedMaterial);
    lUpperLeg.position.set(0, -upperLegLength / 2, 0);
    lHipPivot.add(lUpperLeg);
    const lKneePivot = new THREE.Object3D();
    lKneePivot.position.set(0, -upperLegLength, 0);
    lHipPivot.add(lKneePivot);
    const lLowerLeg = new THREE.Mesh(lowerLegGeo, sharedMaterial);
    lLowerLeg.position.set(0, -lowerLegLength / 2, 0);
    lKneePivot.add(lLowerLeg);

    const rHipPivot = new THREE.Object3D();
    rHipPivot.position.set(hipOffsetX, hipY, 0);
    group.add(rHipPivot);
    const rUpperLeg = new THREE.Mesh(upperLegGeo, sharedMaterial);
    rUpperLeg.position.set(0, -upperLegLength / 2, 0);
    rHipPivot.add(rUpperLeg);
    const rKneePivot = new THREE.Object3D();
    rKneePivot.position.set(0, -upperLegLength, 0);
    rHipPivot.add(rKneePivot);
    const rLowerLeg = new THREE.Mesh(lowerLegGeo, sharedMaterial);
    rLowerLeg.position.set(0, -lowerLegLength / 2, 0);
    rKneePivot.add(rLowerLeg);

    // Tobillos y pies (con pivote de tobillo)
    const footGeo = new THREE.BoxGeometry(0.25, 0.08, 0.35);
    const lAnklePivot = new THREE.Object3D();
    lAnklePivot.position.set(0, -lowerLegLength, 0);
    lKneePivot.add(lAnklePivot);
    const lFoot = new THREE.Mesh(footGeo, sharedMaterial);
    // Que el pie caiga desde el tobillo
    lFoot.position.set(0, -0.08 / 2, 0.12);
    lAnklePivot.add(lFoot);

    const rAnklePivot = new THREE.Object3D();
    rAnklePivot.position.set(0, -lowerLegLength, 0);
    rKneePivot.add(rAnklePivot);
    const rFoot = new THREE.Mesh(footGeo, sharedMaterial);
    rFoot.position.set(0, -0.08 / 2, 0.12);
    rAnklePivot.add(rFoot);

    // (Manos antiguas eliminadas)

    // Centrar pivote XZ
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.sub(new THREE.Vector3(center.x, 0, center.z));

    // Escalar a altura objetivo (más grande)
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const targetHeight = 2.6; // antes ~1.8
    if (size.y > 0) {
      const s = targetHeight / size.y;
      group.scale.setScalar(s);
    }

    group.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
      }
    });

    // Guardar referencias para animación
    group.userData.limbs = {
      // pivotes
      lShoulderPivot,
      rShoulderPivot,
      lElbowPivot,
      rElbowPivot,
      lWristPivot,
      rWristPivot,
      lHipPivot,
      rHipPivot,
      lKneePivot,
      rKneePivot,
      lAnklePivot,
      rAnklePivot,
      // partes
      shoulders,
      pelvis,
      torso,
      head,
    };

    // Inicializar estado de animación con tipo aleatorio
    const animTypes = GAME_CONFIG.animation.types;
    const animType = animTypes[Math.floor(Math.random() * animTypes.length)];
    
    this.animationStates.set(group, {
      t: Math.random() * Math.PI * 2, // fase aleatoria
      t2: Math.random() * Math.PI * 2, // segunda fase para movimientos secundarios
      t3: Math.random() * Math.PI * 2, // tercera fase para variación
      speed: GAME_CONFIG.animation.speedBase + (Math.random() - 0.5) * 2 * GAME_CONFIG.animation.speedJitter,
      baseY: group.position.y,
      type: animType, // tipo de animación asignado
      // Parámetros únicos por modelo para más variación
      headLookSpeed: 0.3 + Math.random() * 0.4,
      breathSpeed: 0.8 + Math.random() * 0.4,
      swayPhase: Math.random() * Math.PI * 2,
    });

    return group;
  }

  async init() {
    this.scene = new THREE.Scene();
    const isMobile = this.isTouchDevice;
    const camCfg = isMobile ? GAME_CONFIG.cameraMobile : GAME_CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(
      camCfg.fov,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(
      camCfg.position.x,
      camCfg.position.y,
      camCfg.position.z
    );
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    const quality = this.isTouchDevice ? GAME_CONFIG.quality.mobile : GAME_CONFIG.quality.desktop;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = quality.castShadows;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.outline = 'none';
    this.renderer.domElement.setAttribute('tabindex', '0');
    // Crear gestor de texturas con anisotropía según perfil
    const qualityForTextures = this.isTouchDevice ? GAME_CONFIG.quality.mobile : GAME_CONFIG.quality.desktop;
    this.textureManager = new TextureManager(this.renderer, 10, qualityForTextures.anisotropy);

    await this.loadAssets();

    if (!this.isTouchDevice) {
      this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
      this.controls.addEventListener('lock', () => {
        this.isActive = true;
        this.hasEnteredPointerLockOnce = true;
        this.redirectEnabled = true;
        this.ensureAudioStarted();
        this.centerCustomCursor();
        this.hideCustomCursor();
        this.ensureDesktopCrosshair();
        this.showDesktopCrosshair();
        this.hideDesktopClickOverlay();
        this.showEscHintOverlay();
      });
      this.controls.addEventListener('unlock', () => {
        this.isActive = false;
        // Al salir con ESC, deshabilitar redirección hasta volver a entrar en lock
        this.redirectEnabled = false;
        this.stopAllSounds();
        this.showCustomCursor();
        this.hideDesktopCrosshair();
        this.showDesktopClickOverlay();
        this.hideEscHintOverlay();
      });
    } else {
      // Modo móvil: activo por defecto y mira centrada con overlay propio
      this.isActive = true;
      this.ensureMobileCrosshair();
      this.showMobileCrosshair();
      // Sonido se iniciará en la primera interacción táctil
    }

    const ambient = new THREE.AmbientLight(0xffffff, GAME_CONFIG.lights.ambientIntensity);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(
      GAME_CONFIG.lights.hemi.skyColor,
      GAME_CONFIG.lights.hemi.groundColor,
      GAME_CONFIG.lights.hemi.intensity
    );
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, GAME_CONFIG.lights.dir.intensity);
    dir.position.set(
      GAME_CONFIG.lights.dir.position.x,
      GAME_CONFIG.lights.dir.position.y,
      GAME_CONFIG.lights.dir.position.z
    );
    const qualityLights = this.isTouchDevice ? GAME_CONFIG.quality.mobile : GAME_CONFIG.quality.desktop;
    dir.castShadow = qualityLights.castShadows;
    dir.shadow.mapSize.set(qualityLights.shadowMapSize, qualityLights.shadowMapSize);
    dir.shadow.camera.near = GAME_CONFIG.lights.dir.shadow.near;
    dir.shadow.camera.far = GAME_CONFIG.lights.dir.shadow.far;
    dir.shadow.camera.left = GAME_CONFIG.lights.dir.shadow.left;
    dir.shadow.camera.right = GAME_CONFIG.lights.dir.shadow.right;
    dir.shadow.camera.top = GAME_CONFIG.lights.dir.shadow.top;
    dir.shadow.camera.bottom = GAME_CONFIG.lights.dir.shadow.bottom;
    dir.shadow.bias = GAME_CONFIG.lights.dir.shadow.bias;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, GAME_CONFIG.lights.fill.intensity);
    fill.position.set(
      GAME_CONFIG.lights.fill.position.x,
      GAME_CONFIG.lights.fill.position.y,
      GAME_CONFIG.lights.fill.position.z
    );
    this.scene.add(fill);

    // Piso eliminado

    if (this.skyTexture) {
      // Generar IBL con PMREM
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      const envRT = this.pmremGenerator.fromEquirectangular(this.skyTexture);
      this.scene.environment = envRT.texture;
      this.scene.background = this.skyTexture;
    } else {
      const bg = new THREE.Color(0x0a0a0a);
      this.scene.background = bg;
    }

    const material = new THREE.SpriteMaterial({ map: this.kickTexture, transparent: true, opacity: 0 });
    this.kickSprite = new THREE.Sprite(material);
    this.kickSprite.scale.set(1.0, 1.0, 1);
    this.scene.add(this.kickSprite);

    this.camera.add(this.audioListener);
    await this.loadSounds();

    this.artworkPaths = this.getArtworkPaths();
    this.nextTexturePromise = null;

    // Plinto eliminado
    if (!this.isTouchDevice) this.createDesktopOverlays();
    this.spawnSingleTarget();
    // Contador desactivado: no se crea UI de score

    // Inicializar post-processing
    this.initPostProcessing();
    if (DEBUG_POST_PROCESSING) {
      this.initDebugGUI();
    }

    window.addEventListener('resize', this.onResize);
    // Blur/Focus: pausar y reanudar música
    this.onWindowBlur = () => {
      if (this.music && this.music.isPlaying) {
        try { this.music.pause(); } catch {}
      }
    };
    this.onWindowFocus = () => {
      if ((this.controls?.isLocked || this.isTouchDevice) && this.audioStarted && this.music && !this.music.isPlaying) {
        try { this.music.play(); } catch {}
      }
    };
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('focus', this.onWindowFocus);
    if (!this.isTouchDevice) {
      // Solo bloquear y disparar cuando el click ocurre dentro del contenedor del juego
      this.container.addEventListener('click', this.onDocumentClick);
    } else {
      // Controles táctiles en el contenedor para no interferir con scroll global
      this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
      this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
      this.container.addEventListener('touchend', this.onTouchEnd, { passive: false });
      this.container.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    }

    // Si el menú móvil se abre, deshabilitar redirección y disparos para evitar navegaciones accidentales
    this._onMobileMenuState = (ev) => {
      const isOpen = !!ev?.detail?.isOpen;
      if (!this.isTouchDevice) return; // solo aplica a móvil
      if (isOpen) {
        this._wasActiveBeforeMobileMenu = this.isActive;
        this.isActive = false;
        this.redirectEnabled = false;
      } else {
        this.isActive = this._wasActiveBeforeMobileMenu ?? true;
        this._wasActiveBeforeMobileMenu = null;
        this.redirectEnabled = true;
      }
    };
    window.addEventListener('mobileMenuState', this._onMobileMenuState);

    this.animate();

    // Pausar música al cambiar de pestaña/visibilidad
    this.visibilityHandler = () => {
      if (document.hidden) {
        if (this.music && this.music.isPlaying) {
          try { this.music.pause(); } catch {}
        }
      } else if (this.isActive || this.isTouchDevice) {
        if (this.music && !this.music.isPlaying && this.audioStarted) {
          try { this.music.play(); } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  async loadSounds() {
    const loader = new THREE.AudioLoader();
    const sounds = {
      kick: '/game/assets/audio/kick.mp3',
      wallHit: '/game/assets/audio/wall-hit.mp3',
    };
    for (const [name, url] of Object.entries(sounds)) {
      try {
        const buffer = await loader.loadAsync(url);
        const audio = new THREE.Audio(this.audioListener);
        audio.setBuffer(buffer);
        this.sounds.set(name, audio);
      } catch (err) {
        // silencioso
      }
    }

    // Crear pista de música aleatoria (no loop, volumen bajo)
    await this.loadRandomMusic(loader);
  }

  async loadRandomMusic(loader) {
    try {
      const path = this.randomMusicPaths[Math.floor(Math.random() * this.randomMusicPaths.length)];
      const buffer = await loader.loadAsync(path);
      if (!this.music) this.music = new THREE.Audio(this.audioListener);
      this.music.stop();
      this.music.setBuffer(buffer);
      this.music.setLoop(false);
      this.music.setVolume(0.25);
      this.music.onEnded = async () => {
        await this.loadRandomMusic(loader);
        try { this.music.play(); } catch {}
      };
    } catch {}
  }

  playSound(name) {
    const a = this.sounds.get(name);
    if (a && !a.isPlaying) a.play();
  }

  stopAllSounds() {
    this.sounds.forEach((a) => {
      if (a.isPlaying) a.stop();
    });
  }

  createUI() { /* score desactivado */ }

  updateScore(delta) { /* score desactivado */ }

  spawnInitialTargets(count) {
    // Deprecated en modo de un solo objetivo
  }

  spawnTarget(distribute = false) {
    // Deprecated en modo de un solo objetivo
  }

  createPlinth() {
    // Plinto eliminado: mantener compatibilidad por si se llama
    this.plinthMesh = null;
  }

  async spawnSingleTarget() {
    if (!this.artworkPaths?.length) return;
    // Limpiar fila previa si existe
    if (this.rowGroup) {
      this.rowGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => { if (m.map) m.map.dispose(); m.dispose?.(); });
            else { if (child.material.map) child.material.map.dispose(); child.material.dispose?.(); }
          }
          if (child.geometry) child.geometry.dispose();
        }
      });
      if (this.rowGroup.parent) this.rowGroup.parent.remove(this.rowGroup);
      this.rowGroup = null;
    }
    this.targets = [];
    this.currentTarget = null;
    // Elegir 3 artworks únicos con mayor probabilidad para obras prioritarias
    const pickUniqueWeighted = (arr, n) => {
      const res = [];
      const used = new Set();
      const max = Math.min(n, arr.length);
      
      // Crear array ponderado: obras prioritarias aparecen 3 veces más
      const weighted = [];
      arr.forEach((item, idx) => {
        const weight = item.priority ? 3 : 1;
        for (let i = 0; i < weight; i++) {
          weighted.push(idx);
        }
      });
      
      while (res.length < max) {
        const weightedIdx = Math.floor(Math.random() * weighted.length);
        const idx = weighted[weightedIdx];
        if (!used.has(idx)) { 
          used.add(idx); 
          res.push(arr[idx]); 
        }
      }
      return res;
    };
    const selectedArtworks = pickUniqueWeighted(this.artworkPaths, 3);
    const textures = await Promise.all(selectedArtworks.map((artwork) => this.textureManager.load(artwork.src)));

    // Material base compartido (sin mapa) para propiedades comunes
    if (!this.sharedMaterial) {
      this.sharedMaterial = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1, flatShading: true });
    }

    // Crear grupo fila
    const rowGroup = new THREE.Group();
    // Crear modelos y guardar info del proyecto para navegación
    const models = textures.map((tex, index) => {
      const mat = this.sharedMaterial.clone();
      mat.map = tex || null;
      mat.needsUpdate = true;
      const m = this.createLowPolyHuman(mat);
      // Guardar información del proyecto para navegación al destruir
      const artworkInfo = selectedArtworks[index];
      m.userData.projectInfo = {
        category: artworkInfo.category,
        projectId: artworkInfo.projectId,
        title: artworkInfo.title,
        src: artworkInfo.src
      };
      return m;
    });

    // Determinar alturas y anchos
    let maxWidth = 0;
    let maxHeight = 0;
    const sizes = models.map((m) => {
      const bb = new THREE.Box3().setFromObject(m);
      const sz = new THREE.Vector3();
      bb.getSize(sz);
      maxWidth = Math.max(maxWidth, sz.x);
      maxHeight = Math.max(maxHeight, sz.y);
      return sz;
    });

    // Posicionar en círculo alrededor de la cámara
    const radius = GAME_CONFIG.orbit.radius;
    const baseZ = -3.5;
    const baseAngle = Math.random() * Math.PI * 2;
    const angles = [baseAngle, baseAngle + (2*Math.PI/3), baseAngle + (4*Math.PI/3)];

    models.forEach((m, i) => {
      const h = sizes[i].y || maxHeight;
      const angle = angles[i];
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      m.position.set(x, h / 2 + 0.02, z);
      rowGroup.add(m);
    });
    // El grupo se ancla en el origen; cada modelo sigue su propia órbita en animate()

    // Rotación y animación independiente por modelo
    models.forEach((m) => {
      const speed = 0.008 + Math.random() * 0.006;
      this.rotationSpeeds.set(m, new THREE.Vector3(0, speed, 0));
    });

    this.scene.add(rowGroup);
    this.rowGroup = rowGroup;
    this.targets = models;
    // Guardar ángulo orbital inicial en userData para cada modelo
    models.forEach((m, i) => { m.userData.orbitAngle = angles[i]; });
  }

  handlePrimaryClick(e) {
    // Ignorar si ya estamos navegando (evita redirecciones “fantasma”)
    if (this.isNavigating) return;

    // Asegurar que el evento realmente viene del canvas del juego
    if (!this.container || !this.container.contains(e.target)) return;
    if (this.renderer?.domElement && e.target !== this.renderer.domElement) return;

    if (!this.controls?.isLocked) {
      // Desktop: SIEMPRE bloquear primero. No se permite destruir/redirigir estando desbloqueado,
      // porque el canvas puede solaparse con UI y capturar clicks “fuera” del juego.
      this.centerCustomCursor();
      this.ensureAudioStarted();
      this.controls.lock();
      return;
    }
    this.animateDesktopCrosshairClick();
    this.shoot();
  }

  // Obtener el modelo en una posición específica de la pantalla
  getModelAtScreenPosition(clientX, clientY) {
    if (!this.container || !this.camera || !this.targets?.length) return null;
    
    const rect = this.container.getBoundingClientRect();
    // Si el click ocurrió fuera del contenedor, no hacemos raycast (importante para evitar hits accidentales)
    if (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    ) {
      return null;
    }

    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Guard adicional (por si el rect cambia o hay valores raros)
    if (x < -1 || x > 1 || y < -1 || y > 1) return null;
    
    this.raycaster.setFromCamera({ x, y }, this.camera);
    const intersections = this.raycaster.intersectObjects(this.targets, true);
    
    if (intersections.length > 0) {
      // Encontrar el modelo raíz
      let root = intersections[0].object;
      while (root.parent && !this.targets.includes(root)) {
        root = root.parent;
      }
      if (this.targets.includes(root)) {
        return root;
      }
    }
    return null;
  }

  handleTouchStart(e) {
    if (!this.isActive) return;
    if (e.touches && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      this.lastTouchX = t.clientX;
      this.lastTouchY = t.clientY;
      this.startTouchX = t.clientX;
      this.startTouchY = t.clientY;
      this.startTouchTime = performance.now();
      this.ensureAudioStarted();
      this._touchMode = 'look'; // por defecto arrastrar mueve cámara
      this._touchTapTimer && clearTimeout(this._touchTapTimer);
      this._touchMoved = false;
    }
  }

  handleTouchMove(e) {
    if (!this.isActive) return;
    if (!e.touches || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    if (this.lastTouchX == null || this.lastTouchY == null) {
      this.lastTouchX = t.clientX;
      this.lastTouchY = t.clientY;
      return;
    }
    const dx = t.clientX - this.lastTouchX;
    const dy = t.clientY - this.lastTouchY;
    this.lastTouchX = t.clientX;
    this.lastTouchY = t.clientY;
    if (Math.abs(t.clientX - this.startTouchX) > this.tapMoveThresholdPx || Math.abs(t.clientY - this.startTouchY) > this.tapMoveThresholdPx) this._touchMoved = true;
    if (this._touchMode === 'look') {
      this.touchYaw -= dx * this.touchSensitivity;
      this.touchPitch -= dy * this.touchSensitivity;
      const maxPitch = Math.PI / 2 - 0.05;
      this.touchPitch = Math.max(-maxPitch, Math.min(maxPitch, this.touchPitch));
      this.camera.rotation.set(this.touchPitch, this.touchYaw, 0, 'YXZ');
    }
  }

  handleTouchEnd() {
    this._touchMode = null;
    this.lastTouchX = null;
    this.lastTouchY = null;
    const dt = performance.now() - this.startTouchTime;
    const moved = this._touchMoved;
    this.startTouchX = null;
    this.startTouchY = null;
    this._touchMoved = false;
    // Si el toque fue corto y sin movimiento significativo, disparamos
    if (!moved && dt <= this.tapTimeThresholdMs) {
      this.animateDesktopCrosshairClick();
    this.shoot();
    }
  }

  playShootOverlay() {
    if (!this.kickSprite) return;
    this.kickSprite.material.opacity = 1;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.kickSprite.position.copy(this.camera.position).add(dir.multiplyScalar(1.2));
    setTimeout(() => {
      if (this.kickSprite) this.kickSprite.material.opacity = 0;
    }, GAME_CONFIG.shotOverlay.durationMs);
  }

  createImpactMark() { /* desactivado */ }

  // Crear explosión low poly a partir de un modelo
  createExplosionFromObject(root) {
    try {
      root.updateMatrixWorld?.(true);
      const bbox = new THREE.Box3().setFromObject(root);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const shards = [];
      const velocities = [];
      const angularVelocities = [];

      // Intentar reutilizar mapa de textura de algún hijo para mantener paleta
      let sampleMap = null;
      root.traverse?.((c) => {
        if (!sampleMap && c.isMesh && c.material && !Array.isArray(c.material) && c.material.map) {
          sampleMap = c.material.map;
        }
      });

      const n = GAME_CONFIG.explosion.shardsPerModel;
      // Material compartido para los fragmentos
      if (!this.explosionMaterial) {
        this.explosionMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.85,
          metalness: 0.05,
          flatShading: true,
          transparent: true,
          opacity: 1,
          map: sampleMap || null,
        });
      } else {
        this.explosionMaterial.map = sampleMap || null;
        this.explosionMaterial.needsUpdate = true;
      }

      for (let i = 0; i < n; i++) {
        const r = THREE.MathUtils.lerp(GAME_CONFIG.explosion.shardSizeMin, GAME_CONFIG.explosion.shardSizeMax, Math.random());
        const geom = new THREE.TetrahedronGeometry(r, 0);

        const shard = new THREE.Mesh(geom, this.explosionMaterial);
        // Posición inicial aleatoria dentro del bbox (mundo)
        shard.position.set(
          THREE.MathUtils.lerp(bbox.min.x, bbox.max.x, Math.random()),
          THREE.MathUtils.lerp(bbox.min.y, bbox.max.y, Math.random()),
          THREE.MathUtils.lerp(bbox.min.z, bbox.max.z, Math.random())
        );
        // Velocidad inicial
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.4, Math.random() - 0.5).normalize();
        const speed = GAME_CONFIG.explosion.speed * (0.6 + Math.random() * 0.8);
        const vel = dir.multiplyScalar(speed);
        vel.y += GAME_CONFIG.explosion.upwardBoost * (0.2 + Math.random() * 0.8);

        // Velocidad angular
        const angVel = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        );

        this.scene.add(shard);
        shards.push(shard);
        velocities.push(vel);
        angularVelocities.push(angVel);
      }

      this.explosions.push({
        meshes: shards,
        velocities,
        angularVelocities,
        startTime: performance.now(),
        lifetimeMs: GAME_CONFIG.explosion.lifetimeMs,
      });
    } catch (e) {
      // silencioso
    }
  }

  shoot() {
    if (!this.isActive) return;
    const now = performance.now();
    if (now - this.lastShotTime < this.shotIntervalMs) return;
    this.lastShotTime = now;
    this.playShootOverlay();
    this.playSound('kick');

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObjects(this.targets, true);

    if (intersections.length > 0) {
      const hit = intersections[0];
      const mesh = hit.object;
      // Marca de impacto desactivada
      this.destroyTarget(mesh);
      this.updateScore(100);
      if (this.targets.length === 0) {
        if (this.rowGroup) {
          if (this.rowGroup.parent) this.rowGroup.parent.remove(this.rowGroup);
          this.rowGroup = null;
        }
        this.spawnSingleTarget();
      }
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      this.updateScore(0);
    }
  }

  destroyTarget(mesh) {
    // Asegurar que removemos el root que guardamos en targets (fila o modelo entero)
    let root = mesh;
    while (root.parent && !this.targets.includes(root)) {
      root = root.parent;
    }
    const idx = this.targets.indexOf(root);
    if (idx >= 0) this.targets.splice(idx, 1);
    
    // Obtener información del proyecto antes de destruir para navegación
    const projectInfo = root.userData?.projectInfo;
    
    // No disponer sharedMaterial; se reutiliza. Manejar grupos.
    // Crear explosión antes de eliminar
    this.createExplosionFromObject(root);
    if (root.traverse) {
      root.traverse((child) => {
        if (child.isMesh) {
          if (child.material && child.material !== this.sharedMaterial) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => {
                if (m?.map) m.map.dispose();
                m.dispose?.();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose?.();
            }
          }
          if (child.geometry) child.geometry.dispose();
        }
      });
    } else {
      if (root.material && root.material !== this.sharedMaterial) {
        if (Array.isArray(root.material)) {
          root.material.forEach((m) => {
            if (m?.map) m.map.dispose();
            m.dispose?.();
          });
        } else {
          if (root.material.map) root.material.map.dispose();
          root.material.dispose?.();
        }
      }
      if (root.geometry) root.geometry.dispose();
    }
    if (root.parent) root.parent.remove(root); else this.scene.remove(root);
    if (this.currentTarget === root) this.currentTarget = null;
    
    // Navegar al proyecto correspondiente de forma instantánea
    // Solo navegar si no estamos ya navegando (evita navegaciones múltiples)
    if (projectInfo && this.onNavigate && !this.isNavigating && this.redirectEnabled) {
      this.isNavigating = true;
      this.isActive = false; // Desactivar el juego para evitar más disparos
      this.onNavigate(`/${projectInfo.category}/${projectInfo.projectId}`);
    }
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    
    // Actualizar resolución del post-processing
    if (this.composer) {
      this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
      const resolution = new THREE.Vector2(
        this.container.clientWidth * this.renderer.getPixelRatio(),
        this.container.clientHeight * this.renderer.getPixelRatio()
      );
      if (this.crtPass) {
        this.crtPass.uniforms.resolution.value = resolution;
      }
      if (this.ditheringPass) {
        this.ditheringPass.uniforms.resolution.value = resolution;
      }
    }
    
    if (this.controls?.isLocked) this.centerCustomCursor();
    if (this.isTouchDevice) {
      this.ensureMobileCrosshair();
      if (this.isActive) this.showMobileCrosshair();
    }
  }

  centerCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    cursor.style.left = `${centerX}px`;
    cursor.style.top = `${centerY}px`;
  }

  ensureMobileCrosshair() {
    if (!this.isTouchDevice) return;
    if (this.mobileCrosshairEl && this.mobileCrosshairEl.parentNode) return;

    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';
    const crosshairInner = document.createElement('div');
    crosshairInner.style.position = 'relative';
    crosshairInner.style.width = '100%';
    crosshairInner.style.height = '100%';
    crosshairInner.style.transition = 'transform 0.4s ease-out';

    // Cruz idéntica al cursor custom (líneas vertical y horizontal)
    const crosshair = document.createElement('div');
    crosshair.style.position = 'relative';
    crosshair.style.width = '100%';
    crosshair.style.height = '100%';

    // Línea vertical (before)
    const vertical = document.createElement('div');
    vertical.style.content = '';
    vertical.style.position = 'absolute';
    vertical.style.left = '50%';
    vertical.style.top = '0';
    vertical.style.width = '2px';
    vertical.style.height = '100%';
    vertical.style.backgroundColor = 'black';
    vertical.style.transform = 'translateX(-50%)';

    // Línea horizontal (after)
    const horizontal = document.createElement('div');
    horizontal.style.content = '';
    horizontal.style.position = 'absolute';
    horizontal.style.left = '0';
    horizontal.style.top = '50%';
    horizontal.style.width = '100%';
    horizontal.style.height = '2px';
    horizontal.style.backgroundColor = 'black';
    horizontal.style.transform = 'translateY(-50%)';

    crosshair.appendChild(vertical);
    crosshair.appendChild(horizontal);
    el.appendChild(crosshair);

    this.container.style.position = 'relative';
    this.container.appendChild(el);
    this.mobileCrosshairEl = el;
  }

  ensureAudioStarted() {
    if (this.audioStarted) return;
    try {
      const ctx = this.audioListener.context;
      if (ctx && ctx.state !== 'running' && ctx.resume) ctx.resume();
      if (this.music && !this.music.isPlaying) {
        try { this.music.play(); } catch {}
      }
      this.audioStarted = true;
    } catch {}
  }

  hideCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.style.display = 'none';
  }

  showCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.style.display = 'block';
  }

  ensureDesktopCrosshair() {
    if (this.isTouchDevice) return; // no en móvil
    if (this.desktopCrosshairEl && this.desktopCrosshairEl.parentNode) return;
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';
    const crosshairInner = document.createElement('div');
    crosshairInner.style.position = 'relative';
    crosshairInner.style.width = '100%';
    crosshairInner.style.height = '100%';
    crosshairInner.style.transition = 'transform 0.4s ease-out';
    // mira similar a CustomCursor: líneas cruzadas
    const v = document.createElement('div');
    v.style.position = 'absolute';
    v.style.left = '50%';
    v.style.top = '0';
    v.style.width = '2px';
    v.style.height = '100%';
    v.style.background = 'black';
    v.style.transform = 'translateX(-50%)';
    const h = document.createElement('div');
    h.style.position = 'absolute';
    h.style.left = '0';
    h.style.top = '50%';
    h.style.width = '100%';
    h.style.height = '2px';
    h.style.background = 'black';
    h.style.transform = 'translateY(-50%)';
    crosshairInner.appendChild(v);
    crosshairInner.appendChild(h);
    el.appendChild(crosshairInner);
    this.container.style.position = 'relative';
    this.container.appendChild(el);
    this.desktopCrosshairEl = el;
    this.desktopCrosshairInner = crosshairInner;
  }

  animateDesktopCrosshairClick() {
    if (!this.desktopCrosshairInner) return;
    this.desktopCrosshairInner.style.transform = 'rotate(180deg)';
    const handleTransitionEnd = () => {
      this.desktopCrosshairInner.style.transition = 'none';
      this.desktopCrosshairInner.style.transform = 'rotate(0deg)';
      void this.desktopCrosshairInner.offsetWidth;
      this.desktopCrosshairInner.style.transition = 'transform 0.4s ease-out';
      this.desktopCrosshairInner.removeEventListener('transitionend', handleTransitionEnd);
    };
    this.desktopCrosshairInner.addEventListener('transitionend', handleTransitionEnd);
  }

  showDesktopCrosshair() {
    if (this.desktopCrosshairEl) this.desktopCrosshairEl.style.display = 'block';
  }

  hideDesktopCrosshair() {
    if (this.desktopCrosshairEl) this.desktopCrosshairEl.style.display = 'none';
  }

  showMobileCrosshair() {
    if (this.mobileCrosshairEl) this.mobileCrosshairEl.style.display = 'block';
  }

  hideMobileCrosshair() {
    if (this.mobileCrosshairEl) this.mobileCrosshairEl.style.display = 'none';
  }

  createDesktopOverlays() {
    // Overlay de click para entrar en modo juego
    if (!this.desktopClickOverlayEl) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.background = 'rgba(255,255,255,0.0)';
      el.style.pointerEvents = 'none';
    const crosshairInner = document.createElement('div');
    crosshairInner.style.position = 'relative';
    crosshairInner.style.width = '100%';
    crosshairInner.style.height = '100%';
    crosshairInner.style.transition = 'transform 0.4s ease-out';
      el.style.zIndex = '900';
      const text = document.createElement('div');
      text.textContent = 'CLICK';
      text.style.fontFamily = 'monospace';
      text.style.fontSize = '14px';
      text.style.color = '#ff0000';
      text.style.textShadow = '0 0 4px rgba(0,0,0,0.5)';
      el.appendChild(text);
      this.container.style.position = 'relative';
      this.container.appendChild(el);
      this.desktopClickOverlayEl = el;
    }
    // Hint de ESC para salir de pointer lock
    if (!this.desktopEscHintEl) {
      const esc = document.createElement('div');
      esc.style.position = 'absolute';
      esc.style.left = '12px';
      esc.style.bottom = '12px';
      esc.style.background = 'rgba(0,0,0,0.4)';
      esc.style.color = '#fff';
      esc.style.fontFamily = 'monospace';
      esc.style.fontSize = '12px';
      esc.style.display = 'none';
      esc.style.zIndex = '900';
      esc.textContent = 'SALIR ESC';
      this.container.appendChild(esc);
      this.desktopEscHintEl = esc;
    }
  }

  showDesktopClickOverlay() {
    if (this.desktopClickOverlayEl) this.desktopClickOverlayEl.style.display = 'flex';
  }
  hideDesktopClickOverlay() {
    if (this.desktopClickOverlayEl) this.desktopClickOverlayEl.style.display = 'none';
  }
  showEscHintOverlay() {
    if (this.desktopEscHintEl) this.desktopEscHintEl.style.display = 'block';
  }
  hideEscHintOverlay() {
    if (this.desktopEscHintEl) this.desktopEscHintEl.style.display = 'none';
  }

  // ============ POST-PROCESSING ============
  
  initPostProcessing() {
    // Crear composer
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass (escena base)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // CRT pass
    this.crtPass = new ShaderPass(CRTShader);
    this.crtPass.uniforms.resolution.value = new THREE.Vector2(
      this.container.clientWidth * this.renderer.getPixelRatio(),
      this.container.clientHeight * this.renderer.getPixelRatio()
    );
    this.crtPass.enabled = this.crtConfig.enabled;
    this.composer.addPass(this.crtPass);
    
    // Dithering pass
    this.ditheringPass = new ShaderPass(DitheringShader);
    this.ditheringPass.uniforms.resolution.value = new THREE.Vector2(
      this.container.clientWidth * this.renderer.getPixelRatio(),
      this.container.clientHeight * this.renderer.getPixelRatio()
    );
    this.ditheringPass.enabled = this.ditheringConfig.enabled;
    this.composer.addPass(this.ditheringPass);
    
    // Aplicar configuración inicial
    this.updateCRTUniforms();
    this.updateDitheringUniforms();
  }
  
  updateCRTUniforms() {
    if (!this.crtPass) return;
    const u = this.crtPass.uniforms;
    const c = this.crtConfig;
    
    this.crtPass.enabled = c.enabled;
    
    u.scanlineEnabled.value = c.scanlineEnabled;
    u.scanlineIntensity.value = c.scanlineIntensity;
    u.scanlineCount.value = c.scanlineCount;
    u.scanlineSpeed.value = c.scanlineSpeed;
    
    u.chromaticEnabled.value = c.chromaticEnabled;
    u.chromaticIntensity.value = c.chromaticIntensity;
    
    u.distortionEnabled.value = c.distortionEnabled;
    u.distortionAmount.value = c.distortionAmount;
    
    u.vignetteEnabled.value = c.vignetteEnabled;
    u.vignetteIntensity.value = c.vignetteIntensity;
    u.vignetteRoundness.value = c.vignetteRoundness;
    
    u.phosphorEnabled.value = c.phosphorEnabled;
    u.phosphorIntensity.value = c.phosphorIntensity;
    
    u.flickerEnabled.value = c.flickerEnabled;
    u.flickerIntensity.value = c.flickerIntensity;
    
    u.noiseEnabled.value = c.noiseEnabled;
    u.noiseIntensity.value = c.noiseIntensity;
    
    u.brightness.value = c.brightness;
    u.contrast.value = c.contrast;
    u.saturation.value = c.saturation;
    
    u.glowEnabled.value = c.glowEnabled;
    u.glowIntensity.value = c.glowIntensity;
  }
  
  updateDitheringUniforms() {
    if (!this.ditheringPass) return;
    const u = this.ditheringPass.uniforms;
    const c = this.ditheringConfig;
    
    this.ditheringPass.enabled = c.enabled;
    
    u.ditheringEnabled.value = c.ditheringEnabled;
    u.ditheringType.value = c.ditheringType;
    u.colorLevels.value = c.colorLevels;
    u.ditherStrength.value = c.ditherStrength;
    
    u.paletteEnabled.value = c.paletteEnabled;
    u.paletteSize.value = c.paletteSize;
    
    u.pixelateEnabled.value = c.pixelateEnabled;
    u.pixelSize.value = c.pixelSize;
  }
  
  applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;
    
    if (preset.crt) {
      Object.assign(this.crtConfig, preset.crt);
      this.updateCRTUniforms();
    }
    if (preset.dithering) {
      Object.assign(this.ditheringConfig, preset.dithering);
      this.updateDitheringUniforms();
    }
    
    // Actualizar GUI si existe
    if (this.debugGui) {
      this.debugGui.controllersRecursive().forEach(c => c.updateDisplay());
    }
  }
  
  async initDebugGUI() {
    try {
      // Importar lil-gui dinámicamente
      const { GUI } = await import('lil-gui');
      
      this.debugGui = new GUI({ 
        title: '🎮 Post-Processing Debug',
        width: 320
      });
      this.debugGui.domElement.style.position = 'absolute';
      this.debugGui.domElement.style.top = '10px';
      this.debugGui.domElement.style.right = '10px';
      this.debugGui.domElement.style.zIndex = '9999';
      
      // Presets
      const presetNames = Object.keys(presets);
      const presetObj = { preset: 'CRT Suave' };
      this.debugGui.add(presetObj, 'preset', presetNames)
        .name('📋 Preset')
        .onChange((v) => this.applyPreset(v));
      
      // ===== CRT FOLDER =====
      const crtFolder = this.debugGui.addFolder('📺 CRT Effects');
      crtFolder.add(this.crtConfig, 'enabled')
        .name('Activar CRT')
        .onChange(() => this.updateCRTUniforms());
      
      // Scanlines
      const scanFolder = crtFolder.addFolder('Scanlines');
      scanFolder.add(this.crtConfig, 'scanlineEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      scanFolder.add(this.crtConfig, 'scanlineIntensity', 0, 0.5, 0.01)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      scanFolder.add(this.crtConfig, 'scanlineCount', 100, 800, 10)
        .name('Cantidad')
        .onChange(() => this.updateCRTUniforms());
      scanFolder.add(this.crtConfig, 'scanlineSpeed', 0, 2, 0.1)
        .name('Velocidad (rolling)')
        .onChange(() => this.updateCRTUniforms());
      
      // Chromatic Aberration
      const chromaFolder = crtFolder.addFolder('Chromatic Aberration');
      chromaFolder.add(this.crtConfig, 'chromaticEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      chromaFolder.add(this.crtConfig, 'chromaticIntensity', 0, 0.02, 0.001)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      
      // Distortion
      const distortFolder = crtFolder.addFolder('Barrel Distortion');
      distortFolder.add(this.crtConfig, 'distortionEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      distortFolder.add(this.crtConfig, 'distortionAmount', 0, 0.4, 0.01)
        .name('Curvatura')
        .onChange(() => this.updateCRTUniforms());
      
      // Vignette
      const vignetteFolder = crtFolder.addFolder('Vignette');
      vignetteFolder.add(this.crtConfig, 'vignetteEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      vignetteFolder.add(this.crtConfig, 'vignetteIntensity', 0, 1, 0.05)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      vignetteFolder.add(this.crtConfig, 'vignetteRoundness', 0.1, 1, 0.05)
        .name('Redondez')
        .onChange(() => this.updateCRTUniforms());
      
      // Phosphor
      const phosphorFolder = crtFolder.addFolder('Phosphor RGB');
      phosphorFolder.add(this.crtConfig, 'phosphorEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      phosphorFolder.add(this.crtConfig, 'phosphorIntensity', 0, 1, 0.05)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      
      // Flicker
      const flickerFolder = crtFolder.addFolder('Flicker');
      flickerFolder.add(this.crtConfig, 'flickerEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      flickerFolder.add(this.crtConfig, 'flickerIntensity', 0, 0.15, 0.01)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      
      // Noise
      const noiseFolder = crtFolder.addFolder('Noise');
      noiseFolder.add(this.crtConfig, 'noiseEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      noiseFolder.add(this.crtConfig, 'noiseIntensity', 0, 0.3, 0.01)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      
      // Glow
      const glowFolder = crtFolder.addFolder('Glow');
      glowFolder.add(this.crtConfig, 'glowEnabled')
        .name('Activar')
        .onChange(() => this.updateCRTUniforms());
      glowFolder.add(this.crtConfig, 'glowIntensity', 0, 0.5, 0.05)
        .name('Intensidad')
        .onChange(() => this.updateCRTUniforms());
      
      // Color adjustments
      const colorFolder = crtFolder.addFolder('Color');
      colorFolder.add(this.crtConfig, 'brightness', 0.5, 1.5, 0.05)
        .name('Brillo')
        .onChange(() => this.updateCRTUniforms());
      colorFolder.add(this.crtConfig, 'contrast', 0.5, 2, 0.05)
        .name('Contraste')
        .onChange(() => this.updateCRTUniforms());
      colorFolder.add(this.crtConfig, 'saturation', 0, 2, 0.05)
        .name('Saturación')
        .onChange(() => this.updateCRTUniforms());
      
      crtFolder.open();
      
      // ===== DITHERING FOLDER =====
      const ditherFolder = this.debugGui.addFolder('🎨 Dithering');
      ditherFolder.add(this.ditheringConfig, 'enabled')
        .name('Activar Dithering')
        .onChange(() => this.updateDitheringUniforms());
      
      const ditherTypes = { 'Bayer 4x4': 0, 'Bayer 8x8': 1, 'Blue Noise': 2 };
      ditherFolder.add(this.ditheringConfig, 'ditheringType', ditherTypes)
        .name('Patrón')
        .onChange(() => this.updateDitheringUniforms());
      ditherFolder.add(this.ditheringConfig, 'colorLevels', 2, 32, 1)
        .name('Niveles de color')
        .onChange(() => this.updateDitheringUniforms());
      ditherFolder.add(this.ditheringConfig, 'ditherStrength', 0, 2, 0.1)
        .name('Fuerza')
        .onChange(() => this.updateDitheringUniforms());
      
      // Palette
      const paletteFolder = ditherFolder.addFolder('Paleta');
      paletteFolder.add(this.ditheringConfig, 'paletteEnabled')
        .name('Reducir paleta')
        .onChange(() => this.updateDitheringUniforms());
      paletteFolder.add(this.ditheringConfig, 'paletteSize', 2, 32, 1)
        .name('Colores')
        .onChange(() => this.updateDitheringUniforms());
      
      // Pixelation
      const pixelFolder = ditherFolder.addFolder('Pixelación');
      pixelFolder.add(this.ditheringConfig, 'pixelateEnabled')
        .name('Pixelar')
        .onChange(() => this.updateDitheringUniforms());
      pixelFolder.add(this.ditheringConfig, 'pixelSize', 1, 16, 1)
        .name('Tamaño pixel')
        .onChange(() => this.updateDitheringUniforms());
      
      // Export button
      const exportObj = {
        exportConfig: () => {
          const config = {
            crt: { ...this.crtConfig },
            dithering: { ...this.ditheringConfig }
          };
          console.log('=== POST-PROCESSING CONFIG ===');
          console.log(JSON.stringify(config, null, 2));
          console.log('==============================');
          
          // Copiar al portapapeles
          navigator.clipboard?.writeText(JSON.stringify(config, null, 2))
            .then(() => alert('Configuración copiada al portapapeles!'))
            .catch(() => alert('Config impresa en consola (F12)'));
        }
      };
      this.debugGui.add(exportObj, 'exportConfig').name('📤 Exportar Config');
      
      // Aplicar preset inicial
      this.applyPreset('CRT Suave');
      
    } catch (err) {
      console.warn('Debug GUI no disponible:', err);
    }
  }

  // ============ MÉTODOS DE ANIMACIÓN ============

  // Animación de caminar (mejorada)
  animateWalk(anim, amplitudes, limbs, model, baseY) {
    const { lShoulderPivot, rShoulderPivot, lElbowPivot, rElbowPivot,
            lHipPivot, rHipPivot, lKneePivot, rKneePivot,
            lWristPivot, rWristPivot, lAnklePivot, rAnklePivot,
            torso, pelvis, head, shoulders } = limbs;

    const swingArm = Math.sin(anim.t) * amplitudes.arm;
    const swingLeg = Math.sin(anim.t) * amplitudes.leg;

    // Brazos oscilando
    if (lShoulderPivot) lShoulderPivot.rotation.x = swingArm;
    if (rShoulderPivot) rShoulderPivot.rotation.x = -swingArm;
    
    // Codos plegándose
    if (lElbowPivot) lElbowPivot.rotation.x = Math.max(0, -Math.sin(anim.t + Math.PI * 0.2) * amplitudes.elbow);
    if (rElbowPivot) rElbowPivot.rotation.x = Math.max(0, Math.sin(anim.t + Math.PI * 0.2) * amplitudes.elbow);
    
    // Muñecas
    if (lWristPivot) lWristPivot.rotation.z = Math.sin(anim.t * 1.2) * 0.15;
    if (rWristPivot) rWristPivot.rotation.z = -Math.sin(anim.t * 1.2) * 0.15;

    // Piernas
    if (lHipPivot) lHipPivot.rotation.x = -swingLeg;
    if (rHipPivot) rHipPivot.rotation.x = swingLeg;
    
    // Rodillas
    if (lKneePivot) lKneePivot.rotation.x = Math.max(0, Math.sin(anim.t + Math.PI * 0.2) * amplitudes.knee);
    if (rKneePivot) rKneePivot.rotation.x = Math.max(0, -Math.sin(anim.t + Math.PI * 0.2) * amplitudes.knee);

    // Tobillos
    const footPitchL = -Math.max(0, Math.sin(anim.t + Math.PI * 0.4)) * 0.35;
    const footPitchR = -Math.max(0, Math.sin(anim.t + Math.PI * 0.4 + Math.PI)) * 0.35;
    if (lAnklePivot) lAnklePivot.rotation.x = footPitchL;
    if (rAnklePivot) rAnklePivot.rotation.x = footPitchR;

    // Torsión de pelvis/torso
    if (pelvis) pelvis.rotation.y = -swingLeg * amplitudes.hipTwist;
    if (torso) torso.rotation.y = swingArm * amplitudes.torsoTwist;
    
    // Cabeza mira ligeramente alrededor mientras camina
    if (head) {
      head.rotation.y = -swingArm * amplitudes.torsoTwist * 0.6 + Math.sin(anim.t3) * amplitudes.headLook * 0.3;
      head.rotation.x = Math.sin(anim.t3 * 0.7) * 0.1;
    }

    // Hombros suben/bajan ligeramente con el paso
    if (shoulders) {
      shoulders.rotation.z = Math.sin(anim.t) * amplitudes.shoulderShrug;
    }

    // Bob vertical
    const bob = Math.max(0, Math.cos(anim.t)) * amplitudes.bob;
    model.position.y = baseY + bob;
  }

  // Animación de reposo/idle
  animateIdle(anim, amplitudes, limbs, model, baseY) {
    const { lShoulderPivot, rShoulderPivot, lElbowPivot, rElbowPivot,
            lHipPivot, rHipPivot, lKneePivot, rKneePivot,
            lWristPivot, rWristPivot, lAnklePivot, rAnklePivot,
            torso, pelvis, head, shoulders } = limbs;

    // Peso cambiando de un pie a otro (muy sutil)
    const weightShift = Math.sin(anim.t * 0.3) * 0.08;
    
    // Brazos relajados con pequeño balanceo
    if (lShoulderPivot) {
      lShoulderPivot.rotation.x = 0.1 + Math.sin(anim.t * 0.5) * 0.05;
      lShoulderPivot.rotation.z = 0.15 + Math.sin(anim.t * 0.4) * 0.03;
    }
    if (rShoulderPivot) {
      rShoulderPivot.rotation.x = 0.1 + Math.sin(anim.t * 0.5 + 0.5) * 0.05;
      rShoulderPivot.rotation.z = -0.15 - Math.sin(anim.t * 0.4 + 0.5) * 0.03;
    }
    
    // Codos ligeramente doblados
    if (lElbowPivot) lElbowPivot.rotation.x = 0.2 + Math.sin(anim.t * 0.6) * 0.05;
    if (rElbowPivot) rElbowPivot.rotation.x = 0.2 + Math.sin(anim.t * 0.6 + 1) * 0.05;
    
    // Muñecas relajadas
    if (lWristPivot) lWristPivot.rotation.z = Math.sin(anim.t * 0.4) * 0.1;
    if (rWristPivot) rWristPivot.rotation.z = -Math.sin(anim.t * 0.4) * 0.1;

    // Piernas casi quietas, solo peso cambiando
    if (lHipPivot) lHipPivot.rotation.x = weightShift * 0.5;
    if (rHipPivot) rHipPivot.rotation.x = -weightShift * 0.5;
    if (lKneePivot) lKneePivot.rotation.x = Math.max(0, -weightShift * 0.3);
    if (rKneePivot) rKneePivot.rotation.x = Math.max(0, weightShift * 0.3);

    // Balanceo lateral sutil del torso
    if (torso) {
      torso.rotation.z = Math.sin(anim.t * 0.3 + anim.swayPhase) * amplitudes.sway;
      torso.rotation.y = Math.sin(anim.t * 0.2) * 0.03;
    }
    if (pelvis) {
      pelvis.rotation.z = -Math.sin(anim.t * 0.3 + anim.swayPhase) * amplitudes.sway * 0.5;
    }

    // Cabeza mirando alrededor con curiosidad
    if (head) {
      head.rotation.y = Math.sin(anim.t3) * amplitudes.headLook;
      head.rotation.x = Math.sin(anim.t3 * 0.7 + 1) * amplitudes.headLook * 0.4;
      // Pequeña inclinación lateral
      head.rotation.z = Math.sin(anim.t3 * 0.5) * 0.08;
    }

    // Hombros suben/bajan con la respiración
    if (shoulders) {
      shoulders.position.y = (shoulders.position.y || 0) + Math.sin(anim.t2) * 0.005;
    }

    // Pequeño bob de respiración
    const breathBob = Math.sin(anim.t2) * 0.008;
    model.position.y = baseY + breathBob;
  }

  // Animación de baile
  animateDance(anim, amplitudes, limbs, model, baseY) {
    const { lShoulderPivot, rShoulderPivot, lElbowPivot, rElbowPivot,
            lHipPivot, rHipPivot, lKneePivot, rKneePivot,
            lWristPivot, rWristPivot, lAnklePivot, rAnklePivot,
            torso, pelvis, head, shoulders } = limbs;

    const beat = anim.t * 2; // Ritmo más rápido
    const bounce = Math.abs(Math.sin(beat)) * amplitudes.danceBounce;

    // Brazos moviéndose al ritmo - alternando arriba/abajo
    if (lShoulderPivot) {
      lShoulderPivot.rotation.x = -Math.PI * 0.4 + Math.sin(beat) * amplitudes.danceArm * 0.5;
      lShoulderPivot.rotation.z = Math.sin(beat * 0.5) * 0.3;
    }
    if (rShoulderPivot) {
      rShoulderPivot.rotation.x = -Math.PI * 0.4 + Math.sin(beat + Math.PI) * amplitudes.danceArm * 0.5;
      rShoulderPivot.rotation.z = -Math.sin(beat * 0.5) * 0.3;
    }
    
    // Codos flexionados y moviéndose
    if (lElbowPivot) lElbowPivot.rotation.x = 0.5 + Math.sin(beat * 1.5) * 0.4;
    if (rElbowPivot) rElbowPivot.rotation.x = 0.5 + Math.sin(beat * 1.5 + Math.PI) * 0.4;
    
    // Muñecas girando
    if (lWristPivot) {
      lWristPivot.rotation.z = Math.sin(beat * 2) * 0.4;
      lWristPivot.rotation.x = Math.cos(beat * 2) * 0.2;
    }
    if (rWristPivot) {
      rWristPivot.rotation.z = -Math.sin(beat * 2) * 0.4;
      rWristPivot.rotation.x = Math.cos(beat * 2) * 0.2;
    }

    // Piernas saltando ligeramente
    const legBounce = Math.sin(beat) * 0.15;
    if (lHipPivot) lHipPivot.rotation.x = legBounce;
    if (rHipPivot) rHipPivot.rotation.x = -legBounce;
    if (lKneePivot) lKneePivot.rotation.x = Math.max(0, Math.sin(beat + Math.PI * 0.5) * 0.4);
    if (rKneePivot) rKneePivot.rotation.x = Math.max(0, Math.sin(beat + Math.PI * 1.5) * 0.4);
    
    // Tobillos apuntando
    if (lAnklePivot) lAnklePivot.rotation.x = Math.sin(beat) * 0.2;
    if (rAnklePivot) rAnklePivot.rotation.x = Math.sin(beat + Math.PI) * 0.2;

    // Torso girando y moviéndose
    if (torso) {
      torso.rotation.y = Math.sin(beat * 0.5) * amplitudes.danceTwist;
      torso.rotation.z = Math.sin(beat) * 0.1;
    }
    if (pelvis) {
      pelvis.rotation.y = -Math.sin(beat * 0.5) * amplitudes.danceTwist * 0.7;
      pelvis.rotation.x = Math.sin(beat) * 0.08;
    }

    // Cabeza moviéndose al ritmo
    if (head) {
      head.rotation.y = Math.sin(beat * 0.5) * 0.2;
      head.rotation.x = Math.sin(beat) * 0.15;
      head.rotation.z = Math.sin(beat * 0.5) * 0.1;
    }

    // Hombros al ritmo
    if (shoulders) {
      shoulders.rotation.z = Math.sin(beat) * 0.15;
    }

    // Rebote vertical pronunciado
    model.position.y = baseY + bounce;
  }

  // Animación flotante/espectral
  animateFloat(anim, amplitudes, limbs, model, baseY) {
    const { lShoulderPivot, rShoulderPivot, lElbowPivot, rElbowPivot,
            lHipPivot, rHipPivot, lKneePivot, rKneePivot,
            lWristPivot, rWristPivot, lAnklePivot, rAnklePivot,
            torso, pelvis, head, shoulders } = limbs;

    const floatT = anim.t * 0.5; // Movimiento lento y etéreo

    // Brazos extendidos flotando suavemente
    if (lShoulderPivot) {
      lShoulderPivot.rotation.x = -Math.PI * 0.15 + Math.sin(floatT + 0.5) * 0.15;
      lShoulderPivot.rotation.z = Math.PI * 0.25 + Math.sin(floatT * 0.7) * amplitudes.floatSway;
    }
    if (rShoulderPivot) {
      rShoulderPivot.rotation.x = -Math.PI * 0.15 + Math.sin(floatT) * 0.15;
      rShoulderPivot.rotation.z = -Math.PI * 0.25 - Math.sin(floatT * 0.7 + 1) * amplitudes.floatSway;
    }
    
    // Codos suavemente doblados
    if (lElbowPivot) lElbowPivot.rotation.x = 0.3 + Math.sin(floatT * 0.8) * 0.1;
    if (rElbowPivot) rElbowPivot.rotation.x = 0.3 + Math.sin(floatT * 0.8 + 1) * 0.1;
    
    // Muñecas cayendo elegantemente
    if (lWristPivot) {
      lWristPivot.rotation.x = 0.4 + Math.sin(floatT * 0.6) * 0.15;
      lWristPivot.rotation.z = Math.sin(floatT * 0.5) * 0.2;
    }
    if (rWristPivot) {
      rWristPivot.rotation.x = 0.4 + Math.sin(floatT * 0.6 + 0.5) * 0.15;
      rWristPivot.rotation.z = -Math.sin(floatT * 0.5) * 0.2;
    }

    // Piernas colgando ligeramente
    if (lHipPivot) {
      lHipPivot.rotation.x = 0.1 + Math.sin(floatT * 0.4) * 0.08;
      lHipPivot.rotation.z = Math.sin(floatT * 0.3) * 0.05;
    }
    if (rHipPivot) {
      rHipPivot.rotation.x = 0.1 + Math.sin(floatT * 0.4 + 0.5) * 0.08;
      rHipPivot.rotation.z = -Math.sin(floatT * 0.3 + 0.5) * 0.05;
    }
    if (lKneePivot) lKneePivot.rotation.x = 0.15 + Math.sin(floatT * 0.5) * 0.1;
    if (rKneePivot) rKneePivot.rotation.x = 0.15 + Math.sin(floatT * 0.5 + 1) * 0.1;
    
    // Pies apuntando hacia abajo
    if (lAnklePivot) lAnklePivot.rotation.x = 0.3 + Math.sin(floatT * 0.4) * 0.1;
    if (rAnklePivot) rAnklePivot.rotation.x = 0.3 + Math.sin(floatT * 0.4 + 0.5) * 0.1;

    // Torso balanceándose suavemente
    if (torso) {
      torso.rotation.z = Math.sin(floatT * 0.3) * amplitudes.floatSway * 0.5;
      torso.rotation.x = Math.sin(floatT * 0.4) * 0.05;
    }
    if (pelvis) {
      pelvis.rotation.z = -Math.sin(floatT * 0.3) * amplitudes.floatSway * 0.3;
    }

    // Cabeza inclinada serenamente
    if (head) {
      head.rotation.x = -0.1 + Math.sin(floatT * 0.5) * 0.1;
      head.rotation.y = Math.sin(floatT * 0.3) * 0.15;
      head.rotation.z = Math.sin(floatT * 0.4) * 0.08;
    }

    // Flotación vertical
    const floatHeight = Math.sin(floatT) * amplitudes.floatHeight;
    model.position.y = baseY + 0.1 + floatHeight;
  }

  // Animación agresiva/amenazante
  animateAggressive(anim, amplitudes, limbs, model, baseY) {
    const { lShoulderPivot, rShoulderPivot, lElbowPivot, rElbowPivot,
            lHipPivot, rHipPivot, lKneePivot, rKneePivot,
            lWristPivot, rWristPivot, lAnklePivot, rAnklePivot,
            torso, pelvis, head, shoulders } = limbs;

    const aggroT = anim.t * 1.5; // Movimientos más rápidos e intensos
    const pulse = Math.sin(aggroT * 3) * 0.5 + 0.5; // Pulsación de tensión

    // Brazos levantados en postura de pelea
    if (lShoulderPivot) {
      lShoulderPivot.rotation.x = -0.8 + Math.sin(aggroT) * amplitudes.aggressiveArm * 0.3;
      lShoulderPivot.rotation.z = 0.4 + pulse * 0.1;
    }
    if (rShoulderPivot) {
      rShoulderPivot.rotation.x = -0.8 + Math.sin(aggroT + Math.PI * 0.5) * amplitudes.aggressiveArm * 0.3;
      rShoulderPivot.rotation.z = -0.4 - pulse * 0.1;
    }
    
    // Codos muy flexionados (puños arriba)
    if (lElbowPivot) lElbowPivot.rotation.x = 1.2 + Math.sin(aggroT * 2) * 0.2;
    if (rElbowPivot) rElbowPivot.rotation.x = 1.2 + Math.sin(aggroT * 2 + 1) * 0.2;
    
    // Puños cerrados (muñecas tensas)
    if (lWristPivot) lWristPivot.rotation.x = 0.3;
    if (rWristPivot) rWristPivot.rotation.x = 0.3;

    // Piernas en postura de combate
    if (lHipPivot) {
      lHipPivot.rotation.x = -0.15 + Math.sin(aggroT * 0.8) * 0.1;
      lHipPivot.rotation.z = 0.1;
    }
    if (rHipPivot) {
      rHipPivot.rotation.x = 0.1 + Math.sin(aggroT * 0.8) * 0.1;
      rHipPivot.rotation.z = -0.1;
    }
    if (lKneePivot) lKneePivot.rotation.x = 0.2 + pulse * 0.1;
    if (rKneePivot) rKneePivot.rotation.x = 0.15 + pulse * 0.1;

    // Torso inclinado hacia adelante amenazadoramente
    if (torso) {
      torso.rotation.x = amplitudes.aggressiveLean + Math.sin(aggroT * 2) * 0.05;
      torso.rotation.y = Math.sin(aggroT * 0.7) * 0.1;
    }
    if (pelvis) {
      pelvis.rotation.x = -amplitudes.aggressiveLean * 0.5;
    }

    // Cabeza baja y mirando fijamente con pequeños movimientos erráticos
    if (head) {
      head.rotation.x = 0.2 + Math.sin(aggroT * 4) * 0.03; // Pequeño temblor
      head.rotation.y = Math.sin(aggroT * 0.5) * 0.15;
      head.rotation.z = Math.sin(aggroT * 3) * 0.02; // Temblor
    }

    // Hombros tensos y elevados
    if (shoulders) {
      shoulders.rotation.z = pulse * 0.05;
    }

    // Pequeño rebote de tensión
    const tensionBob = Math.sin(aggroT * 2) * 0.015;
    model.position.y = baseY + tensionBob;
  }

  animate() {
    if (!this.scene || !this.camera) return;
    requestAnimationFrame(() => this.animate());
    const delta = (this.clock && this.clock.getDelta) ? this.clock.getDelta() : 1/60;
    const scale = 60 * delta;
    this.targets.forEach((m) => {
      const s = this.rotationSpeeds.get(m);
      if (s) {
        m.rotation.x += s.x * scale;
        m.rotation.y += s.y * scale;
        m.rotation.z += s.z * scale;
      }
      // Órbita lenta alrededor del origen (cámara cercana al origen)
      if (m.userData && typeof m.userData.orbitAngle === 'number') {
        const dAngle = GAME_CONFIG.orbit.speed * delta;
        m.userData.orbitAngle += dAngle;
        const r = GAME_CONFIG.orbit.radius;
        const angle = m.userData.orbitAngle;
        const baseY = m.userData.baseY || m.position.y;
        m.position.x = Math.cos(angle) * r;
        m.position.z = Math.sin(angle) * r;
        // mantener bob vertical adicional más abajo
        if (!m.userData.baseY) m.userData.baseY = baseY;
      }
      // Sistema de animación mejorado con múltiples tipos
      const anim = this.animationStates.get(m);
      if (anim && m.userData && m.userData.limbs) {
        // Actualizar fases de tiempo
        anim.t += delta * anim.speed;
        anim.t2 += delta * anim.breathSpeed;
        anim.t3 += delta * anim.headLookSpeed;
        
        const { amplitudes } = GAME_CONFIG.animation;
        const {
          lShoulderPivot,
          rShoulderPivot,
          lElbowPivot,
          rElbowPivot,
          lHipPivot,
          rHipPivot,
          lKneePivot,
          rKneePivot,
          lWristPivot,
          rWristPivot,
          lAnklePivot,
          rAnklePivot,
          torso,
          pelvis,
          head,
          shoulders,
        } = m.userData.limbs;

        const baseY2 = anim.baseY || m.position.y;
        if (!anim.baseY) anim.baseY = baseY2;

        // Respiración universal (sutil expansión del torso)
        const breathScale = 1 + Math.sin(anim.t2) * amplitudes.breath;
        if (torso) {
          torso.scale.x = breathScale;
          torso.scale.z = breathScale;
        }

        // Aplicar animación según el tipo
        switch (anim.type) {
          case 'walk':
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'idle':
            this.animateIdle(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'dance':
            this.animateDance(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'float':
            this.animateFloat(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          case 'aggressive':
            this.animateAggressive(anim, amplitudes, m.userData.limbs, m, baseY2);
            break;
          default:
            this.animateWalk(anim, amplitudes, m.userData.limbs, m, baseY2);
        }
      }
    });
    // Actualizar explosiones
    if (this.explosions.length) {
      const now = performance.now();
      for (let i = this.explosions.length - 1; i >= 0; i--) {
        const exp = this.explosions[i];
        const t = (now - exp.startTime) / exp.lifetimeMs;
        const fade = 1 - Math.min(Math.max(t, 0), 1);
        for (let j = 0; j < exp.meshes.length; j++) {
          const mesh = exp.meshes[j];
          const vel = exp.velocities[j];
          const ang = exp.angularVelocities[j];
          // Física simple
          vel.y -= GAME_CONFIG.explosion.gravity * delta;
          mesh.position.x += vel.x * delta;
          mesh.position.y += vel.y * delta;
          mesh.position.z += vel.z * delta;
          mesh.rotation.x += ang.x * delta;
          mesh.rotation.y += ang.y * delta;
          mesh.rotation.z += ang.z * delta;
          if (mesh.material) mesh.material.opacity = fade;
        }
        if (t >= 1) {
          // limpiar
          exp.meshes.forEach((mesh) => {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.material) {
              if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
              else mesh.material.dispose();
            }
            if (mesh.geometry) mesh.geometry.dispose();
          });
          this.explosions.splice(i, 1);
        }
      }
    }
    // Actualizar uniforms de tiempo para efectos animados
    if (this.crtPass && this.crtPass.uniforms.time) {
      this.crtPass.uniforms.time.value = performance.now() / 1000;
    }
    
    // Simple frame skip adaptativo en móvil si el delta sube mucho
    if (this.isTouchDevice && delta > 0.035 && Math.random() < 0.33) {
      // salta este frame ocasionalmente para bajar carga
    } else {
      // Usar composer si está disponible, sino renderer normal
      if (this.composer && (this.crtConfig.enabled || this.ditheringConfig.enabled)) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  dispose() {
    this.isActive = false;
    window.removeEventListener('resize', this.onResize);
    if (!this.isTouchDevice && this.container) {
      this.container.removeEventListener('click', this.onDocumentClick);
    }
    if (this.container) {
      this.container.removeEventListener('touchstart', this.onTouchStart);
      this.container.removeEventListener('touchmove', this.onTouchMove);
      this.container.removeEventListener('touchend', this.onTouchEnd);
      this.container.removeEventListener('touchcancel', this.onTouchEnd);
      // no click listener adicional en móvil
    }

    // Detener música al salir del juego
    if (this.music && this.music.isPlaying) {
      try { this.music.stop(); } catch {}
    }
    this.music = null;

    this.stopAllSounds();
    this.sounds.clear();

    this.targets.forEach((mesh) => this.destroyTarget(mesh));
    this.targets = [];

    if (this.kickSprite) {
      if (this.kickSprite.material?.map) this.kickSprite.material.map.dispose();
      if (this.kickSprite.material) this.kickSprite.material.dispose();
      this.scene.remove(this.kickSprite);
      this.kickSprite = null;
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss?.();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    // Limpiar explosiones restantes
    if (this.explosions && this.explosions.length) {
      this.explosions.forEach((exp) => {
        exp.meshes.forEach((mesh) => {
          if (mesh.parent) mesh.parent.remove(mesh);
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
          if (mesh.geometry) mesh.geometry.dispose();
        });
      });
      this.explosions = [];
    }

    if (this.ui && this.ui.parentNode) this.ui.parentNode.removeChild(this.ui);
    if (this.mobileCrosshairEl && this.mobileCrosshairEl.parentNode) {
      this.mobileCrosshairEl.parentNode.removeChild(this.mobileCrosshairEl);
      this.mobileCrosshairEl = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
    if (this.desktopCrosshairEl && this.desktopCrosshairEl.parentNode) {
      this.desktopCrosshairEl.parentNode.removeChild(this.desktopCrosshairEl);
    }
    if (this.desktopClickOverlayEl && this.desktopClickOverlayEl.parentNode) {
      this.desktopClickOverlayEl.parentNode.removeChild(this.desktopClickOverlayEl);
    }
    if (this.desktopEscHintEl && this.desktopEscHintEl.parentNode) {
      this.desktopEscHintEl.parentNode.removeChild(this.desktopEscHintEl);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.onWindowBlur) window.removeEventListener('blur', this.onWindowBlur);
    if (this.onWindowFocus) window.removeEventListener('focus', this.onWindowFocus);
    if (this._onMobileMenuState) {
      window.removeEventListener('mobileMenuState', this._onMobileMenuState);
      this._onMobileMenuState = null;
    }
    
    // Limpiar post-processing
    if (this.composer) {
      this.composer.dispose?.();
      this.composer = null;
    }
    if (this.crtPass) {
      this.crtPass = null;
    }
    if (this.ditheringPass) {
      this.ditheringPass = null;
    }
    
    // Limpiar debug GUI
    if (this.debugGui) {
      this.debugGui.destroy();
      this.debugGui = null;
    }
  }
}


