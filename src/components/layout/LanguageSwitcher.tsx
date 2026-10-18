import { useLanguage } from '@/i18n/LanguageContext'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage()
  return (
    <button
      type="button"
      aria-label={t('common.changeLanguage')}
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      className={`inline-flex appearance-none items-center justify-center border-0 bg-transparent p-0 text-xs leading-none text-gray-700 transition-colors select-none hover:text-red-600 focus:outline-none focus-visible:text-red-600 ${className}`}
    >
      {lang.toUpperCase()}
    </button>
  )
}
