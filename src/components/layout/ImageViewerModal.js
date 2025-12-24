"use client";

import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ImageViewerModal({ 
  isOpen, 
  onClose, 
  image, 
  imagePreloader,
  onPrev, 
  onNext, 
  hasPrev, 
  hasNext,
  currentIndex,
  totalItems
}) {
  const { t } = useLanguage();
  if (!isOpen || !image) return null;

  // Handler to only close if the background itself is clicked
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Check if image is preloaded for modal context
  const isImagePreloaded = imagePreloader 
    ? imagePreloader.isImageCached(image.src, 'modal')
    : false;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={handleBackgroundClick}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-10 p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Desktop Navigation arrows (hidden on mobile) */}
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="hidden md:block absolute left-4 text-white hover:text-red-500 transition-colors z-10 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="hidden md:block absolute right-4 text-white hover:text-red-500 transition-colors z-10 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Cache status indicator */}
        {!isImagePreloaded && (
          <div className="absolute top-4 left-4 text-xs text-white/70 z-10 flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span>{t('modal.loadingHighRes')}</span>
          </div>
        )}

        {isImagePreloaded && (
          <div className="absolute top-4 left-4 text-xs text-white/50 z-10 flex items-center space-x-2">
          </div>
        )}

        {/* Image container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full max-w-[95vw] max-h-[85vh] md:max-h-[90vh] mx-auto flex items-center justify-center p-4 pb-20 md:pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt || ''}
            context="modal"
            priority={true}
            fillContainer={true}
            isPreloaded={isImagePreloaded}
            containerStyle={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              backgroundColor: 'transparent'
            }}
          />
        </motion.div>

        {/* Mobile bottom navigation bar */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white z-10 py-4 px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasPrev) onPrev();
              }}
              disabled={!hasPrev}
              className={`text-black p-2 ${hasPrev ? 'hover:text-red-500' : 'opacity-30'} transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="font-['Press_Start_2P'] text-xs text-black/50">
              {currentIndex} / {totalItems}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasNext) onNext();
              }}
              disabled={!hasNext}
              className={`text-black p-2 ${hasNext ? 'hover:text-red-500' : 'opacity-30'} transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop image counter */}
        <div className="hidden md:block absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white/50 z-10">
          <span className="font-['Press_Start_2P']">
            {currentIndex} / {totalItems}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 