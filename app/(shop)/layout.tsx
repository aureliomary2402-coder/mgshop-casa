import { ShopHeader } from '@/components/shop/shop-header'
import { Suspense } from 'react'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Suspense>
        <ShopHeader />
      </Suspense>
      <Suspense>{children}</Suspense>
    </div>
  )
}
