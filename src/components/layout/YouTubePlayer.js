'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function YouTubePlayer({ videoId, title }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="relative w-full max-w-4xl mx-auto h-0 pb-[56.25%]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
          title={title || 'YouTube Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}