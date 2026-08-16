"use client"

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Store, Droplets, SprayCan, Sparkles, WashingMachine, Flower2,
  UtensilsCrossed, Home, MoreHorizontal, Tag,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { Category } from '@/lib/types'

function categoryIcon(name: string): ComponentType<{ className?: string }> {
  const n = name.toLowerCase()
  if (n.includes('detersiv')) return Droplets
  if (n.includes('pulizia')) return SprayCan
  if (n.includes('person')) return Sparkles
  if (n.includes('bucato')) return WashingMachine
  if (n.includes('profum')) return Flower2
  if (n.includes('cucina')) return UtensilsCrossed
  if (n.includes('accessor')) return Home
  return MoreHorizontal
}

export function CategorySidebar({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('categoria') || null

  const go = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) { params.set('categoria', slug) } else { params.delete('categoria') }
    router.push(`${pathname}?${params.toString()}#prodotti-grid`, { scroll: false })
    requestAnimationFrame(() => document.getElementById('prodotti-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const items = [{ slug: null as string | null, name: 'Tutti i prodotti', icon: Store }, ...categories.map(c => ({ slug: c.slug, name: c.name, icon: categoryIcon(c.name) }))]

  return (
    <>
      {/* Desktop: colonna sticky con etichetta CATEGORIE, come da riferimento */}
      <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
        <p className="text-xs font-bold tracking-wider mb-3 px-1" style={{ color: '#0c2b36' }}>CATEGORIE</p>
        <nav className="rounded-2xl p-2 space-y-0.5" style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 8px 24px rgba(8,145,178,0.06)' }}>
          {items.map(it => {
            const Icon = it.icon
            const isActive = it.slug === active
            return (
              <button key={it.slug ?? 'all'} onClick={() => go(it.slug)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all btn-press"
                style={{
                  background: isActive ? 'rgba(8,145,178,0.1)' : 'transparent',
                  color: isActive ? '#0891b2' : '#334155',
                }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isActive ? 'rgba(8,145,178,0.15)' : 'rgba(8,145,178,0.07)', color: '#0891b2' }}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{it.name}</span>
              </button>
            )
          })}
        </nav>
        <a href="/promo"
          className="mt-3 flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-bold transition-transform hover:scale-[1.02] btn-press"
          style={{ background: 'linear-gradient(135deg,#db2777,#ec4899)', color: 'white', boxShadow: '0 8px 20px rgba(219,39,119,0.3)' }}>
          <Tag className="w-4 h-4" /> Offerte della settimana
        </a>
      </aside>

      {/* Mobile/tablet: chip che vanno a capo, mai in scroll orizzontale */}
      <div className="lg:hidden">
        <p className="text-xs font-bold tracking-wider mb-2 px-1" style={{ color: '#0c2b36' }}>CATEGORIE</p>
        <div className="flex flex-wrap gap-2">
          {items.map(it => {
            const Icon = it.icon
            const isActive = it.slug === active
            return (
              <button key={it.slug ?? 'all'} onClick={() => go(it.slug)}
                className="flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full text-xs font-semibold transition-all btn-press"
                style={{
                  background: isActive ? '#0891b2' : 'white',
                  color: isActive ? 'white' : '#334155',
                  border: `1px solid ${isActive ? '#0891b2' : 'rgba(8,145,178,0.15)'}`,
                }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(8,145,178,0.08)', color: isActive ? 'white' : '#0891b2' }}>
                  <Icon className="w-3 h-3" />
                </span>
                {it.name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
