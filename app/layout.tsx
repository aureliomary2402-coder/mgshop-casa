import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { FloatingMenu } from '@/components/shop/floating-menu'
import { Suspense } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MGShop Casa',
  description: 'Il tuo negozio di articoli per la casa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Suspense><AnalyticsTracker /></Suspense>
        {children}
        <FloatingMenu />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
