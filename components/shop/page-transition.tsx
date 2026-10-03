"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Transizioni tra pagine:
//  - link/pulsanti dentro la pagina  -> schiuma che cala dall'alto e poi scivola giù
//  - link della navbar (header, barra in basso) -> onda ciano da lato a lato
// Montato una sola volta nel layout. Intercetta solo i click sui link interni
// (<Link>/<a>): cambi di filtro/ordinamento nello shop (stessa pagina), pannello
// admin, tasto apri-in-nuova-scheda e movimento ridotto restano senza animazione.

// --- Velocità della schiuma: 1 = come l'anteprima; più alto = più lenta ---
const FOAM_SLOW = 1.4
const SWEEP_SLOW = 1

const NS = 'http://www.w3.org/2000/svg'
const GOO_ID = 'mg-goo'
// Ordine usato solo per decidere se l'onda va verso destra o sinistra.
const ROUTE_ORDER = ['/', '/shop', '/promo', '/volantino', '/lotteria', '/consegne', '/recensioni', '/social', '/preferiti', '/carrello']

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()))

function routeIndex(path: string) {
  const i = ROUTE_ORDER.findIndex(r => (r === '/' ? path === '/' : path.startsWith(r)))
  return i === -1 ? ROUTE_ORDER.length : i
}

function svgEl(name: string, attrs: Record<string, string | number>) {
  const e = document.createElementNS(NS, name)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  return e
}

function ensureGoo() {
  if (document.getElementById(GOO_ID + '-defs')) return
  const svg = svgEl('svg', { width: 0, height: 0, id: GOO_ID + '-defs', 'aria-hidden': 'true' })
  svg.style.position = 'absolute'
  svg.innerHTML =
    `<defs><filter id="${GOO_ID}" x="-5%" y="-30%" width="110%" height="160%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/>` +
    `<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/>` +
    `</filter></defs>`
  document.body.appendChild(svg)
}

function makeFoam(W: number, H: number, D: number, kind: 'front' | 'back') {
  const front = kind === 'front'
  const fill = front ? '#f3fdff' : '#a5f3fc'
  const el = document.createElement('div')
  el.style.cssText = `position:absolute;left:0;right:0;top:0;height:${H + D}px;will-change:transform;`

  const body = document.createElement('div')
  body.style.cssText = `position:absolute;left:0;right:0;top:0;height:${H + 2}px;background:${
    front ? 'linear-gradient(180deg,#ffffff 0%,#f3fdff 100%)' : 'linear-gradient(180deg,#cffafe 0%,#a5f3fc 100%)'
  };`
  el.appendChild(body)

  // bordo inferiore: gocce che colano
  const drip = svgEl('svg', { width: W, height: D, viewBox: `0 0 ${W} ${D}` })
  drip.style.cssText = `position:absolute;left:0;top:${H}px;overflow:visible;`
  const g = svgEl('g', { filter: `url(#${GOO_ID})`, fill })
  g.appendChild(svgEl('rect', { x: -20, y: -10, width: W + 40, height: 40 }))
  let x = -10
  while (x < W + 20) {
    const w = rnd(14, 32)
    const len = rnd(30, D - 44) * (front ? 0.85 : 1)
    g.appendChild(svgEl('rect', { x: x - w / 2, y: 18, width: w, height: len }))
    g.appendChild(svgEl('circle', { cx: x, cy: 18 + len, r: w / 2 }))
    x += rnd(26, 58)
  }
  drip.appendChild(g)
  el.appendChild(drip)

  // bordo superiore irregolare (si vede quando la schiuma scivola via)
  const TOP = 70
  const top = svgEl('svg', { width: W, height: TOP, viewBox: `0 0 ${W} ${TOP}` })
  top.style.cssText = `position:absolute;left:0;top:${-TOP}px;overflow:visible;`
  const gt = svgEl('g', { filter: `url(#${GOO_ID})`, fill })
  gt.appendChild(svgEl('rect', { x: -20, y: TOP - 24, width: W + 40, height: 40 }))
  let tx = -10
  while (tx < W + 20) {
    gt.appendChild(svgEl('circle', { cx: tx, cy: TOP - rnd(18, 30), r: rnd(13, 28) }))
    tx += rnd(20, 40)
  }
  top.appendChild(gt)
  el.appendChild(top)

  // bollicine (numero limitato per non pesare su schermi grandi / telefoni)
  const bubs = document.createElement('div')
  bubs.style.cssText = 'position:absolute;inset:0;'
  const n = Math.min(front ? 90 : 50, Math.round((W * H) / (front ? 7000 : 11000)))
  for (let i = 0; i < n; i++) {
    const s = 8 + Math.pow(Math.random(), 2.2) * 52
    const b = document.createElement('span')
    b.style.cssText =
      `position:absolute;border-radius:50%;width:${s}px;height:${s}px;` +
      `left:${rnd(0, W) - s / 2}px;top:${rnd(0, H + D * 0.55) - s / 2}px;` +
      `background:radial-gradient(circle at 32% 28%,#fff 0 14%,rgba(255,255,255,.2) 15% 55%,rgba(103,232,249,.3) 100%);` +
      `border:1px solid rgba(8,145,178,.16);box-shadow:inset -2px -3px 6px rgba(8,145,178,.1);` +
      (front ? '' : 'opacity:.55;')
    bubs.appendChild(b)
  }
  el.appendChild(bubs)
  return el
}

function makeOverlay() {
  const o = document.createElement('div')
  o.setAttribute('aria-hidden', 'true')
  // pointer-events attivi: durante l'animazione i click non passano alla pagina
  o.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow:hidden;'
  document.body.appendChild(o)
  return o
}

async function runFoam(navigate: () => Promise<void>) {
  ensureGoo()
  const S = FOAM_SLOW
  const W = window.innerWidth
  const H = window.innerHeight + 2
  const D = 230
  const overlay = makeOverlay()
  try {
    const back = makeFoam(W, H, D, 'back')
    const front = makeFoam(W, H, D, 'front')
    overlay.appendChild(back)
    overlay.appendChild(front)
    const start = `translateY(${-(H + D + 90)}px)`
    back.style.transform = front.style.transform = start
    const cover = [{ transform: start }, { transform: 'translateY(0)' }]
    const out = [{ transform: 'translateY(0)' }, { transform: `translateY(${H + 100}px)` }]
    const easeIn = 'cubic-bezier(.55,.1,.3,1)'
    const easeOut = 'cubic-bezier(.5,0,.8,.45)'

    back.animate(cover, { duration: 560 * S, easing: easeIn, fill: 'forwards' })
    const af = front.animate(cover, { duration: 560 * S, delay: 90 * S, easing: easeIn, fill: 'forwards' })
    await af.finished
    await navigate()
    await wait(60 * S)
    const of = front.animate(out, { duration: 640 * S, easing: easeOut, fill: 'forwards' })
    const ob = back.animate(out, { duration: 640 * S, delay: 110 * S, easing: easeOut, fill: 'forwards' })
    await Promise.all([of.finished, ob.finished])
  } finally {
    overlay.remove()
  }
}

async function runSweep(dir: 1 | -1, navigate: () => Promise<void>) {
  const S = SWEEP_SLOW
  const W = window.innerWidth
  const H = window.innerHeight + 2
  const Wp = W * 2.3
  const Hp = H * 1.5
  const overlay = makeOverlay()
  try {
    const mk = (bg: string, scale: number) => {
      const p = document.createElement('div')
      p.style.cssText =
        `position:absolute;border-radius:50%;will-change:transform;background:${bg};` +
        `width:${Wp * scale}px;height:${Hp * scale}px;left:${(W - Wp * scale) / 2}px;top:${(H - Hp * scale) / 2}px;`
      overlay.appendChild(p)
      return p
    }
    const lead = mk('linear-gradient(100deg,#a5f3fc,#cffafe)', 1.06)
    const main = mk(
      'radial-gradient(ellipse 40% 35% at 35% 25%,rgba(255,255,255,.5),rgba(255,255,255,0) 70%),linear-gradient(100deg,#0891b2,#22d3ee 60%,#67e8f9)',
      1
    )
    const far = (W + Wp) / 2 + 60
    const s = `translateX(${dir * far}px)`
    const m = 'translateX(0)'
    const e = `translateX(${-dir * far}px)`
    lead.style.transform = main.style.transform = s
    const enter = 'cubic-bezier(.3,.6,.3,1)'
    const leave = 'cubic-bezier(.6,0,.8,.5)'

    lead.animate([{ transform: s }, { transform: m }], { duration: 480 * S, easing: enter, fill: 'forwards' })
    const am = main.animate([{ transform: s }, { transform: m }], { duration: 480 * S, delay: 80 * S, easing: enter, fill: 'forwards' })
    await am.finished
    await navigate()
    await wait(40 * S)
    const ol = lead.animate([{ transform: m }, { transform: e }], { duration: 520 * S, easing: leave, fill: 'forwards' })
    const om = main.animate([{ transform: m }, { transform: e }], { duration: 520 * S, delay: 80 * S, easing: leave, fill: 'forwards' })
    await Promise.all([ol.finished, om.finished])
  } finally {
    overlay.remove()
  }
}

export function PageTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  const busyRef = useRef(false)
  const resolveRef = useRef<(() => void) | null>(null)

  // Quando la nuova pagina è montata sblocca l'animazione di uscita.
  useEffect(() => {
    pathRef.current = pathname
    if (resolveRef.current) {
      const r = resolveRef.current
      resolveRef.current = null
      // piccolo margine per far dipingere la pagina nuova prima di scoprirla
      setTimeout(r, 120)
    }
  }, [pathname])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onClick = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
      if (reduce.matches || typeof Element.prototype.animate !== 'function') return
      const target = ev.target as Element | null
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      if (a.target && a.target !== '_self') return
      if (a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return

      let url: URL
      try { url = new URL(a.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      const here = pathRef.current || window.location.pathname
      if (url.pathname === here) return // stessa pagina: filtri, ordinamento, #ancore
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/mgadmin-panel') || here.startsWith('/mgadmin-panel')) return

      // Blocca la navigazione normale (Next.js la salta se il click è già
      // "prevented"), ma lascia girare gli altri onClick (es. chiudere menu).
      ev.preventDefault()
      if (busyRef.current) return
      busyRef.current = true

      const inNav = !!a.closest('header, nav')
      const dir: 1 | -1 = routeIndex(url.pathname) >= routeIndex(here) ? 1 : -1
      const dest = url.pathname + url.search + url.hash

      const navigate = () =>
        new Promise<void>(resolve => {
          let done = false
          const finish = () => { if (!done) { done = true; resolveRef.current = null; resolve() } }
          resolveRef.current = finish
          setTimeout(finish, 5000) // rete lenta: non restare bloccati
          router.push(dest)
        })

      const run = inNav ? runSweep(dir, navigate) : runFoam(navigate)
      run
        .catch(() => { window.location.href = dest })
        .finally(() => { busyRef.current = false })
    }

    // fase di cattura: arriva prima del <Link> di Next.js
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [router])

  return null
}
