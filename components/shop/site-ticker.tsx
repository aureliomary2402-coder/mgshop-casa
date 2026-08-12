"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

const TICKER_BUBBLES = Array.from({ length: 10 }).map((_, i) => ({
  left: `${(i * 97) % 100}%`,
  size: 4 + ((i * 13) % 8),
  dur: 4 + ((i * 11) % 4),
  delay: (i * 1.4) % 6,
}))

// Scintillii sparsi lungo la cresta di schiuma (posizioni in %, va bene:
// sono solo accenti sparkle sopra al pattern di schiuma che invece
// si ripete a piastrelle su tutta la larghezza, senza buchi)
const FOAM_SPARKLES = Array.from({ length: 16 }).map((_, i) => ({
  left: `${(i * 6.4 + (i % 3) * 9) % 100}%`,
  size: 3 + ((i * 5) % 4),
  bottom: -2 + ((i * 7) % 16),
  dur: 1.8 + ((i * 0.6) % 2.2),
  delay: (i * 0.35) % 3,
}))

// Bollicine che "scoppiano" sulla cresta della schiuma: nascono, si gonfiano
// e fanno pop, dando movimento vivo e tridimensionale invece di una texture ferma
const POP_BUBBLES = Array.from({ length: 12 }).map((_, i) => ({
  left: `${(i * 8.3 + (i % 4) * 5) % 100}%`,
  size: 7 + ((i * 11) % 13),
  bottom: -1 + ((i * 5) % 12),
  dur: 3.2 + ((i * 0.9) % 3),
  delay: (i * 1.1) % 8,
}))

export function SiteTicker() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/ticker')
      .then(r => r.json())
      .then(d => {
        setMessage(d.message || '')
        setIsActive(d.is_active === true)
      })
      .catch(() => {})
    // Nasconde di nuovo solo per questa "sessione" di navigazione (tab aperta),
    // così chi lo chiude non lo rivede continuando a girare per il sito,
    // ma tornando in un secondo momento lo trova di nuovo.
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true)
    }
  }, [])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <>
    <div className="fixed left-0 right-0 h-14 overflow-visible pointer-events-none" style={{ bottom: 24, zIndex: 60 }}>
      {TICKER_BUBBLES.map((b, i) => (
        <div key={i} className="absolute rounded-full site-ticker-bubble"
          style={{
            left: b.left, bottom: 0, width: b.size, height: b.size,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
      ))}
    </div>
    <div className="fixed left-0 right-0 pointer-events-none site-ticker-foam-wrap" style={{ bottom: 32, zIndex: 50 }}>
      <div className="site-ticker-foam site-ticker-foam-wave" />
      <div className="site-ticker-foam site-ticker-foam-back" />
      <div className="site-ticker-foam site-ticker-foam-mid" />
      <div className="site-ticker-foam site-ticker-foam-solid" />
      <div className="site-ticker-foam site-ticker-foam-front" />
      <div className="site-ticker-foam-shine" />
      {FOAM_SPARKLES.map((s, i) => (
        <span key={i} className="absolute rounded-full site-ticker-foam-sparkle"
          style={{
            left: s.left, bottom: s.bottom, width: s.size, height: s.size,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
          }} />
      ))}
      {POP_BUBBLES.map((p, i) => (
        <span key={i} className="absolute rounded-full site-ticker-pop-bubble"
          style={{
            left: p.left, bottom: p.bottom, width: p.size, height: p.size,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
          }} />
      ))}
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center h-8 overflow-hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)] site-ticker-bg">
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center whitespace-nowrap animate-site-ticker">
          <span className="text-white text-xs font-semibold px-6">{message}</span>
          <span className="text-white text-xs font-semibold px-6">{message}</span>
          <span className="text-white text-xs font-semibold px-6">{message}</span>
        </div>
        <div className="site-ticker-shine" />
      </div>
      <button onClick={handleDismiss} aria-label="Chiudi" className="shrink-0 h-full px-2.5 flex items-center justify-center hover:bg-black/10 transition-colors relative z-10">
        <X className="w-3.5 h-3.5 text-white/80" />
      </button>
      <style jsx global>{`
        .site-ticker-bg {
          background: linear-gradient(270deg, #0891b2, #0e7490, #06b6d4, #0891b2);
          background-size: 300% 100%;
          animation: site-ticker-gradient 10s ease infinite;
        }
        @keyframes site-ticker-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes site-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .animate-site-ticker {
          animation: site-ticker-scroll 18s linear infinite;
        }
        .site-ticker-shine {
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);
          animation: site-ticker-shine-sweep 5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes site-ticker-shine-sweep {
          0% { left: -30%; }
          35% { left: 130%; }
          100% { left: 130%; }
        }

        /* ===== SCHIUMA 3D ===== */
        .site-ticker-foam-wrap {
          height: 0;
          perspective: 300px;
        }
        .site-ticker-foam {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -7px;
          height: 26px;
          background-repeat: repeat-x;
          background-position: bottom;
        }

        /* Onda liquida di base: bordo superiore che ondeggia davvero,
           non un pattern fisso. Da' il senso di superficie viva. */
        .site-ticker-foam-wave {
          bottom: -16px;
          height: 36px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(207,250,254,0.92) 45%, rgba(8,145,178,0.4) 100%);
          clip-path: polygon(0% 55%, 8% 28%, 16% 55%, 24% 22%, 32% 55%, 40% 18%, 48% 55%, 56% 26%, 64% 55%, 72% 16%, 80% 55%, 88% 30%, 96% 55%, 100% 42%, 100% 100%, 0% 100%);
          filter: drop-shadow(0 -1px 2px rgba(8,145,178,0.25));
          animation: site-ticker-wave-morph 4.2s ease-in-out infinite, site-ticker-wave-drift 6.5s linear infinite;
        }
        @keyframes site-ticker-wave-morph {
          0%, 100% { clip-path: polygon(0% 55%, 8% 28%, 16% 55%, 24% 22%, 32% 55%, 40% 18%, 48% 55%, 56% 26%, 64% 55%, 72% 16%, 80% 55%, 88% 30%, 96% 55%, 100% 42%, 100% 100%, 0% 100%); }
          50% { clip-path: polygon(0% 44%, 8% 58%, 16% 24%, 24% 58%, 32% 20%, 40% 58%, 48% 26%, 56% 58%, 64% 18%, 72% 58%, 80% 28%, 88% 58%, 96% 22%, 100% 56%, 100% 100%, 0% 100%); }
        }
        @keyframes site-ticker-wave-drift {
          from { transform: translateX(0); }
          to { transform: translateX(-48px); }
        }

        /* Bolle glossy con vera ombreggiatura sferica (luce in alto a sx,
           corpo cangiante, bordo in ombra): questo e' cio' che le fa
           sembrare 3D invece di semplici cerchi piatti. */
        .site-ticker-foam-back {
          bottom: -3px;
          height: 20px;
          opacity: 0.5;
          filter: blur(1.4px);
          background-image:
            radial-gradient(circle at 30% 24%, #fff 0%, #fff 10%, rgba(224,247,250,0.85) 26%, rgba(103,212,231,0.5) 52%, rgba(8,145,178,0.28) 76%, transparent 100%);
          background-position: 4px 10px, 22px 14px, 40px 9px;
          background-size: 46px 20px;
          animation: site-ticker-foam-drift-back 12s linear infinite, site-ticker-foam-bob 4.4s ease-in-out infinite;
        }
        .site-ticker-foam-mid {
          bottom: -6px;
          height: 23px;
          opacity: 0.72;
          filter: blur(0.5px);
          background-image:
            radial-gradient(circle at 30% 24%, #fff 0%, #fff 11%, rgba(224,247,250,0.88) 28%, rgba(103,212,231,0.52) 54%, rgba(8,145,178,0.3) 78%, transparent 100%);
          background-size: 34px 23px;
          animation: site-ticker-foam-drift-mid 8.5s linear infinite reverse, site-ticker-foam-bob 3.1s ease-in-out infinite 0.5s;
        }
        .site-ticker-foam-solid {
          bottom: -9px;
          height: 22px;
          background-image:
            radial-gradient(circle at 28% 22%, #fff 0%, #fff 13%, rgba(224,247,250,0.92) 30%, rgba(120,220,235,0.55) 56%, rgba(8,145,178,0.32) 80%, transparent 100%);
          background-position: 7px 12px, 21px 12px;
          background-size: 28px 22px;
          animation: site-ticker-foam-bob 3.7s ease-in-out infinite 0.2s;
        }
        .site-ticker-foam-front {
          background-image:
            radial-gradient(circle at 32% 24%, #fff 0%, #fff 14%, rgba(240,253,255,0.95) 32%, rgba(150,230,245,0.5) 58%, rgba(8,145,178,0.25) 82%, transparent 100%);
          background-size: 26px 26px;
          animation: site-ticker-foam-drift-front 5.8s linear infinite reverse, site-ticker-foam-bob 2.4s ease-in-out infinite 0.3s;
        }
        @keyframes site-ticker-foam-drift-back {
          from { background-position-x: 0; }
          to { background-position-x: -92px; }
        }
        @keyframes site-ticker-foam-drift-mid {
          from { background-position-x: 0; }
          to { background-position-x: -68px; }
        }
        @keyframes site-ticker-foam-drift-front {
          from { background-position-x: 0; }
          to { background-position-x: 52px; }
        }
        @keyframes site-ticker-foam-bob {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-2.5px) scaleY(1.04); }
        }

        /* Riflesso di luce che scorre sopra la cresta di schiuma */
        .site-ticker-foam-shine {
          position: absolute;
          bottom: -14px;
          left: -40%;
          width: 40%;
          height: 30px;
          background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
          mix-blend-mode: screen;
          animation: site-ticker-foam-shine-sweep 4.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes site-ticker-foam-shine-sweep {
          0% { left: -40%; }
          40% { left: 130%; }
          100% { left: 130%; }
        }

        .site-ticker-foam-sparkle {
          background: #fff;
          box-shadow: 0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(150,235,250,0.6);
          animation-name: site-ticker-foam-sparkle-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-foam-sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50% { opacity: 1; transform: scale(1); }
        }

        /* Bollicine che nascono, si gonfiano e scoppiano sulla cresta */
        .site-ticker-pop-bubble {
          background: radial-gradient(circle at 32% 26%, #fff 0%, rgba(255,255,255,0.9) 18%, rgba(190,240,250,0.55) 45%, rgba(8,145,178,0.25) 72%, transparent 100%);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: inset -1px -1px 2px rgba(8,145,178,0.25), inset 1px 1px 2px rgba(255,255,255,0.7);
          animation-name: site-ticker-pop;
          animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-pop {
          0% { transform: scale(0.3); opacity: 0; }
          12% { opacity: 0.85; }
          55% { transform: scale(1); opacity: 0.9; }
          78% { transform: scale(1.25); opacity: 0.7; }
          88% { transform: scale(1.7); opacity: 0.35; box-shadow: 0 0 0 3px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(8,145,178,0.25), inset 1px 1px 2px rgba(255,255,255,0.7); }
          100% { transform: scale(2.1); opacity: 0; box-shadow: 0 0 0 9px rgba(255,255,255,0); }
        }

        .site-ticker-bubble {
          background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75), rgba(8,145,178,0.12) 60%, transparent 100%);
          box-shadow: inset -1px -1px 3px rgba(255,255,255,0.3), inset 1px 1px 2px rgba(8,145,178,0.1);
          border: 1px solid rgba(255,255,255,0.25);
          animation-name: site-ticker-bubble-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-bubble-rise {
          0% { transform: translateY(0) scale(0.4); opacity: 0; }
          10% { opacity: 0.75; }
          65% { transform: translateY(-30px) scale(0.9); opacity: 0.6; }
          88% { transform: translateY(-42px) scale(1.1); opacity: 0.25; }
          100% { transform: translateY(-48px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
    </>
  )
}
