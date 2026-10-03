"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, Clock, Tag, ShoppingBag, ShoppingCart, Plus, ImageIcon, X, Info } from 'lucide-react'
import { PageHero } from '@/components/shop/page-hero'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { toast } from 'sonner'
import type { Product, CustomizationOption } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { buildCustomPromoProduct, isCustomPromoProductId } from '@/lib/promo-custom-product'
import { TornaPrestoStamp } from '@/components/shop/torna-presto-stamp'
import { getMinCustomizedPrice, normalizeChoices, missingRequiredOptions, buildCustomizationSelections, buildCartCombinations, computeCustomizedPrice } from '@/lib/customization'
import { ProductCustomizeForm } from '@/components/shop/product-customize-form'

interface PromoItem {
  id: string
  product_id: string | null
  name?: string
  image_url?: string | null
  original_price?: number
  sale_price: number
  description?: string
  torna_presto?: boolean
  is_customizable?: boolean
  customization_options?: CustomizationOption[]
  customization_note?: string
}

interface PromoData {
  is_active: boolean; title: string; subtitle: string; content: string
  image_url: string; badge_text: string; expires_at: string; promo_items: PromoItem[]
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState({ days:0, hours:0, minutes:0, seconds:0 })
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const calc = () => { const d = new Date(expiresAt).getTime()-Date.now(); if(d<=0){setExpired(true);return} setT({days:Math.floor(d/86400000),hours:Math.floor((d%86400000)/3600000),minutes:Math.floor((d%3600000)/60000),seconds:Math.floor((d%60000)/1000)}) }
    calc(); const i=setInterval(calc,1000); return ()=>clearInterval(i)
  },[expiresAt])
  if(expired) return <div className="text-center text-slate-400 text-sm">Offerta scaduta</div>
  return (
    <div className="flex items-center justify-center gap-3">
      {[{v:t.days,l:'Giorni'},{v:t.hours,l:'Ore'},{v:t.minutes,l:'Min'},{v:t.seconds,l:'Sec'}].map(({v,l},i)=>(
        <div key={l} className="flex items-center gap-3">
          <div className="text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-2xl font-black text-cyan-200 backdrop-blur-md">{String(v).padStart(2,'0')}</div>
            <p className="text-xs mt-1" style={{ color: 'rgba(224,247,250,0.65)' }}>{l}</p>
          </div>
          {i<3&&<span className="text-cyan-500 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  )
}

function PromoProductCard({ product, salePrice, onOpenDetail, index }: { product: Product; salePrice: number; onOpenDetail: () => void; index: number }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)

  const hasDiscount = salePrice < product.price
  const percentOff = hasDiscount ? Math.round((1 - salePrice / product.price) * 100) : 0

  // I prodotti personalizzabili (es. con scelte a prezzo variabile) non hanno
  // un prezzo fisso: il tasto rapido deve aprire la scheda per far scegliere
  // l'opzione, esattamente come nel volantino, invece di aggiungere al
  // carrello un prodotto "vuoto" a prezzo 0.
  const hasVariablePricing = !!product.is_customizable && (product.customization_options || []).some(
    opt => opt.type === 'select' && normalizeChoices(opt.choices).some(c => typeof c.price === 'number')
  )

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.torna_presto) return
    if (product.is_customizable) {
      onOpenDetail()
      return
    }
    addItem({ ...product, price: salePrice }, undefined, undefined, 'promo')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  const soldOut = !!product.torna_presto
  const showDiscount = hasDiscount && percentOff > 0 && !soldOut && !hasVariablePricing
  const priceLabel = hasVariablePricing ? `da €${getMinCustomizedPrice(product).toFixed(2)}` : `€${salePrice.toFixed(2)}`

  return (
    <div onClick={onOpenDetail} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpenDetail() }}
      className="group flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3.5 transition-colors hover:bg-cyan-50/60 sm:gap-4 sm:p-4 md:odd:border-r animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28" style={{ background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
        {(product.card_image || product.cover_image)
          ? <Image src={product.card_image || product.cover_image || ''} alt={product.name} fill draggable={false} sizes="112px" className="select-none object-cover" style={soldOut ? { filter: 'grayscale(1)' } : undefined} />
          : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-8 w-8" style={{ color: 'rgba(8,145,178,0.3)' }} /></div>}
        {soldOut && <TornaPrestoStamp />}
        {showDiscount && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white shadow-md">-{percentOff}%</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug tracking-[-0.01em] text-slate-950 transition-colors group-hover:text-cyan-700">{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-black leading-none tracking-[-0.02em]" style={{ color: showDiscount || hasVariablePricing ? '#dc2626' : '#0e7490' }}>{priceLabel}</span>
          {showDiscount && <span className="text-xs text-slate-400 line-through">€{product.price.toFixed(2)}</span>}
        </div>
      </div>
      <button onClick={handleAdd} disabled={soldOut}
        aria-label={soldOut ? 'Non disponibile' : hasVariablePricing ? 'Personalizza' : 'Aggiungi al carrello'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-not-allowed"
        style={soldOut
          ? { background: '#e2e8f0', color: '#94a3b8' }
          : added
            ? { background: '#4ade80', color: '#052e16' }
            : { background: '#22d3ee', color: '#05212a', boxShadow: '0 10px 25px rgba(34,211,238,.30)' }}>
        {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  )
}

// Scheda con le informazioni del prodotto in promo. Non riusiamo la pagina
// /prodotto/[id] perché i prodotti creati apposta per una promo non
// esistono nel catalogo vero: qui mostriamo le informazioni scritte
// dall'admin direttamente nella promo, senza bisogno di una pagina a parte.
function PromoDetailModal({ product, salePrice, onClose }: { product: Product; salePrice: number; onClose: () => void }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string | string[]>>({})

  const options = product.customization_options || []
  // Stesso calcolo del modale prodotto del negozio: se il cliente ha
  // selezionato più scelte insieme, sommiamo tutte le righe che verranno
  // create per mostrare il totale reale che sta per aggiungere al carrello.
  const cartCombinations = product.is_customizable ? buildCartCombinations(options, customValues) : []
  const displayPrice = product.is_customizable
    ? (cartCombinations.length > 0
      ? cartCombinations.reduce((sum, combo) => sum + computeCustomizedPrice(product, options, combo), 0)
      : product.price)
    : salePrice
  const multipleSelected = cartCombinations.length > 1
  const hasDiscount = !product.is_customizable && salePrice < product.price
  const percentOff = hasDiscount ? Math.round((1 - salePrice / product.price) * 100) : 0

  const handleAdd = () => {
    if (product.torna_presto) return
    if (product.is_customizable) {
      const missing = missingRequiredOptions(options, customValues)
      if (missing.length > 0) {
        toast.error(`Completa prima: ${missing.map(o => o.label).join(', ')}`)
        return
      }
      const combos = cartCombinations.length > 0 ? cartCombinations : [{}]
      combos.forEach(combo => {
        const selections = buildCustomizationSelections(options, combo)
        const unitPrice = computeCustomizedPrice(product, options, combo)
        addItem(product, selections, unitPrice, 'promo')
      })
    } else {
      addItem({ ...product, price: salePrice }, undefined, undefined, 'promo')
    }
    setAdded(true)
    toast.success(multipleSelected ? `${cartCombinations.length} varianti di ${product.name} aggiunte!` : `${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
    setTimeout(onClose, 700)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(12,43,54,0.5)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-in-right">
        <div className="relative shrink-0" style={{ height: '200px', background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
          {product.cover_image
            ? <Image src={product.cover_image} alt={product.name} fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" style={product.torna_presto ? { filter: 'grayscale(1)' } : undefined} />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-12 h-12" style={{color:'rgba(8,145,178,0.3)'}}/></div>}
          {product.torna_presto && <TornaPrestoStamp size="50%" />}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform"><X className="w-4 h-4 text-slate-600"/></button>
          {hasDiscount && !product.torna_presto && <div className="absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: '#dc2626' }}>-{percentOff}%</div>}
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <h2 className="text-xl font-black tracking-[-.03em]" style={{color:'#020617'}}>{product.name}</h2>
          <div className="flex items-baseline gap-2">
            {hasDiscount && <span className="text-sm text-slate-400 line-through">€{product.price.toFixed(2)}</span>}
            <span className="text-2xl font-bold" style={{ color: hasDiscount ? '#dc2626' : '#0891b2' }}>€{displayPrice.toFixed(2)}</span>
          </div>
          {multipleSelected && (
            <p className="text-sm -mt-3" style={{ color: '#0891b2' }}>Totale per {cartCombinations.length} varianti selezionate</p>
          )}
          {product.description && (
            <div className="flex gap-2 p-3 rounded-xl" style={{ background: 'rgba(8,145,178,0.05)' }}>
              <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
          {product.is_customizable && (
            <ProductCustomizeForm
              options={options}
              values={customValues}
              onChange={(id, value) => setCustomValues(v => ({ ...v, [id]: value }))}
              note={product.customization_note}
            />
          )}
          <button onClick={handleAdd}
            disabled={product.torna_presto}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:cursor-not-allowed"
            style={product.torna_presto
              ? { background: '#334155', color: '#cbd5e1' }
              : added
                ? { background: '#4ade80', color: '#052e16' }
                : { background: '#22d3ee', color: '#05212a', boxShadow: '0 12px 32px rgba(34,211,238,.30)' }}>
            <ShoppingCart className="w-4 h-4" /> {product.torna_presto ? 'Non disponibile' : added ? 'Aggiunto!' : multipleSelected ? `Aggiungi ${cartCombinations.length} varianti` : 'Aggiungi al carrello'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromoPage() {
  const [promo, setPromo] = useState<PromoData|null>(null)
  const [displayItems, setDisplayItems] = useState<{ product: Product; salePrice: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDetail, setSelectedDetail] = useState<{ product: Product; salePrice: number } | null>(null)
  const cartCount = useCartStore(s => s.getTotalItems)()

  useEffect(()=>{
    fetch('/api/promo', { cache: 'no-store' })
      .then(r=>r.json())
      .then(async d => {
        setPromo(d)
        const promoItems: PromoItem[] = d.promo_items || []
        const shopIds = promoItems.filter(i => i.product_id).map(i => i.product_id as string)
        let shopProducts: Product[] = []
        if (shopIds.length > 0) {
          const allProducts = await fetch('/api/admin/products').then(r=>r.json())
          shopProducts = allProducts.filter((p: Product) => shopIds.includes(p.id))
        }
        const built = promoItems.map(item => {
          if (item.product_id) {
            const p = shopProducts.find(sp => sp.id === item.product_id)
            if (!p) return null
            const withPromoInfo = item.description?.trim() ? { ...p, description: item.description } : p
            return { product: withPromoInfo, salePrice: item.sale_price }
          }
          const custom = buildCustomPromoProduct({
            id: item.id, name: item.name || 'Prodotto', image_url: item.image_url || null,
            price: item.original_price ?? item.sale_price, description: item.description || null,
            torna_presto: item.torna_presto,
            is_customizable: item.is_customizable, customization_options: item.customization_options,
            customization_note: item.customization_note,
          })
          return { product: custom, salePrice: item.sale_price }
        }).filter((x): x is { product: Product; salePrice: number } => !!x)
        setDisplayItems(built)
        setLoading(false)
      })
      .catch(()=>setLoading(false))
  },[])

  if(loading) return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#e9fbff 0%,#f5fdff 38%,#ffffff 100%)' }}>
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg,#e9fbff 0%,#f5fdff 38%,#ffffff 100%)' }}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(8,145,178,0.08)',border:'2px dashed rgba(8,145,178,0.2)'}}><ShoppingBag className="w-12 h-12" style={{color:'rgba(8,145,178,0.4)'}}/></div>
        <h1 className="text-2xl font-black mb-2 tracking-[-.03em]" style={{color:'#020617'}}>Nessuna promo attiva</h1>
        <p className="text-slate-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/shop" className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-600 px-8 font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-500"><ArrowLeft className="w-4 h-4"/> Vai al negozio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#e9fbff 0%,#f5fdff 38%,#ffffff 100%)' }}>
      {/* Hero */}
      <PageHero
        icon={Tag}
        iconColor="#f59e0b"
        badge={promo.badge_text ? { icon: Tag, text: promo.badge_text } : undefined}
        title={promo.title}
        subtitle={promo.subtitle}
        cart={{ count: cartCount, href: '/carrello?promo=1' }}
      >
        {promo.expires_at && (
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 text-sm mb-3" style={{ color: '#67e8f9' }}><Clock className="w-4 h-4"/> Offerta valida ancora per:</div>
            <Countdown expiresAt={promo.expires_at}/>
          </div>
        )}
      </PageHero>

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="mg-page-shell relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-10">
          {(promo.image_url||promo.content)&&(
            <Reveal className={`grid gap-6 ${promo.image_url&&promo.content?'md:grid-cols-2':''}`}>
              {promo.image_url&&<div className="relative rounded-2xl overflow-hidden aspect-video" style={{boxShadow:'0 16px 40px rgba(8,145,178,0.12)'}}><Image src={promo.image_url} alt="Promo" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"/></div>}
              {promo.content&&<div className="flex items-center"><div className="glass-card rounded-2xl p-6 w-full"><p className="text-slate-600 leading-relaxed whitespace-pre-line">{promo.content}</p></div></div>}
            </Reveal>
          )}

          {/* Prodotti in promo */}
          {displayItems.length > 0 && (
            <Reveal delay={100}>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                  <Tag className="h-3.5 w-3.5 text-cyan-300" /> {displayItems.length} {displayItems.length === 1 ? 'offerta' : 'offerte'}
                </span>
              </div>
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_15px_50px_rgba(15,23,42,.06)]">
                <div className="-mb-px grid md:grid-cols-2">
                  {displayItems.map(({ product, salePrice }, i) => (
                    <PromoProductCard key={product.id} product={product} salePrice={salePrice} index={i}
                      onOpenDetail={() => {
                        if (isCustomPromoProductId(product.id)) setSelectedDetail({ product, salePrice })
                        else useProductDetailStore.getState().open(product.id)
                      }} />
                  ))}
                </div>
              </div>
              {/* Sticky cart button */}
              {cartCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
                  <Link href="/carrello?promo=1"
                    className="flex items-center gap-3 rounded-2xl px-8 py-4 font-black shadow-2xl transition-all hover:scale-105"
                    style={{ background: '#22d3ee', color: '#05212a', boxShadow: '0 16px 40px rgba(34,211,238,.40)' }}>
                    <ShoppingBag className="w-5 h-5"/>
                    Vai al carrello ({cartCount})
                  </Link>
                </div>
              )}
            </Reveal>
          )}

          <Reveal delay={150} className="text-center py-6">
            <Link href="/shop" className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-600 px-8 font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-500">
              <ShoppingBag className="w-5 h-5"/> Vai al negozio completo
            </Link>
          </Reveal>
        </div>
      </div>
      {selectedDetail && (
        <PromoDetailModal product={selectedDetail.product} salePrice={selectedDetail.salePrice} onClose={() => setSelectedDetail(null)} />
      )}
    </div>
  )
}
