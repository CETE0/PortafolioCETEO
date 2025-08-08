import { DM_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/layout/Sidebar'
import MobileMenu from '../components/layout/MobileMenu'
import Link from 'next/link'
import { Press_Start_2P } from 'next/font/google';
import CustomCursor from '../components/layout/CustomCursor';
import { LanguageProvider } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans'
})

export const metadata = {
  title: 'CETEO',
  description: 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile. Currently working at the intersection of digital art and experimental sculptural installation.',
  keywords: ['new media art', 'digital art', 'experimental installation', 'Chilean artist', 'CETEO'],
  authors: [{ name: 'Mateo Cereceda' }],
  creator: 'CETEO',
  publisher: 'CETEO',
  robots: 'index, follow',
  openGraph: {
    title: 'CETEO',
    description: 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CETEO',
    description: 'Mateo Cereceda (CETEO) is a new media artist based in Santiago, Chile.',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${dmSans.variable} font-sans bg-white`}>
        <LanguageProvider>
        <CustomCursor />
        <div className="flex min-h-screen h-screen bg-white">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex w-64 h-full">
            <Sidebar />
          </div>

          {/* Mobile Header with centered hamburger */}
          <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white z-50 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 flex-nowrap min-w-0">
              <Link href="/" className="flex items-center min-w-0">
                <h1 className="text-xl font-bold text-red-600 whitespace-nowrap">CETEO</h1>
                <p className="text-sm text-gray-600 ml-2 whitespace-nowrap truncate max-w-[45vw]">new?-media artist</p>
              </Link>
              <LanguageSwitcher className="flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3">
              <MobileMenu />
            </div>
          </div>

          {/* Mobile Sidebar (restaurado) */}
          <div 
            id="mobile-sidebar"
            className="md:hidden fixed inset-y-0 right-0 w-full bg-white transform translate-x-full transition-transform duration-300 ease-in-out z-40 h-full flex flex-col justify-center"
          >
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 w-full bg-white min-h-screen h-full pt-16 md:pt-0">
            {children}
          </main>
        </div>
        </LanguageProvider>
      </body>
    </html>
  );
}