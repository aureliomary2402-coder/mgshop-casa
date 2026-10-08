"use client"

import { useState, useEffect, useCallback } from 'react'
import { Lock, Check } from 'lucide-react'

// Note private dell'admin ("dove rifornirmi"). Arrivano da una API protetta dal
// login e non sono mai inserite nei dati pubblici di prodotti, volantino o promo.
// Chiave: id del prodotto, oppure "promo:<id voce>" per i prodotti personalizzati
// creati dentro la Promo.
export function useAdminNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/admin/product-notes')
      .then(r => (r.ok ? r.json() : {}))
      .then(n => setNotes(n && typeof n === 'object' ? n : {}))
      .catch(() => {})
  }, [])
  const setNote = useCallback((key: string, value: string) => {
    setNotes(prev => ({ ...prev, [key]: value }))
  }, [])
  return { notes, setNote }
}

export function AdminNoteInput({ noteKey, notes, setNote }: {
  noteKey: string
  notes: Record<string, string>
  setNote: (key: string, value: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const idField = noteKey.startsWith('promo:') ? { promo_item_id: noteKey.slice(6) } : { product_id: noteKey }
      const res = await fetch('/api/admin/product-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...idField, supplier_note: notes[noteKey] || '' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      alert('Salvataggio nota fallito. Hai creato le tabelle su Supabase?')
    }
    setSaving(false)
  }

  return (
    <div className="relative">
      <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 pointer-events-none" />
      <input
        value={notes[noteKey] || ''}
        onChange={e => setNote(noteKey, e.target.value)}
        onBlur={save}
        placeholder="Dove rifornirmi (solo tu)"
        title="Nota privata: visibile solo a te, i clienti non la vedono mai"
        className="w-full text-[11px] border border-amber-200 bg-amber-50/70 rounded-lg pl-6 pr-6 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      {saving && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
      {saved && !saving && <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />}
    </div>
  )
}
