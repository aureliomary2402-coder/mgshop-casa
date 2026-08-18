#!/bin/bash
set -e
cd "$(dirname "$0")" 2>/dev/null || true
cd ~/mgshop-casa

echo "1/2 - Aggiorno app/api/admin/push-notify/route.ts (aggiungo PATCH per rinominare)..."
cat > app/api/admin/push-notify/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import webpush from 'web-push'
async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { title, body, url } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Titolo e messaggio sono obbligatori' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Nessun cliente iscritto alle notifiche' })
  }
  const { data: logRow } = await supabase
    .from('push_notifications_log')
    .insert({ title, body, sent_count: 0, failed_count: 0 })
    .select('id')
    .single()
  const notificationId = logRow?.id || null
  const payload = JSON.stringify({ title, body, url: url || '/', notificationId })
  let sent = 0
  let failed = 0
  for (const { subscription, id } of subs) {
    try {
      await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err: unknown) {
      failed++
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', id)
      }
    }
  }
  if (notificationId) {
    await supabase
      .from('push_notifications_log')
      .update({ sent_count: sent, failed_count: failed })
      .eq('id', notificationId)
  }
  return NextResponse.json({ ok: true, sent, failed })
}
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: subscribers } = await supabase
    .from('push_subscriptions')
    .select('id, phone_number, label, created_at')
    .order('created_at', { ascending: false })
  const { data: history } = await supabase
    .from('push_notifications_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({
    activeSubscriptions: subscribers?.length || 0,
    subscribers: subscribers || [],
    history: history || [],
  })
}
// PATCH - assegna/modifica un nome (label) a un numero iscritto, per
// riconoscere i clienti nell'elenco invece del solo numero di telefono.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { id, label } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ label: typeof label === 'string' ? (label.trim() || null) : null })
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_notifications_log')
    .delete()
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
EOF

echo "2/2 - Aggiorno components/admin/customer-push-notify.tsx (rinomina inline)..."
cat > components/admin/customer-push-notify.tsx << 'EOF'
"use client"
import { useState, useEffect } from 'react'
import { Send, Megaphone, Check, Users, Clock, Trash2, Pencil, X as XIcon } from 'lucide-react'

type HistoryItem = {
  id: string
  title: string
  body: string
  sent_count: number
  failed_count: number
  clicked_count: number
  created_at: string
}

type Subscriber = {
  id: string
  phone_number: string | null
  label: string | null
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Rinomina inline: click sulla matita, modifica il nome, salva con invio
  // o con il pulsante di conferma. editingId === null quando nessuna riga
  // è in modifica.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)

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

  const handleDelete = async (id: string) => {
    if (confirmingId !== id) {
      setConfirmingId(id)
      return
    }
    setDeletingId(id)
    try {
      await fetch('/api/admin/push-notify', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setHistory(h => h.filter(item => item.id !== id))
    } catch {
      setError('Errore durante eliminazione, riprova')
    }
    setDeletingId(null)
    setConfirmingId(null)
  }

  const startEdit = (s: Subscriber) => {
    setEditingId(s.id)
    setEditValue(s.label || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveLabel = async (id: string) => {
    setSavingLabel(true)
    try {
      const res = await fetch('/api/admin/push-notify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: editValue.trim() }),
      })
      if (res.ok) {
        setSubscribers(list => list.map(s => s.id === id ? { ...s, label: editValue.trim() || null } : s))
        setEditingId(null)
        setEditValue('')
      }
    } catch {}
    setSavingLabel(false)
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
              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                {editingId === s.id ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLabel(s.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      placeholder="Nome cliente"
                      className="flex-1 min-w-0 h-8 px-2 rounded-lg text-sm border border-cyan-300 outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => saveLabel(s.id)}
                      disabled={savingLabel}
                      className="shrink-0 p-1.5 rounded-lg text-cyan-700"
                      style={{ background: 'rgba(8,145,178,0.1)' }}
                      title="Salva"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="shrink-0 p-1.5 rounded-lg text-slate-400" title="Annulla">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        {s.label || s.phone_number || 'Anonimo (nessun numero)'}
                      </p>
                      {s.label && s.phone_number && (
                        <p className="text-xs text-slate-400">{s.phone_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <button onClick={() => startEdit(s)} className="p-1 text-slate-300 hover:text-cyan-600" title="Rinomina">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      title={confirmingId === item.id ? 'Conferma eliminazione' : 'Elimina'}
                      className="p-1 rounded-lg transition-colors disabled:opacity-50"
                      style={confirmingId === item.id ? { background: 'rgba(220,38,38,0.1)' } : undefined}
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${confirmingId === item.id ? 'text-red-600' : 'text-slate-300'}`} />
                    </button>
                  </div>
                </div>
                {confirmingId === item.id && (
                  <p className="text-xs text-red-500 mt-1">Tocca di nuovo il cestino per confermare l'eliminazione</p>
                )}
                <p className="text-sm text-slate-500 mt-0.5">{item.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Raggiunte {item.sent_count} persone · {item.clicked_count || 0} click
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
EOF

echo ""
echo "✅ Fatto! File modificati:"
echo "   - app/api/admin/push-notify/route.ts (aggiunto PATCH)"
echo "   - components/admin/customer-push-notify.tsx (rinomina inline)"
echo ""
echo "La colonna 'label' è già stata aggiunta alla tabella push_subscriptions su Supabase."
echo ""
echo "Ora testa in locale con: npm run dev"
echo "Se va tutto bene:"
echo "   git add -A"
echo "   git commit -m 'Aggiunta rinomina numeri iscritti alle notifiche in admin'"
echo "   git push"
