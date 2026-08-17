"use client"
import { useState } from 'react'
import { Send, Megaphone, Check } from 'lucide-react'

export function CustomerPushNotify() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')

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
    } catch {
      setError('Errore di rete, riprova')
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-5 h-5 text-cyan-600" />
        <h2 className="font-bold text-slate-800">Invia notifica ai clienti</h2>
      </div>
      <p className="text-sm text-slate-500 -mt-2">
        Il messaggio arriva sul telefono di chi ha già fatto un ordine e ha attivato le notifiche.
      </p>

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
  )
}
