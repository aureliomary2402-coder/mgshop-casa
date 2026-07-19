"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, ArrowLeft, Phone, Trash2 } from 'lucide-react'

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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      if (Array.isArray(data)) setConversations(data)
    } catch {}
    setLoading(false)
  }, [])

  const fetchThread = useCallback(async (phone_normalized: string) => {
    try {
      const res = await fetch(`/api/admin/chat?phone=${encodeURIComponent(phone_normalized)}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    } catch {}
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

  const handleDelete = async (phone_normalized: string) => {
    setDeleting(true)
    try {
      await fetch('/api/admin/chat', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_normalized }) })
      setConfirmDelete(null)
      if (active?.phone_normalized === phone_normalized) setActive(null)
      fetchConversations()
    } catch {}
    setDeleting(false)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  if (active) return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{active.customer_name || active.phone_number}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {active.phone_number}</p>
        </div>
        {confirmDelete === active.phone_normalized ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Eliminare?</span>
            <button onClick={() => handleDelete(active.phone_normalized)} disabled={deleting}
              className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium disabled:opacity-50">
              {deleting ? '...' : 'Sì'}
            </button>
            <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium">
              Annulla
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(active.phone_normalized)}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div ref={scrollRef} className="bg-slate-50 rounded-xl p-3 h-96 overflow-y-auto space-y-2 border border-slate-100">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'admin' ? 'text-white rounded-br-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'}`}
              style={m.sender === 'admin' ? { background: 'linear-gradient(135deg,#0891b2,#06b6d4)' } : undefined}
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
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white disabled:opacity-50 shrink-0"
          style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-cyan-600" /> Chat ({conversations.length})
      </h2>
      <div className="space-y-2">
        {conversations.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">Nessuna conversazione</p>
        ) : conversations.map(c => (
          <div key={c.phone_normalized}
            className="w-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-3 hover:border-cyan-200 transition-colors">
            <button onClick={() => setActive(c)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm bg-cyan-50 text-cyan-700">
                {c.customer_name ? c.customer_name[0].toUpperCase() : <Phone className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{c.customer_name || c.phone_number}</p>
                  {c.unread > 0 && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white shrink-0">{c.unread}</span>}
                </div>
                <p className="text-xs text-slate-400 truncate">{c.last_message}</p>
              </div>
              <p className="text-xs text-slate-400 shrink-0">
                {new Date(c.last_message_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
              </p>
            </button>
            {confirmDelete === c.phone_normalized ? (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleDelete(c.phone_normalized)} disabled={deleting}
                  className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50">
                  {deleting ? '...' : 'Sì'}
                </button>
                <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(c.phone_normalized)}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
