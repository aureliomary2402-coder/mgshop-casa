"use client"
import Link from 'next/link'
import { ShoppingBag, Search, X, Home, ChevronDown, Tag, Sparkles } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Category } from '@/lib/types'

export function ShopHeader() {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const [promoActive, setPromoActive] = useState(false)
  const [cartBump, setCartBump] = useState(false)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const lastAdded = useCartStore(s => s.lastAdded)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const q = searchParams.get('q')
    if (q) { setSearchValue(q); setSearchOpen(true) }
    const hs = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', hs, { passive: true })
    fetch('/api/admin/categories').then(r => r.json()).then(setCategories).catch(() => {})
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    const hc = (e: MouseEvent) => { if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false) }
    document.addEventListener('mousedown', hc)
    return () => { window.removeEventListener('scroll', hs); document.removeEventListener('mousedown', hc) }
  }, [])

  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50) }, [searchOpen])

  useEffect(() => {
    if (lastAdded === 0) return
    setCartBump(true)
    const t = setTimeout(() => setCartBump(false), 500)
    return () => clearTimeout(t)
  }, [lastAdded])

  const itemCount = mounted ? getTotalItems() : 0
  const activeCategory = searchParams.get('categoria')
  const activeCategoryName = categories.find(c => c.slug === activeCategory)?.name

  const handleSearch = (value: string) => {
    setSearchValue(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) { params.set('q', value.trim()) } else { params.delete('q') }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.replace(`${pathname}?${params.toString()}`)
    setSearchOpen(false)
  }

  const handleCategorySelect = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) { params.set('categoria', slug) } else { params.delete('categoria') }
    router.replace(`/shop?${params.toString()}`)
    setCatOpen(false)
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg' : ''}`}
      style={{ background: scrolled ? 'rgba(250,247,242,0.97)' : 'rgba(250,247,242,0.98)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(217,119,6,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block" style={{ color: '#1a0800' }}>
            MG<span style={{ color: '#d97706' }}>Shop</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <div className="relative" ref={catRef}>
            <button onClick={() => setCatOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-amber-50 btn-press"
              style={{ color: catOpen || activeCategory ? '#d97706' : '#44403c' }}>
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">{activeCategoryName || 'Categorie'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {catOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
                style={{ background: 'white', border: '1px solid rgba(217,119,6,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                <div className="p-2">
                  <button onClick={() => handleCategorySelect(null)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-amber-50 ${!activeCategory ? 'bg-amber-50 text-amber-700' : 'text-stone-700'}`}>
                    Tutti i prodotti
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => handleCategorySelect(cat.slug)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-amber-50 ${activeCategory === cat.slug ? 'bg-amber-50 text-amber-700' : 'text-stone-700'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {promoActive && (
            <Link href="/promo" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-amber-50 btn-press" style={{ color: '#d97706' }}>
              <Sparkles className="w-4 h-4" /> Promo
              <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">!</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`transition-all duration-300 ${searchOpen ? 'flex w-40' : 'hidden md:flex w-40'}`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
              <input ref={inputRef} type="search" placeholder="Cerca..." value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-9 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', color: '#1a0800' }} />
              {searchValue && <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400"><X className="w-4 h-4" /></button>}
            </div>
          </div>
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-amber-50 text-amber-700"
            onClick={() => { searchOpen ? handleClearSearch() : setSearchOpen(true) }}>
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
          <Link href="/carrello" className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-amber-50 btn-press group">
            <ShoppingBag className={`w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform ${cartBump ? 'animate-cart-bounce' : ''}`} />
            {itemCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold ${cartBump ? 'animate-badge-pop' : ''}`}
                style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
