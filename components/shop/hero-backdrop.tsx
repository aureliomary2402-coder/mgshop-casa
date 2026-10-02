import type { ReactNode } from 'react'
import { AmbientBubbles } from './ambient-bubbles'

// Sfondo scuro condiviso da tutte le hero del sito: glow cyan, griglia in
// prospettiva e bolle. Stesso look della landing (app/page.tsx).
// Il contenitore che lo usa deve essere "relative overflow-hidden bg-[#06151c]".
export function HeroBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[80px] h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[110px]" />
        <div className="absolute right-[-160px] top-[160px] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[130px]" />
        <div className="absolute bottom-[-250px] left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(103,232,249,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.35) 1px, transparent 1px)',
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
      <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-sky-300 bg-clip-text text-transparent">
        {ultima}
      </span>
    </>
  )
}
