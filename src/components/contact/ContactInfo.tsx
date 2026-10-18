import { useLanguage } from '@/i18n/LanguageContext'
import { SITE } from '@/data/site'
import { CV_ITEMS } from '@/data/cv'

const label = 'font-mono text-[11px] leading-[22px] tracking-[0.06em] text-gray-600 uppercase'
const link = 'transition-colors hover:text-red-500 focus-visible:text-red-500 focus:outline-none'

type Props = { cvOpen: boolean; onToggleCv: () => void }

export default function ContactInfo({ cvOpen, onToggleCv }: Props) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <h2 className="text-xl font-light text-black">{SITE.name}</h2>
      <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-5 text-sm leading-[22px] font-light text-black md:grid-cols-[88px_minmax(0,1fr)] md:gap-x-4 md:gap-y-6">
        <dt className={label}>{t('contact.about')}</dt>
        <dd className="text-pretty">{t('contact.aboutText')}</dd>

        <dt className={label}>{t('contact.contact')}</dt>
        <dd>
          <a href={`mailto:${SITE.email}`} className={link}>{SITE.email}</a>
        </dd>

        <dt className={label}>{t('contact.social')}</dt>
        <dd>
          <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className={link}>
            <span className="hidden md:inline">Instagram — </span>
            {SITE.instagram.handle}
          </a>
        </dd>

        <dt className={label}>{t('contact.cv')}</dt>
        <dd>
          <button
            type="button"
            id="contact-cv-toggle"
            aria-expanded={cvOpen}
            aria-controls="cv"
            onClick={onToggleCv}
            className={`flex min-h-11 items-start gap-2 font-light md:min-h-0 ${link} ${cvOpen ? 'text-red-500' : 'text-black'}`}
          >
            <span>{cvOpen ? t('contact.cvHide') : t('contact.cvShow', { count: CV_ITEMS.length })}</span>
            <span aria-hidden="true">{cvOpen ? '↑' : '↓'}</span>
          </button>
        </dd>
      </dl>
    </div>
  )
}
