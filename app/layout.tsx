import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { CartAbandonTracker } from '@/components/cart-abandon-tracker'
import { FloatingMenu } from '@/components/shop/floating-menu'
import { ProductDetailModal } from '@/components/shop/product-detail-modal'
import { BackToTop } from '@/components/shop/back-to-top'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { SiteTicker } from '@/components/shop/site-ticker'
import { SiteFooter } from '@/components/shop/site-footer'
import { BottomNav } from '@/components/shop/bottom-nav'
import { GlobalHeader } from '@/components/shop/global-header'
import { Suspense } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MGShop Casa',
  description: 'Il tuo negozio di articoli per la casa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MGShop Casa',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0891b2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <GlobalHeader />
        <Suspense><AnalyticsTracker /></Suspense>
        <CartAbandonTracker />
        <ServiceWorkerRegister />
        {children}
        <SiteFooter />
        <BottomNav />
        <FloatingMenu />
        <Suspense><BackToTop /></Suspense>
        <ProductDetailModal />
        <SiteTicker />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}
