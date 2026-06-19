"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Category } from '@/lib/types'

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories')
    setCategories(await res.json())
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) })
    setNewName('')
    setSaving(false)
    fetchCategories()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa categoria?')) return
    await fetch('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchCategories()
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-800">Categorie ({categories.length})</h2>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nome nuova categoria"
        />
        <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="bg-amber-600 hover:bg-amber-700 shrink-0 gap-1">
          <Plus className="w-4 h-4" /> Aggiungi
        </Button>
      </div>
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="font-medium text-stone-700">{c.name}</span>
            <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="text-center py-6 text-stone-400 text-sm">Nessuna categoria</p>}
      </div>
    </div>
  )
}
