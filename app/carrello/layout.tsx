import { ShopHeader } from '@/components/shop/shop-header'
import { Suspense } from 'react'
export default function CarrelloLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      <Suspense><ShopHeader/></Suspense>
      {children}
    </div>
  )
}
