'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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

// Animation assets - these need to be loaded directly for performance
const ANIMATION_ASSETS = {
  background: '/images/game/background.png',
  plinth: Array.from({ length: 5 }, (_, i) => `/images/game/plinth/${i + 1}.png`),
  object: Array.from({ length: 5 }, (_, i) => `/images/game/object/${i + 1}.png`),
  leg: Array.from({ length: 14 }, (_, i) => `/images/game/leg/${i + 1}.png`),
};

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

// Optimized animation image component
const AnimationImage = ({ src, alt, className = '', style = {} }) => {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-contain ${className}`}
      style={style}
      priority={true}
      quality={90}
      sizes="100vw"
      loading="eager"
    />
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  
  const backgroundMusicRef = useRef(null);
  const kickSoundRef = useRef(null);
  const nextImageSoundRef = useRef(null);
  const preloadedImagesRef = useRef(new Set());
  const animationAssetsRef = useRef(new Map());

  const FRAME_DURATION = 80;
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

  // Preload animation assets with progress tracking
  useEffect(() => {
    const preloadAnimationAssets = async () => {
      const allAssets = [
        ANIMATION_ASSETS.background,
        ...ANIMATION_ASSETS.plinth,
        ...ANIMATION_ASSETS.object,
        ...ANIMATION_ASSETS.leg,
      ];

      let loaded = 0;
      const total = allAssets.length;
      setLoadingProgress(0);

      const loadPromises = allAssets.map(src => 
        new Promise((resolve) => {
          if (animationAssetsRef.current.has(src)) {
            loaded++;
            setLoadingProgress((loaded / total) * 100);
            resolve();
            return;
          }

          const img = new window.Image();
          img.onload = () => {
            animationAssetsRef.current.set(src, img);
            loaded++;
            setLoadingProgress((loaded / total) * 100);
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load animation asset: ${src}`);
            loaded++;
            setLoadingProgress((loaded / total) * 100);
            resolve();
          };
          img.src = src;
        })
      );

      await Promise.all(loadPromises);
      
      // Ensure all critical assets are loaded
      const criticalAssetsLoaded = animationAssetsRef.current.has(ANIMATION_ASSETS.background) &&
                                  animationAssetsRef.current.has(ANIMATION_ASSETS.plinth[0]) &&
                                  animationAssetsRef.current.has(ANIMATION_ASSETS.object[0]) &&
                                  animationAssetsRef.current.has(ANIMATION_ASSETS.leg[0]);
      
      if (criticalAssetsLoaded) {
        setAssetsLoaded(true);
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 300);
      } else {
        // If critical assets failed, still proceed but log warning
        console.warn('Some critical animation assets failed to load');
        setAssetsLoaded(true);
        setIsInitialLoading(false);
      }
    };

    preloadAnimationAssets();
  }, []);

  // Audio initialization
  useEffect(() => {
    if (isInitialLoading) return;
    
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
  }, [isInitialLoading]);

  // Secondary preloading for portfolio images
  useEffect(() => {
    if (isInitialLoading || !assetsLoaded) return;

    const preloadPortfolioImages = () => {
      // Preload first few portfolio images
      const firstImages = projectImages.slice(0, 5);
      
      firstImages.forEach(src => {
        if (!preloadedImagesRef.current.has(src)) {
          const optimizedUrl = getOptimizedImageUrl(src, { width: 800, height: 600, quality: 75 });
          const img = new window.Image();
          img.onload = () => preloadedImagesRef.current.add(src);
          img.src = optimizedUrl;
        }
      });

      // Preload remaining images with lower priority
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          const remainingImages = projectImages.slice(5);
          remainingImages.forEach(src => {
            if (!preloadedImagesRef.current.has(src)) {
              const optimizedUrl = getOptimizedImageUrl(src, { width: 800, height: 600, quality: 75 });
              const img = new window.Image();
              img.onload = () => preloadedImagesRef.current.add(src);
              img.src = optimizedUrl;
            }
          });
        });
      }
    };

    preloadPortfolioImages();

    return () => {
      preloadedImagesRef.current.clear();
    };
  }, [isInitialLoading, assetsLoaded]);

  const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * projectImages.length);
    const selectedImage = projectImages[randomIndex];
    setBackgroundUrl(selectedImage);
    if (nextImageSoundRef.current) {
      nextImageSoundRef.current.currentTime = 0;
      nextImageSoundRef.current.play().catch(e => console.warn('Audio play failed:', e));
    }
  };

  const startAnimation = () => {
    if (!canKick || !assetsLoaded) return;
    
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
          if (kickSoundRef.current) {
            kickSoundRef.current.currentTime = 0;
            kickSoundRef.current.play().catch(e => console.warn('Audio play failed:', e));
          }
          shouldIncreaseScore = true;
          setTimeout(() => setIsHit(false), 200);
        }
        return prev + 1;
      });
    }, FRAME_DURATION);
  };

  useEffect(() => {
    if (gameStarted && backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(e => console.warn('Audio play failed:', e));
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

  // Auto-start initial animation
  useEffect(() => {
    if (isInitialLoading || !assetsLoaded) return;
    
    const startInitialAnimation = () => {
      if (!gameStarted && !isLegAnimating && !isFalling && !firstKickDone) {
        const timer = setTimeout(() => {
          startAnimation();
        }, 500);
        return () => clearTimeout(timer);
      }
    };

    const timer = setTimeout(startInitialAnimation, 1000);
    return () => clearTimeout(timer);
  }, [isInitialLoading, assetsLoaded]);

  // Show loading screen while assets are loading
  if (isInitialLoading) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="relative w-full max-w-4xl aspect-[4/3] flex items-center justify-center">
          <div className="text-center">
            <div className="text-black font-['Press_Start_2P'] text-lg mb-4">
              Loading Assets...
            </div>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="text-black font-['Press_Start_2P'] text-xs mt-2">
              {Math.round(loadingProgress)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <motion.div
                key="initial-bg"
                className="absolute inset-0"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimationImage
                  src={ANIMATION_ASSETS.background}
                  alt="Background"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Game Elements */}
        <div className="absolute inset-0 z-10">
          {!gameStarted && assetsLoaded && (
            <>
              {/* Plinth */}
              <div className="absolute inset-0">
                <AnimationImage
                  src={ANIMATION_ASSETS.plinth[isFalling ? Math.min(fallFrame, FALL_FRAMES - 1) : 0]}
                  alt="Plinth"
                />
              </div>
              {/* Object */}
              <div className="absolute inset-0">
                <AnimationImage
                  src={ANIMATION_ASSETS.object[isFalling ? Math.min(fallFrame, FALL_FRAMES - 1) : 0]}
                  alt="Object"
                />
              </div>
            </>
          )}
          
          {/* Leg Animation */}
          {isLegAnimating && assetsLoaded && (
            <div className={`absolute inset-0 ${isFlipped ? 'scale-x-[-1]' : ''}`}>
              <AnimationImage
                src={ANIMATION_ASSETS.leg[Math.min(legFrame, LEG_FRAMES - 1)]}
                alt="Leg"
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
      
      {/* UI text below the image */}
      <div className="w-full flex justify-center gap-4 font-['Press_Start_2P'] text-sm mt-4">
        {!gameStarted && (
          <span className="text-red-600">[tap/click to start]</span>
        )}
        {gameStarted && (
          <span className="text-red-600">shoot em' up     [score:{score}]</span>
        )}
      </div>
    </div>
  );
}