import type { ReactNode } from 'react'
import { AmbientBubbles } from './ambient-bubbles'

// Sfondo scuro condiviso da tutte le hero del sito: glow cyan, griglia in
// prospettiva e bolle. Stesso look della landing (app/page.tsx).
// Il contenitore che lo usa deve essere "relative overflow-hidden bg-[#120a22]".
export function HeroBackdrop() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-3 select-none text-5xl leading-none -rotate-6 sm:text-7xl">🎃</span>
      <span aria-hidden="true" className="pointer-events-none absolute left-1 top-[46%] select-none text-4xl leading-none rotate-12 sm:text-6xl">🎃</span>
      <span aria-hidden="true" className="pointer-events-none absolute right-2 top-24 select-none text-3xl leading-none rotate-6 sm:text-5xl">🎃</span>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[80px] h-[420px] w-[420px] rounded-full bg-zucca-400/15 blur-[110px]" />
        <div className="absolute right-[-160px] top-[160px] h-[500px] w-[500px] rounded-full bg-purple-900/30 blur-[130px]" />
        <div className="absolute bottom-[-250px] left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-zucca-300/10 blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,184,119,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,119,.35) 1px, transparent 1px)',
            backgroundSize: '70px 70px',
            transform: 'perspective(500px) rotateX(62deg) scale(1.8)',
            transformOrigin: 'center bottom',
          }}
        />
      </div>
      <AmbientBubbles count={7} theme="dark" />
    </>
  )
}

// Titolo in stile landing: bianco, con l'ultima parola sfumata cyan.
// Se il titolo non è una semplice stringa viene mostrato così com'è.
export function AccentTitle({ text }: { text: ReactNode }) {
  if (typeof text !== 'string') return <>{text}</>
  const parole = text.trim().split(/\s+/)
  const ultima = parole.pop() as string
  return (
    <>
      {parole.length > 0 && <>{parole.join(' ')}{' '}</>}
      <span className="bg-gradient-to-r from-yellow-100 via-yellow-300 to-yellow-100 bg-clip-text text-transparent">
        {ultima}
      </span>
    </>
  )
}
