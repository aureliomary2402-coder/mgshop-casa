"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Tag, ShoppingBag } from 'lucide-react'

interface PromoData { is_active: boolean; title: string; subtitle: string; content: string; image_url: string; badge_text: string; expires_at: string }

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState({ days:0, hours:0, minutes:0, seconds:0 })
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const calc = () => { const d = new Date(expiresAt).getTime()-Date.now(); if(d<=0){setExpired(true);return} setT({days:Math.floor(d/86400000),hours:Math.floor((d%86400000)/3600000),minutes:Math.floor((d%3600000)/60000),seconds:Math.floor((d%60000)/1000)}) }
    calc(); const i=setInterval(calc,1000); return ()=>clearInterval(i)
  },[expiresAt])
  if(expired) return <div className="text-center text-stone-400 text-sm">Offerta scaduta</div>
  return (
    <div className="flex items-center justify-center gap-3">
      {[{v:t.days,l:'Giorni'},{v:t.hours,l:'Ore'},{v:t.minutes,l:'Min'},{v:t.seconds,l:'Sec'}].map(({v,l},i)=>(
        <div key={l} className="flex items-center gap-3">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl text-white" style={{background:'linear-gradient(135deg,#d97706,#f59e0b)',boxShadow:'0 4px 16px rgba(217,119,6,0.3)'}}>{String(v).padStart(2,'0')}</div>
            <p className="text-xs text-stone-400 mt-1">{l}</p>
          </div>
          {i<3&&<span className="text-amber-500 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  )
}

export default function PromoPage() {
  const [promo, setPromo] = useState<PromoData|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch('/api/promo', { cache: 'no-store' })
      .then(r=>r.json())
      .then(d=>{setPromo(d);setLoading(false)})
      .catch(()=>setLoading(false))
  },[])

  if(loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#faf7f2'}}><div className="w-10 h-10 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin"/></div>

  if(!promo || promo.is_active !== true) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#faf7f2'}}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(217,119,6,0.08)',border:'2px dashed rgba(217,119,6,0.2)'}}><ShoppingBag className="w-12 h-12" style={{color:'rgba(217,119,6,0.4)'}}/></div>
        <h1 className="text-2xl font-bold mb-2" style={{color:'#1a0800'}}>Nessuna promo attiva</h1>
        <p className="text-stone-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#d97706,#f59e0b)'}}><ArrowLeft className="w-4 h-4"/> Torna al negozio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#faf7f2'}}>
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#1a0800,#2d1500)'}}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{background:'radial-gradient(circle,#d97706,transparent)'}}/>
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-400/60 hover:text-amber-300 text-sm mb-8 transition-colors"><ArrowLeft className="w-4 h-4"/> Torna al negozio</Link>
          {promo.badge_text&&<div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-amber-300 text-sm font-medium mb-6" style={{background:'rgba(217,119,6,0.15)',border:'1px solid rgba(217,119,6,0.3)'}}><Tag className="w-4 h-4"/> {promo.badge_text}</div>}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">{promo.title}</h1>
          {promo.subtitle&&<p className="text-xl text-amber-200/60 mb-8">{promo.subtitle}</p>}
          {promo.expires_at&&<div className="mb-8"><div className="flex items-center justify-center gap-2 text-amber-400/60 text-sm mb-4"><Clock className="w-4 h-4"/> Offerta valida ancora per:</div><Countdown expiresAt={promo.expires_at}/></div>}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {(promo.image_url||promo.content)&&(
          <div className={`grid gap-8 ${promo.image_url&&promo.content?'md:grid-cols-2':''}`}>
            {promo.image_url&&<div className="rounded-2xl overflow-hidden" style={{boxShadow:'0 16px 40px rgba(217,119,6,0.12)'}}><img src={promo.image_url} alt="Promo" className="w-full h-full object-cover max-h-80"/></div>}
            {promo.content&&<div className="flex items-center"><div className="bg-white rounded-2xl p-6 w-full" style={{border:'1px solid rgba(217,119,6,0.1)'}}><p className="text-stone-600 leading-relaxed whitespace-pre-line">{promo.content}</p></div></div>}
          </div>
        )}
        <div className="text-center py-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#d97706,#f59e0b)',boxShadow:'0 12px 32px rgba(217,119,6,0.35)'}}>
            <ShoppingBag className="w-5 h-5"/> Vai al negozio completo
          </Link>
        </div>
      </div>
    </div>
  )
}
