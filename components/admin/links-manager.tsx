"use client"

import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, Search, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface LinkRow {
  key: string
  label: string
  path: string
  note?: string
}

const PAGINE: LinkRow[] = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'landing', label: 'Pagina di benvenuto', path: '/landing' },
  { key: 'shop', label: 'Negozio', path: '/shop' },
  { key: 'promo', label: 'Promo', path: '/promo' },
  { key: 'volantino', label: 'Volantino (elenco)', path: '/volantino' },
  { key: 'lotteria', label: 'Lotteria', path: '/lotteria' },
  { key: 'consegne', label: 'Consegne', path: '/consegne' },
  { key: 'recensioni', label: 'Recensioni', path: '/recensioni' },
  { key: 'social', label: 'Social', path: '/social' },
  { key: 'preferiti', label: 'Preferiti', path: '/preferiti' },
  { key: 'carrello', label: 'Carrello', path: '/carrello' },
]

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function Row({ row, base, copiedKey, onCopy }: {
  row: LinkRow
  base: string
  copiedKey: string | null
  onCopy: (key: string, url: string) => void
}) {
  const url = `${base}${row.path}`
  const copied = copiedKey === row.key
  return (
    <div className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {row.label}
          {row.note && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">{row.note}</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">{url}</p>
      </div>
      <button
        onClick={() => onCopy(row.key, url)}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${copied ? 'bg-green-50 text-green-700 border-green-200' : 'text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
      >
        {copied ? <><Check className="w-3.5 h-3.5" /> Copiato</> : <><Copy className="w-3.5 h-3.5" /> Copia</>}
      </button>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(8,145,178,0.12)' }}>
      <div className="px-4 py-2.5 bg-cyan-50 border-b" style={{ borderColor: 'rgba(8,145,178,0.12)' }}>
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
          {title}{typeof count === 'number' ? ` (${count})` : ''}
        </p>
      </div>
      {children}
    </div>
  )
}

export function LinksManager() {
  const [base, setBase] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [volantini, setVolantini] = useState<LinkRow[]>([])
  const [categorie, setCategorie] = useState<LinkRow[]>([])
  const [prodotti, setProdotti] = useState<LinkRow[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    setBase(window.location.origin)

    fetch('/api/admin/volantino').then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return
      setVolantini(d.map((v: { id: string; slug: string | null; title: string; is_active: boolean }) => ({
        key: `vol-${v.id}`,
        label: v.title || 'Volantino',
        path: `/volantino/${v.slug || v.id}`,
        note: v.is_active ? undefined : 'non attivo',
      })))
    }).catch(() => {})

    fetch('/api/admin/categories').then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return
      setCategorie(d.map((c: { id: string; name: string; slug: string }) => ({
        key: `cat-${c.id}`,
        label: c.name,
        path: `/shop?categoria=${c.slug}`,
      })))
    }).catch(() => {})

    fetch('/api/admin/products').then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return
      setProdotti(d.map((p: { id: string; name: string; is_active: boolean }) => ({
        key: `prod-${p.id}`,
        label: p.name,
        path: `/prodotto/${p.id}`,
        note: p.is_active ? undefined : 'non attivo',
      })))
    }).catch(() => {})
  }, [])

  const handleCopy = async (key: string, url: string) => {
    const ok = await copyText(url)
    if (!ok) {
      setError('Copia non riuscita: tieni premuto sul link e copialo a mano.')
      return
    }
    setError('')
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1800)
  }

  const prodottiFiltrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return prodotti.slice(0, 15)
    return prodotti.filter(p => p.label.toLowerCase().includes(q)).slice(0, 50)
  }, [prodotti, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-cyan-600" />
        <p className="text-sm text-slate-500">Tocca <b>Copia</b> per prendere il link da incollare in WhatsApp, social o messaggi.</p>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Section title="Pagine del sito" count={PAGINE.length}>
        {PAGINE.map(r => <Row key={r.key} row={r} base={base} copiedKey={copiedKey} onCopy={handleCopy} />)}
      </Section>

      {volantini.length > 0 && (
        <Section title="Volantini" count={volantini.length}>
          {volantini.map(r => <Row key={r.key} row={r} base={base} copiedKey={copiedKey} onCopy={handleCopy} />)}
        </Section>
      )}

      {categorie.length > 0 && (
        <Section title="Categorie" count={categorie.length}>
          {categorie.map(r => <Row key={r.key} row={r} base={base} copiedKey={copiedKey} onCopy={handleCopy} />)}
        </Section>
      )}

      <Section title="Prodotti" count={prodotti.length}>
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca un prodotto..." className="pl-9 h-9 text-sm" />
          </div>
          {!search.trim() && prodotti.length > 15 && (
            <p className="text-[11px] text-slate-400 mt-1.5 px-1">Mostro i primi 15: scrivi il nome per trovare gli altri.</p>
          )}
        </div>
        {prodottiFiltrati.length === 0
          ? <p className="p-4 text-sm text-slate-400 text-center">Nessun prodotto trovato</p>
          : prodottiFiltrati.map(r => <Row key={r.key} row={r} base={base} copiedKey={copiedKey} onCopy={handleCopy} />)}
      </Section>
    </div>
  )
}
