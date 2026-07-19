import { ShopHeader } from '@/components/shop/shop-header'
import { Suspense } from 'react'
export default function ProdottoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      <Suspense><ShopHeader/></Suspense>
      {children}
    </div>
  )
}
