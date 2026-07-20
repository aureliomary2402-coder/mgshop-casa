import { ShopHeader } from '@/components/shop/shop-header'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Category } from '@/lib/types'

export default async function ProdottoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      <Suspense><ShopHeader categories={(categories || []) as Category[]} /></Suspense>
      {children}
    </div>
  )
}
