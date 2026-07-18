"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send } from 'lucide-react'

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

const STORAGE_KEY = 'mgshop_chat_identity'
const SEEN_KEY = 'mgshop_chat_last_seen'
const POLL_MS = 4000

export function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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
      const data: ChatMessage[] = await res.json()
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
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    if (open && messages.length > 0) {
      const lastAdmin = [...messages].reverse().find(m => m.sender === 'admin')
      if (lastAdmin) localStorage.setItem(SEEN_KEY, lastAdmin.id)
      setHasUnseen(false)
    }
  }, [open, messages])

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

  // Nascosto nel pannello admin
  if (pathname?.startsWith('/mgadmin-panel')) return null

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}
        aria-label="Apri chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {hasUnseen && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[90vw] max-w-sm h-[480px] max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-100">
          <div className="px-4 py-3 text-white font-semibold flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
            <MessageCircle className="w-4 h-4" /> Scrivici
          </div>

          {!identity ? (
            <div className="flex-1 p-5 space-y-3 flex flex-col justify-center">
              <p className="text-sm text-stone-500 text-center mb-2">Lascia il tuo nome e numero per iniziare a chattare con noi</p>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Il tuo nome"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Numero di telefono"
                type="tel"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={startChat}
                disabled={!nameInput.trim() || !phoneInput.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}
              >
                Inizia chat
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-stone-50">
                {messages.length === 0 && (
                  <p className="text-xs text-stone-400 text-center mt-4">Scrivici un messaggio, ti risponderemo al più presto!</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'customer' ? 'text-white rounded-br-sm' : 'bg-white text-stone-700 border border-stone-200 rounded-bl-sm'}`}
                      style={m.sender === 'customer' ? { background: 'linear-gradient(135deg,#d97706,#f59e0b)' } : undefined}
                    >
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-stone-100 flex gap-2">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-50 shrink-0"
                  style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
