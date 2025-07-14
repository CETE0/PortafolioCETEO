'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import YouTubePlayer from './YouTubePlayer';
import TextContentView from './TextContentView';
import SketchfabViewer from './SketchfabViewer';
import ImageViewerModal from './ImageViewerModal';

const KickGame = dynamic(() => import('../games/KickGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-black">Loading game...</p>
    </div>
  ),
});

export default function ProjectView({ content = [], title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  if (!content || content.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-black">
        No content available
      </div>
    );
  }

  const currentItem = content[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo permitir navegación si no estamos en el juego
      if (currentItem.type === 'game') return;

      if (e.key === 'ArrowRight' && currentIndex < content.length - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      }
      if (e.key === 'Escape' && isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, content.length, currentItem.type, isImageViewerOpen]);

  const renderContent = () => {
    if (!currentItem) return null;

    switch (currentItem.type) {
      case 'image':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-white">
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsImageViewerOpen(true)}
            >
              <Image
                src={getOptimizedImageUrl(currentItem.src, { width: 1600, height: 1200, quality: 85 })}
                alt={currentItem.alt || ''}
                width={6240}
                height={4160}
                className="w-auto h-auto object-contain"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 70vw"
                priority={currentIndex === 0}
              />
            </div>
          </div>
        );
      case 'youtube':
        return (
          <YouTubePlayer 
            videoId={currentItem.id} 
            title={currentItem.title} 
          />
        );
      case 'text':
        return <TextContentView content={currentItem} />;
      case '3d':
        return (
          <SketchfabViewer 
            modelId={currentItem.modelId}
            title={currentItem.title}
          />
        );
      case 'game':
        return (
          <div className="w-full h-full">
            <KickGame />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            className="absolute w-full h-full"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
            style={{ visibility: isImageViewerOpen ? 'hidden' : 'visible' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer solo si no es un juego */}
      {currentItem.type !== 'game' && (
        <div 
          className="bg-white border-t border-white"
          style={{ visibility: isImageViewerOpen ? 'hidden' : 'visible' }}
        >
          {/* Navegación */}
          <div className="flex justify-between items-center px-4 md:px-8 py-4">
            <motion.button
              onClick={() => {
                if (currentIndex > 0) {
                  setDirection(-1);
                  setCurrentIndex(currentIndex - 1);
                }
              }}
              disabled={currentIndex === 0}
              className="text-sm text-black hover:text-red-500 transition-colors disabled:opacity-50 disabled:hover:text-black"
            >
              PREV
            </motion.button>
            <span className="text-sm text-black">
              {currentIndex + 1} / {content.length}
            </span>
            <motion.button
              onClick={() => {
                if (currentIndex < content.length - 1) {
                  setDirection(1);
                  setCurrentIndex(currentIndex + 1);
                }
              }}
              disabled={currentIndex === content.length - 1}
              className="text-sm text-black hover:text-red-500 transition-colors disabled:opacity-50 disabled:hover:text-black"
            >
              NEXT
            </motion.button>
          </div>

          {/* Texto descriptivo */}
          <div className="px-4 md:px-8 py-4 border-t border-white">
            <p className="text-sm text-black font-light">
              {currentItem.text || content.find(item => item.text)?.text || ''}
            </p>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {currentItem.type === 'image' && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          image={currentItem}
          onPrev={() => {
            if (currentIndex > 0) {
              const newIndex = currentIndex - 1;
              setDirection(-1);
              setCurrentIndex(newIndex);
              if (content[newIndex].type !== 'image') {
                setIsImageViewerOpen(false);
              }
            }
          }}
          onNext={() => {
            if (currentIndex < content.length - 1) {
              const newIndex = currentIndex + 1;
              setDirection(1);
              setCurrentIndex(newIndex);
              if (content[newIndex].type !== 'image') {
                setIsImageViewerOpen(false);
              }
            }
          }}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < content.length - 1}
        />
      )}
    </div>
  );
}