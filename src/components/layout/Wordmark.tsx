import { Link } from '@tanstack/react-router'
import { SITE } from '@/data/site'

type Props = {
  orientation?: 'horizontal' | 'vertical'
  size?: number
  className?: string
  onNavigate?: () => void
}

export default function Wordmark({ orientation = 'horizontal', size = 24, className = 'text-red-600', onNavigate }: Props) {
  const vertical = orientation === 'vertical'
  return (
    <Link
      to="/"
      onClick={onNavigate}
      style={{ fontSize: size }}
      className={`block font-display leading-none font-black tracking-[0.03em] whitespace-nowrap uppercase ${
        vertical ? 'rotate-180 [writing-mode:vertical-rl]' : ''
      } ${className}`}
    >
      {SITE.name}
    </Link>
  )
}
