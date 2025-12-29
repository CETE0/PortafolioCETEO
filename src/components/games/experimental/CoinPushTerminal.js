'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { DitheringShader } from './PostProcessingShaders';

// Configuración
const CUBE_SIZE = 2.5;
const PUSHER_SPEED = 0.015;
const PUSHER_AMPLITUDE = 0.6;
const PUSHER_BASE_Y = 0;  // Posición base del pusher (0 = centro, negativo = más abajo)
const GRAVITY = 0.0008;
const FRICTION = 0.985;

// Auto-rotación del cubo
const AUTO_ROTATE_Y = 0.003;
const AUTO_TILT_AMPLITUDE = 0.15;
const AUTO_TILT_SPEED = 0.008;

// Configuración de caras para poemas
const FACE_TEXT_Y_OFFSET = -0.8; // Ajusta este valor para subir/bajar el texto (negativo = más abajo)
const FACE_CONFIG = {
  front:  { position: [0, FACE_TEXT_Y_OFFSET, CUBE_SIZE / 2 + 0.01], rotation: [0, 0, 0] },
  back:   { position: [0, FACE_TEXT_Y_OFFSET, -CUBE_SIZE / 2 - 0.01], rotation: [0, Math.PI, 0] },
  left:   { position: [-CUBE_SIZE / 2 - 0.01, FACE_TEXT_Y_OFFSET, 0], rotation: [0, -Math.PI / 2, 0] },
  right:  { position: [CUBE_SIZE / 2 + 0.01, FACE_TEXT_Y_OFFSET, 0], rotation: [0, Math.PI / 2, 0] },
};

export default function CoinPushTerminal() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeGroupRef = useRef(null);
  const composerRef = useRef(null);
  const ditheringPassRef = useRef(null);
  const audioRef = useRef(null);
  const wordsRef = useRef([]);
  const pusherTimeRef = useRef(0);
  const animationRef = useRef(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const autoRotationRef = useRef({ y: 0, tiltTime: 0 });
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const wordPoolRef = useRef([]);
  const wordWeightsRef = useRef([]);
  const totalWeightRef = useRef(0);
  
  // Poemas en cada cara - array de líneas, cada línea es array de palabras
  const facePoemsRef = useRef({
    front: { lines: [[]], mesh: null },
    back: { lines: [[]], mesh: null },
    left: { lines: [[]], mesh: null },
    right: { lines: [[]], mesh: null },
  });
  
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const inputRef = useRef(null);

  // Inicializar audio
  useEffect(() => {
    const audio = new Audio('/game/assets/audio/lol.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Iniciar audio con interacción del usuario
  const startAudio = useCallback(() => {
    if (!audioStarted && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio autoplay blocked:', e));
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // Cargar palabras desde el JSON
  useEffect(() => {
    fetch('/game/assets/rjp.json')
      .then(res => res.json())
      .then(data => {
        const frecuencias = data.frecuencias;
        const words = [];
        const weights = [];
        let total = 0;
        
        for (const [word, freq] of Object.entries(frecuencias)) {
          if (word.length >= 2) {
            words.push(word);
            weights.push(freq);
            total += freq;
          }
        }
        
        wordPoolRef.current = words;
        wordWeightsRef.current = weights;
        totalWeightRef.current = total;
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Error loading words:', err);
        wordPoolRef.current = ['poesía', 'vertical', 'mundo', 'vida', 'amor', 'muerte', 'tiempo', 'silencio'];
        wordWeightsRef.current = [1, 1, 1, 1, 1, 1, 1, 1];
        totalWeightRef.current = 8;
        setIsLoaded(true);
      });
  }, []);

  // Obtener palabra random ponderada
  const getRandomWord = useCallback(() => {
    if (wordPoolRef.current.length === 0) return 'poesía';
    
    let random = Math.random() * totalWeightRef.current;
    for (let i = 0; i < wordPoolRef.current.length; i++) {
      random -= wordWeightsRef.current[i];
      if (random <= 0) {
        return wordPoolRef.current[i];
      }
    }
    return wordPoolRef.current[0];
  }, []);

  // Crear sprite de texto para palabras cayendo
  const createTextSprite = useCallback((text, color = '#00ff00') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 48;
    
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    const metrics = ctx.measureText(text);
    
    canvas.width = Math.ceil(metrics.width) + 20;
    canvas.height = fontSize + 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(aspect * 0.5, 0.5, 1);
    
    return sprite;
  }, []);

  // Crear/actualizar el plano de texto para una cara
  const updateFacePoem = useCallback((side) => {
    const cubeGroup = cubeGroupRef.current;
    if (!cubeGroup) return;
    
    const facePoem = facePoemsRef.current[side];
    const config = FACE_CONFIG[side];
    
    // Generar texto del poema
    const poemText = facePoem.lines
      .map(line => line.join(' '))
      .filter(line => line.length > 0)
      .join('\n');
    
    if (!poemText) return;
    
    // Crear canvas con el texto
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 28;
    const lineHeight = fontSize * 1.3;
    const padding = 20;
    
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    
    // Calcular dimensiones basadas en el texto
    const lines = poemText.split('\n');
    let maxWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    });
    
    // Canvas más ancho que el cubo para desbordamiento
    canvas.width = Math.max(512, maxWidth + padding * 2);
    canvas.height = Math.max(512, lines.length * lineHeight + padding * 2);
    
    // Fondo transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar texto
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, padding + i * lineHeight);
    });
    
    // Crear textura
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    // Remover mesh anterior si existe
    if (facePoem.mesh) {
      cubeGroup.remove(facePoem.mesh);
      facePoem.mesh.material.map?.dispose();
      facePoem.mesh.material.dispose();
      facePoem.mesh.geometry.dispose();
    }
    
    // Crear nuevo plano - más grande que el cubo para desbordamiento
    const aspectRatio = canvas.width / canvas.height;
    const planeHeight = CUBE_SIZE * 1.5;
    const planeWidth = planeHeight * aspectRatio;
    
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...config.position);
    mesh.rotation.set(...config.rotation);
    
    cubeGroup.add(mesh);
    facePoem.mesh = mesh;
  }, []);

  // Añadir palabra al poema de una cara
  const addToPoem = useCallback((word, x, z) => {
    // Determinar a qué cara va basándose en la posición
    let side;
    const absX = Math.abs(x);
    const absZ = Math.abs(z);
    
    if (absZ > absX) {
      side = z > 0 ? 'front' : 'back';
    } else {
      side = x > 0 ? 'right' : 'left';
    }
    
    const facePoem = facePoemsRef.current[side];
    const currentLine = facePoem.lines[facePoem.lines.length - 1];
    
    currentLine.push(word);
    
    // Si la línea es muy larga, crear nueva línea
    if (currentLine.length >= 3 + Math.floor(Math.random() * 3)) {
      facePoem.lines.push([]);
      setScore(s => s + 10);
    }
    
    // Actualizar el mesh de la cara
    updateFacePoem(side);
  }, [updateFacePoem]);

  // Inicializar Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Dithering + Pixelado
    const ditheringPass = new ShaderPass(DitheringShader);
    ditheringPass.uniforms.resolution.value = new THREE.Vector2(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    // Configuración del efecto
    ditheringPass.uniforms.ditheringEnabled.value = true;
    ditheringPass.uniforms.ditheringType.value = 0; // Bayer 4x4
    ditheringPass.uniforms.colorLevels.value = 8;
    ditheringPass.uniforms.ditherStrength.value = 0.8;
    ditheringPass.uniforms.pixelateEnabled.value = true;
    ditheringPass.uniforms.pixelSize.value = 2;
    composer.addPass(ditheringPass);
    ditheringPassRef.current = ditheringPass;

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    cubeGroupRef.current = cubeGroup;

    // Cubo wireframe
    const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.LineSegments(edges, lineMaterial);
    cubeGroup.add(cube);

    // Pusher
    const pusherGeometry = new THREE.BoxGeometry(CUBE_SIZE * 0.95, 0.05, CUBE_SIZE * 0.95);
    const pusherMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.4
    });
    const pusher = new THREE.Mesh(pusherGeometry, pusherMaterial);
    pusher.position.y = PUSHER_BASE_Y;
    pusher.name = 'pusher';
    cubeGroup.add(pusher);

    const pusherEdges = new THREE.EdgesGeometry(pusherGeometry);
    const pusherLines = new THREE.LineSegments(pusherEdges, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
    pusher.add(pusherLines);

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      composer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      if (ditheringPassRef.current) {
        ditheringPassRef.current.uniforms.resolution.value.set(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Auto-rotación continua
      autoRotationRef.current.y += AUTO_ROTATE_Y;
      autoRotationRef.current.tiltTime += AUTO_TILT_SPEED;
      
      // Balanceo suave en X
      const autoTiltX = Math.sin(autoRotationRef.current.tiltTime) * AUTO_TILT_AMPLITUDE;
      
      // Input del usuario
      if (keysRef.current.left) targetRotationRef.current.y -= 0.03;
      if (keysRef.current.right) targetRotationRef.current.y += 0.03;
      if (keysRef.current.up) targetRotationRef.current.x -= 0.03;
      if (keysRef.current.down) targetRotationRef.current.x += 0.03;
      
      if (mouseRef.current.active) {
        targetRotationRef.current.y += mouseRef.current.x * 0.002;
        targetRotationRef.current.x += mouseRef.current.y * 0.002;
      }
      
      targetRotationRef.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationRef.current.x));
      
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;
      
      cubeGroup.rotation.x = currentRotationRef.current.x + autoTiltX;
      cubeGroup.rotation.y = currentRotationRef.current.y + autoRotationRef.current.y;
      
      pusherTimeRef.current += PUSHER_SPEED;
      const pusherMesh = cubeGroup.getObjectByName('pusher');
      if (pusherMesh) {
        pusherMesh.position.y = PUSHER_BASE_Y + Math.sin(pusherTimeRef.current) * PUSHER_AMPLITUDE;
      }
      
      updateWords(pusherMesh);
      
      // Usar composer en lugar de renderer directo
      composer.render();
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      composer.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Actualizar palabras
  const updateWords = useCallback((pusher) => {
    const cubeGroup = cubeGroupRef.current;
    if (!cubeGroup) return;

    const pusherY = pusher ? pusher.position.y : 0;
    const halfCube = CUBE_SIZE / 2;
    
    wordsRef.current = wordsRef.current.filter(word => {
      word.vy -= GRAVITY;
      
      word.x += word.vx;
      word.y += word.vy;
      word.vz += (Math.random() - 0.5) * 0.001;
      word.z += word.vz;
      
      word.vx *= FRICTION;
      word.vz *= FRICTION;
      
      // Empuje del pusher
      if (pusher && word.y < pusherY + 0.2 && word.y > pusherY - 0.1) {
        word.vy = Math.sin(pusherTimeRef.current) * PUSHER_SPEED * 2;
        word.vx += (Math.random() - 0.5) * 0.01;
        word.vz += (Math.random() - 0.5) * 0.01;
      }
      
      // Rebote en paredes del cubo
      if (word.x > halfCube - 0.2) { word.x = halfCube - 0.2; word.vx *= -0.5; }
      if (word.x < -halfCube + 0.2) { word.x = -halfCube + 0.2; word.vx *= -0.5; }
      if (word.z > halfCube - 0.2) { word.z = halfCube - 0.2; word.vz *= -0.5; }
      if (word.z < -halfCube + 0.2) { word.z = -halfCube + 0.2; word.vz *= -0.5; }
      
      // Palabra cayó - añadir al poema de la cara correspondiente
      if (word.y < -halfCube - 0.3) {
        addToPoem(word.text, word.x, word.z);
        
        cubeGroup.remove(word.mesh);
        word.mesh.material.map?.dispose();
        word.mesh.material.dispose();
        return false;
      }
      
      word.mesh.position.set(word.x, word.y, word.z);
      
      return true;
    });
  }, [addToPoem]);

  // Añadir palabra
  const addWord = useCallback((text) => {
    const cubeGroup = cubeGroupRef.current;
    if (!cubeGroup) return;
    
    const sprite = createTextSprite(text);
    
    const halfCube = CUBE_SIZE / 2;
    sprite.position.set(
      (Math.random() - 0.5) * CUBE_SIZE * 0.6,
      halfCube + 0.5,
      (Math.random() - 0.5) * CUBE_SIZE * 0.6
    );
    
    cubeGroup.add(sprite);
    
    wordsRef.current.push({
      mesh: sprite,
      text: text,
      x: sprite.position.x,
      y: sprite.position.y,
      z: sprite.position.z,
      vx: (Math.random() - 0.5) * 0.02,
      vy: -0.01,
      vz: (Math.random() - 0.5) * 0.02
    });
    
    setScore(s => s + 1);
  }, [createTextSprite]);

  // Manejar submit - solo genera palabras si hay texto
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    startAudio();
    
    const text = input.trim();
    
    // No hacer nada si el input está vacío
    if (text === '') return;
    
    // Contar palabras separadas por espacio
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Generar esa cantidad de palabras del JSON
    for (let i = 0; i < wordCount; i++) {
      setTimeout(() => {
        addWord(getRandomWord());
      }, i * 100);
    }
    
    setInput('');
  }, [addWord, getRandomWord, isLoaded, input, startAudio]);

  // Manejar teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target === inputRef.current) {
        return;
      }
      
      switch (e.code) {
        case 'ArrowLeft': keysRef.current.left = true; break;
        case 'ArrowRight': keysRef.current.right = true; break;
        case 'ArrowUp': keysRef.current.up = true; break;
        case 'ArrowDown': keysRef.current.down = true; break;
        case 'Space':
          e.preventDefault();
          if (isLoaded) addWord(getRandomWord());
          break;
      }
    };
    
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'ArrowLeft': keysRef.current.left = false; break;
        case 'ArrowRight': keysRef.current.right = false; break;
        case 'ArrowUp': keysRef.current.up = false; break;
        case 'ArrowDown': keysRef.current.down = false; break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [addWord, getRandomWord, isLoaded]);

  // Manejar mouse
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseRef.current.x = (e.clientX - centerX) / rect.width;
      mouseRef.current.y = (e.clientY - centerY) / rect.height;
      mouseRef.current.active = true;
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleContainerClick = useCallback((e) => {
    inputRef.current?.focus();
    startAudio();
  }, [startAudio]);

  return (
    <div 
      className="w-full h-full bg-black relative overflow-hidden flex flex-col"
      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
    >
      {/* Three.js container */}
      <div 
        ref={containerRef} 
        className="flex-1 cursor-crosshair"
        onClick={handleContainerClick}
      />
      
      {/* Score */}
      <div className="absolute top-4 right-4 text-green-500 text-sm">
        {score.toString().padStart(6, '0')}
      </div>
      
      {/* Input terminal style */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-green-900">
        <div className="flex items-center max-w-xl mx-auto">
          <span className="text-green-500 mr-2">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-green-400 text-sm caret-green-500"
            autoComplete="off"
            spellCheck="false"
            autoFocus
          />
        </div>
      </form>
    </div>
  );
}
