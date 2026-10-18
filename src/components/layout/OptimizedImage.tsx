import { useState, type CSSProperties } from 'react'
import { getOptimizedImageUrl, getOptimizedOptions, getResponsiveSizes, imageMap } from '@/lib/cloudinary'

type Props = {
  src: string
  alt?: string
  context?: 'gallery' | 'modal' | 'thumbnail' | 'hero'
  priority?: boolean
  onClick?: () => void
  className?: string
  style?: CSSProperties
}

const WIDTHS = [640, 1080, 1600, 1920]

/** Plain <img> replacement for next/image. Cloudinary-mapped images get a srcset; local ones load as-is. */
export default function OptimizedImage({ src, alt = '', context = 'gallery', priority = false, onClick, className = '', style }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const opts = getOptimizedOptions(context)
  const url = getOptimizedImageUrl(src, opts)
  const srcSet = imageMap[src]
    ? WIDTHS.filter((w) => w <= opts.width)
        .map((w) => `${getOptimizedImageUrl(src, { ...opts, width: w, height: Math.round((w * opts.height) / opts.width) })} ${w}w`)
        .join(', ')
    : undefined

  if (error) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">{alt}</div>
  }

  return (
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? getResponsiveSizes(context) : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      onClick={onClick}
      style={style}
      className={`block max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${
        onClick ? 'cursor-zoom-in' : ''
      } ${className}`}
    />
  )
}
