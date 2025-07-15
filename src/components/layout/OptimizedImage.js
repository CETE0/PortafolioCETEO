import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getOptimizedImageUrl, getOptimizedOptions, getResponsiveSizes } from '../../lib/cloudinary';

/**
 * Componente de imagen optimizado que preserva el aspecto ratio
 */
export default function OptimizedImage({
  src,
  alt = '',
  context = 'gallery',
  containerStyle = {},
  imageStyle = {},
  onClick,
  priority = false,
  customOptions = {},
  fillContainer = false,
  maxWidth,
  maxHeight,
  className = '',
  isPreloaded = false,
  ...props
}) {
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(!isPreloaded);

  // Obtener opciones optimizadas para el contexto
  const optimizedOptions = getOptimizedOptions(context, customOptions);
  
  // Aplicar restricciones de tamaño si se especifican
  if (maxWidth) optimizedOptions.width = Math.min(optimizedOptions.width, maxWidth);
  if (maxHeight) optimizedOptions.height = Math.min(optimizedOptions.height, maxHeight);

  // Generar URL optimizada
  const optimizedSrc = getOptimizedImageUrl(src, optimizedOptions);
  
  // Obtener sizes responsivos
  const responsiveSizes = getResponsiveSizes(context);

  // Detectar dimensiones de la imagen
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = optimizedSrc;
  }, [optimizedSrc]);

  // Handle preloaded state
  useEffect(() => {
    if (isPreloaded) {
      setIsLoading(false);
      setImageError(false);
    }
  }, [isPreloaded]);

  // Calcular aspecto ratio
  const aspectRatio = imageDimensions.width && imageDimensions.height 
    ? imageDimensions.width / imageDimensions.height 
    : 1;

  // Estilos del contenedor basados en el contexto
  const getContainerStyles = () => {
    const baseStyles = {
      position: 'relative',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: context === 'modal' ? 'transparent' : 'white',
      ...containerStyle
    };

    if (fillContainer) {
      return {
        ...baseStyles,
        height: '100%'
      };
    }

    // Para contextos específicos, ajustar el contenedor
    switch (context) {
      case 'modal':
        return {
          ...baseStyles,
          maxWidth: '95vw',
          maxHeight: '90vh',
          margin: '0 auto'
        };
      case 'gallery':
        return {
          ...baseStyles,
          maxWidth: '100%',
          aspectRatio: aspectRatio > 0 ? aspectRatio : 'auto'
        };
      case 'thumbnail':
        return {
          ...baseStyles,
          aspectRatio: '1',
          overflow: 'hidden'
        };
      case 'hero':
        return {
          ...baseStyles,
          width: '100%',
          minHeight: '60vh',
          maxHeight: '80vh'
        };
      default:
        return baseStyles;
    }
  };

  // Estilos de la imagen
  const getImageStyles = () => {
    const baseStyles = {
      transition: isLoading ? 'none' : 'opacity 0.3s ease-in-out',
      ...imageStyle
    };

    if (fillContainer) {
      return {
        ...baseStyles,
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      };
    }

    return {
      ...baseStyles,
      width: 'auto',
      height: 'auto',
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain'
    };
  };

  // Manejar carga de imagen
  const handleLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  // Manejar error de imagen
  const handleError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  // Blur placeholder minimalista
  const blurDataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LS0yMi4qLjgyPj4+Oj5CQkJCQkJCQkJCQkJCQkJCQkJCQkL/2wBDAR4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

  if (imageError) {
    return (
      <div 
        style={getContainerStyles()}
        className={`flex items-center justify-center ${className}`}
      >
        <div className="text-center text-gray-500">
          <p className="text-sm">Error al cargar imagen</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={getContainerStyles()}
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Loading indicator for non-preloaded images */}
      {isLoading && !isPreloaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <Image
        src={optimizedSrc}
        alt={alt}
        width={optimizedOptions.width}
        height={optimizedOptions.height}
        style={getImageStyles()}
        priority={priority || isPreloaded}
        quality={optimizedOptions.quality}
        sizes={responsiveSizes}
        placeholder="blur"
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
} 