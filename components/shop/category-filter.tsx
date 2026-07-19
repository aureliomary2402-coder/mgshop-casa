"use client"

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Category } from '@/lib/types'

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const active = searchParams.get('categoria') || 'tutti'

  const setCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug === 'tutti') { params.delete('categoria') } else { params.set('categoria', slug) }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button onClick={() => setCategory('tutti')}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${active === 'tutti' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
        Tutti
      </button>
      {categories.map((cat) => (
        <button key={cat.id} onClick={() => setCategory(cat.slug)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${active === cat.slug ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {cat.name}
        </button>
      ))}
    </div>
  )
}
