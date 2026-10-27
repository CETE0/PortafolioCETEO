import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { SITE } from '@/data/site'
import { CV_ITEMS } from '@/data/cv'

const row = 'flex flex-col gap-1 border-t border-rule py-3.5 md:grid md:grid-cols-[96px_minmax(0,1fr)] md:gap-4 md:py-4'
const label = 'font-mono text-[11px] leading-4 tracking-[0.06em] text-muted uppercase md:leading-[22px]'
const value = 'text-[15px] leading-[22px] text-pretty'
const link = 'transition-colors hover:text-red-600 focus-visible:text-red-600 focus-visible:outline-none'

type Props = { cvOpen: boolean; onToggleCv: () => void }

export default function ContactInfo({ cvOpen, onToggleCv }: Props) {
  const { t } = useLanguage()
  const rows: Array<[string, ReactNode]> = [
    ['contact.about', <p className={value}>{t('contact.aboutText')}</p>],
    [
      'contact.contact',
      <a href={`mailto:${SITE.email}`} className={`${value} ${link}`}>
        {SITE.email}
      </a>,
    ],
    [
      'contact.social',
      <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className={`${value} ${link}`}>
        Instagram — {SITE.instagram.handle}
      </a>,
    ],
  ]

  return (
    <dl className="flex flex-col">
      {rows.map(([key, content]) => (
        <div key={key} className={row}>
          <dt className={label}>{t(key)}</dt>
          <dd>{content}</dd>
        </div>
      ))}
      <div className="flex min-h-12 items-center justify-between border-t border-b border-t-rule border-b-ink md:grid md:min-h-0 md:grid-cols-[96px_minmax(0,1fr)] md:gap-4 md:py-4">
        <dt className={label}>{t('contact.cv')}</dt>
        <dd className="md:justify-self-start">
          <button
            type="button"
            id="contact-cv-toggle"
            aria-expanded={cvOpen}
            aria-controls="cv"
            onClick={onToggleCv}
            className={`min-h-11 text-[15px] leading-[22px] md:min-h-0 ${link} ${cvOpen ? 'text-red-600' : 'text-ink'}`}
          >
            {cvOpen ? t('contact.cvHide') : t('contact.cvShow', { count: CV_ITEMS.length })}
          </button>
        </dd>
      </div>
    </dl>
  )
}
