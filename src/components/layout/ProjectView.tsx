import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import OptimizedImage from './OptimizedImage'
import YouTubePlayer from './YouTubePlayer'
import SketchfabViewer from './SketchfabViewer'
import ImageViewerModal from './ImageViewerModal'
import { useLanguage } from '@/i18n/LanguageContext'
import { projectTranslations } from '@/i18n/projects'

const KickGame = lazy(() => import('../games/KickGame'))

type Item = { type: 'image' | 'youtube' | '3d' | 'game'; [k: string]: any }
type Props = { content?: Item[]; title?: string; category: string; projectId: string }

export default function ProjectView({ content = [], category, projectId }: Props) {
  const { t, lang } = useLanguage()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)

  const items = useMemo<Item[]>(() => {
    const tr = (projectTranslations as any)?.[category]?.[projectId]
    if (!tr) return content
    return content.map((item, i) => {
      const it = tr.items?.[i] ?? {}
      const out = { ...item }
      if (it.text?.[lang]) out.text = it.text[lang]
      if (it.alt?.[lang]) out.alt = it.alt[lang]
      if ((item.type === 'youtube' || item.type === '3d') && it.title?.[lang]) out.title = it.title[lang]
      if (item.type === '3d' && it.description?.[lang]) out.description = it.description[lang]
      return out
    })
  }, [content, category, projectId, lang])

  const current = items[index]
  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  const go = useCallback(
    (d: 1 | -1) => {
      const next = index + d
      if (next < 0 || next >= items.length) return
      setDirection(d)
      setIndex(next)
      if (items[next].type !== 'image') setViewerOpen(false)
    },
    [index, items],
  )

  useEffect(() => {
    if (!current || current.type === 'game') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') setViewerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, go])

  if (!current) {
    return <div className="flex h-full items-center justify-center text-black">{t('project.noContent')}</div>
  }

  const caption = current.text || items.find((i) => i.text)?.text || ''

  const renderContent = () => {
    switch (current.type) {
      case 'image':
        return (
          <div className="flex h-full w-full items-center justify-center bg-white p-4">
            <OptimizedImage
              key={current.src}
              src={current.src}
              alt={current.alt}
              context="gallery"
              priority={index === 0}
              onClick={() => setViewerOpen(true)}
              className="max-h-[calc(100vh-200px)]"
            />
          </div>
        )
      case 'youtube':
        return <YouTubePlayer videoId={current.id} title={current.title} />
      case '3d':
        return <SketchfabViewer modelId={current.modelId} title={current.title} />
      case 'game':
        return (
          <ClientOnly fallback={<GameLoading />}>
            <Suspense fallback={<GameLoading />}>
              <KickGame />
            </Suspense>
          </ClientOnly>
        )
      default:
        return null
    }
  }

  const hidden = { visibility: viewerOpen ? 'hidden' : 'visible' } as const

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            className="absolute h-full w-full"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
            style={hidden}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {current.type !== 'game' && (
        <div className="bg-white" style={hidden}>
          <div className="flex items-center justify-between px-4 py-4 md:px-8">
            <button type="button" onClick={() => go(-1)} disabled={!hasPrev} className="text-sm text-black transition-colors hover:text-red-500 disabled:opacity-50 disabled:hover:text-black">
              {t('project.prev')}
            </button>
            <span className="text-sm text-black" aria-live="polite">
              {index + 1} / {items.length}
            </span>
            <button type="button" onClick={() => go(1)} disabled={!hasNext} className="text-sm text-black transition-colors hover:text-red-500 disabled:opacity-50 disabled:hover:text-black">
              {t('project.next')}
            </button>
          </div>
          <div className="px-4 py-4 md:px-8">
            <p className="text-sm font-light text-black">{caption}</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewerOpen && current.type === 'image' && (
          <ImageViewerModal
            image={current as any}
            onClose={() => setViewerOpen(false)}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentIndex={index + 1}
            totalItems={items.length}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GameLoading() {
  const { t } = useLanguage()
  return <div className="flex h-full w-full items-center justify-center text-black">{t('project.loadingGame')}</div>
}
