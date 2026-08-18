#!/bin/bash
set -e
cd "$(dirname "$0")" 2>/dev/null || true
cd ~/mgshop-casa

echo "1/4 - Aggiorno app/api/push/subscribe/route.ts (aggiungo DELETE)..."
cat > app/api/push/subscribe/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(req: Request) {
  const { subscription, phoneNumber } = await req.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'subscription non valida' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        subscription,
        phone_number: phoneNumber ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )
  if (error) {
    console.error('Errore salvataggio push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE - rimuove la subscription quando l'utente disattiva le notifiche
// dallo switch nel popup "Il mio account" (o da qualunque altro punto).
export async function DELETE(req: Request) {
  const { endpoint } = await req.json()
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .contains('subscription', { endpoint })
  if (error) {
    console.error('Errore rimozione push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
EOF

echo "2/4 - Aggiorno lib/push-subscribe.ts (aggiungo unsubscribeFromPush)..."
cat > lib/push-subscribe.ts << 'EOF'
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

type SubscribeResult = { ok: true } | { ok: false; reason: string }

export async function subscribeToPush(phoneNumber?: string): Promise<SubscribeResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not-supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' }
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, phoneNumber }),
    })

    if (!res.ok) return { ok: false, reason: 'save-failed' }
    return { ok: true }
  } catch (err) {
    console.error('Errore subscribe push:', err)
    return { ok: false, reason: 'exception' }
  }
}

// Disattiva le notifiche: annulla la subscription lato browser e rimuove
// la riga corrispondente da push_subscriptions lato server. Usata dallo
// switch OFF nel popup "Il mio account" e riusabile ovunque serva.
export async function unsubscribeFromPush(): Promise<SubscribeResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not-supported' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return { ok: true }

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    const res = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })

    if (!res.ok) return { ok: false, reason: 'delete-failed' }
    return { ok: true }
  } catch (err) {
    console.error('Errore unsubscribe push:', err)
    return { ok: false, reason: 'exception' }
  }
}
EOF

echo "3/4 - Aggiorno app/api/account-lookup/route.ts (aggiungo notificationsEnabled)..."
cat > app/api/account-lookup/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) { if (n.startsWith(p)) { n = n.slice(p.length); break } }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

// GET - dati pubblici dell'account (punti fedeltà, lotteria in corso, ultimi
// ordini, stato notifiche) per un numero di telefono. Nessuna autenticazione
// richiesta, stesso principio già usato da /api/loyalty-check: non espone
// dati di altri clienti, solo quanto risulta dal numero digitato dall'utente.
//
// Prima di questa route il pannello "Il mio account" (FloatingMenu) chiamava
// già /api/account-lookup ma l'endpoint non esisteva: da qui l'errore mostrato
// a ogni inserimento del numero.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone') || ''
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 6) {
    return NextResponse.json({ error: 'Numero di telefono non valido' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const last8 = normalized.slice(-8)
  const supabase = createAdminClient()

  const [{ data: pointsRows, error: pointsError }, { data: settings }, { data: lottery }, { data: pushSubs }] = await Promise.all([
    supabase.from('loyalty_points').select('points, type').eq('phone_normalized', normalized),
    supabase.from('loyalty_settings').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
    supabase.from('lottery').select('*').limit(1).single(),
    supabase.from('push_subscriptions').select('phone_number').not('phone_number', 'is', null).ilike('phone_number', `%${last8}%`),
  ])

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 })
  }

  const total = Math.max(0, (pointsRows || []).reduce((s, r) => s + r.points, 0))
  const threshold = settings?.points_threshold || 10
  const rewardDescription = settings?.reward_description || 'un premio esclusivo'
  const resetCount = (pointsRows || []).filter(r => r.type === 'reset').length
  const cardsCompleted = resetCount + Math.floor(total / threshold)
  const progress = total % threshold

  // Notifiche già attive per questo numero: usato per mostrare lo switch
  // già "acceso" quando il cliente riapre il popup da un dispositivo dove
  // aveva già attivato le notifiche con lo stesso numero.
  const notificationsEnabled = (pushSubs || []).some(
    r => r.phone_number && normalizePhone(r.phone_number) === normalized
  )

  // Numeri lotteria del turno in corso per questo cliente: sia quelli
  // aggiunti durante un ordine normale (colonna lottery_number su orders)
  // sia quelli comprati a parte come biglietti (tabella lottery_tickets).
  let lotteryPayload: { title: string; ends_at: string | null; numbers: number[] } | null = null
  if (lottery?.is_active && lottery.round_id) {
    const [{ data: orderTickets }, { data: standaloneTickets }] = await Promise.all([
      supabase.from('orders').select('phone_number, lottery_number')
        .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null)
        .ilike('phone_number', `%${last8}%`),
      supabase.from('lottery_tickets').select('phone_number, lottery_number')
        .eq('round_id', lottery.round_id).eq('is_reserved', false)
        .ilike('phone_number', `%${last8}%`),
    ])
    const numbers = new Set<number>()
    for (const row of [...(orderTickets || []), ...(standaloneTickets || [])]) {
      if (row.phone_number && row.lottery_number != null && normalizePhone(row.phone_number) === normalized) {
        numbers.add(row.lottery_number)
      }
    }
    lotteryPayload = { title: lottery.title, ends_at: lottery.ends_at, numbers: Array.from(numbers).sort((a, b) => a - b) }
  }

  // Ultimi ordini (solo prodotti veri, non i biglietti lotteria acquistati a parte)
  const { data: candidateOrders } = await supabase
    .from('orders')
    .select('id, status, total, created_at, phone_number, order_items(product_name, quantity, product_price)')
    .eq('is_ticket_only', false)
    .ilike('phone_number', `%${last8}%`)
    .order('created_at', { ascending: false })
    .limit(30)

  const orders = (candidateOrders || [])
    .filter(o => normalizePhone(o.phone_number) === normalized)
    .slice(0, 5)
    .map(o => ({ id: o.id, status: o.status, total: o.total, created_at: o.created_at, items: o.order_items || [] }))

  return NextResponse.json({
    points: { total, threshold, reward_description: rewardDescription, cards_completed: cardsCompleted, progress },
    lottery: lotteryPayload,
    orders,
    notificationsEnabled,
  })
}
EOF

echo "4/4 - Aggiorno components/shop/floating-menu.tsx (switch anche prima del numero)..."
cat > components/shop/floating-menu.tsx << 'EOF'
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, X, Send, Menu as MenuIcon, ShoppingBag, Gift, Share2, Bell } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-subscribe'

interface ChatMessage {
  id: string
  sender: 'customer' | 'admin'
  message: string
  created_at: string
}

interface Identity {
  name: string
  phone: string
}

interface PointsData {
  total: number
  threshold: number
  reward_description: string
  cards_completed: number
  progress: number
}

interface LotteryData {
  title: string
  ends_at: string | null
  numbers: number[]
}

interface OrderItemSummary {
  product_name: string
  quantity: number
  product_price: number
}

interface OrderSummary {
  id: string
  status: string
  total: number
  created_at: string
  items: OrderItemSummary[]
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STORAGE_KEY = 'mgshop_chat_identity'
const SEEN_KEY = 'mgshop_chat_last_seen'
const POLL_MS = 4000

export function FloatingMenu() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [pointsOpen, setPointsOpen] = useState(false)

  const [pointsPhone, setPointsPhone] = useState('')
  const [pointsChecking, setPointsChecking] = useState(false)
  const [pointsError, setPointsError] = useState('')
  const [pointsData, setPointsData] = useState<PointsData | null>(null)
  const [lotteryData, setLotteryData] = useState<LotteryData | null>(null)
  const [ordersData, setOrdersData] = useState<OrderSummary[]>([])

  // Switch notifiche dentro il popup "Il mio account": riusa le stesse
  // subscribeToPush/unsubscribeFromPush del banner NotifyBanner, così non
  // si duplica la logica push già esistente (VAPID + push_subscriptions).
  const [notifOn, setNotifOn] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState('')

  const [identity, setIdentity] = useState<Identity | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cartCount = useCartStore(s => s.getTotalItems)()
  const requestPoints = useUIPanelsStore(s => s.requestPoints)
  const requestChat = useUIPanelsStore(s => s.requestChat)

  // Nelle pagine Volantino, Promo, Negozio e Prodotto lo scroll è lungo e
  // il carrello rischia di restare "fuori vista" dopo un acquisto: qui
  // aggiungiamo una scorciatoia sempre a portata di mano, sopra il
  // pulsante social/chat, così non serve risalire per il checkout.
  const showStickyCart = pathname === '/volantino' || pathname === '/promo' || pathname === '/shop' || pathname?.startsWith('/prodotto')
  const cartHref = pathname === '/promo' ? '/carrello?promo=1' : '/carrello'
  // La bottom nav è fissa su tutte le larghezze: alziamo tutto di uno
  // "scalino" in più per non finirci sopra, su mobile e da browser.
  const menuOffsetClass = showStickyCart ? 'bottom-[13.5rem]' : 'bottom-[9.5rem]'

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try { setIdentity(JSON.parse(raw)) } catch {}
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!identity) return
    try {
      const res = await fetch(`/api/chat?phone=${encodeURIComponent(identity.phone)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      setMessages(data)
      const lastAdmin = [...data].reverse().find(m => m.sender === 'admin')
      if (lastAdmin) {
        const seen = localStorage.getItem(SEEN_KEY)
        if (seen !== lastAdmin.id) setHasUnseen(true)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity])

  useEffect(() => {
    if (!identity) return
    fetchMessages()
    const interval = setInterval(fetchMessages, POLL_MS)
    return () => clearInterval(interval)
  }, [identity, fetchMessages])

  useEffect(() => {
    if (chatOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    if (chatOpen && messages.length > 0) {
      const lastAdmin = [...messages].reverse().find(m => m.sender === 'admin')
      if (lastAdmin) localStorage.setItem(SEEN_KEY, lastAdmin.id)
      setHasUnseen(false)
    }
  }, [chatOpen, messages])

  const startChat = () => {
    if (!nameInput.trim() || !phoneInput.trim()) return
    const id = { name: nameInput.trim(), phone: phoneInput.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(id))
    setIdentity(id)
  }

  const send = async () => {
    if (!text.trim() || !identity) return
    setSending(true)
    const body = { phone_number: identity.phone, customer_name: identity.name, message: text.trim() }
    setText('')
    try {
      await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      fetchMessages()
    } catch {}
    setSending(false)
  }

  const openChat = () => {
    setMenuOpen(false)
    setChatOpen(prev => !prev)
  }
  const openPoints = () => {
    setMenuOpen(false)
    setPointsOpen(prev => !prev)
    if (!pointsPhone && identity?.phone) setPointsPhone(identity.phone)
  }
  const closeAll = () => { setMenuOpen(false); setChatOpen(false); setPointsOpen(false) }

  // La bolla "Punti"/"Account" e la bolla "Contatti" della homepage (e la
  // bottom nav) chiamano useUIPanelsStore().openPoints()/openChat() per
  // aprire questi stessi pannelli senza duplicare la logica.
  useEffect(() => {
    if (requestPoints === 0) return
    openPoints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestPoints])
  useEffect(() => {
    if (requestChat === 0) return
    openChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestChat])

  // Cambio pagina: chiudi automaticamente tutti i pannelli (account, chat,
  // mini-menu) invece di lasciarli aperti "fantasma" sulla nuova pagina.
  useEffect(() => {
    setMenuOpen(false)
    setChatOpen(false)
    setPointsOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const checkPoints = async () => {
    if (!pointsPhone.trim()) return
    setPointsChecking(true)
    setPointsError('')
    try {
      const res = await fetch(`/api/account-lookup?phone=${encodeURIComponent(pointsPhone.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setPointsError(data.error || 'Numero non valido')
        setPointsData(null)
        setLotteryData(null)
        setOrdersData([])
      } else {
        setPointsData(data.points)
        setLotteryData(data.lottery)
        setOrdersData(data.orders || [])
        setNotifOn(!!data.notificationsEnabled)
        setNotifError('')
      }
    } catch {
      setPointsError('Errore di connessione, riprova')
      setPointsData(null)
      setLotteryData(null)
      setOrdersData([])
    }
    setPointsChecking(false)
  }

  const resetPoints = () => {
    setPointsData(null); setLotteryData(null); setOrdersData([]); setPointsError('')
    // Non azzeriamo notifOn qui: lo switch nella schermata "inserisci
    // numero" deve continuare a riflettere lo stato reale del dispositivo.
  }

  // All'apertura del popup, prima ancora di inserire il numero, mostriamo
  // lo stato reale delle notifiche su questo dispositivo/browser (stesso
  // controllo già fatto da NotifyBanner). Se poi il cliente inserisce un
  // numero, checkPoints() lo sovrascrive con lo stato collegato a quel
  // numero specifico (più preciso, letto dal server).
  useEffect(() => {
    if (!pointsOpen) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') { setNotifOn(false); return }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setNotifOn(!!sub)
    }).catch(() => {})
  }, [pointsOpen])

  // Switch ON/OFF nel popup: riusa esattamente lo stesso flusso di
  // subscribe/unsubscribe usato dal banner. Se il numero è già stato
  // digitato lo colleghiamo alla subscription, altrimenti si attiva comunque
  // (come il banner) e resterà collegato solo al dispositivo finché non
  // viene inserito un numero in un secondo momento.
  const toggleNotifications = async () => {
    if (notifLoading) return
    setNotifLoading(true)
    setNotifError('')
    if (notifOn) {
      const result = await unsubscribeFromPush()
      if (result.ok) setNotifOn(false)
      else setNotifError('Errore nella disattivazione, riprova')
    } else {
      const result = await subscribeToPush(pointsPhone.trim() || undefined)
      if (result.ok) {
        setNotifOn(true)
      } else if (result.reason === 'permission-denied') {
        setNotifError('Permesso negato dal browser')
      } else if (result.reason === 'not-supported') {
        setNotifError('Notifiche non supportate su questo dispositivo')
      } else {
        setNotifError('Errore, riprova')
      }
    }
    setNotifLoading(false)
  }

  const NotifSwitch = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-cyan-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700">Notifiche</p>
            <p className="text-[11px] text-slate-400 leading-snug">Ricevi avvisi su offerte e ordini</p>
          </div>
        </div>
        <button
          onClick={toggleNotifications}
          disabled={notifLoading}
          aria-pressed={notifOn}
          aria-label="Attiva notifiche"
          className="relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-60"
          style={{ background: notifOn ? 'linear-gradient(135deg,#0891b2,#06b6d4)' : '#e2e8f0' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: notifOn ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>
      {notifError && <p className="text-[11px] text-red-500 text-center">{notifError}</p>}
    </div>
  )

  // Nascosto nel pannello admin
  if (pathname?.startsWith('/mgadmin-panel')) return null

  const isOpen = menuOpen || chatOpen || pointsOpen

  return (
    <>
      {/* Bolla principale */}
      <button
        onClick={() => (isOpen ? closeAll() : setMenuOpen(true))}
        className="fixed bottom-[5.5rem] right-5 z-[45] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
        aria-label="Apri menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        {hasUnseen && !isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>

      {/* Scorciatoia carrello, sempre visibile, sopra il pulsante social/chat */}
      {showStickyCart && cartCount > 0 && !isOpen && (
        <Link
          href={cartHref}
          className="fixed bottom-[9.5rem] right-5 z-[45] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 animate-scale-in"
          style={{ background: '#0c2b36' }}
          aria-label="Vai al carrello"
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            {cartCount}
          </span>
        </Link>
      )}

      {/* Mini-menu a scomparsa: social + chat */}
      {menuOpen && !chatOpen && !pointsOpen && (
        <div className={`fixed ${menuOffsetClass} right-5 z-[45] flex flex-col items-end gap-3`}>
          <Link href="/social" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            Social
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
              <Share2 size={17} />
            </span>
          </Link>
          <button onClick={openChat}
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            Scrivici in chat
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
              <MessageCircle size={17} />
            </span>
          </button>
        </div>
      )}

      {/* Pannello chat: su desktop ancorato vicino all'header (dove sta il
          pulsante "Contatti"), su mobile resta sopra la bolla flottante. */}
      {chatOpen && (
        <div className={`fixed ${menuOffsetClass} lg:top-20 lg:bottom-auto right-5 z-[45] w-[90vw] max-w-sm h-[480px] max-h-[70vh] liquid-glass-card rounded-2xl flex flex-col overflow-hidden`}>
          <div className="px-4 py-3 text-white font-semibold flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <MessageCircle className="w-4 h-4" /> Scrivici
          </div>

          {!identity ? (
            <div className="flex-1 p-5 space-y-3 flex flex-col justify-center">
              <p className="text-sm text-slate-500 text-center mb-2">Lascia il tuo nome e numero per iniziare a chattare con noi</p>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Il tuo nome"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Numero di telefono"
                type="tel"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={startChat}
                disabled={!nameInput.trim() || !phoneInput.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
              >
                Inizia chat
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                {messages.length === 0 && (
                  <p className="text-xs text-slate-400 text-center mt-4">Scrivici un messaggio, ti risponderemo al più presto!</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'customer' ? 'text-white rounded-br-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'}`}
                      style={m.sender === 'customer' ? { background: 'linear-gradient(135deg,#0891b2,#06b6d4)' } : undefined}
                    >
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-50 shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pannello punti fedeltà: stesso comportamento, ancorato vicino
          all'header su desktop, sopra la bolla flottante su mobile. */}
      {pointsOpen && (
        <div className={`fixed ${menuOffsetClass} lg:top-20 lg:bottom-auto right-5 z-[45] w-[90vw] max-w-sm lg:max-h-[75vh] liquid-glass-card rounded-2xl flex flex-col overflow-hidden`}>
          <div className="px-4 py-3 text-white font-semibold flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <img src="/images/mgshop-stamp.png" alt="" className="w-4 h-4 object-contain" /> Il mio account
          </div>

          {!pointsData ? (
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500 text-center mb-1">Inserisci il numero usato nei tuoi ordini per vedere punti, lotteria e ultimi ordini</p>
              <input
                value={pointsPhone}
                onChange={e => setPointsPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && checkPoints()}
                placeholder="Numero di telefono"
                type="tel"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {pointsError && <p className="text-xs text-red-500 text-center">{pointsError}</p>}
              <button
                onClick={checkPoints}
                disabled={pointsChecking || !pointsPhone.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
              >
                {pointsChecking ? 'Verifica in corso...' : 'Controlla i miei punti'}
              </button>
              <NotifSwitch />
            </div>
          ) : (
            <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <NotifSwitch />

              {pointsData.cards_completed > 0 && (
                <p className="text-xs font-semibold text-center text-cyan-700 bg-cyan-50 rounded-lg py-1.5">
                  🎉 Hai completato la scheda {pointsData.cards_completed} {pointsData.cards_completed === 1 ? 'volta' : 'volte'}!
                </p>
              )}

              <div className="grid grid-cols-5 gap-2.5 justify-items-center">
                {Array.from({ length: pointsData.threshold }).map((_, i) => {
                  const filled = i < pointsData.progress
                  return (
                    <div key={i} className="relative">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-white overflow-hidden"
                        style={filled
                          ? {
                            border: '2px solid #dc2626',
                            boxShadow: '0 2px 6px rgba(220,38,38,0.2)',
                            animation: `checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 70}ms both`,
                          }
                          : { border: '2px dashed #cbd5e1', background: '#f8fafc' }}
                      >
                        {filled && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src="/images/mgshop-stamp.png" alt="" className="w-12 h-12 object-contain" />
                        )}
                      </div>
                      <span
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ background: filled ? '#dc2626' : '#94a3b8' }}
                      >
                        {i + 1}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">
                  {pointsData.progress} / {pointsData.threshold} punti
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  Premio: {pointsData.reward_description}
                </p>
              </div>

              {/* Numero/i lotteria del turno in corso, se il cliente ha già partecipato */}
              {lotteryData && lotteryData.numbers.length > 0 && (
                <div className="rounded-xl p-3 border" style={{ background: 'rgba(225,29,72,0.05)', borderColor: 'rgba(225,29,72,0.15)' }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: '#be123c' }}>🎟️ Lotteria in corso: {lotteryData.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lotteryData.numbers.map(n => (
                      <span key={n} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: '#e11d48' }}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ultimi ordini */}
              {ordersData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">I tuoi ultimi ordini</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {ordersData.map(o => (
                      <div key={o.id} className="rounded-lg border border-slate-100 p-2.5 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            {new Date(o.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ORDER_STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-snug">
                          {o.items.slice(0, 3).map(it => `${it.quantity}× ${it.product_name}`).join(', ')}
                          {o.items.length > 3 && ` +${o.items.length - 3} altro/i`}
                        </p>
                        <p className="text-xs font-bold text-slate-900 mt-1">€{Number(o.total).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={resetPoints}
                className="w-full py-2 rounded-lg text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors"
              >
                Controlla un altro numero
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
EOF

echo ""
echo "✅ Fatto! File modificati:"
echo "   - app/api/push/subscribe/route.ts"
echo "   - lib/push-subscribe.ts"
echo "   - app/api/account-lookup/route.ts"
echo "   - components/shop/floating-menu.tsx"
echo ""
echo "Ora testa in locale con: npm run dev"
echo "Se va tutto bene:"
echo "   git add -A"
echo "   git commit -m 'Aggiunto switch notifiche nel popup account'"
echo "   git push"
