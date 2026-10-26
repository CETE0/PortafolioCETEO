import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { CATEGORIES, EXTERNAL_PROJECTS, projectLabel } from '@/data/navigation'

type Variant = 'desktop' | 'mobile'

const STYLES: Record<Variant, { list: string; group: string; category: string; projects: string; project: string }> = {
  desktop: {
    list: 'gap-3.5',
    group: 'gap-2.5',
    category: 'min-h-4 text-xs',
    projects: 'gap-[3px]',
    project: 'min-h-5 text-sm',
  },
  mobile: {
    list: 'gap-0',
    group: 'gap-0',
    category: 'min-h-11 text-[13px]',
    projects: 'gap-0 pb-2',
    project: 'min-h-[34px] text-base',
  },
}

type Props = { variant: Variant; onNavigate?: () => void }

export default function NavList({ variant, onNavigate }: Props) {
  const { t } = useLanguage()
  const pathname = useLocation({ select: (l) => l.pathname })
  const s = STYLES[variant]

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

  return (
    <ul className={`flex flex-col font-sans ${s.list}`}>
      {CATEGORIES.map((cat) => {
        const open = cat.key === active
        return (
          <li key={cat.key} className={`flex flex-col ${s.group}`}>
            <div className="relative flex">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => pick(cat.key)}
                className={`flex items-center text-left leading-4 font-semibold tracking-[0.08em] transition-colors hover:text-red-600 focus-visible:text-red-600 focus-visible:outline-none ${s.category} ${
                  open ? 'text-red-600' : 'text-ink'
                }`}
              >
                {t(`sidebar.${cat.labelKey}`)}
              </button>
              {cat.key === 'experimental' && warn && (
                <div
                  role="status"
                  className="absolute inset-x-0 top-full z-50 mt-1 max-w-[200px] border border-rule bg-white px-3 py-2 text-xs text-muted shadow-sm"
                >
                  {t('experimental.warning')}
                </div>
              )}
            </div>

            {open && (
              <ul className={`flex flex-col ${s.projects}`}>
                {cat.projects.map((p) => {
                  const external = EXTERNAL_PROJECTS[p]
                  const current = pathname === `/${cat.key}/${p}`
                  const cls = `flex items-center text-left leading-[1.3] text-pretty transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none ${s.project} ${
                    current ? 'font-medium text-ink' : 'text-muted'
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
          </li>
        )
      })}
    </ul>
  )
}
