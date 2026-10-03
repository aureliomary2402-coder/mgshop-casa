"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, Flame, ImageIcon, Newspaper, Plus, ShoppingBag, Tag } from 'lucide-react'
import { PageHero } from '@/components/shop/page-hero'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'
import { optimizeImage } from '@/lib/image'
import { TornaPrestoStamp } from '@/components/shop/torna-presto-stamp'
import { getMinCustomizedPrice, normalizeChoices } from '@/lib/customization'

export interface VolantinoItem {
  product_id: string
  sale_price: number
}

export interface VolantinoData {
  is_active: boolean
  title: string
  subtitle: string
  items: VolantinoItem[]
}

// Calcoli comuni a ogni offerta (sconto, prezzo variabile, disponibilità).
function getOfferInfo(product: Product, salePrice: number) {
  const fullPrice = typeof product.old_price === 'number' ? product.old_price : product.price
  const hasDiscount = salePrice < fullPrice
  const percentOff = hasDiscount ? Math.round((1 - salePrice / fullPrice) * 100) : 0
  // I prodotti personalizzabili (es. con scelte a prezzo variabile) non hanno
  // un prezzo fisso: il tasto rapido deve aprire la scheda per far scegliere
  // l'opzione, come nella griglia normale del negozio, invece di aggiungere
  // al carrello un prodotto "vuoto" a prezzo 0.
  const hasVariablePricing = !!product.is_customizable && (product.customization_options || []).some(
    opt => opt.type === 'select' && normalizeChoices(opt.choices).some(c => typeof c.price === 'number')
  )
  const soldOut = !!product.torna_presto
  const showDiscount = hasDiscount && percentOff > 0 && !soldOut && !hasVariablePricing
  const priceLabel = hasVariablePricing ? `da €${getMinCustomizedPrice(product).toFixed(2)}` : `€${salePrice.toFixed(2)}`
  return { fullPrice, percentOff, hasVariablePricing, soldOut, showDiscount, priceLabel }
}

function useOfferActions(product: Product, salePrice: number) {
  const addItem = useCartStore(s => s.addItem)
  const openDetail = useProductDetailStore(s => s.open)
  const [added, setAdded] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.torna_presto) return
    if (product.is_customizable) {
      openDetail(product.id)
      return
    }
    addItem({ ...product, price: salePrice }, undefined, undefined, 'volantino')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  return { added, handleAdd, open: () => openDetail(product.id) }
}

function OfferImage({ product, width, sizes, soldOut }: { product: Product; width: number; sizes: string; soldOut: boolean }) {
  const src = product.card_image || product.cover_image
  return (
    <>
      {src
        ? <Image src={optimizeImage(src, width) || src} alt={product.name} fill draggable={false} sizes={sizes} className="select-none object-cover" style={soldOut ? { filter: 'grayscale(1)' } : undefined} />
        : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-8 w-8" style={{ color: 'rgba(8,145,178,0.3)' }} /></div>}
      {soldOut && <TornaPrestoStamp />}
    </>
  )
}

// Offerta in evidenza: la più scontata del volantino, in grande.
function FeaturedOffer({ product, salePrice }: { product: Product; salePrice: number }) {
  const info = getOfferInfo(product, salePrice)
  const { added, handleAdd, open } = useOfferActions(product, salePrice)

  return (
    <div onClick={open} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') open() }}
      className="relative cursor-pointer overflow-hidden rounded-[32px] border border-cyan-300/15 bg-[#06151c] p-5 text-white shadow-[0_30px_80px_rgba(6,21,28,.30)] sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="relative grid grid-cols-[128px_1fr] items-center gap-4 sm:grid-cols-[250px_1fr] sm:gap-9">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10" style={{ background: 'linear-gradient(135deg,#0b2a35,#0e4a5c)' }}>
          <OfferImage product={product} width={600} sizes="(max-width: 640px) 128px, 250px" soldOut={info.soldOut} />
        </div>
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Flame className="h-3.5 w-3.5" /> Offerta top
          </div>
          <h3 className="line-clamp-3 text-lg font-black leading-tight tracking-[-0.02em] sm:text-3xl">{product.name}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-4xl font-black leading-none tracking-[-0.03em] text-cyan-300 sm:text-5xl">{info.priceLabel}</span>
            {info.showDiscount && (
              <>
                <span className="text-base text-slate-400 line-through">€{info.fullPrice.toFixed(2)}</span>
                <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">-{info.percentOff}%</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button onClick={handleAdd} disabled={info.soldOut}
        className="relative mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:cursor-not-allowed sm:w-auto sm:px-10"
        style={info.soldOut
          ? { background: '#334155', color: '#cbd5e1' }
          : added
            ? { background: '#4ade80', color: '#052e16' }
            : { background: '#22d3ee', color: '#05212a', boxShadow: '0 12px 32px rgba(34,211,238,.30)' }}>
        {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
        {info.soldOut ? 'Non disponibile' : info.hasVariablePricing ? 'Personalizza' : added ? 'Aggiunto!' : 'Aggiungi al carrello'}
      </button>
    </div>
  )
}

// Riga del listino: niente card, una lista pulita dentro un unico pannello.
function OfferRow({ product, salePrice, index }: { product: Product; salePrice: number; index: number }) {
  const info = getOfferInfo(product, salePrice)
  const { added, handleAdd, open } = useOfferActions(product, salePrice)

  return (
    <div onClick={open} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') open() }}
      className="group flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3.5 transition-colors hover:bg-cyan-50/60 sm:gap-4 sm:p-4 md:odd:border-r animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28" style={{ background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
        <OfferImage product={product} width={300} sizes="112px" soldOut={info.soldOut} />
        {info.showDiscount && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white shadow-md">-{info.percentOff}%</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug tracking-[-0.01em] text-slate-950 transition-colors group-hover:text-cyan-700">{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-black leading-none tracking-[-0.02em]" style={{ color: info.showDiscount ? '#dc2626' : '#0e7490' }}>{info.priceLabel}</span>
          {info.showDiscount && <span className="text-xs text-slate-400 line-through">€{info.fullPrice.toFixed(2)}</span>}
        </div>
      </div>
      <button onClick={handleAdd} disabled={info.soldOut}
        aria-label={info.soldOut ? 'Non disponibile' : info.hasVariablePricing ? 'Personalizza' : 'Aggiungi al carrello'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-not-allowed"
        style={info.soldOut
          ? { background: '#e2e8f0', color: '#94a3b8' }
          : added
            ? { background: '#4ade80', color: '#052e16' }
            : { background: '#22d3ee', color: '#05212a', boxShadow: '0 10px 25px rgba(34,211,238,.30)' }}>
        {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  )
}

// Volantino già caricato (dati + prodotti risolti). Usato sia da /volantino
// (quando c'è un solo volantino attivo, per compatibilità con link/QR/catalogo
// già condivisi) sia da /volantino/[slug].
export function VolantinoFlyerView({ data, products, backHref = '/volantino', showBackToList = false }: {
  data: VolantinoData
  products: Product[]
  backHref?: string
  showBackToList?: boolean
}) {
  const cartCount = useCartStore(s => s.getTotalItems)()

  const offers = products.map(p => {
    const item = data.items.find(it => it.product_id === p.id)
    const salePrice = item ? item.sale_price : p.price
    return { product: p, salePrice, info: getOfferInfo(p, salePrice) }
  })

  // L'offerta in evidenza è la più scontata (solo se il volantino ha abbastanza prodotti).
  let featured: (typeof offers)[number] | null = null
  if (offers.length >= 3) {
    for (const o of offers) {
      if (o.info.showDiscount && (!featured || o.info.percentOff > featured.info.percentOff)) featured = o
    }
  }
  const rest = featured ? offers.filter(o => o.product.id !== featured!.product.id) : offers
  const maxOff = offers.reduce((m, o) => (o.info.showDiscount ? Math.max(m, o.info.percentOff) : m), 0)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <PageHero
        icon={Newspaper}
        iconColor="#2563eb"
        badge={{ icon: Newspaper, text: 'Volantino digitale' }}
        title={data.title || 'Offerte della settimana'}
        subtitle={data.subtitle}
        cart={{ count: cartCount, href: '/carrello' }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-8">
        {showBackToList && (
          <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-cyan-700">
            <ArrowLeft className="h-4 w-4" /> Tutti i volantini
          </Link>
        )}

        {offers.length > 0 ? (
          <Reveal>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                <Tag className="h-3.5 w-3.5 text-cyan-300" /> {offers.length} {offers.length === 1 ? 'offerta' : 'offerte'}
              </span>
              {maxOff > 0 && (
                <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">Fino al -{maxOff}%</span>
              )}
            </div>

            {featured && (
              <div className="mb-5">
                <FeaturedOffer product={featured.product} salePrice={featured.salePrice} />
              </div>
            )}

            {rest.length > 0 && (
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_15px_50px_rgba(15,23,42,.06)]">
                <div className="-mb-px grid md:grid-cols-2">
                  {rest.map((o, i) => <OfferRow key={o.product.id} product={o.product} salePrice={o.salePrice} index={i} />)}
                </div>
              </div>
            )}

            {cartCount > 0 && (
              <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-scale-in">
                <Link href="/carrello"
                  className="flex items-center gap-3 rounded-2xl px-8 py-4 font-black shadow-2xl transition-all hover:scale-105"
                  style={{ background: '#22d3ee', color: '#05212a', boxShadow: '0 16px 40px rgba(34,211,238,.40)' }}>
                  <ShoppingBag className="h-5 w-5" />
                  Vai al carrello ({cartCount})
                </Link>
              </div>
            )}
          </Reveal>
        ) : (
          <p className="py-12 text-center text-slate-400">Nessun prodotto nel volantino al momento.</p>
        )}

        <div className="py-10 text-center">
          <Link href="/shop" className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-600 px-8 font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-500">
            <ShoppingBag className="h-5 w-5" /> Vai al negozio completo
          </Link>
        </div>
      </div>
    </div>
  )
}

export function VolantinoEmptyState() {
  const cartCount = useCartStore(s => s.getTotalItems)()
  return (
    <div className="min-h-screen bg-[#f0fbfd]">
      <PageHero
        icon={Newspaper}
        iconColor="#2563eb"
        badge={{ icon: Newspaper, text: 'Volantino digitale' }}
        title="Nessun volantino attivo"
        subtitle="Torna presto per le nostre offerte!"
        cart={{ count: cartCount, href: '/carrello' }}
      />
      <div className="px-5 py-16 text-center sm:px-8">
        <Link href="/shop" className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-600 px-7 font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-500">
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" /> Vai al negozio
        </Link>
      </div>
    </div>
  )
}

export function VolantinoLoadingState() {
  const cartCount = useCartStore(s => s.getTotalItems)()
  return (
    <div className="min-h-screen bg-[#f0fbfd]">
      <PageHero
        icon={Newspaper}
        iconColor="#2563eb"
        badge={{ icon: Newspaper, text: 'Volantino digitale' }}
        title="Volantino"
        subtitle="Sto caricando le offerte…"
        cart={{ count: cartCount, href: '/carrello' }}
      />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-10">
        <div className="skeleton h-56 rounded-[32px]" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-[28px]" />)}
        </div>
      </div>
    </div>
  )
}
