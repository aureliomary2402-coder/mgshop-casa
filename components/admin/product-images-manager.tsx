"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Trash2, ImageIcon, Link, Video, PlayCircle } from 'lucide-react'
import type { ProductImage } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

// Estensioni video riconosciute quando l'admin incolla un URL diretto
// (l'upload da file invece rileva il tipo dal file stesso).
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv']
const looksLikeVideoUrl = (url: string) => VIDEO_EXTENSIONS.some(ext => url.toLowerCase().split('?')[0].endsWith(ext))

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

  const saveImageUrl = async (url: string, mediaType: 'image' | 'video' = 'image') => {
    const res = await fetch('/api/admin/product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        image_url: url,
        display_order: images.length,
        media_type: mediaType,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Errore salvataggio (${res.status})`)
    }
  }

  // I video (file pesanti) non passano dal server Next.js/Vercel, che
  // rifiuta corpi sopra ~4.5MB: vanno caricati direttamente su Supabase
  // Storage dal browser, usando un URL di upload firmato generato dal server.
  const uploadVideoDirect = async (file: File): Promise<string> => {
    const signRes = await fetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name }),
    })
    const signData = await signRes.json()
    if (!signRes.ok) throw new Error(signData.error || `Errore preparazione upload (${signRes.status})`)

    const supabase = createClient()
    const { error } = await supabase.storage
      .from('images')
      .uploadToSignedUrl(signData.path, signData.token, file, { contentType: file.type })
    if (error) throw new Error(error.message)

    return signData.publicUrl
  }

  // Upload file (foto o video) → Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const errors: string[] = []

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/')
      try {
        if (isVideo) {
          const url = await uploadVideoDirect(file)
          await saveImageUrl(url, 'video')
        } else {
          const formData = new FormData()
          formData.append('file', file)
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok || !uploadData.url) {
            throw new Error(uploadData.error || `Errore caricamento (${uploadRes.status})`)
          }
          await saveImageUrl(uploadData.url, 'image')
        }
      } catch (error: any) {
        console.error('Upload failed:', error)
        errors.push(`${file.name}: ${error?.message || 'errore sconosciuto'}`)
      }
    }

    setUploading(false)
    if (errors.length > 0) alert('Alcuni file non sono stati caricati:\n\n' + errors.join('\n'))
    fetchImages()
  }

  // Aggiunta tramite URL (foto o video, riconosciuto dall'estensione)
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
    try {
      await saveImageUrl(trimmed, looksLikeVideoUrl(trimmed) ? 'video' : 'image')
      setUrlInput('')
    } catch (error: any) {
      alert('Errore: ' + (error?.message || 'salvataggio non riuscito'))
    }
    setUploading(false)
    fetchImages()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/product-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert('Errore eliminazione immagine: ' + (err.error || res.status))
      return
    }
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
        <h2 className="text-lg font-semibold">Galleria Foto e Video</h2>
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
              {uploading ? 'Caricamento in corso...' : 'Clicca o trascina foto o video qui'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Puoi selezionare più file. I video vengono caricati direttamente, anche se pesanti</p>
            <input
              type="file"
              accept="image/*,video/*"
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
              placeholder="https://esempio.com/immagine.jpg oppure video.mp4"
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
            Incolla l'URL di una foto o di un video già online. Se il link finisce con .mp4, .webm o .mov viene riconosciuto automaticamente come video.
          </p>
        </CardContent>
      </Card>

      {/* Griglia immagini */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nessuna foto o video aggiuntivo</p>
          </div>
        ) : (
          images.map((image) => (
            <div key={image.id} className="relative group aspect-square">
              {image.media_type === 'video' ? (
                <>
                  <video
                    src={image.image_url}
                    className="w-full h-full object-cover rounded-lg bg-black"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <PlayCircle className="w-10 h-10 text-white drop-shadow" />
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                    <Video className="w-3 h-3" /> Video
                  </div>
                </>
              ) : (
                <img
                  src={image.image_url}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
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
