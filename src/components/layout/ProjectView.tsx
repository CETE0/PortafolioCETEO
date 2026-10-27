import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import OptimizedImage from './OptimizedImage'
import YouTubePlayer from './YouTubePlayer'
import SketchfabViewer from './SketchfabViewer'
import ImageViewer from './ImageViewer'
import Pager from './Pager'
import GameFrame from './GameFrame'
import { pad2, projectYear, stripYear } from './projectMeta'
import { useLanguage } from '@/i18n/LanguageContext'
import { projectTranslations } from '@/i18n/projects'
import { projectLabel } from '@/data/navigation'

const KickGame = lazy(() => import('../games/KickGame'))

type Item = { type: 'image' | 'youtube' | '3d' | 'game'; text?: string; [k: string]: any }
type Props = { content?: Item[]; title?: string; category: string; projectId: string }

export default function ProjectView({ content = [], title, category, projectId }: Props) {
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
    return <div className="flex h-full items-center justify-center text-ink">{t('project.noContent')}</div>
  }

  const name = title ?? projectLabel(projectId)
  const year = projectYear(items.map((i) => i.text))
  const caption = stripYear(current.text || items.find((i) => i.text)?.text || '')
  const counter = `${pad2(index + 1)} / ${pad2(items.length)}`
  const pager = {
    prevLabel: t('project.prev'),
    nextLabel: t('project.next'),
    hasPrev,
    hasNext,
    onPrev: () => go(-1),
    onNext: () => go(1),
  }

  const renderContent = () => {
    switch (current.type) {
      case 'image':
        return (
          <div className="flex h-full w-full items-center justify-center p-3 md:p-6">
            <OptimizedImage
              key={current.src}
              src={current.src}
              alt={current.alt}
              context="gallery"
              priority={index === 0}
              onClick={() => setViewerOpen(true)}
            />
          </div>
        )
      case 'youtube':
        return <YouTubePlayer videoId={current.id} title={current.title} />
      case '3d':
        return <SketchfabViewer modelId={current.modelId} title={current.title} />
      default:
        return null
    }
  }

  if (current.type === 'game') {
    return (
      <GameFrame title={name} hint={t('games.kick.hint')}>
        <ClientOnly fallback={<GameLoading />}>
          <Suspense fallback={<GameLoading />}>
            <KickGame />
          </Suspense>
        </ClientOnly>
      </GameFrame>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <header className="hidden h-[72px] flex-none items-center justify-between border-b border-ink px-8 md:flex">
        <h1 className="text-sm font-medium">{name}</h1>
        {year && <span className="font-mono text-[11px] text-muted">({year})</span>}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            className="absolute h-full w-full"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {caption && <p className="max-w-[70ch] px-4 py-3 text-[13px] text-pretty text-muted md:px-8">{caption}</p>}
      <div className="md:hidden">
        <Pager variant="minimal" label={name} meta={`${year ? `${year} · ` : ''}${index + 1}/${items.length}`} {...pager} />
      </div>
      <div className="hidden md:block">
        <Pager variant="ruled" counter={counter} {...pager} />
      </div>

      <AnimatePresence>
        {viewerOpen && current.type === 'image' && (
          <ImageViewer
            image={{ src: current.src, alt: current.alt }}
            counter={counter}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GameLoading() {
  const { t } = useLanguage()
  return <div className="absolute inset-0 flex items-center justify-center text-ink">{t('project.loadingGame')}</div>
}
