"use client"
import Link from 'next/link'
import { ShoppingBag, Search, X, Home, ChevronDown, Tag, Sparkles } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Category } from '@/lib/types'

const WA_URL = "https://whatsapp.com/channel/0029VbChkIv9Bb66CYyUH02u"

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export function ShopHeader() {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [catOpen, setCatOpen] = useState(false)
  const [promoActive, setPromoActive] = useState(false)
  const getTotalItems = useCartStore(s => s.getTotalItems)
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

          {/* WhatsApp channel */}
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-green-50 btn-press"
            style={{ color: '#16a34a' }}
            title="Seguici su WhatsApp">
            <WhatsAppIcon size={18} />
            <span className="hidden md:inline">Canale</span>
          </a>
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
            <ShoppingBag className="w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold"
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
