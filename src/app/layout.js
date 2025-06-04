import { DM_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/layout/Sidebar'
import MobileMenu from '../components/layout/MobileMenu'
import { Press_Start_2P } from 'next/font/google';

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
  description: 'Artist Portfolio',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${dmSans.variable} font-sans bg-white`}>
        <div className="flex min-h-screen h-screen bg-white">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex w-64 h-full">
            <Sidebar />
          </div>

          {/* Mobile Header with centered hamburger */}
          <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white z-50 flex items-center justify-center">
            <MobileMenu />
          </div>

          {/* Mobile Sidebar */}
          <div 
            id="mobile-sidebar"
            className="md:hidden fixed inset-y-0 left-0 w-64 bg-white transform -translate-x-full transition-transform duration-300 ease-in-out z-40 h-full flex flex-col justify-center"
          >
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 w-full bg-white min-h-screen h-full pt-16 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}