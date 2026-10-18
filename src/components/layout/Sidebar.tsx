import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { CATEGORIES, EXTERNAL_PROJECTS, projectLabel } from '@/data/navigation'
import Wordmark from './Wordmark'

type Props = { variant?: 'desktop' | 'mobile'; onNavigate?: () => void }

export default function Sidebar({ variant = 'desktop', onNavigate }: Props) {
  const { t } = useLanguage()
  const pathname = useLocation({ select: (l) => l.pathname })
  const mobile = variant === 'mobile'

  const routeCategory = pathname.split('/')[1]
  const [active, setActive] = useState(() =>
    CATEGORIES.some((c) => c.key === routeCategory) ? routeCategory : 'artworks',
  )
  const [warn, setWarn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const pick = (key: string) => {
    if (key === 'experimental' && active !== 'experimental') {
      setWarn(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setWarn(false), 3000)
    }
    setActive(key)
  }

  const contactActive = pathname === '/contact'

  return (
    <nav
      className={
        mobile
          ? 'flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-white px-8 pt-24 pb-6 text-center'
          : 'relative flex h-screen w-full flex-col overflow-y-auto bg-white p-6'
      }
    >
      {!mobile && (
        <div className="mb-8">
          <Wordmark />
        </div>
      )}

      <div className={`flex w-full flex-col ${mobile ? 'items-center gap-8' : 'items-start gap-4'}`}>
        {CATEGORIES.map((cat) => {
          const open = cat.key === active
          return (
            <div key={cat.key} className={`relative flex flex-col gap-2 ${mobile ? 'items-center' : ''}`}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => pick(cat.key)}
                className={`text-sm font-medium transition-colors focus:outline-none focus-visible:text-red-500 ${
                  open ? 'text-red-500' : 'text-gray-900 hover:text-red-500'
                }`}
              >
                {t(`sidebar.${cat.labelKey}`)}
              </button>

              {cat.key === 'experimental' && warn && (
                <div
                  role="status"
                  className="absolute top-0 left-0 z-50 mt-6 w-[200px] border border-gray-300 bg-white px-3 py-2 text-left text-xs text-gray-700 shadow-sm md:left-full md:mt-0 md:ml-2"
                >
                  {t('experimental.warning')}
                </div>
              )}

              {open && (
                <ul className={`flex flex-col gap-1 ${mobile ? 'items-center' : ''}`}>
                  {cat.projects.map((p) => {
                    const external = EXTERNAL_PROJECTS[p]
                    const current = pathname === `/${cat.key}/${p}`
                    const cls = `text-sm transition-colors focus:outline-none focus-visible:text-gray-900 ${
                      current ? 'text-red-500' : 'text-gray-600 hover:text-gray-900'
                    }`
                    return (
                      <li key={p}>
                        {external ? (
                          <a href={external} target="_blank" rel="noopener noreferrer" className={cls} onClick={onNavigate}>
                            {projectLabel(p)}
                          </a>
                        ) : (
                          <Link
                            to="/$category/$project"
                            params={{ category: cat.key, project: p }}
                            className={cls}
                            aria-current={current ? 'page' : undefined}
                            onClick={onNavigate}
                          >
                            {projectLabel(p)}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <Link
        to="/contact"
        onClick={onNavigate}
        aria-current={contactActive ? 'page' : undefined}
        className={`text-sm transition-colors ${contactActive ? 'text-red-500' : 'text-gray-600 hover:text-gray-900'} ${
          mobile ? 'mt-8' : 'absolute bottom-6 left-8'
        }`}
      >
        {t('sidebar.contact')}
      </Link>
    </nav>
  )
}
