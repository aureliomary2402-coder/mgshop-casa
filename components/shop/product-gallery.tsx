"use client"

import { useState, useRef } from 'react'
import { ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GalleryImage {
  id: string
  image_url: string
}

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [currentImg, setCurrentImg] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const touchState = useRef({ startX: 0, startY: 0, moved: false, lastTap: 0, panStart: { x: 0, y: 0 } })

  const goNext = () => setCurrentImg(i => (i + 1) % images.length)
  const goPrev = () => setCurrentImg(i => (i - 1 + images.length) % images.length)

  // Swipe sull'immagine principale (fuori dal lightbox)
  const handleMainTouchStart = (e: React.TouchEvent) => {
    touchState.current.startX = e.touches[0].clientX
    touchState.current.startY = e.touches[0].clientY
    touchState.current.moved = false
  }
  const handleMainTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchState.current.startX)
    const dy = Math.abs(e.touches[0].clientY - touchState.current.startY)
    if (dx > 8 || dy > 8) touchState.current.moved = true
  }
  const handleMainTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchState.current.startX
    if (Math.abs(dx) > 45 && images.length > 1) {
      if (dx < 0) goNext(); else goPrev()
    } else if (!touchState.current.moved) {
      openLightbox()
    }
  }

  const openLightbox = () => {
    setZoomScale(1); setPan({ x: 0, y: 0 })
    setLightboxOpen(true)
  }
  const closeLightbox = () => setLightboxOpen(false)

  // Swipe / doppio tap / trascinamento dentro il lightbox
  const lbTouchStart = (e: React.TouchEvent) => {
    touchState.current.startX = e.touches[0].clientX
    touchState.current.startY = e.touches[0].clientY
    touchState.current.moved = false
    touchState.current.panStart = { ...pan }
  }
  const lbTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchState.current.startX
    const dy = e.touches[0].clientY - touchState.current.startY
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) touchState.current.moved = true
    if (zoomScale > 1) {
      setPan({ x: touchState.current.panStart.x + dx, y: touchState.current.panStart.y + dy })
    }
  }
  const lbTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchState.current.startX
    const dy = e.changedTouches[0].clientY - touchState.current.startY

    if (!touchState.current.moved) {
      // Tap singolo o doppio: rilevo il doppio tap manualmente
      const now = Date.now()
      if (now - touchState.current.lastTap < 300) {
        // doppio tap: alterna zoom
        if (zoomScale > 1) {
          setZoomScale(1); setPan({ x: 0, y: 0 })
        } else {
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          const originX = ((e.changedTouches[0].clientX - rect.left) / rect.width) * 100
          const originY = ((e.changedTouches[0].clientY - rect.top) / rect.height) * 100
          setZoomOrigin({ x: originX, y: originY })
          setZoomScale(2.5)
        }
      }
      touchState.current.lastTap = now
      return
    }

    if (zoomScale === 1) {
      if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
        closeLightbox() // swipe verso il basso per chiudere
      } else if (Math.abs(dx) > 60 && images.length > 1) {
        if (dx < 0) goNext(); else goPrev()
      }
    }
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-square rounded-3xl overflow-hidden mb-3 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)', boxShadow: '0 20px 60px rgba(8,145,178,0.12)' }}>
        <ImageIcon className="w-20 h-20" style={{ color: 'rgba(8,145,178,0.3)' }} />
      </div>
    )
  }

  return (
    <>
      <div>
        <div
          className="relative aspect-square rounded-3xl overflow-hidden mb-3 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #f0fbfd, #cffafe)',
            boxShadow: '0 20px 60px rgba(8,145,178,0.12)',
            transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.3s ease'
          }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            setTilt({ x: ((e.clientY - rect.top) / rect.height - 0.5) * 8, y: ((e.clientX - rect.left) / rect.width - 0.5) * -8 })
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          onClick={() => !touchState.current.moved && openLightbox()}
          onTouchStart={handleMainTouchStart}
          onTouchMove={handleMainTouchMove}
          onTouchEnd={handleMainTouchEnd}
        >
          <img src={images[currentImg].image_url} alt={productName} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" draggable={false} />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center btn-press hidden sm:flex"
                style={{ background: 'rgba(240,251,253,0.9)', backdropFilter: 'blur(8px)' }}>
                <ChevronLeft className="w-5 h-5" style={{ color: '#155e75' }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center btn-press hidden sm:flex"
                style={{ background: 'rgba(240,251,253,0.9)', backdropFilter: 'blur(8px)' }}>
                <ChevronRight className="w-5 h-5" style={{ color: '#155e75' }} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
                {images.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: i === currentImg ? '#0891b2' : 'rgba(8,145,178,0.25)' }} />
                ))}
              </div>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((img, i) => (
              <button key={img.id} onClick={() => setCurrentImg(i)}
                className="w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-all hover:scale-105 btn-press"
                style={{ border: i === currentImg ? '2px solid #0891b2' : '2px solid transparent' }}>
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox a schermo intero */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onTouchStart={lbTouchStart} onTouchMove={lbTouchMove} onTouchEnd={lbTouchEnd}>
          <button onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <p className="absolute top-4 left-4 text-white/70 text-sm">{currentImg + 1} / {images.length}</p>
          )}
          <img
            src={images[currentImg].image_url}
            alt={productName}
            draggable={false}
            className="max-w-full max-h-full select-none"
            style={{
              transform: `scale(${zoomScale}) translate(${pan.x / zoomScale}px, ${pan.y / zoomScale}px)`,
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
              transition: touchState.current.moved ? 'none' : 'transform 0.25s ease',
            }}
            onDoubleClick={() => setZoomScale(z => z > 1 ? 1 : 2.5)}
          />
          {images.length > 1 && zoomScale === 1 && (
            <>
              <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center bg-white/10 hover:bg-white/20 transition-colors hidden sm:flex">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center bg-white/10 hover:bg-white/20 transition-colors hidden sm:flex">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          {zoomScale === 1 && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              Doppio tap per zoomare · scorri per chiudere
            </p>
          )}
        </div>
      )}
    </>
  )
}
