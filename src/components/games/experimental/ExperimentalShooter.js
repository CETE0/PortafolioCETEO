'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArtShooterGame } from './ArtShooterGame';

export default function ExperimentalShooter() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const router = useRouter();

  // Callback de navegación que se pasará al juego
  const handleNavigate = useCallback((path) => {
    router.push(path);
  }, [router]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Pasar el callback de navegación al juego
    gameRef.current = new ArtShooterGame(containerRef.current, {
      onNavigate: handleNavigate
    });
    
    // Hacer que el contenedor capture clicks y no toda la página
    containerRef.current.style.cursor = 'crosshair';
    
    return () => {
      if (gameRef.current) gameRef.current.dispose();
    };
  }, [handleNavigate]);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="w-full relative"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}
    />
  );
}


