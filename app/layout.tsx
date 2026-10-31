import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { CartAbandonTracker } from '@/components/cart-abandon-tracker'
import { WishlistTracker } from '@/components/wishlist-tracker'
import { FloatingMenu } from '@/components/shop/floating-menu'
import { ProductDetailModal } from '@/components/shop/product-detail-modal'
import { BackToTop } from '@/components/shop/back-to-top'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { SiteTicker } from '@/components/shop/site-ticker'
import { SiteThemeProvider } from '@/components/site-theme-provider'
import { getActiveTheme } from '@/lib/site-theme-server'
import { THEME_COLORS } from '@/lib/site-theme'
import { HalloweenDecor } from '@/components/shop/halloween-decor'
import { SitePopup } from '@/components/shop/site-popup'
import { SiteFooter } from '@/components/shop/site-footer'
import { BottomNav } from '@/components/shop/bottom-nav'
import { FloatingCart } from '@/components/shop/floating-cart'
import { NotifyBanner } from '@/components/shop/notify-banner'
import { RouteProgress } from '@/components/shop/route-progress'
import { Suspense } from 'react'
import './globals.css'
import './typography.css'

// Un solo font per tutto il sito (come la landing): Inter, esposto anche come
// variabile CSS così lo ereditano pure notifiche, pannelli e portali.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

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

// Il colore della barra del browser segue il tema del sito
export async function generateViewport(): Promise<Viewport> {
  const theme = await getActiveTheme()
  return {
    themeColor: THEME_COLORS[theme],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tema scelto dal pannello admin (scheda "Tema del sito"): sta su <html data-theme>
  // e le variabili CSS in globals.css cambiano tutti i colori del sito.
  const theme = await getActiveTheme()
  return (
    <html lang="it" className={inter.variable} data-theme={theme} suppressHydrationWarning>
      <body className={inter.className}>
        <SiteThemeProvider initial={theme}>
        <Suspense><AnalyticsTracker /></Suspense>
        <CartAbandonTracker />
        <WishlistTracker />
        <ServiceWorkerRegister />
        <RouteProgress />
        {children}
        <SiteFooter />
        <BottomNav />
        <FloatingCart />
        <NotifyBanner />
        <FloatingMenu />
        <Suspense><BackToTop /></Suspense>
        <ProductDetailModal />
        <SiteTicker />
        <HalloweenDecor />
        <SitePopup />
        <Toaster position="bottom-center" richColors />
        <Analytics />
        </SiteThemeProvider>
      </body>
    </html>
  )
}
