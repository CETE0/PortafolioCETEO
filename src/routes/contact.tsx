import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'
import { pageTitle, SITE } from '@/data/site'
import ContactInfo from '@/components/contact/ContactInfo'
import ContactCV from '@/components/contact/ContactCV'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: pageTitle('Contact') },
      { name: 'description', content: `Contact information for ${SITE.name}, new media artist based in Santiago, Chile.` },
    ],
  }),
  component: ContactPage,
})

function ContactPage() {
  const { t } = useLanguage()
  const [cvOpen, setCvOpen] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#cv') setCvOpen(true)
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-white text-ink md:flex md:flex-col md:overflow-hidden">
      <h1 className="sr-only">{t('sidebar.contact')}</h1>
      <header className="flex items-baseline justify-between px-4 pt-5 md:h-[72px] md:flex-none md:items-center md:border-b md:border-ink md:px-8 md:pt-0">
        <span className="text-xs font-semibold tracking-[0.08em] text-red-600">{t('sidebar.contact')}</span>
        <span className="font-mono text-[11px] text-muted">{t('contact.location')}</span>
      </header>

      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="flex flex-col px-4 pt-4 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-x-12 md:gap-y-10 md:px-8 md:py-10">
          <div className="order-1 md:order-none md:col-start-1 md:row-start-1">
            <ContactInfo cvOpen={cvOpen} onToggleCv={() => setCvOpen((o) => !o)} />
          </div>

          <img
            src="/images/contact/gifcontacto.gif"
            alt=""
            width={800}
            height={1067}
            className="order-3 my-6 block aspect-[800/1067] w-full object-cover md:order-none md:col-start-2 md:row-start-1 md:my-0"
          />

          {cvOpen && (
            <div className="order-2 md:order-none md:col-span-2 md:row-start-2">
              <ContactCV />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
