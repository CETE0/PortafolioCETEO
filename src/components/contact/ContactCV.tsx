import { useLanguage } from '@/i18n/LanguageContext'
import { CV_ITEMS } from '@/data/cv'

export default function ContactCV() {
  const { t, lang } = useLanguage()
  return (
    <ol id="cv" role="region" aria-labelledby="contact-cv-toggle" className="flex flex-col">
      {CV_ITEMS.map((item, i) => (
        <li
          key={`${item.period}-${i}`}
          className="flex flex-col gap-0.5 border-b border-rule py-3 text-sm leading-5 md:grid md:grid-cols-[120px_minmax(0,1.4fr)_minmax(0,1fr)] md:gap-6 md:border-t md:border-b-0"
        >
          <span className="font-mono text-[11px] leading-5">{item.period.replace('{present}', t('contact.present'))}</span>
          <span>{item.title[lang]}</span>
          <span className="text-muted">{item.institution[lang]}</span>
        </li>
      ))}
    </ol>
  )
}
