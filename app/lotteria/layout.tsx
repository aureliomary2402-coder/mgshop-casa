import { GlobalHeader } from '@/components/shop/global-header'
import { Suspense } from 'react'

export default function LotteriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense><GlobalHeader /></Suspense>
      {children}
    </>
  )
}
