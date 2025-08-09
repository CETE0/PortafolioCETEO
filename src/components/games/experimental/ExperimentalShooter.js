'use client';

import { useEffect, useRef } from 'react';
import { ArtShooterGame } from './ArtShooterGame';

export default function ExperimentalShooter() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gameRef.current = new ArtShooterGame(containerRef.current);
    // Hacer que el contenedor capture clicks y no toda la página
    containerRef.current.style.cursor = 'crosshair';
    return () => {
      if (gameRef.current) gameRef.current.dispose();
    };
  }, []);

  return (
    <div
      id="game-container"
      ref={containerRef}
      className="w-full relative"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}
    />
  );
}


