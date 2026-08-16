"use client"

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Menu, X, ShoppingBag, User, Search, Heart, ChevronDown,
  Tag, Sparkles, Newspaper, Ticket, ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/cart-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'
import { createClient } from '@/lib/supabase/client'
import type { Category, Product } from '@/lib/types'
import { optimizeImage } from '@/lib/image'

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#0891b2', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

type NavItem =
  | { label: string; href: string }
  | { label: string; action: 'points' | 'chat' | 'soon' }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Negozio', href: '/shop' },
  { label: 'Promozioni', href: '/promo' },
  { label: 'Promo Box', action: 'soon' },
  { label: 'Lotteria', href: '/lotteria' },
  { label: 'Volantino', href: '/volantino' },
  { label: 'Punti', action: 'points' },
  { label: 'Zone di Consegna', href: '/consegne' },
  { label: 'Contatti', action: 'chat' },
]

export function GlobalHeader() {
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchCount, setSearchCount] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const [promoActive, setPromoActive] = useState(false)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const [cartBump, setCartBump] = useState(false)

  const getTotalItems = useCartStore(s => s.getTotalItems)
  const lastAdded = useCartStore(s => s.lastAdded)
  const wishlistCount = useWishlistStore(s => s.ids.length)
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const openChat = useUIPanelsStore(s => s.openChat)

  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const itemCount = mounted ? getTotalItems() : 0
  const activeCategory = searchParams.get('categoria')
  const activeCategoryName = categories.find(c => c.slug === activeCategory)?.name

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  useEffect(() => {
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(d.is_active === true)).catch(() => {})
  }, [])

  useEffect(() => {
    const term = searchValue.trim()
    if (!term) { setSearchResults([]); setSearchCount(0); setSearchLoading(false); return }
    setSearchLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/shop/products?q=${encodeURIComponent(term)}&pagina=1`)
        .then(r => r.json())
        .then(d => { setSearchResults((d.products || []).slice(0, 6)); setSearchCount(d.count || 0) })
        .catch(() => { setSearchResults([]); setSearchCount(0) })
        .finally(() => setSearchLoading(false))
      fetch('/api/analytics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      }).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [searchValue])

  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50) }, [searchOpen])

  useEffect(() => {
    if (lastAdded === 0) return
    setCartBump(true)
    const t = setTimeout(() => setCartBump(false), 500)
    return () => clearTimeout(t)
  }, [lastAdded])

  const runAction = (item: NavItem) => {
    setMenuOpen(false)
    if ('href' in item) return
    if (item.action === 'points') openPoints()
    else if (item.action === 'chat') openChat()
    else toast(`${item.label}: disponibile a breve! ✨`, { duration: 2000 })
  }

  const handleSearch = (value: string) => {
    setSearchValue(value)
    setDropdownOpen(value.trim().length > 0)
    if (pathname?.startsWith('/shop')) {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) { params.set('q', value.trim()) } else { params.delete('q') }
      router.replace(`${pathname}?${params.toString()}`)
    }
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setSearchResults([])
    setDropdownOpen(false)
    if (pathname?.startsWith('/shop')) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('q')
      router.replace(`${pathname}?${params.toString()}`)
    }
    setSearchOpen(false)
  }

  const handleSelectProduct = (product: Product) => {
    setDropdownOpen(false)
    setSearchOpen(false)
    router.push(`/prodotto/${product.id}`)
  }

  const handleSeeAllResults = () => {
    setDropdownOpen(false)
    setSearchOpen(false)
    const term = searchValue.trim()
    router.push(`/shop?q=${encodeURIComponent(term)}#prodotti-grid`)
    requestAnimationFrame(() => {
      document.getElementById('prodotti-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleCategorySelect = (slug: string | null) => {
    setMenuOpen(false)
    setCatOpen(false)
    const params = new URLSearchParams()
    if (slug) params.set('categoria', slug)
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <header className="sticky top-0 z-50 liquid-glass-nav">
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 30% -10%, rgba(255,255,255,0.75), rgba(255,255,255,0) 60%)',
          mixBlendMode: 'screen',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none group">
          <img src="/logo/mgshop-logo-neon.png" alt="MGShop Casa"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover neon-glow-logo transition-transform group-hover:scale-105" />
          <span className="hidden sm:block text-lg font-bold tracking-tight text-slate-800">
            MG<span className="text-shimmer">Shop</span> Casa
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 flex-1 justify-center px-2">
          <Link href="/" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </Link>
          <Link href="/shop" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
            Negozio
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </Link>

          <div className="relative" ref={catRef}>
            <button onClick={() => setCatOpen(v => !v)}
              className="flex items-center gap-1 text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
              <Tag className="w-3.5 h-3.5" />
              {activeCategoryName || 'Categorie'}
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
                style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                <div className="p-2 max-h-80 overflow-y-auto">
                  <button onClick={() => handleCategorySelect(null)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 ${!activeCategory ? 'bg-cyan-50 text-cyan-700' : 'text-slate-700'}`}>
                    Tutti i prodotti
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => handleCategorySelect(cat.slug)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 ${activeCategory === cat.slug ? 'bg-cyan-50 text-cyan-700' : 'text-slate-700'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {promoActive && (
            <Link href="/promo" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Promo
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
            </Link>
          )}
          {volantinoActive && (
            <Link href="/volantino" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group flex items-center gap-1">
              <Newspaper className="w-3.5 h-3.5" /> Volantino
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
            </Link>
          )}
          <Link href="/lotteria" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5" /> Lotteria
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </Link>
          <button onClick={() => openPoints()} className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
            Punti
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </button>
          <Link href="/consegne" className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
            Zone di Consegna
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </Link>
          <button onClick={() => openChat()} className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-cyan-700 transition-colors relative group">
            Contatti
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
          </button>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <div ref={searchBoxRef} className={`transition-all duration-300 ${searchOpen ? 'flex w-48 sm:w-56' : 'hidden md:flex md:w-48'} ${searchFocused ? '!w-56 sm:!w-64' : ''}`}>
            <div className="relative w-full">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-300 ${searchFocused ? 'text-cyan-500' : 'text-cyan-400'}`} />
              <input
                ref={inputRef}
                type="search"
                placeholder="Cerca..."
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => { setSearchFocused(true); if (searchValue.trim()) setDropdownOpen(true) }}
                onBlur={() => setSearchFocused(false)}
                className="search-glow w-full h-9 pl-9 pr-9 rounded-xl text-sm outline-none transition-all duration-300"
                style={{
                  background: searchFocused ? '#ffffff' : 'rgba(8,145,178,0.06)',
                  border: searchFocused ? '1px solid rgba(8,145,178,0.5)' : '1px solid rgba(8,145,178,0.15)',
                  color: '#0c2b36',
                }} />
              {searchLoading && (
                <span className="absolute right-9 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-cyan-300 border-t-cyan-600 animate-spin" />
              )}
              {searchValue && (
                <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}

              {dropdownOpen && searchValue.trim() && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
                  style={{ background: 'white', border: '1px solid rgba(8,145,178,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  {searchResults.length > 0 ? (
                    <>
                      <div className="max-h-80 overflow-y-auto p-1.5">
                        {searchResults.map(product => {
                          const imgUrl = optimizeImage(product.card_image || product.cover_image, 80)
                          return (
                            <button key={product.id} onClick={() => handleSelectProduct(product)}
                              className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-cyan-50 transition-colors">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'rgba(8,145,178,0.06)' }}>
                                {imgUrl ? <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-cyan-300" />}
                              </div>
                              <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: '#0c2b36' }}>
                                <HighlightedText text={product.name} query={searchValue} />
                              </span>
                              <span className="text-sm font-bold shrink-0" style={{ color: '#0891b2' }}>€{product.price.toFixed(2)}</span>
                            </button>
                          )
                        })}
                      </div>
                      <button onClick={handleSeeAllResults}
                        className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-t transition-colors hover:bg-cyan-50"
                        style={{ borderColor: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>
                        Vedi tutti i risultati{searchCount > 0 ? ` (${searchCount})` : ''}
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                    </>
                  ) : !searchLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">Nessun prodotto trovato</div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">Cerco...</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 text-slate-700"
            onClick={() => { searchOpen ? handleClearSearch() : setSearchOpen(true) }}>
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <Link href="/preferiti" className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/60 text-slate-700 transition-colors group">
            <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
                style={{ background: '#ef4444' }}>
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </Link>

          <button onClick={openPoints} aria-label="Il mio account"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 text-slate-700 transition-colors">
            <User className="w-5 h-5" />
          </button>

          <Link href="/carrello" aria-label="Vai al carrello"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 text-slate-700 transition-colors group">
            <ShoppingBag className={`w-5 h-5 group-hover:scale-110 transition-transform ${cartBump ? 'animate-cart-bounce' : ''}`} />
            {itemCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold ${cartBump ? 'animate-badge-pop' : ''}`}
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          <div className="relative lg:hidden" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Apri menu"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/60 text-slate-700 btn-press">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50 liquid-glass-card">
                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {NAV_ITEMS.map(item =>
                    'href' in item ? (
                      <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                        {item.label}
                      </Link>
                    ) : (
                      <button key={item.label} onClick={() => runAction(item)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                        {item.label}
                      </button>
                    )
                  )}
                  <div className="border-t border-slate-200 my-2" />
                  <button onClick={() => { setMenuOpen(false); handleCategorySelect(null) }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                    Tutti i prodotti
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => { setMenuOpen(false); handleCategorySelect(cat.slug) }}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
