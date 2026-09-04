#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "app/consegne"
cat > "app/consegne/page.tsx" << 'ZONEEOF'
"use client"
import Link from 'next/link'
import { ArrowLeft, MapPin, Truck, ShoppingBag, Banknote } from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { Reveal } from '@/components/shop/reveal'

const ZONES = [
  {
    title: 'Aci Sant\u2019Antonio',
    price: 'Consegna gratuita',
    highlight: true,
    note: 'Nessun costo di consegna per gli ordini in città.',
  },
  {
    title: 'Paesi etnei',
    price: 'Consegna a €2,00',
    highlight: false,
    note: 'Piccolo contributo per la consegna nei comuni della zona etnea.',
  },
]

export default function ConsegnePage() {
  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0c2b36,#06303d)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle,#0891b2,transparent)' }} />
        <AmbientBubbles count={9} theme="dark" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Negozio
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-cyan-300 text-sm font-medium mb-4"
            style={{ background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)' }}>
            <Truck className="w-4 h-4" /> Zone di consegna
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">Dove consegniamo</h1>
          <p className="text-lg text-cyan-200/60 max-w-xl mx-auto">
            Siamo un negozio online: Consegniamo direttamente a casa tua nelle zone qui sotto.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-6">
          <Reveal>
            <div className="grid sm:grid-cols-2 gap-5">
              {ZONES.map(z => (
                <div key={z.title} className="bg-white rounded-2xl p-6"
                  style={{
                    border: z.highlight ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(8,145,178,0.12)',
                    boxShadow: '0 4px 20px rgba(8,145,178,0.08)',
                  }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: z.highlight ? 'rgba(22,163,74,0.1)' : 'rgba(8,145,178,0.1)' }}>
                    <MapPin className="w-5 h-5" style={{ color: z.highlight ? '#16a34a' : '#0891b2' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#0c2b36' }}>{z.title}</h3>
                  <p className="text-xl font-extrabold mb-2" style={{ color: z.highlight ? '#16a34a' : '#0891b2' }}>{z.price}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{z.note}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
              <Banknote className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-green-700">Pagamento alla consegna:</strong> paghi comodamente in contanti quando ricevi l&apos;ordine, nessun pagamento online richiesto.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-sm text-slate-400 text-center">
              La tua zona non è in elenco? Scrivici in chat o su WhatsApp: verifichiamo se possiamo comunque consegnarti l&apos;ordine.
            </p>
          </Reveal>

          <Reveal delay={200} className="text-center pt-4">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 12px 32px rgba(8,145,178,0.35)' }}>
              <ShoppingBag className="w-5 h-5" /> Vai al negozio
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
ZONEEOF

mkdir -p "app"
cat > "app/page.tsx" << 'ZONEEOF'
"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Sparkles, ArrowRight, Tag, Newspaper, Gift, MapPin } from 'lucide-react'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/shop/social-icons'
import { CodBanner } from '@/components/shop/cod-banner'

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [promoActive, setPromoActive] = useState(false)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const [lotteryActive, setLotteryActive] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(d.is_active === true)).catch(() => {})
    fetch('/api/lottery').then(r => r.json()).then(d => setLotteryActive(d.is_active === true)).catch(() => {})
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    window.addEventListener('mousemove', h, { passive: true })
    return () => window.removeEventListener('mousemove', h)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#03131a 0%,#0c2b36 40%,#06303d 70%,#0c2b36 100%)' }}>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full"
          style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${mousePos.x * 80}px),calc(-50% + ${mousePos.y * 60}px))`, transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="w-full h-full rounded-full blur-[120px] opacity-25 animate-breathe" style={{ background: 'radial-gradient(circle,#0891b2,#155e75)' }} />
        </div>
        <div className="absolute w-[400px] h-[400px] rounded-full"
          style={{ top: '30%', left: '30%', transform: `translate(calc(-50% + ${mousePos.x * -50}px),calc(-50% + ${mousePos.y * -40}px))`, transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="w-full h-full rounded-full blur-[80px] opacity-15 animate-breathe" style={{ background: 'radial-gradient(circle,#06b6d4,#0e7490)', animationDelay: '2s' }} />
        </div>
        {/* Bolle di sapone in salita */}
        {[
          { left: '5%', size: 46, dur: 11, delay: 0 },
          { left: '13%', size: 22, dur: 9, delay: 1.2 },
          { left: '20%', size: 60, dur: 14, delay: 2.5 },
          { left: '28%', size: 16, dur: 8, delay: 0.5 },
          { left: '35%', size: 34, dur: 12, delay: 3.8 },
          { left: '43%', size: 20, dur: 9.5, delay: 1.8 },
          { left: '50%', size: 52, dur: 13, delay: 4.5 },
          { left: '58%', size: 26, dur: 10, delay: 0.2 },
          { left: '65%', size: 40, dur: 11.5, delay: 2.2 },
          { left: '72%', size: 18, dur: 8.5, delay: 3.2 },
          { left: '79%', size: 58, dur: 15, delay: 1 },
          { left: '86%', size: 24, dur: 9, delay: 4 },
          { left: '92%', size: 36, dur: 12.5, delay: 2.8 },
          { left: '96%', size: 14, dur: 7.5, delay: 0.8 },
          { left: '9%', size: 28, dur: 10.5, delay: 5.2 },
          { left: '62%', size: 44, dur: 13.5, delay: 5.8 },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full animate-bubble-rise"
            style={{
              left: b.left, bottom: '-80px', width: b.size, height: b.size,
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(110,210,230,0.18) 45%, rgba(70,150,175,0.06) 72%, transparent 100%)',
              boxShadow: 'inset -4px -4px 10px rgba(255,255,255,0.35), inset 3px 3px 8px rgba(8,145,178,0.15), 0 0 14px rgba(150,235,250,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
            }} />
        ))}

        {/* Bolle che scoppiano vicino al centro */}
        {[
          { left: '30%', top: '35%', size: 30, delay: 0.5 },
          { left: '68%', top: '28%', size: 22, delay: 2 },
          { left: '48%', top: '55%', size: 18, delay: 3.5 },
        ].map((b, i) => (
          <div key={`pop-${i}`} className="absolute rounded-full animate-bubble-pop"
            style={{
              left: b.left, top: b.top, width: b.size, height: b.size,
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.8), rgba(110,210,230,0.15) 50%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              animationDuration: '5s', animationDelay: `${b.delay}s`,
            }} />
        ))}
      </div>

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className={`relative z-10 text-center px-6 max-w-2xl mx-auto ${mounted ? 'animate-bubble-reveal' : 'opacity-0'}`}>
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 animate-float"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 20px 60px rgba(8,145,178,0.5)' }}>
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white leading-none mb-3">
            MG<span className="text-shimmer">Shop</span>
          </h1>
          <p className="text-xl text-cyan-200/40 tracking-[0.3em] uppercase font-light">Casa</p>
        </div>

        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Prodotti selezionati per la tua casa.<br />Qualità e stile in ogni angolo.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/shop"
            className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl text-white transition-all hover:scale-105 active:scale-95 btn-press neon-glow"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <ShoppingBag className="w-5 h-5" /> Sfoglia il negozio
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {promoActive ? (
            <Link href="/promo"
              className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 btn-press neon-glow"
              style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.3)', color: '#ffffff' }}>
              <Sparkles className="w-5 h-5" /> Vedi le promo
              <span className="text-xs bg-cyan-500 text-black px-2 py-0.5 rounded-full font-semibold">OFFERTE</span>
            </Link>
          ) : (
            <Link href="/promo"
              className="w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 btn-press"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <Tag className="w-5 h-5" /> Promozioni
            </Link>
          )}

          {volantinoActive ? (
            <Link href="/volantino"
              className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 btn-press neon-glow"
              style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.3)', color: '#ffffff' }}>
              <Newspaper className="w-5 h-5" /> Vedi il volantino
              <span className="text-xs bg-cyan-500 text-black px-2 py-0.5 rounded-full font-semibold">VOLANTINO</span>
            </Link>
          ) : (
            <Link href="/volantino"
              className="w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 btn-press"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <Newspaper className="w-5 h-5" /> Volantino
            </Link>
          )}

          {lotteryActive ? (
            <Link href="/lotteria"
              className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 btn-press neon-glow"
              style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.3)', color: '#ffffff' }}>
              <Gift className="w-5 h-5" /> Partecipa alla lotteria
              <span className="text-xs bg-cyan-500 text-black px-2 py-0.5 rounded-full font-semibold">LOTTERIA</span>
            </Link>
          ) : (
            <Link href="/lotteria"
              className="w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 btn-press"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <Gift className="w-5 h-5" /> Lotteria
            </Link>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <CodBanner variant="dark" />
        </div>

        <div className="flex justify-center mb-6 -mt-3">
          <Link href="/consegne" className="inline-flex items-center gap-1.5 text-xs text-cyan-300/70 hover:text-cyan-200 transition-colors underline underline-offset-2">
            <MapPin className="w-3.5 h-3.5" /> Zone di consegna
          </Link>
        </div>

        {/* Icone social */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press neon-glow-pink"
            style={{ background: 'rgba(217,70,160,0.15)', border: '1px solid rgba(217,70,160,0.3)', color: '#f472b6' }}>
            <InstagramIcon size={19} />
          </a>
          <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press neon-glow-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e5e5' }}>
            <TikTokIcon size={18} />
          </a>
          <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press neon-glow-green"
            style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
            <WhatsAppIcon size={19} />
          </a>
        </div>

        <div className="flex items-center justify-center gap-8 mt-10">
          {[['400+', 'Prodotti'], ['⭐⭐⭐⭐⭐', 'Qualità'], ['🚚', 'Consegna rapida']].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="text-lg font-bold text-cyan-400">{v}</div>
              <div className="text-xs text-cyan-200/30 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
ZONEEOF

mkdir -p "components/shop"
cat > "components/shop/cart-content.tsx" << 'ZONEEOF'
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ImageIcon, CheckCircle, ShoppingCart, Tag, X, Gift, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { LoyaltyBanner } from './loyalty-banner'
import { CodBanner } from './cod-banner'

export function CartContent({ scope = 'shop' }: { scope?: string }) {
  const [mounted, setMounted] = useState(false)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponData, setCouponData] = useState<{ discount_percent: number; discount_fixed: number; code: string; scope: string } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [promoProductIds, setPromoProductIds] = useState<string[]>([])
  const [lotteryActive, setLotteryActive] = useState(false)
  const [lotteryPrizeLabel, setLotteryPrizeLabel] = useState('')
  const [joinLottery, setJoinLottery] = useState(false)
  const [wonNumber, setWonNumber] = useState<number | null>(null)

  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)
  const clearCart = useCartStore(s => s.clearCart)
  const getTotalPrice = useCartStore(s => s.getTotalPrice)

  useEffect(() => {
    setMounted(true)
    // Carica quali prodotti fanno parte della promo attiva, per calcolare lo sconto solo su quelli quando serve
    fetch('/api/promo', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPromoProductIds(d?.is_active ? (d.featured_product_ids || []) : []))
      .catch(() => setPromoProductIds([]))
    fetch('/api/lottery', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setLotteryActive(d?.is_active === true); setLotteryPrizeLabel(d?.prize_label || '') })
      .catch(() => {})
  }, [])

  const subtotal = mounted ? getTotalPrice() : 0
  // Se il coupon vale solo per la promo, lo sconto si calcola solo sui prodotti in promo presenti nel carrello
  const promoSubtotal = items.reduce((sum, i) => promoProductIds.includes(i.product.id) ? sum + i.product.price * i.quantity : sum, 0)
  const discountBase = couponData?.scope === 'promo' ? promoSubtotal : subtotal
  const discountAmount = couponData
    ? couponData.discount_percent > 0
      ? discountBase * couponData.discount_percent / 100
      : Math.min(couponData.discount_fixed, discountBase)
    : 0
  const total = Math.max(0, subtotal - discountAmount) + (joinLottery ? 1 : 0)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true); setCouponError('')
    const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponInput, scope }) })
    const data = await res.json()
    if (res.ok) { setCouponData(data); setCouponCode(couponInput); setCouponInput('') }
    else setCouponError(data.error || 'Coupon non valido')
    setCouponLoading(false)
  }

  const removeCoupon = () => { setCouponData(null); setCouponCode(''); setCouponError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!phone.trim()) { setError('Inserisci il tuo numero di telefono'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_number: phone, items, total, coupon_code: couponCode || null, lottery_entry: joinLottery }) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.lottery_number) setWonNumber(data.lottery_number)
      clearCart(); setSubmitted(true)
    } catch { setError('Si è verificato un errore. Riprova.') }
    finally { setSubmitting(false) }
  }

  if (!mounted) return (
    <div className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-2xl bg-white border border-slate-100">
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-4 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton rounded-2xl h-64" />
    </div>
  )

  if (submitted) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="relative w-24 h-24 mx-auto mb-6">
        {['#0891b2','#06b6d4','#22d3ee','#16a34a','#ef4444','#3b82f6'].map((color, i) => (
          <div key={i} className="confetti-piece"
            style={{
              left: `${50 + (i % 2 === 0 ? -1 : 1) * (10 + i * 6)}%`,
              top: '10%',
              width: 6, height: 6,
              background: color,
              borderRadius: i % 3 === 0 ? '50%' : '2px',
              animationDelay: `${i * 40}ms`,
            }} />
        ))}
        <div className="w-24 h-24 rounded-full flex items-center justify-center animate-check-pop" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 20px 40px rgba(8,145,178,0.3)'}}>
          <CheckCircle className="w-12 h-12 text-white"/>
        </div>
      </div>
      <h2 className="text-3xl font-bold mb-3" style={{color:'#0c2b36'}}>Ordine inviato!</h2>
      <p className="text-slate-500 mb-2">Ti contatteremo presto su WhatsApp per confermare.</p>
      {wonNumber && (
        <div className="inline-flex items-center gap-2 font-bold px-5 py-3 rounded-2xl text-white mb-2" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
          <Gift className="w-5 h-5" /> Il tuo numero per la lotteria è: #{wonNumber}
        </div>
      )}
      <p className="text-sm text-cyan-700 font-medium mb-8">🎁 Riceverai i tuoi punti fedeltà via WhatsApp!</p>
      <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
        <ShoppingBag className="w-5 h-5"/> Continua a fare shopping
      </Link>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(8,145,178,0.08)',border:'2px dashed rgba(8,145,178,0.2)'}}>
        <ShoppingCart className="w-12 h-12" style={{color:'rgba(8,145,178,0.4)'}}/>
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{color:'#0c2b36'}}>Il carrello è vuoto</h2>
      <p className="text-slate-400 mb-8">Aggiungi qualche prodotto per iniziare.</p>
      <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>Vai ai prodotti</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium mb-6 group transition-all hover:gap-3" style={{color:'#155e75'}}>
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Continua lo shopping
      </Link>
      <h1 className="text-2xl font-bold mb-8" style={{color:'#0c2b36'}}>
        Il tuo carrello <span className="text-base font-normal text-slate-400">({items.length} {items.length===1?'articolo':'articoli'})</span>
      </h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map(({product,quantity},i) => (
            <div key={product.id} className="flex gap-4 rounded-2xl p-4 animate-fade-in-up"
              style={{animationDelay:`${i*50}ms`,animationFillMode:'both',background:'white',border:'1px solid rgba(8,145,178,0.08)',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{background:'linear-gradient(135deg,#f0fbfd,#cffafe)'}}>
                {product.cover_image ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8" style={{color:'rgba(8,145,178,0.3)'}}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate mb-1" style={{color:'#0c2b36'}}>{product.name}</p>
                <p className="font-bold" style={{color:'#0891b2'}}>€{product.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id,quantity-1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press" style={{border:'1px solid rgba(8,145,178,0.2)',background:'rgba(8,145,178,0.04)'}}><Minus className="w-3 h-3" style={{color:'#155e75'}}/></button>
                  <span className="w-6 text-center text-sm font-bold" style={{color:'#0c2b36'}}>{quantity}</span>
                  <button onClick={() => updateQuantity(product.id,quantity+1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press" style={{border:'1px solid rgba(8,145,178,0.2)',background:'rgba(8,145,178,0.04)'}}><Plus className="w-3 h-3" style={{color:'#155e75'}}/></button>
                  <button onClick={() => removeItem(product.id)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 btn-press" style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.1)'}}><Trash2 className="w-4 h-4 text-red-400"/></button>
                </div>
              </div>
            </div>
          ))}
          {/* Banner fedeltà compact nel carrello */}
          <LoyaltyBanner compact={true} />
        </div>

        <div className="rounded-2xl p-5 h-fit sticky top-20 animate-slide-in-right space-y-4" style={{background:'white',border:'1px solid rgba(8,145,178,0.1)',boxShadow:'0 8px 24px rgba(8,145,178,0.08)'}}>
          <h2 className="font-bold" style={{color:'#0c2b36'}}>Riepilogo ordine</h2>
          <div className="space-y-2">
            {items.map(({product,quantity}) => (
              <div key={product.id} className="flex justify-between text-sm text-slate-500">
                <span className="truncate mr-2">{product.name} ×{quantity}</span>
                <span className="shrink-0">€{(product.price*quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {!couponData ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400"/>
                    <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter'&&handleApplyCoupon()} placeholder="Codice coupon"
                      className="w-full h-10 pl-9 pr-3 rounded-xl text-sm font-mono outline-none" style={{background:'rgba(8,145,178,0.05)',border:'1px solid rgba(8,145,178,0.15)',color:'#0c2b36'}}/>
                  </div>
                  <button onClick={handleApplyCoupon} disabled={couponLoading||!couponInput.trim()} className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all hover:scale-105 btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
                    {couponLoading?'...':'Applica'}
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl" style={{background:'rgba(8,145,178,0.06)',border:'1px solid rgba(8,145,178,0.2)'}}>
                <div>
                  <p className="text-sm font-bold text-cyan-700">{couponData.code}</p>
                  <p className="text-xs text-slate-500">{couponData.discount_percent>0?`-${couponData.discount_percent}%`:`-€${couponData.discount_fixed}`}{couponData.scope==='promo' ? ' (solo prodotti in promo)' : ' (tutto il carrello)'}</p>
                  {couponData.scope==='promo' && promoSubtotal===0 && <p className="text-xs text-red-500 mt-1">Nessun prodotto in promo nel carrello: sconto non applicato</p>}
                </div>
                <button onClick={removeCoupon} className="p-1 hover:bg-cyan-100 rounded-lg"><X className="w-4 h-4 text-cyan-600"/></button>
              </div>
            )}
          </div>
          {lotteryActive && (
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: joinLottery ? 'rgba(8,145,178,0.08)' : 'rgba(8,145,178,0.03)', border: '1px solid rgba(8,145,178,0.15)' }}>
              <input type="checkbox" checked={joinLottery} onChange={e => setJoinLottery(e.target.checked)} className="mt-0.5 w-4 h-4 accent-cyan-600 shrink-0" />
              <span className="text-sm">
                <span className="font-bold flex items-center gap-1.5" style={{ color: '#0c2b36' }}><Gift className="w-4 h-4 text-cyan-600" /> Partecipa alla lotteria (+1€)</span>
                <span className="text-xs text-slate-400 block mt-0.5">{lotteryPrizeLabel ? `In palio: ${lotteryPrizeLabel}` : 'Ricevi un numero per l\'estrazione'}</span>
              </span>
            </label>
          )}
          <div className="border-t border-cyan-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotale</span><span>€{subtotal.toFixed(2)}</span></div>
            {couponData&&discountAmount>0&&<div className="flex justify-between text-sm text-green-600 font-medium"><span>Sconto coupon</span><span>-€{discountAmount.toFixed(2)}</span></div>}
            {joinLottery&&<div className="flex justify-between text-sm text-cyan-700 font-medium"><span>Lotteria</span><span>+€1.00</span></div>}
            <div className="flex justify-between font-bold pt-1"><span style={{color:'#0c2b36'}}>Totale</span><span className="text-xl" style={{color:'#0891b2'}}>€{total.toFixed(2)}</span></div>
          </div>
          <CodBanner />
          <Link href="/consegne" className="flex items-center justify-center gap-1.5 text-xs text-cyan-700/70 hover:text-cyan-700 transition-colors underline underline-offset-2">
            <MapPin className="w-3.5 h-3.5" /> Vedi le zone di consegna e i relativi costi
          </Link>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="tel" placeholder="Numero di telefono" value={phone} onChange={e=>setPhone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-sm outline-none" style={{background:'rgba(8,145,178,0.05)',border:'1px solid rgba(8,145,178,0.15)',color:'#0c2b36'}}/>
            {error&&<p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] btn-press disabled:opacity-60" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 8px 20px rgba(8,145,178,0.3)'}}>
              {submitting?'Invio in corso...':'Invia ordine'}
            </button>
          </form>
          <p className="text-xs text-center text-slate-400">Ti contatteremo su WhatsApp per confermare</p>
        </div>
      </div>
    </div>
  )
}
ZONEEOF

git add app/consegne/page.tsx app/page.tsx components/shop/cart-content.tsx
git commit -m "feat: pagina zone di consegna (Aci Sant'Antonio gratis, paesi etnei 2 euro)"
git push
