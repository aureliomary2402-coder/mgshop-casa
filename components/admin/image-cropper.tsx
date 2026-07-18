"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, ZoomIn } from 'lucide-react'

interface ImageCropperProps {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  outputSize?: number // risoluzione in pixel del lato del quadrato esportato
}

const VIEWPORT = 320 // dimensione in px del riquadro guida mostrato all'utente
const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const EDGE_MARGIN = 24 // px minimi di immagine che devono restare visibili, per non perderla trascinandola fuori

export function ImageCropper({ file, onCancel, onConfirm, outputSize = 1200 }: ImageCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; offX: number; offY: number }>({
    dragging: false, startX: 0, startY: 0, offX: 0, offY: 0,
  })

  // Carica l'immagine a piena risoluzione
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      const bs = VIEWPORT / Math.min(image.naturalWidth, image.naturalHeight)
      const dW = image.naturalWidth * bs
      const dH = image.naturalHeight * bs
      setZoom(1)
      setOffset({ x: (VIEWPORT - dW) / 2, y: (VIEWPORT - dH) / 2 })
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = img ? VIEWPORT / Math.min(img.naturalWidth, img.naturalHeight) : 1
  const displayScale = baseScale * zoom
  const dispW = img ? img.naturalWidth * displayScale : 0
  const dispH = img ? img.naturalHeight * displayScale : 0

  // Permette di spostare l'immagine anche oltre i bordi del riquadro,
  // lasciando comunque un margine minimo visibile per non perderla del tutto
  const clamp = useCallback((off: { x: number; y: number }, w: number, h: number) => {
    const minX = Math.min(-(w - EDGE_MARGIN), VIEWPORT - EDGE_MARGIN)
    const maxX = Math.max(-(w - EDGE_MARGIN), VIEWPORT - EDGE_MARGIN)
    const minY = Math.min(-(h - EDGE_MARGIN), VIEWPORT - EDGE_MARGIN)
    const maxY = Math.max(-(h - EDGE_MARGIN), VIEWPORT - EDGE_MARGIN)
    return {
      x: Math.max(minX, Math.min(maxX, off.x)),
      y: Math.max(minY, Math.min(maxY, off.y)),
    }
  }, [])

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = { dragging: true, startX: clientX, startY: clientY, offX: offset.x, offY: offset.y }
  }
  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return
    const dx = clientX - dragState.current.startX
    const dy = clientY - dragState.current.startY
    setOffset(clamp({ x: dragState.current.offX + dx, y: dragState.current.offY + dy }, dispW, dispH))
  }
  const endDrag = () => { dragState.current.dragging = false }

  // Zoom centrato sul centro del riquadro, mantenendo la posizione relativa dell'immagine
  const handleZoomChange = (newZoom: number) => {
    if (!img) { setZoom(newZoom); return }
    const oldScale = baseScale * zoom
    const newScale = baseScale * newZoom
    const ratio = newScale / oldScale
    const newW = img.naturalWidth * newScale
    const newH = img.naturalHeight * newScale
    setOffset(o => clamp({
      x: VIEWPORT / 2 - (VIEWPORT / 2 - o.x) * ratio,
      y: VIEWPORT / 2 - (VIEWPORT / 2 - o.y) * ratio,
    }, newW, newH))
    setZoom(newZoom)
  }

  const handleConfirm = () => {
    if (!img) return
    setProcessing(true)
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) { setProcessing(false); return }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Riempie prima di sfondo bianco, così lo spazio lasciato libero non è mai trasparente/nero
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputSize, outputSize)

    const outputScale = outputSize / VIEWPORT
    const drawW = dispW * outputScale
    const drawH = dispH * outputScale
    const drawX = offset.x * outputScale
    const drawY = offset.y * outputScale

    ctx.drawImage(img, drawX, drawY, drawW, drawH)
    canvas.toBlob((blob) => {
      setProcessing(false)
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Ritaglia immagine</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <div
          className="relative mx-auto rounded-xl overflow-hidden bg-white border border-stone-200 select-none touch-none"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: 'grab' }}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={endDrag}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: dispW, height: dispH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          )}
          {/* Griglia guida */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: `${VIEWPORT / 3}px ${VIEWPORT / 3}px`,
          }} />
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>
        <p className="text-xs text-stone-400 text-center -mt-2">
          Trascina per spostare, usa lo slider per rimpicciolire o ingrandire. Lo spazio vuoto sarà bianco.
        </p>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors">
            Annulla
          </button>
          <button onClick={handleConfirm} disabled={!img || processing}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
            <Check className="w-4 h-4" /> {processing ? 'Elaborazione...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}
