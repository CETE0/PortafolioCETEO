import { DM_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/layout/Sidebar'
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
  title: 'Portafolio CETEO',
  description: 'Portafolio de artista',
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
      <body className={`${dmSans.variable} font-sans`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}