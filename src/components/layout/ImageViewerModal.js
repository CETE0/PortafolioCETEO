import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from './OptimizedImage';

export default function ImageViewerModal({ 
  isOpen, 
  onClose, 
  image, 
  imagePreloader,
  onPrev, 
  onNext, 
  hasPrev, 
  hasNext 
}) {
  if (!isOpen) return null;

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

        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-2 md:left-4 text-white hover:text-red-500 transition-colors z-10 p-2"
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
            className="absolute right-2 md:right-4 text-white hover:text-red-500 transition-colors z-10 p-2"
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
            <span>Loading high-res...</span>
          </div>
        )}

        {isImagePreloaded && (
          <div className="absolute top-4 left-4 text-xs text-white/50 z-10 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Cached</span>
          </div>
        )}

        {/* Image container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full max-w-[95vw] max-h-[90vh] mx-auto flex items-center justify-center p-4"
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

        {/* Navigation hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white/50 z-10 flex items-center space-x-4">
          <span>Arrow keys to navigate</span>
          <span>•</span>
          <span>ESC to close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 