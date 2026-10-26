import { useLanguage } from '@/i18n/LanguageContext'
import type { Lang } from '@/i18n/dict'

const LANGS: Lang[] = ['en', 'es']

export default function LangToggle({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const { lang, setLang, t } = useLanguage()
  const lg = size === 'lg'
  return (
    <div
      role="group"
      aria-label={t('common.changeLanguage')}
      className={`flex flex-col items-center font-mono leading-4 text-white ${lg ? 'gap-0 text-xs' : 'gap-1 text-[11px]'}`}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`transition-opacity ${lg ? 'min-h-11 min-w-11' : ''} ${lang === l ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
