'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const projectImages = [
  '/images/apropiaciondigifisica/1.JPG',
  '/images/apropiaciondigifisica/2.JPG',
  '/images/apropiaciondigifisica/3.JPG',
  '/images/atencionsargento/1.jpg',
  '/images/atencionsargento/2.jpg',
  '/images/atencionsargento/3.jpeg',
  '/images/Automata1/1.jpg',
  '/images/Automata1/2.jpg',
  '/images/Automata1/3.jpg',
  '/images/Automata1/4.jpg',
  '/images/Autorretrato/1.jpg',
  '/images/Autorretrato/2.jpg',
  '/images/Autorretrato/3.jpg',
  '/images/Autorretrato/4.jpg',
  '/images/Autorretrato/5.jpg',
  '/images/Autorretrato/6.jpg',
  '/images/Autorretrato/7.jpg',
  '/images/Autorretrato/8.jpg',
  '/images/Autorretrato/9.jpg',
  '/images/Autorretrato/10.JPG',
  '/images/CuidateFlor/1.JPG',
  '/images/CuidateFlor/2.JPG',
  '/images/CuidateFlor/3.JPG',
  '/images/CuidateFlor/4.JPG',
  '/images/para-ti-esto-es-un-juego/1.JPG',
  '/images/para-ti-esto-es-un-juego/2.JPG',
  '/images/autorretrato3/IMG_7237.JPG',
];

const BackgroundImage = ({ url, shouldAnimate, isGameImage, isHit }) => {
  if (isGameImage) {
    return (
      <motion.div
        className="absolute inset-0"
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative w-full h-full">
          <div 
            className={`absolute inset-0 glitch-effect ${isHit ? 'hit-flash' : ''}`} 
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover'
            }}
          />
          <div 
            className={`absolute inset-0 glitch-effect-2 ${isHit ? 'hit-flash' : ''}`} 
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover'
            }}
          />
          <div 
            className={`absolute inset-0 glitch-effect-3 ${isHit ? 'hit-flash' : ''}`} 
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover'
            }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Image
        src={url}
        alt="Background"
        fill
        className="object-cover"
        priority
      />
    </motion.div>
  );
};

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
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHit, setIsHit] = useState(false);

  const backgroundMusicRef = useRef(null);
  const kickSoundRef = useRef(null);
  const nextImageSoundRef = useRef(null);

  const FRAME_DURATION = 200;
  const LEG_FRAMES = 12;
  const FALL_FRAMES = 5;

  useEffect(() => {
    backgroundMusicRef.current = new Audio('/sounds/background-loop.mp3');
    kickSoundRef.current = new Audio('/sounds/kick.mp3');
    nextImageSoundRef.current = new Audio('/sounds/next.mp3');

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 0.3;
    }

    return () => {
      if (backgroundMusicRef.current) backgroundMusicRef.current.pause();
    };
  }, []);

  useEffect(() => {
    // Preload animation images
    const plinthFrames = [1,2,3,4,5].map(i => `/images/game/plinth/${i}.png`);
    const objectFrames = [1,2,3,4,5].map(i => `/images/game/object/${i}.png`);
    const legFrames = Array.from({length: 12}, (_, i) => `/images/game/leg/${i+1}.png`);
    const allImages = [...plinthFrames, ...objectFrames, ...legFrames, ...projectImages];
    allImages.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
    // Preload sounds
    ['/sounds/background-loop.mp3', '/sounds/kick.mp3', '/sounds/next.mp3'].forEach(src => {
      const audio = new window.Audio();
      audio.src = src;
    });
  }, []);

  const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * projectImages.length);
    setBackgroundUrl(projectImages[randomIndex]);
    if (nextImageSoundRef.current) nextImageSoundRef.current.play();
  };

  const startAnimation = () => {
    if (!canKick) return;
    
    setCanKick(false);
    setLegFrame(0);
    setFallFrame(0);
    setIsLegAnimating(true);
    setIsFalling(false);
    setIsFlipped(Math.random() > 0.5);

    let shouldIncreaseScore = false;

    const legInterval = setInterval(() => {
      setLegFrame(prev => {
        if (prev >= LEG_FRAMES - 1) {
          clearInterval(legInterval);
          setIsLegAnimating(false);
          setTimeout(() => {
            setCanKick(true);
            if (gameStarted) {
              if (shouldIncreaseScore) {
                setScore(prev => prev + 1);
              }
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
          setIsHit(true);
          if (kickSoundRef.current) kickSoundRef.current.play();
          shouldIncreaseScore = true;
          setTimeout(() => setIsHit(false), 200);
        }
        return prev + 1;
      });
    }, FRAME_DURATION);
  };

  useEffect(() => {
    if (gameStarted && backgroundMusicRef.current) {
      backgroundMusicRef.current.play();
    }
  }, [gameStarted]);

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

  const handleGameAreaClick = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setShowStart(false);
      getRandomImage();
    } else {
      startAnimation();
    }
  };

  // Play initial animation on first load
  useEffect(() => {
    if (!gameStarted && !isLegAnimating && !isFalling && !firstKickDone) {
      startAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white">
      <div
        className="relative w-full max-w-4xl aspect-[4/3] perspective-1000"
        onClick={handleGameAreaClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Background */}
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            {gameStarted && backgroundUrl ? (
              <BackgroundImage 
                key={backgroundUrl}
                url={backgroundUrl}
                shouldAnimate={gameStarted}
                isGameImage={true}
                isHit={isHit}
              />
            ) : (
              <BackgroundImage
                key="initial-bg"
                url="/images/game/background.png"
                shouldAnimate={false}
                isGameImage={false}
              />
            )}
          </AnimatePresence>
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
            <div className={`absolute inset-0 ${isFlipped ? 'scale-x-[-1]' : ''}`}>
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
        {/* UI overlay (start text) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {showStart && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-['Press_Start_2P'] text-red-600">
                [START]
              </span>
            </div>
          )}
        </div>
      </div>
      {/* UI text now below the image */}
      <div className="w-full flex justify-center gap-4 font-['Press_Start_2P'] text-sm mt-4">
        {!gameStarted && (
          <span className="text-red-600 ">[tap/click to start]</span>
        )}
        {gameStarted && (
          <span className="text-red-600 ">shoot em' up     [score:{score}]</span>
        )}
      </div>
    </div>
  );
}