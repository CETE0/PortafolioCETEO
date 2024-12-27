'use client';

import { useState, useEffect } from 'react';  // Añadimos useEffect
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import YouTubePlayer from './YouTubePlayer';
import TextContentView from './TextContentView';
import SketchfabViewer from './SketchFabViewer';

export default function ProjectView({ content = [], title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

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
      if (e.key === 'ArrowRight' && currentIndex < content.length - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, content.length]);

  const renderContent = () => {
    if (!currentItem) return null;

    switch (currentItem.type) {
      case 'image':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-white">
            <div className="relative">
              <Image
                src={currentItem.src}
                alt={currentItem.alt || ''}
                width={6240}
                height={4160}
                className="w-auto h-auto object-contain"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Contenido principal */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            className="absolute w-full h-full"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer con navegación y texto */}
      <div className="bg-white border-t border-gray-100">
        {/* Navegación */}
        <div className="flex justify-between items-center px-8 py-4">
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
        {currentItem.text && (
          <div className="px-8 py-4 border-t border-gray-100">
            <p className="text-sm text-black font-light">{currentItem.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

