import { Link } from '@tanstack/react-router'
import LanguageSwitcher from './LanguageSwitcher'
import { SITE } from '@/data/site'

/** DM Sans Black, all caps, tracked. Language toggle sits beside it. */
export default function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/"
        onClick={onNavigate}
        className="text-base leading-7 font-black tracking-[0.05em] whitespace-nowrap text-red-600 uppercase [font-variation-settings:'opsz'_40]"
      >
        {SITE.name}
      </Link>
      <LanguageSwitcher className="shrink-0" />
    </div>
  )
}
