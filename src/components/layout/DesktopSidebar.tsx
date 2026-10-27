import { Link, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/i18n/LanguageContext'
import Wordmark from './Wordmark'
import LangToggle from './LangToggle'
import NavList from './NavList'

export default function DesktopSidebar() {
  const { t } = useLanguage()
  const contactActive = useLocation({ select: (l) => l.pathname === '/contact' })

  return (
    <nav className="grid h-full w-64 grid-cols-[56px_minmax(0,1fr)] border-r border-rule bg-white font-sans text-ink">
      <div className="flex flex-col items-center justify-between bg-red-600 py-6">
        <Wordmark orientation="vertical" size={36} className="text-white" />
        <LangToggle size="sm" />
      </div>
      <div className="flex min-h-0 flex-col px-5 py-6">
        <div className="min-h-0 overflow-y-auto">
          <NavList variant="desktop" />
        </div>
        <Link
          to="/contact"
          aria-current={contactActive ? 'page' : undefined}
          className={`mt-auto pt-4 text-xs leading-4 font-semibold tracking-[0.08em] transition-colors hover:text-red-600 ${
            contactActive ? 'text-red-600' : 'text-muted'
          }`}
        >
          {t('sidebar.contact')}
        </Link>
      </div>
    </nav>
  )
}
