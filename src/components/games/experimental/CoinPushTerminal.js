'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// Configuración
const CUBE_SIZE = 2.5;
const PUSHER_SPEED = 0.015;
const PUSHER_AMPLITUDE = 0.6;
const GRAVITY = 0.0008;
const FRICTION = 0.985;

// Auto-rotación del cubo
const AUTO_ROTATE_Y = 0.003;  // Velocidad de giro en Y
const AUTO_TILT_AMPLITUDE = 0.15;  // Amplitud del balanceo en X
const AUTO_TILT_SPEED = 0.008;  // Velocidad del balanceo

export default function CoinPushTerminal() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeGroupRef = useRef(null);
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
  const poemLinesRef = useRef({
    front: { words: [], y: -CUBE_SIZE / 2 - 0.3 },
    back: { words: [], y: -CUBE_SIZE / 2 - 0.3 },
    left: { words: [], y: -CUBE_SIZE / 2 - 0.3 },
    right: { words: [], y: -CUBE_SIZE / 2 - 0.3 }
  });
  const poemMeshesRef = useRef([]);
  
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const inputRef = useRef(null);

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

  // Crear texto 3D para poemas en los lados
  const createPoemText = useCallback((text, side) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 32;
    
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    const metrics = ctx.measureText(text);
    
    canvas.width = Math.ceil(metrics.width) + 10;
    canvas.height = fontSize + 10;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#00ff00';
    ctx.globalAlpha = 0.8;
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
    sprite.scale.set(aspect * 0.35, 0.35, 1);
    
    return sprite;
  }, []);

  // Añadir palabra al poema de un lado
  const addToPoem = useCallback((word, z) => {
    const cubeGroup = cubeGroupRef.current;
    if (!cubeGroup) return;
    
    // Determinar a qué lado va basándose en la posición z
    let side;
    if (z > 0.3) {
      side = 'front';
    } else if (z < -0.3) {
      side = 'back';
    } else if (Math.random() > 0.5) {
      side = 'left';
    } else {
      side = 'right';
    }
    
    const poemLine = poemLinesRef.current[side];
    poemLine.words.push(word);
    
    // Crear el texto
    const lineText = poemLine.words.join(' ');
    
    // Remover sprite anterior de esta línea si existe
    const existingIndex = poemMeshesRef.current.findIndex(m => m.side === side && m.lineY === poemLine.y);
    if (existingIndex >= 0) {
      const existing = poemMeshesRef.current[existingIndex];
      cubeGroup.remove(existing.mesh);
      existing.mesh.material.map?.dispose();
      existing.mesh.material.dispose();
      poemMeshesRef.current.splice(existingIndex, 1);
    }
    
    const sprite = createPoemText(lineText, side);
    
    // Posicionar según el lado
    const halfCube = CUBE_SIZE / 2;
    const offset = 0.3;
    
    switch (side) {
      case 'front':
        sprite.position.set(0, poemLine.y, halfCube + offset);
        break;
      case 'back':
        sprite.position.set(0, poemLine.y, -halfCube - offset);
        break;
      case 'left':
        sprite.position.set(-halfCube - offset, poemLine.y, 0);
        break;
      case 'right':
        sprite.position.set(halfCube + offset, poemLine.y, 0);
        break;
    }
    
    cubeGroup.add(sprite);
    poemMeshesRef.current.push({ mesh: sprite, side, lineY: poemLine.y });
    
    // Si la línea es muy larga, crear nueva línea
    if (poemLine.words.length >= 4 + Math.floor(Math.random() * 3)) {
      poemLine.y -= 0.4;
      poemLine.words = [];
      setScore(s => s + 10);
    }
  }, [createPoemText]);

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
    pusher.position.y = CUBE_SIZE / 2 - 0.3;
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
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Auto-rotación continua
      autoRotationRef.current.y += AUTO_ROTATE_Y;
      autoRotationRef.current.tiltTime += AUTO_TILT_SPEED;
      
      // Balanceo suave en X (oscilación sinusoidal)
      const autoTiltX = Math.sin(autoRotationRef.current.tiltTime) * AUTO_TILT_AMPLITUDE;
      
      // Input del usuario modifica la rotación target
      if (keysRef.current.left) targetRotationRef.current.y -= 0.03;
      if (keysRef.current.right) targetRotationRef.current.y += 0.03;
      if (keysRef.current.up) targetRotationRef.current.x -= 0.03;
      if (keysRef.current.down) targetRotationRef.current.x += 0.03;
      
      if (mouseRef.current.active) {
        targetRotationRef.current.y += mouseRef.current.x * 0.002;
        targetRotationRef.current.x += mouseRef.current.y * 0.002;
      }
      
      // Limitar rotación manual en X
      targetRotationRef.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationRef.current.x));
      
      // Suavizar rotación manual
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;
      
      // Combinar auto-rotación con rotación manual
      cubeGroup.rotation.x = currentRotationRef.current.x + autoTiltX;
      cubeGroup.rotation.y = currentRotationRef.current.y + autoRotationRef.current.y;
      
      pusherTimeRef.current += PUSHER_SPEED;
      const pusherMesh = cubeGroup.getObjectByName('pusher');
      if (pusherMesh) {
        pusherMesh.position.y = CUBE_SIZE / 2 - 0.3 + Math.sin(pusherTimeRef.current) * PUSHER_AMPLITUDE;
      }
      
      updateWords(pusherMesh);
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
      
      // Palabra cayó - añadir al poema
      if (word.y < -halfCube - 0.3) {
        addToPoem(word.text, word.z);
        
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

  // Manejar submit - generar palabras basadas en cantidad de palabras escritas
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!isLoaded) return;
    
    const text = input.trim();
    
    if (text === '') {
      // Sin texto = una palabra
      addWord(getRandomWord());
    } else {
      // Contar palabras separadas por espacio
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      
      // Generar esa cantidad de palabras del JSON
      for (let i = 0; i < wordCount; i++) {
        setTimeout(() => {
          addWord(getRandomWord());
        }, i * 100); // Pequeño delay entre cada palabra
      }
    }
    
    setInput('');
  }, [addWord, getRandomWord, isLoaded, input]);

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
  }, []);

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
