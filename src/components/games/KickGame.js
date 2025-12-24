'use client';

import { useEffect, useRef } from 'react';
import { ThreeGame } from './game/ThreeGame';

export default function KickGame() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize game
    gameRef.current = new ThreeGame(containerRef.current);

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full relative"
      style={{ 
        height: 'calc(100vh - 64px)', // Altura ajustada para evitar el doble render
        overflow: 'hidden' // Prevenir scroll
      }}
    />
  );
}