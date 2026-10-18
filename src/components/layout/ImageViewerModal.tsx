import { motion } from 'framer-motion'
import OptimizedImage from './OptimizedImage'
import { useLanguage } from '@/i18n/LanguageContext'

type Props = {
  image: { src: string; alt?: string } | null
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  currentIndex: number
  totalItems: number
}

const Chevron = ({ d, className = 'h-8 w-8' }: { d: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)
const LEFT = 'M15 19l-7-7 7-7'
const RIGHT = 'M9 5l7 7-7 7'

export default function ImageViewerModal({ image, onClose, onPrev, onNext, hasPrev, hasNext, currentIndex, totalItems }: Props) {
  const { t } = useLanguage()
  if (!image) return null
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button type="button" aria-label={t('modal.close')} onClick={onClose} className="absolute top-4 right-4 z-10 p-2 text-white transition-colors hover:text-red-500">
        <Chevron d="M6 18L18 6M6 6l12 12" className="h-6 w-6" />
      </button>

      {hasPrev && (
        <button type="button" aria-label={t('modal.prev')} onClick={stop(onPrev)} className="absolute left-4 z-10 hidden p-2 text-white transition-colors hover:text-red-500 md:block">
          <Chevron d={LEFT} />
        </button>
      )}
      {hasNext && (
        <button type="button" aria-label={t('modal.next')} onClick={stop(onNext)} className="absolute right-4 z-10 hidden p-2 text-white transition-colors hover:text-red-500 md:block">
          <Chevron d={RIGHT} />
        </button>
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative mx-auto flex h-full max-h-[85vh] w-full max-w-[95vw] items-center justify-center p-4 pb-20 md:max-h-[90vh] md:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <OptimizedImage key={image.src} src={image.src} alt={image.alt} context="modal" priority />
      </motion.div>

      <div className="absolute right-0 bottom-0 left-0 z-10 bg-white px-6 py-4 md:hidden">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={t('modal.prev')} disabled={!hasPrev} onClick={stop(onPrev)} className={`p-2 text-black transition-colors ${hasPrev ? 'hover:text-red-500' : 'opacity-30'}`}>
            <Chevron d={LEFT} />
          </button>
          <span className="text-sm text-black/60">{currentIndex} / {totalItems}</span>
          <button type="button" aria-label={t('modal.next')} disabled={!hasNext} onClick={stop(onNext)} className={`p-2 text-black transition-colors ${hasNext ? 'hover:text-red-500' : 'opacity-30'}`}>
            <Chevron d={RIGHT} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 text-sm text-white/70 md:block">
        {currentIndex} / {totalItems}
      </div>
    </motion.div>
  )
}
