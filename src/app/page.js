'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [legFrame, setLegFrame] = useState(0);
  const [fallFrame, setFallFrame] = useState(0);
  const [isLegAnimating, setIsLegAnimating] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [canKick, setCanKick] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [firstKickDone, setFirstKickDone] = useState(false);
  const [showStart, setShowStart] = useState(false);

  const FRAME_DURATION = 200;
  const LEG_FRAMES = 12;
  const FALL_FRAMES = 5;

  const getRandomImage = () => {
    setBackgroundUrl(`https://picsum.photos/800/600?random=${Math.random()}`);
  };

  const startAnimation = () => {
    if (!canKick) return;
    
    setCanKick(false);
    setLegFrame(0);
    setFallFrame(0);
    setIsLegAnimating(true);
    setIsFalling(false);

    const legInterval = setInterval(() => {
      setLegFrame(prev => {
        if (prev >= LEG_FRAMES - 1) {
          clearInterval(legInterval);
          setIsLegAnimating(false);
          setTimeout(() => {
            setCanKick(true);
            if (gameStarted) {
              setScore(prev => prev + 1);
              getRandomImage();
            } else if (!firstKickDone) {
              setFirstKickDone(true);
              setShowStart(true);
            }
          }, FRAME_DURATION * 2);
          return 0;
        }
        if (prev === 7) {
          setIsFalling(true);
        }
        return prev + 1;
      });
    }, FRAME_DURATION);
};

  useEffect(() => {
    if (isFalling) {
      const fallInterval = setInterval(() => {
        setFallFrame(prev => {
          if (prev >= FALL_FRAMES - 1) {
            clearInterval(fallInterval);
            return prev;
          }
          return prev + 1;
        });
      }, FRAME_DURATION);
      return () => clearInterval(fallInterval);
    }
  }, [isFalling]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && canKick) {
        e.preventDefault();
        if (showStart) {
          setGameStarted(true);
          setShowStart(false);
          getRandomImage();
        }
        startAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canKick, showStart]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black">
      <div className="relative w-full max-w-4xl aspect-[4/3]">
        {/* Background */}
        <div className="absolute inset-0">
          {gameStarted ? (
            backgroundUrl && (
              <Image
                src={backgroundUrl}
                alt="Random Background"
                fill
                className="object-cover"
                priority
              />
            )
          ) : (
            <Image
              src="/images/game/background.png"
              alt="Initial Background"
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Game Elements */}
        <div className="absolute inset-0 z-10">
          {!gameStarted && (
            <>
              {/* Plinth */}
              <div className="absolute inset-0">
                <Image
                  src={`/images/game/plinth/${isFalling ? fallFrame + 1 : 1}.png`}
                  alt="Plinth"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Object */}
              <div className="absolute inset-0">
                <Image
                  src={`/images/game/object/${isFalling ? fallFrame + 1 : 1}.png`}
                  alt="Object"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </>
          )}

          {/* Leg */}
          {isLegAnimating && (
            <div className="absolute inset-0">
              <Image
                src={`/images/game/leg/${legFrame + 1}.png`}
                alt="Leg"
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
        </div>

        {/* UI */}
        <div className="absolute inset-0 z-20">
          {showStart && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-['Press_Start_2P'] text-red-700">
                [START]
              </span>
            </div>
          )}
          
          <div className="absolute bottom-0 w-full bg-black py-2">
            <div className="flex justify-center gap-4 font-['Press_Start_2P'] text-sm">
              {!gameStarted && (
                <span className="text-white opacity-50">[press space]</span>
              )}
              {gameStarted && (
                <>
                  <span className="text-white opacity-50">shoot em'</span>
                  <span className="text-red-500">[score:{score}]</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}