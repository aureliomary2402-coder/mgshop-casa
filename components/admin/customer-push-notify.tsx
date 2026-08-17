"use client"
import { useState, useEffect } from 'react'
import { Send, Megaphone, Check, Users, Clock } from 'lucide-react'

type HistoryItem = {
  id: string
  title: string
  body: string
  sent_count: number
  failed_count: number
  created_at: string
}

type Subscriber = {
  id: string
  phone_number: string | null
  created_at: string
}

export function CustomerPushNotify() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [showList, setShowList] = useState(false)

  const loadStats = () => {
    fetch('/api/admin/push-notify')
      .then(r => r.json())
      .then(d => {
        setActiveSubscriptions(d.activeSubscriptions ?? 0)
        setHistory(d.history || [])
        setSubscribers(d.subscribers || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Scrivi titolo e messaggio')
      return
    }
    setSending(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/admin/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore invio'); setSending(false); return }
      setResult({ sent: data.sent, failed: data.failed })
      setTitle(''); setBody('')
      loadStats()
    } catch {
      setError('Errore di rete, riprova')
    }
    setSending(false)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-5 h-5 text-cyan-600" />
          <h2 className="font-bold text-slate-800">Invia notifica ai clienti</h2>
        </div>
        <p className="text-sm text-slate-500 -mt-1 mb-4">
          Il messaggio arriva sul telefono di chi ha attivato le notifiche.
        </p>

        <button onClick={() => setShowList(v => !v)} className="w-full flex items-center gap-2 p-3 rounded-xl mb-2 text-left" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>
          <Users className="w-4 h-4 text-cyan-700 shrink-0" />
          <span className="text-sm text-cyan-800 flex-1">
            <strong>{activeSubscriptions ?? '...'}</strong> {activeSubscriptions === 1 ? 'persona ha' : 'persone hanno'} attivato le notifiche
          </span>
          <span className="text-xs text-cyan-600 underline">{showList ? 'Nascondi' : 'Vedi elenco'}</span>
        </button>

        {showList && (
          <div className="mb-4 rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {subscribers.length === 0 ? (
              <p className="text-sm text-slate-400 p-3">Nessun iscritto ancora.</p>
            ) : subscribers.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-slate-700">{s.phone_number || 'Anonimo (nessun numero)'}</span>
                <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es: Nuova offerta!"
              className="w-full h-11 px-4 rounded-xl text-base outline-none border border-slate-200 focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Messaggio</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Es: Sconto 20% su tutta la pasta, solo oggi!"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-base outline-none border border-slate-200 focus:border-cyan-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {result && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
              <Check className="w-4 h-4" />
              Inviata a {result.sent} client{result.sent === 1 ? 'e' : 'i'}
              {result.failed > 0 && ` (${result.failed} non raggiungibili)`}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Invio in corso...' : 'Invia notifica'}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-600">Storico invii</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuna notifica inviata finora.</p>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="p-3 rounded-xl border border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(item.created_at)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{item.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Raggiunte {item.sent_count} persone
                  {item.failed_count > 0 && ` · ${item.failed_count} non raggiungibili`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
