import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { projects } from '@/lib/projects';

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
  constructor(container) {
    if (!container) return;

    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.textureLoader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.targets = [];
    this.currentTarget = null;
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
    // Recoger todas las imágenes definidas en src/lib/projects.js
    const paths = new Set();
    Object.values(projects).forEach(category => {
      Object.values(category).forEach(project => {
        (project.content || []).forEach(item => {
          if (item.type === 'image' && typeof item.src === 'string') {
            paths.add(item.src);
          }
        });
      });
    });
    return Array.from(paths);
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

    this.createPlinth();
    if (!this.isTouchDevice) this.createDesktopOverlays();
    this.spawnSingleTarget();
    // Contador desactivado: no se crea UI de score

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
    // Plinto blanco: más alto en eje Z visual (aumentamos Y para altura física)
    const sizeX = 2.6;
    const sizeY = 1.2; // altura del plinto (antes 0.4)
    const sizeZ = 2.6;
    const geo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, sizeY / 2, -3.5);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.plinthMesh = mesh;
  }

  async spawnSingleTarget() {
    if (!this.artworkPaths?.length) return;
    // Elimina objetivo previo si existe
    if (this.currentTarget) {
      this.destroyTarget(this.currentTarget);
      this.currentTarget = null;
    }
    // Seleccionar URL aleatoria y cargar textura usando TextureManager (con prefetch 1)
    const url = this.artworkPaths[Math.floor(Math.random() * this.artworkPaths.length)];
    const tex = await (this.nextTexturePromise || this.textureManager.load(url));
    // Lanzar prefetch de la siguiente
    const nextUrl = this.artworkPaths[Math.floor(Math.random() * this.artworkPaths.length)];
    this.nextTexturePromise = this.textureManager.load(nextUrl);

    const geometry = this.getRandomGeometry();
    // Reutilizar material si existe
    if (!this.sharedMaterial) {
      this.sharedMaterial = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 });
    } else {
      this.sharedMaterial.map = tex;
      this.sharedMaterial.needsUpdate = true;
      if (this.sharedMaterial.map) this.sharedMaterial.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(geometry, this.sharedMaterial);
    mesh.castShadow = true;
    // Posición centrada sobre el plinto, ajustando altura a top del plinto
    const baseX = this.plinthMesh ? this.plinthMesh.position.x : 0;
    const plinthTopY = this.plinthMesh ? (this.plinthMesh.position.y + (this.plinthMesh.geometry.parameters.height / 2)) : 0.6;
    const baseZ = this.plinthMesh ? this.plinthMesh.position.z : -3.5;
    const modelHeight = geometry.parameters.height || 1.6; // mejor aproximación para cone/cylinder/box
    mesh.position.set(baseX, plinthTopY + modelHeight / 2 + 0.02, baseZ);

    const rotSpeed = new THREE.Vector3(0, 0.01, 0);
    this.rotationSpeeds.set(mesh, rotSpeed);

    this.scene.add(mesh);
    this.targets = [mesh];
    this.currentTarget = mesh;
  }

  handlePrimaryClick(e) {
    if (!this.controls?.isLocked) {
      this.centerCustomCursor();
      this.ensureAudioStarted();
      this.controls.lock();
      return;
    }
    this.shoot();
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

  shoot() {
    if (!this.isActive) return;
    const now = performance.now();
    if (now - this.lastShotTime < this.shotIntervalMs) return;
    this.lastShotTime = now;
    this.playShootOverlay();
    this.playSound('kick');

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObjects(this.targets, false);

    if (intersections.length > 0) {
      const hit = intersections[0];
      const mesh = hit.object;
      // Marca de impacto desactivada
      this.destroyTarget(mesh);
      this.updateScore(100);
      this.spawnSingleTarget();
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      this.updateScore(0);
    }
  }

  destroyTarget(mesh) {
    const idx = this.targets.indexOf(mesh);
    if (idx >= 0) this.targets.splice(idx, 1);
    // No disponer sharedMaterial; se reutiliza
    if (mesh.material !== this.sharedMaterial) {
      if (mesh.material?.map) mesh.material.map.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    if (mesh.geometry) mesh.geometry.dispose();
    this.scene.remove(mesh);
    if (this.currentTarget === mesh) this.currentTarget = null;
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (this.controls?.isLocked) this.centerCustomCursor();
    if (this.isTouchDevice) this.ensureMobileCrosshair();
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
    // Ya no se muestra mira en dispositivos táctiles
    if (this.mobileCrosshairEl && this.mobileCrosshairEl.parentNode) {
      this.mobileCrosshairEl.parentNode.removeChild(this.mobileCrosshairEl);
      this.mobileCrosshairEl = null;
    }
    return;
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
    el.appendChild(v);
    el.appendChild(h);
    this.container.style.position = 'relative';
    this.container.appendChild(el);
    this.desktopCrosshairEl = el;
  }

  showDesktopCrosshair() {
    if (this.desktopCrosshairEl) this.desktopCrosshairEl.style.display = 'block';
  }

  hideDesktopCrosshair() {
    if (this.desktopCrosshairEl) this.desktopCrosshairEl.style.display = 'none';
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
    });
    // Simple frame skip adaptativo en móvil si el delta sube mucho
    if (this.isTouchDevice && delta > 0.035 && Math.random() < 0.33) {
      // salta este frame ocasionalmente para bajar carga
    } else {
      this.renderer.render(this.scene, this.camera);
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

    if (this.ui && this.ui.parentNode) this.ui.parentNode.removeChild(this.ui);
    if (this.mobileCrosshairEl && this.mobileCrosshairEl.parentNode) {
      this.mobileCrosshairEl.parentNode.removeChild(this.mobileCrosshairEl);
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
  }
}


