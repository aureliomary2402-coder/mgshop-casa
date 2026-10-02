"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, ZoomIn } from 'lucide-react'

interface ImageCropperProps {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  outputWidth?: number // risoluzione in pixel della larghezza esportata
  aspectRatio?: number // larghezza/altezza del riquadro. 1 = quadrato, 3 = panoramico tipo banner
  minZoom?: number // zoom minimo consentito. 1 = non si può rimpicciolire sotto la misura che riempie il riquadro (niente bordi vuoti)
}

const VIEWPORT_W = 320
const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const EDGE_MARGIN = 24 // px minimi di immagine che devono restare visibili, per non perderla trascinandola fuori

// Rileva il colore medio ai bordi della foto, per usarlo come sfondo automatico
function detectEdgeColor(img: HTMLImageElement): string {
  try {
    const sampleSize = 60
    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return '#ffffff'
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
    let r = 0, g = 0, b = 0, count = 0
    const border = Math.max(2, Math.round(sampleSize * 0.08))
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const onEdge = x < border || x >= sampleSize - border || y < border || y >= sampleSize - border
        if (!onEdge) continue
        const i = (y * sampleSize + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]
        count++
      }
    }
    if (count === 0) return '#ffffff'
    r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
    return `rgb(${r},${g},${b})`
  } catch {
    return '#ffffff'
  }
}

export function ImageCropper({ file, onCancel, onConfirm, outputWidth = 1600, aspectRatio = 1, minZoom = MIN_ZOOM }: ImageCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const [bgColor, setBgColor] = useState('#ffffff')
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; offX: number; offY: number }>({
    dragging: false, startX: 0, startY: 0, offX: 0, offY: 0,
  })

  const viewportH = Math.round(VIEWPORT_W / aspectRatio)
  const fillFrame = minZoom >= 1
  const computeBaseScale = useCallback((w: number, h: number) => (
    fillFrame ? Math.max(VIEWPORT_W / w, viewportH / h) : Math.min(VIEWPORT_W / w, viewportH / h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [fillFrame, viewportH])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setBgColor(detectEdgeColor(image))
      const bs = computeBaseScale(image.naturalWidth, image.naturalHeight)
      const dW = image.naturalWidth * bs
      const dH = image.naturalHeight * bs
      setZoom(1)
      setOffset({ x: (VIEWPORT_W - dW) / 2, y: (viewportH - dH) / 2 })
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const baseScale = img ? computeBaseScale(img.naturalWidth, img.naturalHeight) : 1
  const displayScale = baseScale * zoom
  const dispW = img ? img.naturalWidth * displayScale : 0
  const dispH = img ? img.naturalHeight * displayScale : 0

  // Permette di spostare l'immagine anche oltre i bordi del riquadro,
  // lasciando comunque un margine minimo visibile per non perderla del tutto
  const clamp = useCallback((off: { x: number; y: number }, w: number, h: number) => {
    const minX = Math.min(-(w - EDGE_MARGIN), VIEWPORT_W - EDGE_MARGIN)
    const maxX = Math.max(-(w - EDGE_MARGIN), VIEWPORT_W - EDGE_MARGIN)
    const minY = Math.min(-(h - EDGE_MARGIN), viewportH - EDGE_MARGIN)
    const maxY = Math.max(-(h - EDGE_MARGIN), viewportH - EDGE_MARGIN)
    return {
      x: Math.max(minX, Math.min(maxX, off.x)),
      y: Math.max(minY, Math.min(maxY, off.y)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportH])

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
      x: VIEWPORT_W / 2 - (VIEWPORT_W / 2 - o.x) * ratio,
      y: viewportH / 2 - (viewportH / 2 - o.y) * ratio,
    }, newW, newH))
    setZoom(newZoom)
  }

  const handleConfirm = () => {
    if (!img) return
    setProcessing(true)
    const outH = Math.round(outputWidth / aspectRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) { setProcessing(false); return }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Riempie con il colore rilevato dalla foto, così lo spazio lasciato libero si intona invece di essere un bianco piatto
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, outputWidth, outH)

    const outputScale = outputWidth / VIEWPORT_W
    const drawW = dispW * outputScale
    const drawH = dispH * outputScale
    const drawX = offset.x * outputScale
    const drawY = offset.y * outputScale

    ctx.drawImage(img, drawX, drawY, drawW, drawH)
    canvas.toBlob((blob) => {
      setProcessing(false)
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Ritaglia immagine</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div
          className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 select-none touch-none"
          style={{ width: VIEWPORT_W, height: viewportH, cursor: 'grab', background: bgColor }}
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
            backgroundSize: `${VIEWPORT_W / 3}px ${viewportH / 3}px`,
          }} />
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="range" min={minZoom} max={MAX_ZOOM} step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>
        <p className="text-xs text-slate-400 text-center -mt-2">
          {minZoom >= 1
            ? 'Trascina per spostare, usa lo slider per ingrandire. Il riquadro resta sempre pieno, senza bordi vuoti.'
            : 'Trascina per spostare, usa lo slider per rimpicciolire o ingrandire. Lo spazio vuoto si riempie da solo con il colore della foto.'}
        </p>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            Annulla
          </button>
          <button onClick={handleConfirm} disabled={!img || processing}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <Check className="w-4 h-4" /> {processing ? 'Elaborazione...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}
