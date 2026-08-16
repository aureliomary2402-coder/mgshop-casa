import { Suspense } from 'react'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <Suspense>{children}</Suspense>
    </div>
  )
}
