"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Upload, Trash2, ImageIcon, Link as LinkIcon } from 'lucide-react'
import type { ProductImage } from '@/lib/types'

export function ProductImagesManager({ productId, onBack }: { productId: string; onBack: () => void }) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => { fetchImages() }, [productId])

  const fetchImages = async () => {
    const res = await fetch(`/api/admin/product-images?product_id=${productId}`)
    setImages(await res.json())
    setLoading(false)
  }

  const saveImageUrl = async (url: string) => {
    await fetch('/api/admin/product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, image_url: url, display_order: images.length }),
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) await saveImageUrl(data.url)
      } catch { console.error('Upload failed') }
    }
    setUploading(false)
    fetchImages()
  }

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try { new URL(trimmed) } catch { setUrlError('URL non valido'); return }
    setUrlError('')
    setUploading(true)
    await saveImageUrl(trimmed)
    setUrlInput('')
    setUploading(false)
    fetchImages()
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/admin/product-images', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchImages()
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-stone-800">Galleria immagini</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Upload file */}
        <div className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center hover:border-amber-400 transition-colors">
          <label className="cursor-pointer block">
            <Upload className="w-7 h-7 mx-auto text-stone-400 mb-2" />
            <p className="text-sm font-medium text-stone-600">{uploading ? 'Caricamento...' : 'Carica file'}</p>
            <p className="text-xs text-stone-400 mt-1">Puoi selezionare più immagini</p>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>

        {/* URL input */}
        <div className="border border-stone-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-600 mb-1">
            <LinkIcon className="w-4 h-4" /> Aggiungi tramite URL
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              disabled={uploading}
              className="text-sm"
            />
            <Button onClick={handleAddUrl} disabled={uploading || !urlInput.trim()} size="sm" className="bg-amber-600 hover:bg-amber-700 shrink-0">
              Aggiungi
            </Button>
          </div>
          {urlError && <p className="text-xs text-red-500">{urlError}</p>}
        </div>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-8 text-stone-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna immagine</p>
          </div>
        ) : images.map((img) => (
          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-stone-50">
            <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => handleDelete(img.id)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
