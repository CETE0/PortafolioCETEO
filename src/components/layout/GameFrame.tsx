import { createContext, useContext, useState, type ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'

/** `label` and `value` go through `t()`, so games can publish dict keys; anything else (scores) renders as-is. */
export type HudCell = { label: string; value?: string; tone?: 'ink' | 'red' }
export type SetHud = (cells: HudCell[]) => void

const HudContext = createContext<SetHud>(() => {})

export const useGameHud = () => useContext(HudContext)

const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3']

type Props = { title: string; hint: string; children: ReactNode }

export default function GameFrame({ title, hint, children }: Props) {
  const { t } = useLanguage()
  const [cells, setHud] = useState<HudCell[]>([])
  const shown = cells.slice(0, 3)
  const tone = (c: HudCell) => (c.tone === 'red' ? 'text-red-600' : 'text-ink')

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <header className="hidden h-[72px] flex-none items-center justify-between gap-6 border-b border-ink px-8 md:flex">
        <h1 className="truncate text-sm font-medium">{title}</h1>
        <span className="truncate font-mono text-[11px] text-muted">{hint}</span>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <HudContext.Provider value={setHud}>{children}</HudContext.Provider>
      </div>

      <div aria-live="polite" className={`hidden h-12 flex-none border-t border-ink font-mono text-[11px] md:grid ${COLS[shown.length]}`}>
        {shown.map((c) => (
          <div key={c.label} className="flex min-w-0 items-center justify-center gap-2 border-l border-rule first:border-l-0">
            <span className="text-muted">{t(c.label)}</span>
            {c.value && <span className={`truncate ${tone(c)}`}>{t(c.value)}</span>}
          </div>
        ))}
      </div>

      <div className="flex h-12 flex-none items-center px-4 md:hidden">
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
          <span className="shrink-0 text-[13px] font-medium">{title}</span>
          <span className="truncate font-mono text-[11px] text-muted">
            {shown.map((c, i) => (
              <span key={c.label}>
                {i > 0 && ' · '}
                <span className={c.tone === 'red' ? 'text-red-600' : ''}>{t(c.value ?? c.label)}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
