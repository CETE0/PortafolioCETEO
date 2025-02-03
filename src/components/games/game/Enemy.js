import * as THREE from 'three';

export class Enemy {
  constructor(scene, position, type = 'normal') {
    this.scene = scene;
    this.type = type;
    this.isAlive = true;
    
    // Configurar propiedades según el tipo
    this.setTypeProperties();
    
    const textureLoader = new THREE.TextureLoader();
    const enemyTexture = textureLoader.load(this.getTexturePathByType());
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: enemyTexture,
      transparent: true,
      opacity: 1
    });
    
    this.sprite = new THREE.Sprite(spriteMaterial);
    this.sprite.scale.set(this.size, this.size, 1);
    this.sprite.position.copy(position);
    
    // Añadir efecto de brillo
    this.glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: enemyTexture,
        transparent: true,
        opacity: 0.01,
        blending: THREE.AdditiveBlending
      })
    );
    this.glowSprite.scale.set(this.size * 1.2, this.size * 1.2, 1);
    this.glowSprite.position.copy(position);
    
    scene.add(this.sprite);
    scene.add(this.glowSprite);
    
    this.boundingBox = new THREE.Box3();
    this.velocity = new THREE.Vector3();
    this.initialPosition = position.clone();
    this.timeSinceSpawn = 0;
  }

  setTypeProperties() {
    switch(this.type) {
      case 'fast':
        this.speed = 0.04;
        this.size = 1.5;
        this.points = 200;
        break;
      case 'big':
        this.speed = 0.015;
        this.size = 3;
        this.points = 300;
        break;
      default: // normal
        this.speed = 0.02;
        this.size = 2;
        this.points = 100;
    }
  }

  getTexturePathByType() {
    switch(this.type) {
      case 'fast':
        return '/game/assets/textures/e1.png';
      case 'big':
        return '/game/assets/textures/e2.png';
      default:
        return '/game/assets/textures/e3.png';
    }
  }

  getPoints() {
    return this.points;
  }

  update(playerPosition) {
    if (!this.isAlive) return;

    this.timeSinceSpawn += 0.016; // Aproximadamente 60 FPS

    // Actualizar bounding box
    this.boundingBox.setFromObject(this.sprite);
    
    // Movimiento base hacia el jugador
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.sprite.position)
      .normalize();
    
    // Añadir movimiento sinusoidal según el tipo
    if (this.type === 'fast') {
      const sideMovement = Math.sin(this.timeSinceSpawn * 5) * 0.3;
      direction.x += sideMovement;
    }

    if (this.type === 'big') {
      // Movimiento más lento pero imparable
      direction.multiplyScalar(1.2);
    }
      
    this.velocity.copy(direction).multiplyScalar(this.speed);
    this.sprite.position.add(this.velocity);
    this.glowSprite.position.copy(this.sprite.position);

    // Efecto de pulso en el brillo
    const pulseSpeed = this.type === 'fast' ? 8 : 4;
    const pulseIntensity = this.type === 'big' ? 0.4 : 0.2;
    this.glowSprite.material.opacity = 0.3 + Math.sin(this.timeSinceSpawn * pulseSpeed) * pulseIntensity;

    // Billboarding - hacer que el sprite mire siempre a la cámara
    if (this.scene.parent?.camera) {
      this.sprite.quaternion.copy(this.scene.parent.camera.quaternion);
      this.glowSprite.quaternion.copy(this.scene.parent.camera.quaternion);
    }
  }

  checkBallCollision(ballPosition) {
    if (!this.isAlive) return false;
    
    const distance = this.sprite.position.distanceTo(ballPosition);
    const collisionRadius = this.size * 0.75; // Radio de colisión proporcional al tamaño
    
    if (distance < collisionRadius) {
      this.die();
      return true;
    }
    return false;
  }

  checkPlayerCollision(playerPosition) {
    if (!this.isAlive) return false;
    
    const distance = this.sprite.position.distanceTo(playerPosition);
    const collisionRadius = this.size * 0.5; // Radio de colisión más pequeño para el jugador
    return distance < collisionRadius;
  }

  die() {
    this.isAlive = false;
    if (this.sprite.material) {
      if (this.sprite.material.map) {
        this.sprite.material.map.dispose();
      }
      this.sprite.material.dispose();
    }
    if (this.glowSprite.material) {
      this.glowSprite.material.dispose();
    }
    this.scene.remove(this.sprite);
    this.scene.remove(this.glowSprite);
  }

  dispose() {
    if (this.sprite.material) {
      if (this.sprite.material.map) {
        this.sprite.material.map.dispose();
      }
      this.sprite.material.dispose();
    }
    if (this.glowSprite.material) {
      this.glowSprite.material.dispose();
    }
    this.scene.remove(this.sprite);
    this.scene.remove(this.glowSprite);
  }
}