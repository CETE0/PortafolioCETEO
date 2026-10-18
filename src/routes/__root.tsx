/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import appCss from '../styles.css?url'
import { LanguageProvider } from '@/i18n/LanguageContext'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import CustomCursor from '@/components/layout/CustomCursor'
import { SITE } from '@/data/site'

export const Route = createRootRoute({
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
        href: 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..1000&family=JetBrains+Mono:wght@400;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-white font-sans text-black antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  // The games listen for this to pause input while the mobile menu is open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mobileMenuState', { detail: { isOpen: menuOpen } }))
  }, [menuOpen])

  return (
    <LanguageProvider>
      <CustomCursor />
      <div className="flex h-screen min-h-screen bg-white">
        <div className="hidden h-full w-64 md:flex">
          <Sidebar />
        </div>

        <MobileHeader open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} onNavigate={closeMenu} />

        <div
          id="mobile-sidebar"
          aria-hidden={!menuOpen}
          className={`fixed inset-y-0 right-0 z-[10001] flex h-full w-full flex-col justify-center bg-white transition-transform duration-300 ease-in-out md:hidden ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <Sidebar variant="mobile" onNavigate={closeMenu} />
        </div>

        <main className="h-full min-h-screen min-w-0 flex-1 bg-white pt-16 md:pt-0">
          <Outlet />
        </main>
      </div>
    </LanguageProvider>
  )
}
