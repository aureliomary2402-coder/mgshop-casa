import { ShopHeader } from '@/components/shop/shop-header'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Category } from '@/lib/types'

export default async function ProdottoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#EDF5FD 0%,#F7FBFF 45%,#ffffff 100%)' }}>
      <Suspense><ShopHeader categories={(categories || []) as Category[]} /></Suspense>
      {children}
    </div>
  )
}
