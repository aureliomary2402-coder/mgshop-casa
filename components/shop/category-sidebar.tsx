"use client"

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Store, Droplets, Droplet, SprayCan, Sparkles, WashingMachine, Flower2,
  UtensilsCrossed, Home, Tag, SlidersHorizontal, ChevronDown,
  Bath, Scissors, CupSoda, Baby, Pencil, Cookie, Palette, Plug, Sun,
  PartyPopper, Gamepad2, ShieldCheck,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { Category } from '@/lib/types'

function categoryIcon(name: string): ComponentType<{ className?: string }> {
  const n = name.toLowerCase()
  if (n.includes('bagno')) return Bath
  if (n.includes('balsam')) return Scissors
  if (n.includes('shampoo')) return Droplet
  if (n.includes('bevand')) return CupSoda
  if (n.includes('bimb')) return Baby
  if (n.includes('cartoler')) return Pencil
  if (n.includes('cosmetic') || n.includes('bellezza')) return Palette
  if (n.includes('detersiv')) return Droplets
  if (n.includes('elettro')) return Plug
  if (n.includes('estate')) return Sun
  if (n.includes('fest')) return PartyPopper
  if (n.includes('gioch')) return Gamepad2
  if (n.includes('igieni')) return ShieldCheck
  if (n.includes('profum')) return Flower2
  if (n.includes('cibo')) return Cookie
  if (n.includes('casa') || n.includes('accessor')) return Home
  if (n.includes('pulizia')) return SprayCan
  if (n.includes('person')) return Sparkles
  if (n.includes('bucato')) return WashingMachine
  if (n.includes('cucina')) return UtensilsCrossed
  return Tag
}

export function CategorySidebar({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('categoria') || null

  const go = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) { params.set('categoria', slug) } else { params.delete('categoria') }
    router.push(`${pathname}?${params.toString()}#prodotti-grid`, { scroll: false })
    requestAnimationFrame(() => document.getElementById('prodotti-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    setOpen(false)
  }

  const items = [{ slug: null as string | null, name: 'Tutti i prodotti', icon: Store }, ...categories.map(c => ({ slug: c.slug, name: c.name, icon: categoryIcon(c.name) }))]
  const activeLabel = items.find(it => it.slug === active)?.name || 'Categorie'

  return (
    <>
      {/* Desktop: colonna sticky (l'etichetta sta nella pagina) */}
      <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
        <nav className="rounded-2xl p-2 space-y-0.5" style={{ background: 'white', border: '1px solid rgba(217,85,0,0.1)', boxShadow: '0 8px 24px rgba(217,85,0,0.06)' }}>
          {items.map(it => {
            const Icon = it.icon
            const isActive = it.slug === active
            return (
              <button key={it.slug ?? 'all'} onClick={() => go(it.slug)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold text-left transition-all btn-press hover:bg-zucca-50"
                style={{
                  background: isActive ? '#ff9a3d' : 'transparent',
                  color: isActive ? '#1a0d33' : '#2d1458',
                  boxShadow: isActive ? '0 10px 25px rgba(255,154,61,0.28)' : 'none',
                }}>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isActive ? 'rgba(5,33,42,0.12)' : '#ecfeff', color: isActive ? '#1a0d33' : '#5b2a9e' }}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{it.name}</span>
              </button>
            )
          })}
        </nav>
        <a href="/promo"
          className="mt-3 flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-black transition hover:-translate-y-0.5 btn-press"
          style={{ background: '#c2410c', color: 'white', boxShadow: '0 15px 40px rgba(249,115,22,0.25)' }}>
          <Tag className="w-4 h-4" /> Offerte della settimana
        </a>
      </aside>

      {/* Mobile/tablet: tab chiusa di default, l'utente la apre quando le serve */}
      <div className="lg:hidden">
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all btn-press"
          style={{ background: 'white', border: '1px solid rgba(217,85,0,0.15)', color: active ? '#d95500' : '#334155', boxShadow: '0 4px 14px rgba(217,85,0,0.07)' }}>
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" style={{ color: '#d95500' }} />
            {activeLabel}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: '#d95500' }} />
        </button>

        {open && (
          <div className="mt-2.5 rounded-2xl p-3 animate-scale-in" style={{ background: 'white', border: '1px solid rgba(217,85,0,0.12)', boxShadow: '0 12px 30px rgba(26,13,51,0.1)' }}>
            <div className="flex flex-wrap gap-2">
              {items.map(it => {
                const Icon = it.icon
                const isActive = it.slug === active
                return (
                  <button key={it.slug ?? 'all'} onClick={() => go(it.slug)}
                    className="flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full text-xs font-semibold transition-all btn-press"
                    style={{
                      background: isActive ? '#ff9a3d' : '#f8fdfe',
                      color: isActive ? '#1a0d33' : '#2d1458',
                      border: `1px solid ${isActive ? '#ff9a3d' : 'rgba(217,85,0,0.18)'}`,
                    }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: isActive ? 'rgba(5,33,42,0.12)' : 'rgba(217,85,0,0.08)', color: isActive ? '#1a0d33' : '#d95500' }}>
                      <Icon className="w-3 h-3" />
                    </span>
                    {it.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
