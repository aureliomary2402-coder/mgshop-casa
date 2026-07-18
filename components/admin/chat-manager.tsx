"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, ArrowLeft, Phone } from 'lucide-react'

interface Conversation {
  phone_normalized: string
  phone_number: string
  customer_name: string | null
  last_message: string
  last_message_at: string
  unread: number
}

interface ChatMessage {
  id: string
  sender: 'customer' | 'admin'
  message: string
  created_at: string
}

const POLL_MS = 5000

export function ChatManager() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    const res = await fetch('/api/admin/chat')
    const data = await res.json()
    setConversations(data)
    setLoading(false)
  }, [])

  const fetchThread = useCallback(async (phone_normalized: string) => {
    const res = await fetch(`/api/admin/chat?phone=${encodeURIComponent(phone_normalized)}`)
    const data = await res.json()
    setMessages(data)
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, POLL_MS)
    return () => clearInterval(interval)
  }, [fetchConversations])

  useEffect(() => {
    if (!active) return
    fetchThread(active.phone_normalized)
    fetch('/api/admin/chat', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_normalized: active.phone_normalized }) })
    const interval = setInterval(() => fetchThread(active.phone_normalized), POLL_MS)
    return () => clearInterval(interval)
  }, [active, fetchThread])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    if (!text.trim() || !active) return
    setSending(true)
    const body = { phone_normalized: active.phone_normalized, phone_number: active.phone_number, customer_name: active.customer_name, message: text.trim() }
    setText('')
    try {
      await fetch('/api/admin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      fetchThread(active.phone_normalized)
      fetchConversations()
    } catch {}
    setSending(false)
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  if (active) return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="font-semibold text-stone-800">{active.customer_name || active.phone_number}</p>
          <p className="text-xs text-stone-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {active.phone_number}</p>
        </div>
      </div>
      <div ref={scrollRef} className="bg-stone-50 rounded-xl p-3 h-96 overflow-y-auto space-y-2 border border-stone-100">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'admin' ? 'text-white rounded-br-sm' : 'bg-white text-stone-700 border border-stone-200 rounded-bl-sm'}`}
              style={m.sender === 'admin' ? { background: 'linear-gradient(135deg,#d97706,#f59e0b)' } : undefined}
            >
              {m.message}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Scrivi una risposta..."
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-50 shrink-0"
          style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-amber-600" /> Chat ({conversations.length})
      </h2>
      <div className="space-y-2">
        {conversations.length === 0 ? (
          <p className="text-center py-8 text-stone-400 text-sm">Nessuna conversazione</p>
        ) : conversations.map(c => (
          <button key={c.phone_normalized} onClick={() => setActive(c)}
            className="w-full text-left bg-white border border-stone-100 rounded-xl p-4 shadow-sm flex items-center gap-3 hover:border-amber-200 transition-colors">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm bg-amber-50 text-amber-700">
              {c.customer_name ? c.customer_name[0].toUpperCase() : <Phone className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-800 truncate">{c.customer_name || c.phone_number}</p>
                {c.unread > 0 && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white shrink-0">{c.unread}</span>}
              </div>
              <p className="text-xs text-stone-400 truncate">{c.last_message}</p>
            </div>
            <p className="text-xs text-stone-400 shrink-0">
              {new Date(c.last_message_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
