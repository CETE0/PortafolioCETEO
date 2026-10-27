import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import Wordmark from './Wordmark'
import LangToggle from './LangToggle'
import NavList from './NavList'

type Props = { open: boolean; onToggle: () => void; onNavigate: () => void }

const MENU_ID = 'mobile-menu'
const RAIL_OPEN = 'width 0.32s cubic-bezier(.7,0,.2,1), height 0.38s cubic-bezier(.7,0,.2,1) 0.12s'
const RAIL_CLOSED = 'height 0.3s cubic-bezier(.7,0,.2,1), width 0.32s cubic-bezier(.7,0,.2,1) 0.16s'

export default function MobileNav({ open, onToggle, onNavigate }: Props) {
  const { t } = useLanguage()
  const contactActive = useLocation({ select: (l) => l.pathname === '/contact' })

  const menuLayer = {
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: `opacity 0.25s ease ${open ? '0.3s' : '0s'}`,
  } as const

  return (
    <div className="pointer-events-none fixed inset-0 z-[9000] font-sans text-ink md:hidden">
      <div id={MENU_ID} inert={!open} style={menuLayer} className="absolute inset-0 grid grid-cols-[64px_minmax(0,1fr)] bg-white">
        <div />
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="h-16 flex-none" />
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <NavList variant="mobile" onNavigate={onNavigate} />
          </div>
          <Link
            to="/contact"
            onClick={onNavigate}
            aria-current={contactActive ? 'page' : undefined}
            className={`flex h-16 flex-none items-center border-t border-rule px-6 text-[13px] font-semibold tracking-[0.08em] ${
              contactActive ? 'text-red-600' : 'text-muted'
            }`}
          >
            {t('sidebar.contact')}
          </Link>
        </div>
      </div>

      <div
        className="absolute top-0 left-0 bg-red-600"
        style={{ width: open ? 64 : '100%', height: open ? '100%' : 48, transition: open ? RAIL_OPEN : RAIL_CLOSED }}
      />

      <div
        inert={open}
        style={{ opacity: open ? 0 : 1, pointerEvents: open ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}
        className="absolute inset-x-0 top-0 flex h-12 items-center justify-between pl-4"
      >
        <Wordmark orientation="horizontal" size={24} className="text-white" onNavigate={onNavigate} />
        <MenuButton open={open} onToggle={onToggle} />
      </div>

      <div
        inert={!open}
        style={menuLayer}
        className="absolute top-0 bottom-0 left-0 flex w-16 flex-col items-center justify-between pt-6 pb-2"
      >
        <Wordmark orientation="vertical" size={40} className="text-white" onNavigate={onNavigate} />
        <LangToggle size="lg" />
      </div>

      <button
        type="button"
        inert={!open}
        onClick={onToggle}
        aria-label={t('menu.close')}
        aria-expanded={open}
        aria-controls={MENU_ID}
        style={menuLayer}
        className="absolute top-0 right-0 flex h-16 w-16 items-center justify-center text-ink"
      >
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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
      aria-label={t('menu.open')}
      aria-expanded={open}
      aria-controls={MENU_ID}
      className="flex h-12 w-12 items-center justify-center text-white"
    >
      <svg
        width="24"
        height="24"
        className={!open && wiggle ? 'animate-menu-attention' : ''}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
