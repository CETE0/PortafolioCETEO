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
    <div className="min-h-full bg-white">
      <h1 className="sr-only">{t('sidebar.contact')}</h1>
      <div className="mx-auto grid max-w-[896px] grid-cols-1 items-center gap-x-16 gap-y-10 px-4 py-10 md:grid-cols-2 md:gap-y-14 md:px-12 md:pt-24 md:pb-16">
        <div className="order-1 md:col-start-1 md:row-start-1">
          <ContactInfo cvOpen={cvOpen} onToggleCv={() => setCvOpen((o) => !o)} />
        </div>

        <img
          src="/images/contact/gifcontacto.gif"
          alt=""
          width={800}
          height={1067}
          className="order-3 block aspect-[800/1067] w-full object-cover md:order-none md:col-start-2 md:row-start-1"
        />

        {cvOpen && (
          <div className="order-2 md:order-none md:col-span-2 md:row-start-2">
            <ContactCV />
          </div>
        )}
      </div>
    </div>
  )
}
