import { GlobalHeader } from '@/components/shop/global-header'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Category } from '@/lib/types'

export default async function CarrelloLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient()
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#fff3e6 0%,#fffaf4 45%,#ffffff 100%)' }}>
      <Suspense><GlobalHeader categories={(categories || []) as Category[]} /></Suspense>
      {children}
    </div>
  )
}
