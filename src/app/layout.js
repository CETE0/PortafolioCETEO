import { DM_Sans } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/layout/Sidebar'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans'
})

export const metadata = {
  title: 'Portafolio CETEO',
  description: 'Portafolio de artista',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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