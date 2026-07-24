
import { UserProvider } from '@/context'
import './globals.css'
import { Inter } from 'next/font/google'
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Lava Velox',
  description: 'Sistema de administracion Lava Velox',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
  authors: [{ name: 'Lava Velox' }]
}

export const viewport = {
  themeColor: '#00E2FF',
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ServiceWorkerCleanup />
        <UserProvider>
          <main className='h-screen bg-white'>
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  )
}
