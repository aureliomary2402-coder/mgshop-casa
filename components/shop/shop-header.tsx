"use client"

import Link from 'next/link'
import { ShoppingBag, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/lib/cart-store'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function ShopHeader() {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    const q = searchParams.get('q')
    if (q) { setSearchValue(q); setSearchOpen(true) }
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold tracking-tight text-stone-800">MG<span className="text-amber-600">Shop</span> Casa</span>
        </Link>

        <div className={`flex-1 max-w-md transition-all duration-200 ${searchOpen ? 'flex' : 'hidden md:flex'}`}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Cerca prodotti..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-9 h-9 bg-stone-50 border-stone-200"
            />
            {searchValue && (
              <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => { searchOpen ? handleClearSearch() : setSearchOpen(true) }}>
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/carrello">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
