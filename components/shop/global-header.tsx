"use client"
import Link from 'next/link'
import { ShoppingBag, Search, X, ChevronDown, Tag, Sparkles, Newspaper, ImageIcon, Heart, Ticket, User, MapPin, Share2, Home as HomeIcon } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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

// Header unico usato in TUTTE le pagine del sito (Home, Negozio, Prodotto,
// Preferiti, Carrello, Lotteria, Volantino, Promo, Consegne), cosi' il menu
// resta sempre identico e sempre visibile, senza barre doppie o mancanti.
// "categories" non è più usato dall'header (il filtro categorie ora vive
// solo nella pagina Negozio), ma resta come prop opzionale per non dover
// toccare i layout che la passano già.
export function GlobalHeader({ categories = [] }: { categories?: Category[] }) {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [promoActive, setPromoActive] = useState(false)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const [cartBump, setCartBump] = useState(false)
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchCount, setSearchCount] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const lastAdded = useCartStore(s => s.lastAdded)
  const wishlistCount = useWishlistStore(s => s.ids.length)
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const q = searchParams.get('q')
    if (q) { setSearchValue(q); setSearchOpen(true) }
    const hs = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', hs, { passive: true })
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(d.is_active === true)).catch(() => {})
    const hc = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', hc)
    return () => { window.removeEventListener('scroll', hs); document.removeEventListener('mousedown', hc) }
  }, [])

  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50) }, [searchOpen])

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

  useEffect(() => {
    if (lastAdded === 0) return
    setCartBump(true)
    const t = setTimeout(() => setCartBump(false), 500)
    return () => clearTimeout(t)
  }, [lastAdded])

  const itemCount = mounted ? getTotalItems() : 0

  const handleSearch = (value: string) => {
    setSearchValue(value)
    setDropdownOpen(value.trim().length > 0)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) { params.set('q', value.trim()) } else { params.delete('q') }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setSearchResults([])
    setDropdownOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.replace(`${pathname}?${params.toString()}`)
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
    // fallback per quando siamo già sulla pagina shop (l'url q non cambia)
    requestAnimationFrame(() => {
      document.getElementById('prodotti-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 liquid-glass-header ${scrolled ? 'shadow-lg' : ''}`}
      style={{ background: scrolled ? 'rgba(240,251,253,0.97)' : 'rgba(240,251,253,0.98)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(8,145,178,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img src="/logo/mgshop-logo-neon.png" alt="MGShop Casa"
            className="w-9 h-9 rounded-full object-cover transition-transform group-hover:scale-110" />
          <span className="text-lg font-bold tracking-tight hidden sm:block" style={{ color: '#0c2b36' }}>
            MG<span style={{ color: '#0891b2' }}>Shop</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/" className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: pathname === '/' ? '#0891b2' : '#44403c' }}>
            <HomeIcon className="w-4 h-4" /> Home
          </Link>
          <Link href="/shop" className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: pathname?.startsWith('/shop') ? '#0891b2' : '#44403c' }}>
            <Tag className="w-4 h-4" /> Negozio
          </Link>

          {promoActive && (
            <Link href="/promo" className={`${searchOpen ? 'hidden' : 'flex'} items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press`} style={{ color: '#0891b2' }}>
              <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Promo</span>
            </Link>
          )}
          {volantinoActive && (
            <Link href="/volantino" className={`${searchOpen ? 'hidden' : 'flex'} items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press`} style={{ color: '#0891b2' }}>
              <Newspaper className="w-4 h-4" /> <span className="hidden sm:inline">Volantino</span>
            </Link>
          )}

          {/* Solo desktop: su mobile questi collegamenti restano nella tab bar
              in basso, qui servirebbero solo a duplicarla. */}
          <Link href="/lotteria" className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: '#44403c' }}>
            <Ticket className="w-4 h-4" /> Lotteria
          </Link>
          <Link href="/consegne" className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: '#44403c' }}>
            <MapPin className="w-4 h-4" /> Consegne
          </Link>
          <Link href="/social" className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: pathname === '/social' ? '#0891b2' : '#44403c' }}>
            <Share2 className="w-4 h-4" /> Social
          </Link>
          <button onClick={openPoints} className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 btn-press" style={{ color: '#44403c' }}>
            <User className="w-4 h-4" /> Account
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div ref={searchBoxRef} className={`transition-all duration-300 ${searchOpen ? 'flex w-56 sm:w-64' : 'hidden md:flex md:w-40'} ${searchFocused ? '!w-64 sm:!w-72' : ''}`}>
            <div className="relative w-full">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-300 ${searchFocused ? 'text-cyan-500' : 'text-cyan-400'}`} />
              <input ref={inputRef} type="search" placeholder="Cerca prodotti..." value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => { setSearchFocused(true); if (searchValue.trim()) setDropdownOpen(true) }}
                onBlur={() => setSearchFocused(false)}
                className="search-glow w-full h-9 pl-9 pr-9 rounded-xl text-base outline-none transition-all duration-300"
                style={{
                  background: searchFocused ? '#ffffff' : 'rgba(8,145,178,0.06)',
                  border: searchFocused ? '1px solid rgba(8,145,178,0.5)' : '1px solid rgba(8,145,178,0.15)',
                  color: '#0c2b36',
                  boxShadow: searchFocused ? '0 0 0 4px rgba(34,211,238,0.15), 0 4px 16px rgba(8,145,178,0.18)' : 'none',
                }} />
              {searchLoading && (
                <span className="absolute right-9 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-cyan-300 border-t-cyan-600 animate-spin" />
              )}
              {searchValue && <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-600 transition-colors"><X className="w-4 h-4" /></button>}

              {dropdownOpen && searchValue.trim() && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-0 sm:min-w-[280px] rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
                  style={{ background: 'white', border: '1px solid rgba(8,145,178,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  {searchResults.length > 0 ? (
                    <>
                      <div className="max-h-96 overflow-y-auto p-1.5">
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
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 text-cyan-700"
            onClick={() => { searchOpen ? handleClearSearch() : setSearchOpen(true) }}>
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
          <Link href="/preferiti" className={`${searchOpen ? 'hidden sm:flex' : 'flex'} relative items-center gap-2 px-2 sm:px-3 py-2 rounded-xl transition-all hover:bg-cyan-50 btn-press group`}>
            <Heart className="w-5 h-5 text-cyan-700 group-hover:scale-110 transition-transform" />
            {mounted && wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold"
                style={{ background: '#ef4444' }}>
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </Link>
          <Link href="/carrello" className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-cyan-50 btn-press group">
            <ShoppingBag className={`w-5 h-5 text-cyan-700 group-hover:scale-110 transition-transform ${cartBump ? 'animate-cart-bounce' : ''}`} />
            {itemCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold ${cartBump ? 'animate-badge-pop' : ''}`}
                style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
