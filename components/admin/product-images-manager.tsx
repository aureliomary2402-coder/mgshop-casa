"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Trash2, ImageIcon, Link } from 'lucide-react'
import type { ProductImage } from '@/lib/types'

interface ProductImagesManagerProps {
  productId: string
  onBack: () => void
}

export function ProductImagesManager({ productId, onBack }: ProductImagesManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    fetchImages()
  }, [productId])

  const fetchImages = async () => {
    const res = await fetch(`/api/admin/product-images?product_id=${productId}`)
    const data = await res.json()
    setImages(data)
    setLoading(false)
  }

  const saveImageUrl = async (url: string) => {
    await fetch('/api/admin/product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        image_url: url,
        display_order: images.length,
      }),
    })
  }

  // Upload file → Vercel Blob (esistente)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()

        if (uploadData.url) {
          await saveImageUrl(uploadData.url)
        }
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }

    setUploading(false)
    fetchImages()
  }

  // Aggiunta tramite URL
  const handleAddUrl = async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return

    try {
      new URL(trimmed)
    } catch {
      setUrlError('URL non valido. Assicurati che inizi con http:// o https://')
      return
    }

    setUrlError('')
    setUploading(true)
    await saveImageUrl(trimmed)
    setUrlInput('')
    setUploading(false)
    fetchImages()
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/admin/product-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchImages()
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">Galleria Immagini</h2>
      </div>

      {/* Upload file */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" /> Carica file
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploading ? 'Caricamento in corso...' : 'Clicca o trascina le immagini qui'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Puoi selezionare più immagini</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </CardContent>
      </Card>

      {/* Aggiunta tramite URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4" /> Aggiungi tramite URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://esempio.com/immagine.jpg"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              disabled={uploading}
            />
            <Button onClick={handleAddUrl} disabled={uploading || !urlInput.trim()}>
              Aggiungi
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          <p className="text-xs text-muted-foreground">
            Incolla l'URL di un'immagine già online (es. da Vercel Blob, Google Drive, Imgur…)
          </p>
        </CardContent>
      </Card>

      {/* Griglia immagini */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nessuna immagine aggiuntiva</p>
          </div>
        ) : (
          images.map((image) => (
            <div key={image.id} className="relative group aspect-square">
              <img
                src={image.image_url}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                onClick={() => handleDelete(image.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
