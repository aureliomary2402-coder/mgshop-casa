"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react'

const OPTIONS = [
  { value: 'recenti', label: 'Novità' },
  { value: 'prezzo_asc', label: 'Prezzo: dal più basso' },
  { value: 'prezzo_desc', label: 'Prezzo: dal più alto' },
  { value: 'nome', label: 'Nome A-Z' },
]

export function SortDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('ordina') || 'recenti'
  const activeLabel = OPTIONS.find(o => o.value === active)?.label || OPTIONS[0].label

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const select = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'recenti') { params.delete('ordina') } else { params.set('ordina', value) }
    router.replace(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
        style={{ background: open ? 'rgba(8,145,178,0.08)' : 'white', borderColor: 'rgba(8,145,178,0.15)', color: '#0891b2' }}>
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <span className="sm:hidden">Ordina</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-30"
          style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
          <div className="p-2">
            {OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => select(opt.value)}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-cyan-50 ${active === opt.value ? 'bg-cyan-50 text-cyan-700' : 'text-slate-700'}`}>
                {opt.label}
                {active === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
