"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Banner } from '@/lib/types'
import { ImageCropper } from './image-cropper'

export function BannersManager() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link: '', is_active: true, display_order: 0 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)

  useEffect(() => { fetchBanners() }, [])

  const fetchBanners = async () => {
    const res = await fetch('/api/admin/banners')
    setBanners(await res.json())
    setLoading(false)
  }

  const openCreate = () => {
    setForm({ title: '', subtitle: '', image_url: '', link: '', is_active: true, display_order: banners.length })
    setCreating(true); setEditing(null)
  }

  const openEdit = (b: Banner) => {
    setForm({ title: b.title || '', subtitle: b.subtitle || '', image_url: b.image_url, link: b.link || '', is_active: b.is_active, display_order: b.display_order })
    setEditing(b); setCreating(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null)
    setUploading(true)
    try {
      const croppedFile = new File([blob], 'banner.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', croppedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, image_url: data.url }))
    } catch { console.error('Upload failed') }
    setUploading(false)
  }

  const handleCropCancel = () => setCropFile(null)

  const handleSave = async () => {
    if (!form.image_url) return
    setSaving(true)
    if (editing) {
      await fetch('/api/admin/banners', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editing.id }) })
    } else {
      await fetch('/api/admin/banners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setSaving(false); setEditing(null); setCreating(false)
    fetchBanners()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo banner?')) return
    await fetch('/api/admin/banners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchBanners()
  }

  const handleToggle = async (b: Banner) => {
    await fetch('/api/admin/banners', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, is_active: !b.is_active }) })
    fetchBanners()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  if (creating || editing) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">{creating ? 'Nuovo banner' : 'Modifica banner'}</h2>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null) }}>Annulla</Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo banner" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Sottotitolo</label>
          <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Sottotitolo" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Immagine *</label>
          <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL immagine" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-cyan-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            {uploading ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploading} />
          </label>
          {form.image_url && (
            <div className="mt-2 rounded-lg overflow-hidden h-32 bg-slate-100">
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Link (opzionale)</label>
          <Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Ordine</label>
          <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500">Attivo</label>
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-8 h-8 text-cyan-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || !form.image_url} className="w-full bg-cyan-600 hover:bg-cyan-700">
        {saving ? 'Salvataggio...' : 'Salva banner'}
      </Button>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspectRatio={3}
          outputWidth={1800}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Banner ({banners.length})</h2>
        <Button onClick={openCreate} size="sm" className="bg-cyan-600 hover:bg-cyan-700 gap-1">
          <Plus className="w-4 h-4" /> Nuovo
        </Button>
      </div>
      <div className="space-y-2">
        {banners.map(b => (
          <div key={b.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="w-16 h-10 rounded-lg bg-slate-50 overflow-hidden shrink-0">
              <img src={b.image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 truncate">{b.title || 'Banner senza titolo'}</p>
              <p className="text-xs text-slate-400">Ordine: {b.display_order}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggle(b)}>
                {b.is_active ? <ToggleRight className="w-6 h-6 text-cyan-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              </button>
              <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Pencil className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">Nessun banner</p>}
      </div>
    </div>
  )
}
