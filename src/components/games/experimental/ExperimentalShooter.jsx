import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArtShooterGame } from './ArtShooterGame';
import { useGameHud } from '@/components/layout/GameFrame';

export default function ExperimentalShooter() {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const setHud = useGameHud();

  const handleNavigate = useCallback((path) => {
    navigate({ to: path });
  }, [navigate]);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new ArtShooterGame(containerRef.current, { onNavigate: handleNavigate, onHud: setHud });
    containerRef.current.style.cursor = 'crosshair';
    return () => game.dispose();
  }, [handleNavigate, setHud]);

  return <div id="game-container" ref={containerRef} className="absolute inset-0 overflow-hidden" />;
}
