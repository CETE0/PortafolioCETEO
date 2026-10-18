import * as THREE from 'three';

export class KickableObject {
  constructor(scene, position) {
    this.scene = scene;
    const textureLoader = new THREE.TextureLoader();
    
    // Cargar sprite de la pelota
    const objectTexture = textureLoader.load('/game/assets/textures/pelota.png');
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: objectTexture,
      color: 0xffffff 
    });
    
    this.sprite = new THREE.Sprite(spriteMaterial);
    this.sprite.scale.set(2, 2, 1);
    this.sprite.position.copy(position);
    
    this.scene.add(this.sprite);

    this.velocity = new THREE.Vector3();
    this.isKicked = false;

    // Guardar referencia al ThreeGame para acceder a sus métodos
    this.scene.parent = scene;
  }

  update() {
    if (this.isKicked) {
      const oldPosition = this.sprite.position.clone();
      this.sprite.position.add(this.velocity);
      
      // Física mejorada
      this.velocity.y -= 0.015; // Gravedad
      this.velocity.multiplyScalar(0.99); // Fricción
      
      let collided = false;
      let collisionSpeed = 0;

      // Colisión con paredes
      if (Math.abs(this.sprite.position.x) > 9.5) {
        const direction = Math.sign(this.sprite.position.x);
        this.sprite.position.x = 9.5 * direction;
        collisionSpeed = Math.abs(this.velocity.x);
        this.velocity.x *= -0.7;
        collided = true;
        
        const normal = new THREE.Vector3(direction, 0, 0);
        if (this.scene.parent?.createImpactMark) {
          const markPosition = this.sprite.position.clone();
          markPosition.x = direction * 9.9;
          this.scene.parent.createImpactMark(markPosition, normal);
        }
      }

      if (Math.abs(this.sprite.position.z) > 9.5) {
        const direction = Math.sign(this.sprite.position.z);
        this.sprite.position.z = 9.5 * direction;
        collisionSpeed = Math.max(collisionSpeed, Math.abs(this.velocity.z));
        this.velocity.z *= -0.7;
        collided = true;
        
        const normal = new THREE.Vector3(0, 0, direction);
        if (this.scene.parent?.createImpactMark) {
          const markPosition = this.sprite.position.clone();
          markPosition.z = direction * 9.9;
          this.scene.parent.createImpactMark(markPosition, normal);
        }
      }

      // Colisión con el suelo
      if (this.sprite.position.y < 1) {
        this.sprite.position.y = 1;
        collisionSpeed = Math.max(collisionSpeed, Math.abs(this.velocity.y));
        this.velocity.y = Math.abs(this.velocity.y) * 0.6;
        collided = true;
      }

      // Reproducir sonido de colisión
      if (collided && collisionSpeed > 0.1) {
        if (this.scene.parent?.audioManager) {
          const volume = Math.min(collisionSpeed / 2, 1);
          this.scene.parent.audioManager.playWithVariation('wallHit', {
            volume: volume * 0.3,
            pitchVariation: 0.2
          });
        }
      }

      // Detener si la velocidad es muy baja
      if (this.velocity.length() < 0.01 && this.sprite.position.y <= 1.01) {
        this.isKicked = false;
        this.velocity.set(0, 0, 0);
      }
    }

    // Billboarding
    if (this.scene.parent?.camera) {
      this.sprite.quaternion.copy(this.scene.parent.camera.quaternion);
    }
  }

  kick(direction, force) {
    this.isKicked = true;
    // Aumentar la fuerza y el efecto vertical
    this.velocity.copy(direction).multiplyScalar(force * 2);
    this.velocity.y = 0.5;
  }

  dispose() {
    if (this.sprite.material) {
      if (this.sprite.material.map) {
        this.sprite.material.map.dispose();
      }
      this.sprite.material.dispose();
    }
    this.scene.remove(this.sprite);
  }
}