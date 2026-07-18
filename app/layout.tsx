import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { ChatWidget } from '@/components/shop/chat-widget'
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
        <ChatWidget />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
