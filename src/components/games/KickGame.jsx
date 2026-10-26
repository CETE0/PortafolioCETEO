import { useEffect, useRef } from 'react';
import { ThreeGame } from './game/ThreeGame';
import { useGameHud } from '@/components/layout/GameFrame';

export default function KickGame() {
  const containerRef = useRef(null);
  const setHud = useGameHud();

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new ThreeGame(containerRef.current, { onHud: setHud });
    return () => game.dispose();
  }, [setHud]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" />;
}
