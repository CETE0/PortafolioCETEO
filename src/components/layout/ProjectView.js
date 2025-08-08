'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import YouTubePlayer from './YouTubePlayer';
import TextContentView from './TextContentView';
import SketchfabViewer from './SketchfabViewer';
import ImageViewerModal from './ImageViewerModal';
import { useImagePreloader } from '../../lib/imagePreloader';
import { useLanguage } from '@/contexts/LanguageContext';
import { projectTranslations } from '@/i18n/projects';

const KickGame = dynamic(() => import('../games/KickGame'), {
  ssr: false,
  // Nota: no podemos usar hooks aquí, así que mantenemos texto neutro y lo traducimos fuera si es necesario
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-black">Loading game...</p>
    </div>
  ),
});

export default function ProjectView({ content = [], title, category, projectId }) {
  const { t, lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadStats, setPreloadStats] = useState({ loaded: 0, total: 0 });
  const [preloadCompleted, setPreloadCompleted] = useState(false);
  const [showPreloadIndicator, setShowPreloadIndicator] = useState(false);
  
  const imagePreloader = useImagePreloader();

  // Contenido localizado (solo textos/alt/títulos; las rutas de imagen/video no cambian)
  const localizedContent = useMemo(() => {
    const tr = projectTranslations?.[category]?.[projectId];
    if (!tr) return content;
    const itemsTr = tr.items || [];
    return content.map((item, idx) => {
      const itemTr = itemsTr[idx] || {};
      const localized = { ...item };
      if (itemTr.text && itemTr.text[lang]) localized.text = itemTr.text[lang];
      if (itemTr.alt && itemTr.alt[lang]) localized.alt = itemTr.alt[lang];
      if (item.type === 'youtube' && itemTr.title && itemTr.title[lang]) localized.title = itemTr.title[lang];
      if (item.type === '3d') {
        if (itemTr.title && itemTr.title[lang]) localized.title = itemTr.title[lang];
        if (itemTr.description && itemTr.description[lang]) localized.description = itemTr.description[lang];
      }
      return localized;
    });
  }, [content, category, projectId, lang]);

  if (!localizedContent || localizedContent.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-black">
        {t('project.noContent')}
      </div>
    );
  }

  const currentItem = localizedContent[currentIndex];

  // Advanced preloading with priority system and real-time progress - only once per project
  useEffect(() => {
    const preloadProjectImages = async () => {
      // Get all image items from content
      const imageItems = content.filter(item => item.type === 'image');
      
      if (imageItems.length === 0) {
        setIsPreloading(false);
        setShowPreloadIndicator(false);
        return;
      }

      // Initialize preloading state
      setIsPreloading(true);
      setShowPreloadIndicator(true);
      setPreloadCompleted(false);
      setPreloadStats({ loaded: 0, total: imageItems.length });

      try {
        // Prioritize images based on distance from current position (start with first image)
        const prioritizedItems = imageItems.map((item, index) => {
          const distance = Math.abs(index - 0); // Always start from first image
          let priority = 'normal';
          
          if (distance === 0) priority = 'high';
          else if (distance <= 2) priority = 'normal';
          else priority = 'low';
          
          return { ...item, priority, index };
        });

        // Sort by priority and distance
        prioritizedItems.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          
          if (priorityDiff !== 0) return priorityDiff;
          return Math.abs(a.index - 0) - Math.abs(b.index - 0); // Always prioritize from first image
        });

        // Load images one by one to show real-time progress
        let loaded = 0;
        const contexts = ['gallery', 'modal'];
        
        for (const item of prioritizedItems) {
          for (const context of contexts) {
            try {
              await imagePreloader.preloadImage(item.src, context, item.priority || 'normal');
            } catch (error) {
              console.warn(`Failed to preload ${item.src} for ${context}:`, error);
            }
          }
          
          loaded++;
          setPreloadStats({ loaded, total: imageItems.length });
        }

        // Mark as completed and start completion animation
        setPreloadCompleted(true);
        setIsPreloading(false);
        
        // Hide indicator after animation
        setTimeout(() => {
          setShowPreloadIndicator(false);
          setPreloadCompleted(false);
        }, 1500); // Time for green flash + fade out
        
        // Log cache stats for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Image preloader stats:', imagePreloader.getCacheStats());
        }
      } catch (error) {
        console.error('Error preloading images:', error);
        setIsPreloading(false);
        setShowPreloadIndicator(false);
      }
    };

    preloadProjectImages();
  }, [content, imagePreloader]); // Removed currentIndex from dependencies

  // Auto-close modal when navigating to non-image content
  useEffect(() => {
    if (isImageViewerOpen && currentItem.type !== 'image') {
      setIsImageViewerOpen(false);
    }
  }, [currentIndex, isImageViewerOpen, currentItem.type]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo permitir navegación si no estamos en el juego
      if (currentItem.type === 'game') return;

      if (e.key === 'ArrowRight' && currentIndex < localizedContent.length - 1) {
        const newIndex = currentIndex + 1;
        setDirection(1);
        setCurrentIndex(newIndex);
        // Close modal if navigating to non-image content
        if (isImageViewerOpen && localizedContent[newIndex].type !== 'image') {
          setIsImageViewerOpen(false);
        }
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setDirection(-1);
        setCurrentIndex(newIndex);
        // Close modal if navigating to non-image content
        if (isImageViewerOpen && localizedContent[newIndex].type !== 'image') {
          setIsImageViewerOpen(false);
        }
      }
      if (e.key === 'Escape' && isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, localizedContent.length, currentItem.type, isImageViewerOpen, localizedContent]);

  // Check if current image is preloaded
  const isCurrentImagePreloaded = currentItem.type === 'image' 
    ? imagePreloader.isImageCached(currentItem.src, 'gallery')
    : false;

  const renderContent = () => {
    if (!currentItem) return null;

    switch (currentItem.type) {
      case 'image':
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-white">
            <OptimizedImage
              src={currentItem.src}
              alt={currentItem.alt || ''}
              context="gallery"
              onClick={() => setIsImageViewerOpen(true)}
              priority={currentIndex === 0}
              isPreloaded={isCurrentImagePreloaded}
              fillContainer={true}
              containerStyle={{
                maxHeight: 'calc(100vh - 200px)',
                padding: '1rem'
              }}
            />
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

        {/* Advanced preloading indicator */}
        {showPreloadIndicator && (
          <div className={`absolute top-4 right-4 text-xs z-10 ${
            preloadCompleted ? 'animate-preload-complete' : ''
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                preloadCompleted 
                  ? 'bg-green-500' 
                  : 'bg-red-500 animate-pulse'
              }`}></div>
              <span className={`font-['Press_Start_2P'] transition-all duration-300 ${
                preloadCompleted ? 'text-green-500' : 'text-gray-500'
              }`}>
                {t('project.preloading', { loaded: preloadStats.loaded, total: preloadStats.total })}
              </span>
            </div>
          </div>
        )}
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
              {t('project.prev')}
            </motion.button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-black">
                {currentIndex + 1} / {localizedContent.length}
              </span>
              {currentItem.type === 'image' && isCurrentImagePreloaded && (
                <div className="w-1 h-1 bg-green-500 rounded-full" title="Image cached"></div>
              )}
              {isPreloading && (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <motion.button
              onClick={() => {
                if (currentIndex < localizedContent.length - 1) {
                  setDirection(1);
                  setCurrentIndex(currentIndex + 1);
                }
              }}
              disabled={currentIndex === localizedContent.length - 1}
              className="text-sm text-black hover:text-red-500 transition-colors disabled:opacity-50 disabled:hover:text-black"
            >
              {t('project.next')}
            </motion.button>
          </div>

          {/* Texto descriptivo */}
          <div className="px-4 md:px-8 py-4 border-t border-white">
            <p className="text-sm text-black font-light">
              {currentItem.text || localizedContent.find(item => item.text)?.text || ''}
            </p>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {isImageViewerOpen && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          image={currentItem.type === 'image' ? currentItem : null}
          imagePreloader={imagePreloader}
          onPrev={() => {
            if (currentIndex > 0) {
              const newIndex = currentIndex - 1;
              setDirection(-1);
              setCurrentIndex(newIndex);
              if (localizedContent[newIndex].type !== 'image') {
                setIsImageViewerOpen(false);
              }
            }
          }}
          onNext={() => {
            if (currentIndex < localizedContent.length - 1) {
              const newIndex = currentIndex + 1;
              setDirection(1);
              setCurrentIndex(newIndex);
              if (localizedContent[newIndex].type !== 'image') {
                setIsImageViewerOpen(false);
              }
            }
          }}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < localizedContent.length - 1}
          currentIndex={currentIndex + 1}
          totalItems={localizedContent.length}
        />
      )}
    </div>
  );
}