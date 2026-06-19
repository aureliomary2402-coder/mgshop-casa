"use client"

import Link from 'next/link'
import { ShoppingBag, Search, X, Home } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function ShopHeader() {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    const q = searchParams.get('q')
    if (q) { setSearchValue(q); setSearchOpen(true) }
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [searchOpen])

  const itemCount = mounted ? getTotalItems() : 0

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

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg shadow-amber-900/10' : ''}`}
      style={{ background: scrolled ? 'rgba(250, 247, 242, 0.95)' : 'rgba(250, 247, 242, 0.98)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(217, 119, 6, 0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#1a0800' }}>
            MG<span style={{ color: '#d97706' }}>Shop</span>
            <span className="text-sm font-normal text-stone-400 ml-1 hidden sm:inline">Casa</span>
          </span>
        </Link>

        {/* Search bar desktop */}
        <div className={`flex-1 max-w-md transition-all duration-300 ${searchOpen ? 'flex' : 'hidden md:flex'}`}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Cerca prodotti..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', color: '#1a0800' }}
              onFocus={e => e.target.style.borderColor = 'rgba(217,119,6,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(217,119,6,0.15)'}
            />
            {searchValue && (
              <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors text-amber-700"
            onClick={() => { searchOpen ? handleClearSearch() : setSearchOpen(true) }}>
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <Link href="/carrello" className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-amber-50 btn-press group">
            <ShoppingBag className="w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-sm font-medium text-amber-800">Carrello</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold animate-scale-in"
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
