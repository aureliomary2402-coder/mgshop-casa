#!/bin/bash
set -e
cd "$(dirname "$0")" 2>/dev/null || true
cd ~/mgshop-casa

echo "1/3 - Aggiorno app/api/push/subscribe/route.ts (accetta il flag isAdmin)..."
python3 << 'PYEOF'
path = "app/api/push/subscribe/route.ts"
with open(path, "r") as f:
    content = f.read()

old = """export async function POST(req: Request) {
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
    )"""

new = """export async function POST(req: Request) {
  const { subscription, phoneNumber, isAdmin } = await req.json()
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
        // Le subscription "admin" (quella attivata da te nel pannello) sono
        // marcate qui: sendPushToAdmin() usa questo flag per mandare solo a
        // te le notifiche di servizio (nuovo ordine, chat, visite...) invece
        // che a tutti i clienti iscritti.
        is_admin: isAdmin === true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )"""

if old not in content:
    raise SystemExit("ANCHOR non trovato in app/api/push/subscribe/route.ts: controllo manuale necessario")
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("app/api/push/subscribe/route.ts aggiornato")
PYEOF

echo "2/3 - Aggiorno lib/push.ts (sendPushToAdmin manda solo a is_admin=true)..."
python3 << 'PYEOF'
path = "lib/push.ts"
with open(path, "r") as f:
    content = f.read()

old = """export async function sendPushToAdmin(title: string, body: string, url?: string) {
  ensureVapid()
  const supabase = createAdminClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  if (!subs || subs.length === 0) return { sent: 0 }"""

new = """export async function sendPushToAdmin(title: string, body: string, url?: string) {
  ensureVapid()
  const supabase = createAdminClient()
  // Solo le subscription marcate is_admin=true (attivate da te nel pannello
  // /mgadmin-panel): prima qui si prendevano TUTTE le subscription, quindi
  // ordini/chat/visite arrivavano anche ai clienti che avevano attivato le
  // notifiche dallo switch nel popup account.
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('is_admin', true)
  if (!subs || subs.length === 0) return { sent: 0 }"""

if old not in content:
    raise SystemExit("ANCHOR non trovato in lib/push.ts: controllo manuale necessario")
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("lib/push.ts aggiornato")
PYEOF

echo "3/3 - Aggiorno components/admin/push-notifications.tsx (corretto formato + isAdmin: true)..."
cat > components/admin/push-notifications.tsx << 'EOF'
"use client"
import { useState, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
export function PushNotifications() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) setStatus('subscribed')
      else if (Notification.permission === 'denied') setStatus('denied')
      else setStatus('unsubscribed')
    })
  }, [])
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])
  const subscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      // Corretto: prima veniva mandato il solo oggetto "sub" come body,
      // ma /api/push/subscribe si aspetta { subscription, isAdmin }.
      // Con la forma sbagliata la tua subscription non veniva mai salvata
      // come admin (e probabilmente falliva proprio il salvataggio).
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, isAdmin: true })
      })
      setStatus('subscribed')
    } catch (err) {
      console.error(err)
      if (Notification.permission === 'denied') setStatus('denied')
    }
    setLoading(false)
  }
  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }
  if (status === 'loading') return null
  if (status === 'unsupported') return (
    <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
      <BellOff className="w-3.5 h-3.5" /> Notifiche non supportate
    </div>
  )
  return (
    <div>
      {status === 'subscribed' ? (
        <button onClick={unsubscribe} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
          <Check className="w-3.5 h-3.5" />
          {loading ? '...' : 'Notifiche attive'}
        </button>
      ) : status === 'denied' ? (
        <div className="flex items-center gap-1.5 text-xs text-red-500 px-2">
          <BellOff className="w-3.5 h-3.5" /> Notifiche bloccate
        </div>
      ) : (
        <button onClick={subscribe} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:scale-105 btn-press"
          style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
          <Bell className="w-3.5 h-3.5" />
          {loading ? 'Attivazione...' : 'Attiva notifiche'}
        </button>
      )}
    </div>
  )
}
EOF

echo ""
echo "✅ Fatto! File modificati:"
echo "   - app/api/push/subscribe/route.ts"
echo "   - lib/push.ts"
echo "   - components/admin/push-notifications.tsx"
echo ""
echo "La colonna 'is_admin' è già stata aggiunta alla tabella push_subscriptions su Supabase."
echo ""
echo "IMPORTANTISSIMO dopo aver pubblicato:"
echo "1. Vai su /mgadmin-panel dal TUO dispositivo"
echo "2. Se vedi già 'Notifiche attive', clicca per disattivarle e poi riattivale"
echo "   (serve per far salvare la subscription con il flag admin corretto,"
echo "    quella vecchia non aveva questa informazione)"
echo "3. Da quel momento in poi solo tu riceverai ordini/chat/visite/carrelli abbandonati,"
echo "   i clienti continueranno a ricevere solo le notifiche che invii tu da"
echo "   'Invia notifica ai clienti'"
echo ""
echo "Ora testa in locale con: npm run dev"
echo "Se va tutto bene:"
echo "   git add -A"
echo "   git commit -m 'Separa notifiche admin da notifiche clienti (is_admin)'"
echo "   git push"
