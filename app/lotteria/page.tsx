"use client"
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Gift, History, PartyPopper, ImageIcon } from 'lucide-react'
import { Reveal } from '@/components/shop/reveal'

interface Winner {
  id: string; lottery_title: string; prize_label: string; prize_image_url: string | null
  winner_number: number; participants_count: number; drawn_at: string
}
interface LotteryData {
  is_active: boolean; title?: string; description?: string; image_url?: string | null
  prize_label?: string; participants_count?: number; ends_at?: string | null
  revealed?: boolean; winner_number?: number | null; winners: Winner[]
}

function bubbleSize(count: number) {
  if (count <= 20) return 56
  if (count <= 60) return 42
  if (count <= 150) return 30
  return 22
}

function Countdown({ remaining }: { remaining: number }) {
  if (remaining <= 0) return <div className="text-center text-cyan-200/50 text-sm">Estrazione in corso...</div>
  const d = Math.floor(remaining / 86400000)
  const h = Math.floor((remaining % 86400000) / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return (
    <div className="flex items-center justify-center gap-3">
      {[{ v: d, l: 'Giorni' }, { v: h, l: 'Ore' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' }].map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-3">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 4px 16px rgba(8,145,178,0.3)' }}>{String(v).padStart(2, '0')}</div>
            <p className="text-xs text-cyan-200/50 mt-1">{l}</p>
          </div>
          {i < 3 && <span className="text-cyan-500 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  )
}

export default function LotteryPage() {
  const [data, setData] = useState<LotteryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'popping' | 'revealed'>('idle')
  const [winnerNumber, setWinnerNumber] = useState<number | null>(null)
  const fetchedReveal = useRef(false)

  const fetchData = () =>
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => { setData(d); setLoading(false); return d })

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!data?.ends_at) return
    const calc = () => setRemaining(new Date(data.ends_at as string).getTime() - Date.now())
    calc()
    const i = setInterval(calc, 1000)
    return () => clearInterval(i)
  }, [data?.ends_at])

  useEffect(() => {
    if (!data || !data.ends_at || remaining > 0) return
    if (data.revealed && data.winner_number) {
      if (phase === 'idle') { setWinnerNumber(data.winner_number); setPhase('popping') }
      return
    }
    if (fetchedReveal.current) return
    fetchedReveal.current = true
    const t = setTimeout(() => { fetchData() }, 1200)
    return () => clearTimeout(t)
  }, [remaining, data, phase])

  useEffect(() => {
    if (phase !== 'popping') return
    const t = setTimeout(() => setPhase('revealed'), 2200)
    return () => clearTimeout(t)
  }, [phase])

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-10 w-2/3 mx-auto rounded-lg" />
      </div>
    </div>
  )

  if (!data || !data.is_active) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0fbfd' }}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(8,145,178,0.08)', border: '2px dashed rgba(8,145,178,0.2)' }}><Gift className="w-12 h-12" style={{ color: 'rgba(8,145,178,0.4)' }} /></div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0c2b36' }}>Nessuna lotteria attiva</h1>
        <p className="text-slate-400 mb-8">Torna presto per partecipare alle nostre estrazioni!</p>
        <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}><ArrowLeft className="w-4 h-4" /> Vai al negozio</Link>
      </div>
    </div>
  )

  const count = data.participants_count || 10
  const size = bubbleSize(count)
  const revealPhase = phase !== 'idle'

  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0c2b36,#06303d)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle,#0891b2,transparent)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors mb-6"><ArrowLeft className="w-4 h-4" /> Negozio</Link>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-cyan-300 text-sm font-medium mb-4" style={{ background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)' }}><Gift className="w-4 h-4" /> Lotteria a premi</div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">{data.title}</h1>
          {data.description && <p className="text-lg text-cyan-200/60 mb-6 whitespace-pre-line">{data.description}</p>}
          {data.ends_at && !revealPhase && (
            <div className="mb-2">
              <div className="flex items-center justify-center gap-2 text-cyan-400/60 text-sm mb-3"><Clock className="w-4 h-4" /> Estrazione tra:</div>
              <Countdown remaining={remaining} />
            </div>
          )}
          {revealPhase && (
            <div className="mt-2 animate-scale-in">
              <div className="inline-flex items-center gap-2 text-white font-bold text-xl px-6 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
                <PartyPopper className="w-6 h-6" /> Numero vincente: #{winnerNumber}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Premio */}
        {(data.image_url || data.prize_label) && (
          <Reveal className={`grid gap-6 ${data.image_url && data.prize_label ? 'md:grid-cols-2' : ''}`}>
            {data.image_url && <div className="rounded-2xl overflow-hidden aspect-square max-w-xs mx-auto md:mx-0" style={{ boxShadow: '0 16px 40px rgba(8,145,178,0.12)' }}><img src={data.image_url} alt="Premio" className="w-full h-full object-cover" /></div>}
            {data.prize_label && (
              <div className="flex items-center">
                <div className="bg-white rounded-2xl p-6 w-full" style={{ border: '1px solid rgba(8,145,178,0.1)' }}>
                  <p className="text-xs font-medium text-cyan-600 mb-1 flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> In palio</p>
                  <p className="text-lg font-bold" style={{ color: '#0c2b36' }}>{data.prize_label}</p>
                </div>
              </div>
            )}
          </Reveal>
        )}

        {/* Bolle */}
        <Reveal delay={100}>
          <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: '#0c2b36' }}>{count} bolle in gioco</h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            {revealPhase ? 'Tutte le bolle sono scoppiate tranne quella vincente!' : 'Allo scadere del tempo, tutte le bolle scoppieranno tranne quella vincente'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 py-6">
            {Array.from({ length: count }).map((_, idx) => {
              const num = idx + 1
              const isWinner = winnerNumber === num
              const popped = revealPhase && !isWinner
              const winnerGlow = isWinner && revealPhase
              const delay = ((idx * 47) % 24) / 24 * 1.1
              return (
                <div key={num}
                  className={!revealPhase ? 'animate-bubble-bob' : ''}
                  style={{
                    width: size, height: size, borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(9, size * 0.32), fontWeight: 700,
                    color: winnerGlow ? '#fff' : '#0e7490',
                    background: winnerGlow
                      ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                      : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(8,145,178,0.18) 55%, transparent 100%)',
                    boxShadow: winnerGlow ? '0 0 24px rgba(249,115,22,0.6)' : '0 2px 6px rgba(8,145,178,0.12)',
                    border: '1px solid rgba(8,145,178,0.2)',
                    animation: popped
                      ? `bubblePop 0.6s ease-in ${delay}s both`
                      : winnerGlow
                        ? `bubbleReveal 1s cubic-bezier(0.22,1.2,0.36,1) ${delay}s both`
                        : undefined,
                    animationDelay: !revealPhase ? `${(idx % 5) * 0.3}s` : undefined,
                  }}>
                  {num}
                </div>
              )
            })}
          </div>
        </Reveal>

        {/* Storico */}
        {data.winners.length > 0 && (
          <Reveal delay={150}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#0c2b36' }}><History className="w-5 h-5" /> Storico vincitori</h2>
            <div className="space-y-2">
              {data.winners.map(w => (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white" style={{ border: '1px solid rgba(8,145,178,0.1)' }}>
                  {w.prize_image_url
                    ? <img src={w.prize_image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(8,145,178,0.08)' }}><ImageIcon className="w-5 h-5" style={{ color: 'rgba(8,145,178,0.3)' }} /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{w.lottery_title}</p>
                    <p className="text-xs text-slate-400 truncate">{w.prize_label} · Numero vincente #{w.winner_number} su {w.participants_count}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{new Date(w.drawn_at).toLocaleDateString('it-IT')}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={200} className="text-center py-6">
          <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 12px 32px rgba(8,145,178,0.35)' }}>
            <ArrowLeft className="w-5 h-5" /> Vai al negozio
          </Link>
        </Reveal>
      </div>
    </div>
  )
}
