import { motion } from 'framer-motion'
import OptimizedImage from './OptimizedImage'
import Pager from './Pager'
import { useLanguage } from '@/i18n/LanguageContext'

type Props = {
  image: { src: string; alt?: string }
  counter: string
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

export default function ImageViewer({ image, counter, hasPrev, hasNext, onPrev, onNext, onClose }: Props) {
  const { t } = useLanguage()
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9500] flex flex-col bg-white"
    >
      <div className="flex h-12 flex-none items-center justify-end">
        <button
          type="button"
          autoFocus
          aria-label={t('modal.close')}
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center text-ink transition-colors hover:text-red-600"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div onClick={onClose} className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center">
        <OptimizedImage key={image.src} src={image.src} alt={image.alt} context="modal" priority />
      </div>
      <Pager
        variant="minimal"
        label=""
        meta={counter}
        prevLabel={t('modal.prev')}
        nextLabel={t('modal.next')}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={onPrev}
        onNext={onNext}
      />
    </motion.div>
  )
}
