// Lettura della luminosità della pagina sotto un elemento fisso (usata dalla
// striscia scorrevole). Stessa logica della bottom nav.
type RGBA = { r: number; g: number; b: number; a: number }

// ---- lettura del colore della pagina sotto la barra ----

let colorCtx: CanvasRenderingContext2D | null | undefined
const colorCache = new Map<string, RGBA | null>()

// Converte qualunque colore CSS (rgb, oklch, color(), hex...) in rgba sRGB
// passando da un canvas 1x1: così funziona anche con i colori moderni.
function parseColor(str: string): RGBA | null {
  if (!str || str === 'transparent') return null
  if (colorCache.has(str)) return colorCache.get(str) ?? null
  if (colorCtx === undefined) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    colorCtx = c.getContext('2d', { willReadFrequently: true })
  }
  let out: RGBA | null = null
  if (colorCtx) {
    colorCtx.clearRect(0, 0, 1, 1)
    colorCtx.fillStyle = 'rgba(0,0,0,0)'
    colorCtx.fillStyle = str
    colorCtx.fillRect(0, 0, 1, 1)
    const d = colorCtx.getImageData(0, 0, 1, 1).data
    if (d[3] > 0) out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
  }
  colorCache.set(str, out)
  return out
}

// Colore medio di un gradiente (ignora le immagini vere e proprie).
function gradientColor(image: string): RGBA | null {
  if (!image || image === 'none' || !image.includes('gradient')) return null
  const tokens = image.match(/rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}\b|transparent/g)
  if (!tokens || tokens.length === 0) return null
  let r = 0, g = 0, b = 0, aSum = 0
  for (const t of tokens) {
    const c = parseColor(t)
    if (c) { r += c.r * c.a; g += c.g * c.a; b += c.b * c.a; aSum += c.a }
  }
  if (aSum < 0.05) return null
  return { r: r / aSum, g: g / aSum, b: b / aSum, a: Math.min(1, aSum / tokens.length) }
}

// Luminosità (0 = nero, 1 = bianco) di ciò che sta dietro un punto dello schermo.
export function luminanceAt(x: number, y: number, nav: HTMLElement): number {
  let accR = 0, accG = 0, accB = 0, accA = 0
  const add = (c: RGBA | null) => {
    if (!c || accA >= 0.98) return
    const w = (1 - accA) * c.a
    accR += w * c.r; accG += w * c.g; accB += w * c.b; accA += w
  }
  for (const el of document.elementsFromPoint(x, y)) {
    if (nav.contains(el)) continue
    const cs = getComputedStyle(el)
    // I pannelli fissi (ticker, pulsanti flottanti, menu) non sono lo sfondo della pagina.
    if (cs.position === 'fixed') continue
    add(gradientColor(cs.backgroundImage))
    add(parseColor(cs.backgroundColor))
    if (accA >= 0.98) break
  }
  // Quello che resta scoperto è lo sfondo bianco della pagina.
  const rest = 1 - accA
  const r = accR + rest * 255, g = accG + rest * 255, b = accB + rest * 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

