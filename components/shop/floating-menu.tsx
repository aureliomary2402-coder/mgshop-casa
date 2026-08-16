"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, X, Send, Menu as MenuIcon, ShoppingBag, Gift } from 'lucide-react'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon, FacebookIcon } from './social-icons'
import { useCartStore } from '@/lib/cart-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

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

  // Nelle pagine Volantino e Promo lo scroll è lungo e il carrello
  // rischia di restare "fuori vista": qui aggiungiamo una scorciatoia
  // sempre a portata di mano, sopra il pulsante social/chat.
  const showStickyCart = pathname === '/volantino' || pathname === '/promo'
  const cartHref = pathname === '/promo' ? '/carrello?promo=1' : '/carrello'
  // Su mobile c'è anche la bottom nav fissa: alziamo tutto di uno "scalino"
  // in più (bottom-[...]) solo sotto md, dove la barra è visibile.
  const menuOffsetClass = showStickyCart ? 'bottom-[13.5rem] md:bottom-48' : 'bottom-[9.5rem] md:bottom-32'

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

  const openChat = () => { setMenuOpen(false); setChatOpen(true) }
  const openPoints = () => {
    setMenuOpen(false)
    setPointsOpen(true)
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

  const checkPoints = async () => {
    if (!pointsPhone.trim()) return
    setPointsChecking(true)
    setPointsError('')
    try {
      const res = await fetch(`/api/loyalty-check?phone=${encodeURIComponent(pointsPhone.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setPointsError(data.error || 'Numero non valido')
        setPointsData(null)
      } else {
        setPointsData(data)
      }
    } catch {
      setPointsError('Errore di connessione, riprova')
      setPointsData(null)
    }
    setPointsChecking(false)
  }

  const resetPoints = () => { setPointsData(null); setPointsError('') }

  // Nascosto nel pannello admin
  if (pathname?.startsWith('/mgadmin-panel')) return null

  const isOpen = menuOpen || chatOpen || pointsOpen

  return (
    <>
      {/* Bolla principale */}
      <button
        onClick={() => (isOpen ? closeAll() : setMenuOpen(true))}
        className="fixed bottom-[5.5rem] md:bottom-12 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
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
          className="fixed bottom-[9.5rem] md:bottom-32 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 animate-scale-in"
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
        <div className={`fixed ${menuOffsetClass} right-5 z-40 flex flex-col items-end gap-3`}>
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            Instagram
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#06b6d4,#d946ef,#db2777)' }}>
              <InstagramIcon size={17} />
            </span>
          </a>
          <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            TikTok
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-slate-900 shrink-0">
              <TikTokIcon size={16} />
            </span>
          </a>
          <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            WhatsApp
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-green-500 shrink-0">
              <WhatsAppIcon size={17} />
            </span>
          </a>
          <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            Facebook
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-[#1877F2] shrink-0">
              <FacebookIcon size={17} />
            </span>
          </a>
          <button onClick={openChat}
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            Scrivici in chat
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
              <MessageCircle size={17} />
            </span>
          </button>
          <button onClick={openPoints}
            className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full shadow-lg bg-white text-sm font-medium text-slate-700 transition-transform hover:scale-105">
            I tuoi punti
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white border-2"
              style={{ borderColor: '#dc2626', color: '#dc2626' }}>
              <img src="/images/mgshop-stamp.png" alt="" className="w-7 h-7 object-contain" />
            </span>
          </button>
        </div>
      )}

      {/* Pannello chat */}
      {chatOpen && (
        <div className={`fixed ${menuOffsetClass} right-5 z-40 w-[90vw] max-w-sm h-[480px] max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100`}>
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

      {/* Pannello punti fedeltà */}
      {pointsOpen && (
        <div className={`fixed ${menuOffsetClass} right-5 z-40 w-[90vw] max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100`}>
          <div className="px-4 py-3 text-white font-semibold flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <img src="/images/mgshop-stamp.png" alt="" className="w-4 h-4 object-contain" /> I tuoi punti
          </div>

          {!pointsData ? (
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500 text-center mb-1">Inserisci il numero usato nei tuoi ordini per vedere quanti punti hai raccolto</p>
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
            </div>
          ) : (
            <div className="p-5 space-y-4">
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
