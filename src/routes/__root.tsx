/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import appCss from '../styles.css?url'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { detectLang } from '@/i18n/detect'
import DesktopSidebar from '@/components/layout/DesktopSidebar'
import MobileNav from '@/components/layout/MobileNav'
import CustomCursor from '@/components/layout/CustomCursor'
import { SITE } from '@/data/site'

export const Route = createRootRoute({
  // Resolved on the server so the first render is already in the visitor's language.
  beforeLoad: () => ({ lang: detectLang() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITE.name },
      { name: 'description', content: SITE.description },
      { name: 'keywords', content: SITE.keywords.join(', ') },
      { name: 'author', content: SITE.name },
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:title', content: SITE.name },
      { property: 'og:description', content: SITE.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'en_US' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE.name },
      { name: 'twitter:description', content: SITE.description },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Big+Shoulders+Display:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: ReactNode }) {
  const { lang } = Route.useRouteContext()
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body className="bg-white font-sans text-ink antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const { lang } = Route.useRouteContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  // The games listen for this to pause input while the mobile menu is open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mobileMenuState', { detail: { isOpen: menuOpen } }))
  }, [menuOpen])

  return (
    <LanguageProvider initialLang={lang}>
      <CustomCursor />
      <div className="flex h-screen min-h-screen bg-white">
        <div className="hidden h-full w-64 flex-none md:flex">
          <DesktopSidebar />
        </div>

        <MobileNav open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} onNavigate={closeMenu} />

        <main className="h-full min-h-screen min-w-0 flex-1 bg-white pt-12 md:pt-0">
          <Outlet />
        </main>
      </div>
    </LanguageProvider>
  )
}
