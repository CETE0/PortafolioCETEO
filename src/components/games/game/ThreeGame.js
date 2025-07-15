import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { KickableObject } from './KickableObject';
import { Enemy } from './Enemy';
import { GameUI } from './GameUI';

class AudioManager {
  constructor() {
    this.listener = new THREE.AudioListener();
    this.sounds = new Map();
    this.loader = new THREE.AudioLoader();
  }

  resetMovement() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.velocity.set(0, 0, 0);
  }

  async loadSounds() {
    const sounds = {
      background: '/game/assets/audio/background-loop.mp3',
      kick: '/game/assets/audio/kick.mp3',
      enemyDeath: '/game/assets/audio/enemy-death.mp3',
      gameOver: '/game/assets/audio/game-over.mp3',
      wallHit: '/game/assets/audio/wall-hit.mp3'
    };

    for (const [name, path] of Object.entries(sounds)) {
      try {
        const buffer = await this.loader.loadAsync(path);
        const audio = new THREE.Audio(this.listener);
        audio.setBuffer(buffer);
        
        if (name === 'background') {
          audio.setLoop(true);
          audio.setVolume(0.5);
        } else if (name === 'wallHit') {
          audio.setVolume(0.3);
        }
        
        this.sounds.set(name, audio);
      } catch (error) {
        console.error(`Error loading sound ${name}:`, error);
      }
    }
  }

  play(soundName) {
    const sound = this.sounds.get(soundName);
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  playWithVariation(soundName, options = {}) {
    const sound = this.sounds.get(soundName);
    if (sound && !sound.isPlaying) {
      if (options.volume !== undefined) {
        sound.setVolume(options.volume);
      }
      if (options.pitchVariation !== undefined) {
        sound.detune = (Math.random() * 2 - 1) * options.pitchVariation * 1200;
      }
      sound.play();
    }
  }

  stop(soundName) {
    const sound = this.sounds.get(soundName);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  stopAll() {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) sound.stop();
    });
  }
}

export class ThreeGame {
  constructor(container) {
    if (!container) {
      console.error('No container provided for ThreeGame');
      return;
    }
    
    this.container = container;
    this.playerBoundingBox = new THREE.Box3();
    this.wallBoundingBoxes = [];
    this.kickableObjects = [];
    this.enemies = [];
    this.audioManager = new AudioManager();
    this.gameOver = false;
    this.ui = new GameUI();
    this.hasMovedFirstTime = false;
    this.isActive = false;
    
    // Sistema de puntuación
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('kickGameHighScore') || '0');
    
    this.kickAnimation = {
      isPlaying: false,
      currentFrame: 0,
      sprite: null,
      frames: []
    };

    this.impactMarks = [];
    this.textureLoader = new THREE.TextureLoader();
    this.lastSafePosition = new THREE.Vector3();

      this.init();
      this.setupControls();
      this.setupKickingMechanism();
  
      // Manejar cambios de visibilidad
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.isActive = false;
          this.audioManager.stopAll();
        } else if (this.controls?.isLocked && !this.gameOver) {
          this.isActive = true;
          this.audioManager.play('background');
        }
      });
    }
  
    async loadTextures() {
      try {
        const kickTexture = await this.textureLoader.loadAsync('/game/assets/textures/pie.png');
        this.kickAnimation.frames.push(kickTexture);
        this.impactMarkTexture = await this.textureLoader.loadAsync('/game/assets/textures/impact-mark.svg');
      } catch (error) {
        console.error('Error cargando texturas:', error);
      }
    }
  
    async init() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.container.appendChild(this.renderer.domElement);
  
      await this.loadTextures();
  
      this.controls = new PointerLockControls(this.camera, document.body);
  
      // Event listeners para el estado del juego
      this.controls.addEventListener('lock', () => {
        this.isActive = true;
        if (!this.gameOver) {
          this.audioManager.play('background');
        }
      });
  
      this.controls.addEventListener('unlock', () => {
        this.isActive = false;
        this.audioManager.stopAll();
      });
  
      // Iluminación central más intensa
      const spotLight = new THREE.SpotLight(0xffffff, 15);
      spotLight.position.set(0, 9.5, 0);
      spotLight.angle = Math.PI / 2.5;
      spotLight.penumbra = 0.2;
      spotLight.castShadow = true;
      spotLight.distance = 25;
      this.scene.add(spotLight);
  
      const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
      this.scene.add(ambientLight);
  
      this.createRoom();
  
      const kickMaterial = new THREE.SpriteMaterial({
        map: this.kickAnimation.frames[0],
        transparent: true,
        opacity: 0,
      });
      this.kickAnimation.sprite = new THREE.Sprite(kickMaterial);
      this.kickAnimation.sprite.scale.set(2, 2, 1);
      this.scene.add(this.kickAnimation.sprite);
  
      this.camera.position.set(0, 5, 8);
      this.lastSafePosition.copy(this.camera.position);
  
      const kickableObject = new KickableObject(
        this.scene, 
        new THREE.Vector3(0, 1, -5)
      );
      this.kickableObjects.push(kickableObject);
  
      // Inicializar audio
      this.camera.add(this.audioManager.listener);
      await this.audioManager.loadSounds();
  
      // Spawn inicial de enemigos
      this.spawnEnemies();
  
      // Manejar resize de ventana
      const handleResize = () => this.onWindowResize();
      window.addEventListener('resize', handleResize);
      
      // Iniciar loop de animación
      this.animate();
    }
  
    createRoom() {
      const floorGeometry = new THREE.PlaneGeometry(20, 20);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1C234A, 
        side: THREE.DoubleSide 
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);
  
      // Cargar textura para las paredes
      const wallTexture = this.textureLoader.load('/game/assets/textures/32.jpg');
      wallTexture.wrapS = THREE.RepeatWrapping;
      wallTexture.wrapT = THREE.RepeatWrapping;
      wallTexture.repeat.set(4, 2);
  
      const wallGeometry = new THREE.BoxGeometry(20, 10, 0.5);
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1
      });
  
      const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
      frontWall.position.z = -10;
      frontWall.position.y = 5;
      this.scene.add(frontWall);
  
      const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
      backWall.position.z = 10;
      backWall.position.y = 5;
      this.scene.add(backWall);
  
      const sideWallGeometry = new THREE.BoxGeometry(0.5, 10, 20);
      const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
      leftWall.position.x = -10;
      leftWall.position.y = 5;
      this.scene.add(leftWall);
  
      const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
      rightWall.position.x = 10;
      rightWall.position.y = 5;
      this.scene.add(rightWall);
  
      const walls = [frontWall, backWall, leftWall, rightWall];
      this.wallBoundingBoxes = walls.map(wall => new THREE.Box3().setFromObject(wall));
    }
  
    spawnEnemies() {
      const enemyTypes = ['normal', 'fast', 'big'];
      for (let i = 0; i < 5; i++) {
        const position = this.getRandomWallPosition();
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy = new Enemy(this.scene, position, type);
        this.enemies.push(enemy);
      }
    }
  
    getRandomWallPosition() {
      const isXWall = Math.random() > 0.5;
      const isPositive = Math.random() > 0.5;
      
      if (isXWall) {
        return new THREE.Vector3(
          isPositive ? 9 : -9,
          1,
          Math.random() * 16 - 8
        );
      } else {
        return new THREE.Vector3(
          Math.random() * 16 - 8,
          1,
          isPositive ? 9 : -9
        );
      }
    }
  
    getEnemyTypeByDifficulty(difficulty) {
      const rand = Math.random();
      if (rand < difficulty * 0.3) {
        return 'big';
      } else if (rand < difficulty * 0.7) {
        return 'fast';
      }
      return 'normal';
    }

    updateScore(points) {
      this.score += points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('kickGameHighScore', this.score.toString());
      }
      this.ui.updateScore(this.score, this.highScore);
    }
  
    setupControls() {
      this.moveForward = false;
      this.moveBackward = false;
      this.moveLeft = false;
      this.moveRight = false;
      this.isJumping = false;
      this.jumpVelocity = 0;
      this.velocity = new THREE.Vector3();
  
      const startGame = (e) => {
        // Solo activar en click izquierdo para no interferir con la patada
        if (e.button !== 0) return;
        if (!this.isActive && this.controls && !this.controls.isLocked) {
          this.controls.lock();
        }
      };
      
      this.container.addEventListener('click', startGame);
  
      const onKeyDown = (event) => {
        // Prevenir el comportamiento por defecto para las teclas de juego
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code)) {
          event.preventDefault();
        }
  
        // Solo procesar teclas si el juego está activo
        if (!this.isActive) return;
  
        if (this.gameOver && event.code === 'Space') {
          this.restartGame();
          return;
        }
  
        if (!this.hasMovedFirstTime) {
          this.hasMovedFirstTime = true;
          this.ui.hideInstructions();
        }
  
        switch (event.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.moveForward = true;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.moveBackward = true;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.moveLeft = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.moveRight = true;
            break;
          case 'Space':
            if (!this.isJumping) {
              this.isJumping = true;
              this.jumpVelocity = 0.15;
            }
            break;
        }
      };
  
      const onKeyUp = (event) => {
        // Solo procesar teclas si el juego está activo
        if (!this.isActive) return;
  
        switch (event.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.moveForward = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.moveBackward = false;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.moveLeft = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.moveRight = false;
            break;
        }
      };
  
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
  
      this.cleanup = () => {
        this.container.removeEventListener('click', startGame);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      };
    }
  
    setupKickingMechanism() {
      const onMouseDown = (event) => {
        if (!this.isActive) return;
  
        if (event.button === 2) { // Right click
          event.preventDefault();
          
          if (!this.controls?.isLocked) return;
          
          this.playKickAnimation();
          this.audioManager.play('kick');
          
          const direction = new THREE.Vector3();
          this.camera.getWorldDirection(direction);
          
          this.kickableObjects.forEach(obj => {
            const toObject = new THREE.Vector3().subVectors(obj.sprite.position, this.camera.position);
            const distance = toObject.length();
            
            if (distance < 5) {
              obj.kick(direction, 0.5);
            }
          });
        }
      };
  
      const preventContext = (event) => {
        if (this.isActive) {
          event.preventDefault();
        }
      };
  
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('contextmenu', preventContext);
  
      const originalCleanup = this.cleanup;
      this.cleanup = () => {
        if (originalCleanup) originalCleanup();
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('contextmenu', preventContext);
      };
    }
  
    playKickAnimation() {
      if (this.kickAnimation.isPlaying) return;
      
      this.kickAnimation.isPlaying = true;
      if (this.kickAnimation.sprite) {
        this.kickAnimation.sprite.material.opacity = 1;
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.kickAnimation.sprite.position.copy(this.camera.position)
          .add(direction.multiplyScalar(1.5));
        
        setTimeout(() => {
          this.kickAnimation.sprite.material.opacity = 0;
          this.kickAnimation.isPlaying = false;
        }, 200);
      }
    }

    checkCollisions(newPosition) {
      const playerSize = { 
        x: 0.5,
        y: 1.8,
        z: 0.5
      };
      
      const buffer = 0.1;
      const tempBox = new THREE.Box3();
      tempBox.min.set(
        newPosition.x - playerSize.x/2 - buffer,
        newPosition.y - playerSize.y/2,
        newPosition.z - playerSize.z/2 - buffer
      );
      tempBox.max.set(
        newPosition.x + playerSize.x/2 + buffer,
        newPosition.y + playerSize.y/2,
        newPosition.z + playerSize.z/2 + buffer
      );
  
      let collision = false;
      let pushDirection = new THREE.Vector3();
  
      this.wallBoundingBoxes.forEach(wallBox => {
        if (tempBox.intersectsBox(wallBox)) {
          collision = true;
          const boxCenter = new THREE.Vector3();
          tempBox.getCenter(boxCenter);
          const wallCenter = new THREE.Vector3();
          wallBox.getCenter(wallCenter);
          pushDirection.subVectors(boxCenter, wallCenter).normalize();
        }
      });
  
      if (collision) {
        return false;
      } else {
        this.lastSafePosition.copy(newPosition);
        return true;
      }
    }
  
    createImpactMark(position, normal) {
      const markMaterial = new THREE.SpriteMaterial({
        map: this.impactMarkTexture,
        transparent: true,
        opacity: 0.5,
        depthTest: false
      });
      
      const mark = new THREE.Sprite(markMaterial);
      mark.position.copy(position);
      mark.position.add(normal.multiplyScalar(0.05));
      mark.scale.set(2, 2, 2);
      
      this.scene.add(mark);
      this.impactMarks.push(mark);
    }
  
    restartGame() {
      this.enemies.forEach(enemy => {
        enemy.dispose();
      });
      this.enemies = [];
      this.camera.position.set(0, 5, 8);
      this.lastSafePosition.set(0, 5, 8);
      this.gameOver = false;
      this.score = 0;
      this.ui.hideGameOver();
      this.ui.updateScore(this.score, this.highScore);
      this.audioManager.stop('gameOver');
      if (this.isActive) {
        this.audioManager.play('background');
      }
      this.spawnEnemies();
      this.controls.lock();
    }
  
    gameOverSequence() {
      this.gameOver = true;
      this.isActive = false;
      this.audioManager.stop('background');
      this.audioManager.play('gameOver');
      this.controls.unlock();
      this.ui.showGameOver(this.score, this.highScore);
    }
  
    onWindowResize() {
      if (this.camera && this.renderer && this.container) {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      }
    }
  
    animate() {
      if (!this || !this.scene || !this.camera) return;
  
      requestAnimationFrame(() => this.animate());
  
      if (!this.gameOver && this.isActive) {
        if (this.controls?.isLocked) {
          const delta = 0.1;
          this.velocity.x = 0;
          this.velocity.z = 0;
  
          if (this.moveForward) this.velocity.z = -delta;
          if (this.moveBackward) this.velocity.z = delta;
          if (this.moveLeft) this.velocity.x = -delta;
          if (this.moveRight) this.velocity.x = delta;
  
          if (this.isJumping) {
            this.camera.position.y += this.jumpVelocity;
            this.jumpVelocity -= 0.008;
  
            if (this.camera.position.y <= 5) {
              this.camera.position.y = 5;
              this.isJumping = false;
              this.jumpVelocity = 0;
            }
          }
  
          // Sistema de movimiento mejorado
          const newPosition = new THREE.Vector3();
          newPosition.copy(this.camera.position);
  
          // Probar movimiento en X y Z por separado
          if (this.velocity.x !== 0) {
            const testX = new THREE.Vector3(
              newPosition.x + this.velocity.x,
              this.camera.position.y,
              this.camera.position.z
            );
            if (this.checkCollisions(testX)) {
              this.controls.moveRight(this.velocity.x);
            } else {
              this.camera.position.copy(this.lastSafePosition);
            }
          }
  
          if (this.velocity.z !== 0) {
            const testZ = new THREE.Vector3(
              this.camera.position.x,
              this.camera.position.y,
              newPosition.z + this.velocity.z
            );
            if (this.checkCollisions(testZ)) {
              this.controls.moveForward(-this.velocity.z);
            } else {
              this.camera.position.copy(this.lastSafePosition);
            }
          }
        }
  
        // Actualizar enemigos
        this.enemies.forEach(enemy => {
          enemy.update(this.camera.position);
          
          // Comprobar colisiones con la pelota
          this.kickableObjects.forEach(ball => {
            if (enemy.checkBallCollision(ball.sprite.position)) {
              this.audioManager.play('enemyDeath');
              const points = enemy.getPoints();
              this.updateScore(points);
            }
          });
          
          // Comprobar colisión con el jugador
          if (enemy.checkPlayerCollision(this.camera.position)) {
            this.gameOverSequence();
          }
        });
  
        // Limpiar enemigos muertos
        this.enemies = this.enemies.filter(enemy => enemy.isAlive);
  
        // Spawn de nuevos enemigos con dificultad progresiva
        if (this.enemies.length < 3) {
          const position = this.getRandomWallPosition();
          const difficulty = Math.min(this.score / 1000, 1);
          const type = this.getEnemyTypeByDifficulty(difficulty);
          const enemy = new Enemy(this.scene, position, type);
          this.enemies.push(enemy);
        }
      }
  
      // Actualizar objetos pateables
      if (this.kickableObjects) {
        this.kickableObjects.forEach(obj => obj.update());
      }
  
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  
    dispose() {
      this.isActive = false;
      
      // Cleanup event listeners
      if (this.cleanup) {
        this.cleanup();
      }
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      
      // Stop and cleanup audio
      if (this.audioManager) {
        this.audioManager.stopAll();
        this.audioManager.dispose?.();
      }
      
      // Cleanup enemies
      this.enemies.forEach(enemy => {
        enemy.dispose();
      });
      this.enemies = [];
      
      // Cleanup kickable objects
      this.kickableObjects.forEach(obj => {
        obj.dispose();
      });
      this.kickableObjects = [];
      
      // Cleanup impact marks
      this.impactMarks.forEach(mark => {
        if (mark.material) {
          mark.material.dispose();
        }
        if (mark.geometry) {
          mark.geometry.dispose();
        }
        this.scene.remove(mark);
      });
      this.impactMarks = [];
      
      // Cleanup textures
      if (this.textureLoader) {
        this.textureLoader = null;
      }
      
      // Cleanup controls
      if (this.controls) {
        this.controls.dispose();
        this.controls = null;
      }
      
      // Cleanup renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer.domElement = null;
        this.renderer = null;
      }
      
      // Remove DOM element
      if (this.container && this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      // Cleanup scene
      if (this.scene) {
        this.scene.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.scene.clear();
        this.scene = null;
      }
      
      // Cleanup camera
      this.camera = null;
      
      // Remove window resize listener
      window.removeEventListener('resize', this.onWindowResize);
      
      // Cleanup UI
      if (this.ui) {
        this.ui.dispose();
        this.ui = null;
      }
      
      // Clear references
      this.container = null;
      this.playerBoundingBox = null;
      this.wallBoundingBoxes = [];
      this.lastSafePosition = null;
      this.kickAnimation = null;
    }
  }