import { getOptimizedImageUrl, getOptimizedOptions } from './cloudinary';

/**
 * Image preloader utility with intelligent caching and priority management
 */
class ImagePreloader {
  constructor() {
    this.cache = new Map();
    this.loadingQueue = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Check if an image is already cached
   */
  isImageCached(src, context = 'gallery') {
    const optimizedUrl = getOptimizedImageUrl(src, getOptimizedOptions(context));
    return this.cache.has(optimizedUrl);
  }

  /**
   * Preload a single image
   */
  async preloadImage(src, context = 'gallery', priority = 'normal') {
    const optimizedUrl = getOptimizedImageUrl(src, getOptimizedOptions(context));
    
    // Return cached image if available
    if (this.cache.has(optimizedUrl)) {
      return this.cache.get(optimizedUrl);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(optimizedUrl)) {
      return this.loadingPromises.get(optimizedUrl);
    }

    // Create new loading promise
    const loadingPromise = new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(optimizedUrl, img);
        this.loadingPromises.delete(optimizedUrl);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(optimizedUrl);
        reject(new Error(`Failed to load image: ${optimizedUrl}`));
      };

      // Set priority for loading
      if (priority === 'high') {
        img.fetchPriority = 'high';
      } else if (priority === 'low') {
        img.fetchPriority = 'low';
      }

      img.src = optimizedUrl;
    });

    this.loadingPromises.set(optimizedUrl, loadingPromise);
    return loadingPromise;
  }

  /**
   * Preload multiple images in batches
   */
  async preloadImageBatch(imageItems, contexts = ['gallery', 'modal'], batchSize = 3) {
    const preloadPromises = [];
    
    for (let i = 0; i < imageItems.length; i += batchSize) {
      const batch = imageItems.slice(i, i + batchSize);
      
      const batchPromises = batch.flatMap(item => 
        contexts.map(async context => {
          try {
            await this.preloadImage(item.src, context, item.priority || 'normal');
            return { src: item.src, context, status: 'loaded' };
          } catch (error) {
            console.warn(`Failed to preload ${item.src} for ${context}:`, error);
            return { src: item.src, context, status: 'error' };
          }
        })
      );

      preloadPromises.push(...batchPromises);
      
      // Small delay between batches to avoid overwhelming the browser
      if (i + batchSize < imageItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return Promise.allSettled(preloadPromises);
  }

  /**
   * Preload images with priority based on current position
   */
  async preloadWithPriority(imageItems, currentIndex = 0) {
    // Prioritize images based on distance from current position
    const prioritizedItems = imageItems.map((item, index) => {
      const distance = Math.abs(index - currentIndex);
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
      return Math.abs(a.index - currentIndex) - Math.abs(b.index - currentIndex);
    });

    return this.preloadImageBatch(prioritizedItems, ['gallery', 'modal']);
  }

  /**
   * Get cached image URLs
   */
  getCachedUrls() {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear cache (optional, for memory management)
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cachedImages: this.cache.size,
      loadingImages: this.loadingPromises.size,
      totalMemoryUsage: this.cache.size * 0.1 // Rough estimate in MB
    };
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();

/**
 * Hook for React components to use the preloader
 */
export function useImagePreloader() {
  return imagePreloader;
} 