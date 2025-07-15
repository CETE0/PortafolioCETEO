'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from '../components/layout/OptimizedImage';
import { getOptimizedImageUrl } from '../lib/cloudinary';

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
              backgroundSize: 'cover',
              willChange: 'transform, opacity'
            }}
          />
          <div 
            className={`absolute inset-0 glitch-effect-2 ${isHit ? 'hit-flash' : ''}`} 
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              willChange: 'transform, opacity'
            }}
          />
          <div 
            className={`absolute inset-0 glitch-effect-3 ${isHit ? 'hit-flash' : ''}`} 
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              willChange: 'transform, opacity'
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
      <OptimizedImage
        src={url}
        alt="Background"
        context="hero"
        priority={true}
        fillContainer={true}
        containerStyle={{
          width: '100%',
          height: '100%'
        }}
        imageStyle={{
          objectFit: 'cover'
        }}
      />
    </motion.div>
  );
};

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [isLegAnimating, setIsLegAnimating] = useState(false);
  const [legFrame, setLegFrame] = useState(0);
  const [isFalling, setIsFalling] = useState(false);
  const [fallFrame, setFallFrame] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [canKick, setCanKick] = useState(true);
  const [firstKickDone, setFirstKickDone] = useState(false);
  
  const backgroundMusicRef = useRef(null);
  const kickSoundRef = useRef(null);
  const nextImageSoundRef = useRef(null);
  const preloadedImagesRef = useRef(new Set());

  const FRAME_DURATION = 50;
  const LEG_FRAMES = 14;
  const FALL_FRAMES = 5;

  const cleanupAudio = () => {
    [backgroundMusicRef, kickSoundRef, nextImageSoundRef].forEach(ref => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
        ref.current.load();
      }
    });
  };

  useEffect(() => {
    let audioInitialized = false;
    
    const initAudio = () => {
      if (audioInitialized) return;
      
      try {
        backgroundMusicRef.current = new Audio('/sounds/background-loop.mp3');
        kickSoundRef.current = new Audio('/sounds/kick.mp3');
        nextImageSoundRef.current = new Audio('/sounds/next.mp3');

        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.loop = true;
          backgroundMusicRef.current.volume = 0.3;
          backgroundMusicRef.current.preload = 'auto';
        }
        
        audioInitialized = true;
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };

    const handleUserInteraction = () => {
      initAudio();
    };

    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      cleanupAudio();
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  useEffect(() => {
    // Preload critical animation images first
    const criticalImages = [
      '/images/game/background.png',
      '/images/game/plinth/1.png',
      '/images/game/object/1.png',
      '/images/game/leg/1.png'
    ];

    // Preload critical images with higher priority
    criticalImages.forEach(src => {
      if (!preloadedImagesRef.current.has(src)) {
        const img = new window.Image();
        img.src = src;
        img.fetchPriority = 'high';
        preloadedImagesRef.current.add(src);
      }
    });

    // Preload a single random portfolio image (low priority)
    const firstImgSrc = projectImages[Math.floor(Math.random() * projectImages.length)];
    if (!preloadedImagesRef.current.has(firstImgSrc)) {
      const firstPortfolioImg = new window.Image();
      firstPortfolioImg.src = getOptimizedImageUrl(firstImgSrc, { width: 800, height: 600, quality: 75 });
      firstPortfolioImg.fetchPriority = 'low';
      preloadedImagesRef.current.add(firstImgSrc);
    }

    // Defer the rest of the heavy assets until browser is idle
    const preloadRest = () => {
      const plinthFrames = [2, 3, 4, 5].map(i => `/images/game/plinth/${i}.png`);
      const objectFrames = [2, 3, 4, 5].map(i => `/images/game/object/${i}.png`);
      const legFrames = Array.from({ length: 11 }, (_, i) => `/images/game/leg/${i + 2}.png`);
    
      [...plinthFrames, ...objectFrames, ...legFrames].forEach(src => {
        if (!preloadedImagesRef.current.has(src)) {
          const img = new window.Image();
          img.src = src;
          preloadedImagesRef.current.add(src);
        }
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preloadRest);
    } else {
      setTimeout(preloadRest, 1500);
    }

    // Cleanup preloaded images on unmount
    return () => {
      preloadedImagesRef.current.clear();
    };
  }, []);

  const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * projectImages.length);
    const selectedImage = projectImages[randomIndex];
    setBackgroundUrl(selectedImage);
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
    if (!gameStarted && !showStart) return;
    
    if (!gameStarted) {
      setGameStarted(true);
      setShowStart(false);
      getRandomImage();
    } else {
      startAnimation();
    }
  };

  useEffect(() => {
    const startInitialAnimation = () => {
      if (!gameStarted && !isLegAnimating && !isFalling && !firstKickDone) {
        const timer = setTimeout(() => {
          startAnimation();
        }, 100);
        return () => clearTimeout(timer);
      }
    };

    const timer = setTimeout(startInitialAnimation, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white">
      <div
        className={`relative w-full max-w-4xl aspect-[4/3] perspective-1000 ${!gameStarted && !showStart ? 'pointer-events-none' : ''}`}
        onClick={handleGameAreaClick}
        style={{ cursor: showStart || gameStarted ? 'pointer' : 'default' }}
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
                <OptimizedImage
                  src={`/images/game/plinth/${isFalling ? fallFrame + 1 : 1}.png`}
                  alt="Plinth"
                  context="hero"
                  priority={true}
                  fillContainer={true}
                  imageStyle={{
                    objectFit: 'contain'
                  }}
                />
              </div>
              {/* Object */}
              <div className="absolute inset-0">
                <OptimizedImage
                  src={`/images/game/object/${isFalling ? fallFrame + 1 : 1}.png`}
                  alt="Object"
                  context="hero"
                  priority={true}
                  fillContainer={true}
                  imageStyle={{
                    objectFit: 'contain'
                  }}
                />
              </div>
            </>
          )}
          {/* Leg */}
          {isLegAnimating && (
            <div className={`absolute inset-0 ${isFlipped ? 'scale-x-[-1]' : ''}`}>
              <OptimizedImage
                src={`/images/game/leg/${legFrame + 1}.png`}
                alt="Leg"
                context="hero"
                priority={true}
                fillContainer={true}
                imageStyle={{
                  objectFit: 'contain'
                }}
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