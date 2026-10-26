type Common = {
  prevLabel: string
  nextLabel: string
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

type Props =
  | (Common & { variant: 'ruled'; counter: string })
  | (Common & { variant: 'minimal'; label: string; meta: string })

const arrow = 'text-ink transition-colors hover:text-red-600 disabled:text-[#c4c4c4] disabled:hover:text-[#c4c4c4]'

export default function Pager(props: Props) {
  const { prevLabel, nextLabel, hasPrev, hasNext, onPrev, onNext } = props

  if (props.variant === 'ruled') {
    const side = `text-xs font-semibold tracking-[0.08em] ${arrow}`
    return (
      <div className="grid h-12 grid-cols-[140px_minmax(0,1fr)_140px] border-t border-ink bg-white font-sans">
        <button type="button" onClick={onPrev} disabled={!hasPrev} className={`border-r border-rule ${side}`}>
          ← {prevLabel}
        </button>
        <div aria-live="polite" className="flex items-center justify-center font-mono text-[11px] text-muted">
          {props.counter}
        </div>
        <button type="button" onClick={onNext} disabled={!hasNext} className={`border-l border-rule ${side}`}>
          {nextLabel} →
        </button>
      </div>
    )
  }

  return (
    <div className="grid h-12 grid-cols-[48px_minmax(0,1fr)_48px] items-center bg-white font-sans text-ink">
      <button type="button" aria-label={prevLabel} onClick={onPrev} disabled={!hasPrev} className={`h-12 text-base ${arrow}`}>
        ←
      </button>
      <div aria-live="polite" className="flex min-w-0 items-baseline justify-center gap-2">
        {props.label && <span className="truncate text-[13px] font-medium">{props.label}</span>}
        <span className="font-mono text-[11px] whitespace-nowrap text-muted">{props.meta}</span>
      </div>
      <button type="button" aria-label={nextLabel} onClick={onNext} disabled={!hasNext} className={`h-12 text-base ${arrow}`}>
        →
      </button>
    </div>
  )
}
