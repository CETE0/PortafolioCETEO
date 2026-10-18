import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import Wordmark from './Wordmark'

type Props = { open: boolean; onToggle: () => void; onNavigate: () => void }

export default function MobileHeader({ open, onToggle, onNavigate }: Props) {
  return (
    <div className="fixed top-0 left-0 z-[10002] flex h-16 w-full items-center justify-between gap-4 bg-white pl-4 md:hidden">
      <Wordmark onNavigate={onNavigate} />
      <MenuButton open={open} onToggle={onToggle} />
    </div>
  )
}

/** Hamburger that wiggles every 4–10s until the visitor first opens it. */
function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useLanguage()
  const [wiggle, setWiggle] = useState(false)
  const interacted = useRef(false)

  useEffect(() => {
    let next: number
    const pulse = () => {
      if (!interacted.current) {
        setWiggle(true)
        window.setTimeout(() => setWiggle(false), 600)
      }
    }
    const schedule = () => {
      next = window.setTimeout(() => {
        if (!open) pulse()
        schedule()
      }, 4000 + Math.random() * 6000)
    }
    const first = window.setTimeout(() => {
      pulse()
      schedule()
    }, 3000)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(next)
    }
  }, [open])

  return (
    <button
      type="button"
      onClick={() => {
        interacted.current = true
        onToggle()
      }}
      aria-label={open ? t('menu.close') : t('menu.open')}
      aria-expanded={open}
      aria-controls="mobile-sidebar"
      className="flex h-16 w-16 items-center justify-center text-black transition-colors hover:text-red-500"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-8 w-8 ${!open && wiggle ? 'animate-menu-attention' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        {open ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  )
}
