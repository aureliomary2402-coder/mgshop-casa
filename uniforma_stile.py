#!/usr/bin/env python3
# Uniforma lo stile del sito alla landing (hero scura, sezioni chiare, titoli
# font-black con ultima parola sfumata, card bianche, footer #041017).
# Va lanciato DENTRO la cartella del progetto (~/mgshop-casa-main).
# Controlla tutto PRIMA di scrivere: se qualcosa non torna, non modifica nulla.
import os
import re
import sys

out = {}  # percorso -> nuovo contenuto (si scrive tutto solo alla fine)


def leggi(p):
    if p in out:
        return out[p]
    with open(p, encoding="utf-8") as f:
        return f.read()


def modifica(p, vecchio, nuovo, volte=1):
    s = leggi(p)
    n = s.count(vecchio)
    if n != volte:
        sys.exit("STOP: in %s ho trovato %d volte (attese %d): %r\n"
                 "Non ho modificato nessun file." % (p, n, volte, vecchio[:70]))
    out[p] = s.replace(vecchio, nuovo)


for f in ("app/page.tsx", "app/globals.css", "components/shop/page-hero.tsx",
          "components/shop/hero-banner.tsx", "components/shop/product-card.tsx",
          "components/shop/site-footer.tsx"):
    if not os.path.exists(f):
        sys.exit("STOP: non trovo %s. Lancia lo script dalla cartella del progetto." % f)

if "LANDING STYLE" in leggi("app/globals.css"):
    sys.exit("Già applicato: in globals.css c'è già il blocco LANDING STYLE.")

# ---------------------------------------------------------------- nuovi file
out["components/shop/hero-backdrop.tsx"] = r'''import type { ReactNode } from 'react'
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
'''

out["components/shop/page-hero.tsx"] = r'''import Link from 'next/link'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { HeroBackdrop, AccentTitle } from '@/components/shop/hero-backdrop'

// Hero condiviso da tutte le pagine "vetrina" (volantino, promo, lotteria,
// consegne, recensioni, social, preferiti, carrello) con lo stesso stile
// della landing: cambia solo icona/testo passati come props.
interface PageHeroProps {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  iconColor?: string
  title: ReactNode
  subtitle?: ReactNode
  badge?: { icon: ComponentType<{ className?: string }>; text: string }
  cart?: { count: number; href: string }
  maxWidth?: string
  children?: ReactNode
}

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15'

export function PageHero({
  icon: Icon,
  title,
  subtitle,
  badge,
  cart,
  maxWidth = 'max-w-4xl',
  children,
}: PageHeroProps) {
  const BadgeIcon = badge?.icon

  return (
    <section className="relative overflow-hidden bg-[#06151c]">
      <HeroBackdrop />
      <div className={`relative z-10 ${maxWidth} mx-auto px-5 pb-14 pt-6 text-center sm:px-8 sm:pb-20`}>
        <div className="mb-8 flex items-center justify-between">
          <Link href="/shop" className={PILL}>
            <ArrowLeft className="h-4 w-4" /> Negozio
          </Link>
          {cart && (
            <Link href={cart.href} className={`relative ${PILL}`}>
              <ShoppingBag className="h-4 w-4" />
              Carrello
              {cart.count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-[#062029]">
                  {cart.count}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
          <Icon className="h-7 w-7 text-cyan-300" />
        </div>

        {badge && BadgeIcon && (
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
              <BadgeIcon className="h-4 w-4" /> {badge.text}
            </span>
          </div>
        )}

        <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl">
          <AccentTitle text={title} />
        </h1>
        {subtitle && (
          <p className={`mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg ${children ? 'mb-6' : ''}`}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
'''

out["components/shop/hero-banner.tsx"] = r'''"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, Banknote, Star, Package } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { HeroBackdrop, AccentTitle } from './hero-backdrop'
import { SOCIAL_LINKS, WHATSAPP_NUMBER, WhatsAppIcon } from './social-icons'

const ADVANTAGES = [
  { icon: Truck, label: 'Consegna a domicilio o ritiro' },
  { icon: Banknote, label: 'Paghi alla consegna o al ritiro' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Lotteria ogni settimana' },
]

const ARROW =
  'absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 p-2 text-cyan-200 backdrop-blur-md transition hover:bg-white/15'

export function HeroBanner({ banners }: { banners: Banner[]; categories?: Category[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % banners.length), 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  const current: Partial<Banner> | undefined = banners[currentIndex]
  const title = current?.title || 'NEGOZIO'
  const subtitle = current?.subtitle || 'Scopri tutti i prodotti per la tua casa. Qualita e convenienza, sempre.'

  return (
    <section>
      <div className="relative overflow-hidden bg-[#06151c]">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-4xl px-5 pb-14 pt-12 text-center sm:px-8 sm:pb-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <ShoppingBag className="h-7 w-7 text-cyan-300" />
          </div>
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
              Il tuo negozio online
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl">
            <AccentTitle text={title} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">{subtitle}</p>

          {banners.length > 1 && (
            <div className="mt-7 flex items-center justify-center gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Banner ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === currentIndex ? 20 : 6, background: i === currentIndex ? '#22d3ee' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
        </div>

        {banners.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className={`${ARROW} left-3`} aria-label="Banner precedente">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              className={`${ARROW} right-3`} aria-label="Banner successivo">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {ADVANTAGES.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <a.icon className="h-5 w-5 shrink-0 text-cyan-600" />
              <span className="text-xs font-bold leading-snug text-slate-800">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#f0fbfd] px-5 py-5 sm:px-8">
        <a
          href={SOCIAL_LINKS.whatsappChat}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex max-w-7xl items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 transition hover:-translate-y-0.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <WhatsAppIcon size={17} />
          </span>
          <span className="text-xs font-bold text-slate-800 sm:text-sm">
            Scrivici su WhatsApp · {WHATSAPP_NUMBER}
          </span>
        </a>
      </div>
    </section>
  )
}
'''

# ------------------------------------------------------------ card prodotto
modifica("components/shop/product-card.tsx",
         'className="group relative rounded-2xl overflow-hidden animate-fade-in-up cursor-pointer"',
         'className="group relative rounded-[24px] overflow-hidden animate-fade-in-up cursor-pointer"')
modifica("components/shop/product-card.tsx",
         "border: '1px solid rgba(8,145,178,0.14)',",
         "border: '1px solid #e2e8f0',")

# ------------------------------------------------------------------- footer
modifica("components/shop/site-footer.tsx", 'className="relative overflow-hidden mt-10 pb-24"',
         'className="relative overflow-hidden pb-24"')
modifica("components/shop/site-footer.tsx",
         "style={{ background: 'linear-gradient(135deg,#0c2b36 0%,#0e3644 55%,#0c2b36 100%)' }}",
         "style={{ background: '#041017' }}")
modifica("components/shop/site-footer.tsx", "text-cyan-300/60", "text-cyan-300", volte=2)
modifica("components/shop/site-footer.tsx", "text-cyan-200/40", "text-slate-400")

# ------------------------------------------------- landing: via il 2° footer
# Il layout mostra già SiteFooter su tutte le pagine: nella home se ne
# vedevano due uno sotto l'altro.
s = leggi("app/page.tsx")
s2, n = re.subn(r'\n *\{/\* =+\n *FOOTER\n *=+ \*/\}\n+ *<footer.*?</footer>\n', '\n',
                s, flags=re.S)
if n != 1:
    sys.exit("STOP: non riesco a individuare il footer della landing in app/page.tsx (trovati %d)." % n)
out["app/page.tsx"] = s2

# --------------------------------------------------------------------- CSS
out["app/globals.css"] = leggi("app/globals.css").rstrip("\n") + r'''


/* =========================================================
   LANDING STYLE — intestazione dello Shop come nella landing
   (etichetta cyan, titolo font-black, testo slate, card bianca)
   ========================================================= */
.mg-shop-v5 { background: #f0fbfd; }
.mg-shop-v5-shell { padding-top: 56px; }
.mg-shop-v5-intro {
  align-items: flex-end;
  margin-bottom: 36px;
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  backdrop-filter: none;
}
.mg-shop-v5-intro::after { display: none; }
.mg-shop-v5-eyebrow,
.mg-shop-v5-products-head > div > span {
  color: #0e7490;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .25em;
  text-transform: uppercase;
}
.mg-shop-v5-intro h2 {
  color: #020617;
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.02;
  font-weight: 900;
  letter-spacing: -.04em;
}
.mg-shop-v5-intro p {
  color: #475569;
  font-size: 16px;
  line-height: 1.75;
}
.mg-shop-v5-counter {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  box-shadow: 0 15px 50px rgba(15, 23, 42, .06);
}
.mg-shop-v5-counter strong { color: #0e7490; }
.mg-shop-v5-counter span { color: #475569; }
'''

# ---------------------------------------------------------- scrittura finale
for p, c in out.items():
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)
    print("scritto", p)
print("\nFatto: %d file. Ora controlla con 'git status' e prova il sito." % len(out))
