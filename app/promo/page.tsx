"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Tag, ShoppingBag, ShoppingCart, ImageIcon } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'

interface PromoData {
  is_active: boolean; title: string; subtitle: string; content: string
  image_url: string; badge_text: string; expires_at: string; featured_product_ids: string[]
}

interface Coupon {
  code: string; discount_percent: number; discount_fixed: number
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState({ days:0, hours:0, minutes:0, seconds:0 })
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const calc = () => { const d = new Date(expiresAt).getTime()-Date.now(); if(d<=0){setExpired(true);return} setT({days:Math.floor(d/86400000),hours:Math.floor((d%86400000)/3600000),minutes:Math.floor((d%3600000)/60000),seconds:Math.floor((d%60000)/1000)}) }
    calc(); const i=setInterval(calc,1000); return ()=>clearInterval(i)
  },[expiresAt])
  if(expired) return <div className="text-center text-cyan-200/40 text-sm">Offerta scaduta</div>
  return (
    <div className="flex items-center justify-center gap-3">
      {[{v:t.days,l:'Giorni'},{v:t.hours,l:'Ore'},{v:t.minutes,l:'Min'},{v:t.seconds,l:'Sec'}].map(({v,l},i)=>(
        <div key={l} className="flex items-center gap-3">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 4px 16px rgba(8,145,178,0.3)'}}>{String(v).padStart(2,'0')}</div>
            <p className="text-xs text-cyan-200/50 mt-1">{l}</p>
          </div>
          {i<3&&<span className="text-cyan-500 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  )
}

function calcDiscountedPrice(price: number, coupon: Coupon | null): number | null {
  if (!coupon) return null
  if (coupon.discount_percent) return price * (1 - coupon.discount_percent / 100)
  if (coupon.discount_fixed) return Math.max(0, price - coupon.discount_fixed)
  return null
}

function PromoProductCard({ product, coupon }: { product: Product; coupon: Coupon | null }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)

  const discounted = calcDiscountedPrice(product.price, coupon)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 transition-all group"
      style={{ border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 4px 20px rgba(8,145,178,0.08)' }}>
      <Link href={`/prodotto/${product.id}`}>
        <div className="aspect-square overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
          {product.cover_image
            ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10" style={{color:'rgba(8,145,178,0.3)'}}/></div>}
          {discounted !== null && coupon && coupon.discount_percent > 0 && (
            <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#dc2626' }}>
              -{coupon.discount_percent}%
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-2 hover:text-cyan-700 transition-colors">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {discounted !== null ? (
              <>
                <span className="text-xs text-slate-400 line-through">€{product.price.toFixed(2)}</span>
                <span className="font-bold text-lg" style={{ color: '#dc2626' }}>€{discounted.toFixed(2)}</span>
              </>
            ) : (
              <span className="font-bold text-lg" style={{ color: '#0891b2' }}>€{product.price.toFixed(2)}</span>
            )}
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
            style={{ background: added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
            <ShoppingCart className="w-3.5 h-3.5" />
            {added ? 'Aggiunto!' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromoPage() {
  const [promo, setPromo] = useState<PromoData|null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [coupon, setCoupon] = useState<Coupon|null>(null)
  const [loading, setLoading] = useState(true)
  const cartCount = useCartStore(s => s.getTotalItems)()

  useEffect(()=>{
    fetch('/api/promo', { cache: 'no-store' })
      .then(r=>r.json())
      .then(async d => {
        setPromo(d)
        if (d.featured_product_ids && d.featured_product_ids.length > 0) {
          const allProducts = await fetch('/api/admin/products').then(r=>r.json())
          setProducts(allProducts.filter((p: Product) => d.featured_product_ids.includes(p.id)))
        }
        setLoading(false)
      })
      .catch(()=>setLoading(false))
    fetch('/api/coupons?scope=promo', { cache: 'no-store' })
      .then(r=>r.json())
      .then(setCoupon)
      .catch(()=>setCoupon(null))
  },[])

  if(loading) return (
    <div className="min-h-screen" style={{background:'#f0fbfd'}}>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-10 w-2/3 mx-auto rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
        </div>
      </div>
    </div>
  )

  if(!promo||!promo.is_active) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#f0fbfd'}}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(8,145,178,0.08)',border:'2px dashed rgba(8,145,178,0.2)'}}><ShoppingBag className="w-12 h-12" style={{color:'rgba(8,145,178,0.4)'}}/></div>
        <h1 className="text-2xl font-bold mb-2" style={{color:'#0c2b36'}}>Nessuna promo attiva</h1>
        <p className="text-slate-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}><ArrowLeft className="w-4 h-4"/> Vai al negozio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#f0fbfd'}}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#0c2b36,#06303d)'}}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{background:'radial-gradient(circle,#0891b2,transparent)'}}/>
        <AmbientBubbles count={9} theme="dark" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-between mb-6">
            <Link href="/shop" className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors"><ArrowLeft className="w-4 h-4"/> Negozio</Link>
            <Link href="/carrello?promo=1" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <ShoppingBag className="w-4 h-4"/>
              Carrello
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>{cartCount}</span>}
            </Link>
          </div>
          {promo.badge_text&&<div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-cyan-300 text-sm font-medium mb-4" style={{background:'rgba(8,145,178,0.15)',border:'1px solid rgba(8,145,178,0.3)'}}><Tag className="w-4 h-4"/> {promo.badge_text}</div>}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">{promo.title}</h1>
          {promo.subtitle&&<p className="text-lg text-cyan-200/60 mb-6">{promo.subtitle}</p>}
          {promo.expires_at&&<div className="mb-4"><div className="flex items-center justify-center gap-2 text-cyan-400/60 text-sm mb-3"><Clock className="w-4 h-4"/> Offerta valida ancora per:</div><Countdown expiresAt={promo.expires_at}/></div>}
        </div>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-10">
          {(promo.image_url||promo.content)&&(
            <Reveal className={`grid gap-6 ${promo.image_url&&promo.content?'md:grid-cols-2':''}`}>
              {promo.image_url&&<div className="rounded-2xl overflow-hidden aspect-video" style={{boxShadow:'0 16px 40px rgba(8,145,178,0.12)'}}><img src={promo.image_url} alt="Promo" className="w-full h-full object-cover"/></div>}
              {promo.content&&<div className="flex items-center"><div className="bg-white rounded-2xl p-6 w-full" style={{border:'1px solid rgba(8,145,178,0.1)'}}><p className="text-slate-600 leading-relaxed whitespace-pre-line">{promo.content}</p></div></div>}
            </Reveal>
          )}

          {/* Prodotti in promo */}
          {products.length > 0 && (
            <Reveal delay={100}>
              <h2 className="text-2xl font-bold mb-6" style={{color:'#0c2b36'}}>Prodotti in promozione</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 stagger-children">
                {products.map(p => <PromoProductCard key={p.id} product={p} coupon={coupon}/>)}
              </div>
              {/* Sticky cart button */}
              {cartCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
                  <Link href="/carrello?promo=1"
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold shadow-2xl transition-all hover:scale-105 neon-glow"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                    <ShoppingBag className="w-5 h-5"/>
                    Vai al carrello ({cartCount})
                  </Link>
                </div>
              )}
            </Reveal>
          )}

          <Reveal delay={150} className="text-center py-6">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 12px 32px rgba(8,145,178,0.35)'}}>
              <ShoppingBag className="w-5 h-5"/> Vai al negozio completo
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
