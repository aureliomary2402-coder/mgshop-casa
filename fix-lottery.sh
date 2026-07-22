#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo clonato (mgshop-casa)

cat > app/api/admin/lottery/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// La tabella "lottery" deve sempre avere esattamente una riga: tutto il
// pannello admin fa solo UPDATE su quella riga, mai INSERT. Se la riga
// manca (es. cancellata per errore, tabella svuotata a mano) la creiamo
// qui al volo con i valori di default, invece di rispondere 404 e
// bloccare per sempre il salvataggio dal pannello.
async function getOrCreateLotteryRow(supabase: ReturnType<typeof createAdminClient>) {
  const { data: existing } = await supabase.from('lottery').select('*').limit(1).single()
  if (existing) return existing

  const { data: created, error } = await supabase.from('lottery').insert({
    is_active: false,
    title: '',
    description: '',
    prize_type: 'custom',
    prize_label: '',
    participants_count: 10,
    winner_number: 1,
    status: 'draft',
  }).select().single()

  if (error || !created) return null
  return created
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const data = await getOrCreateLotteryRow(supabase)
  if (!data) return NextResponse.json({ error: 'Impossibile creare la riga lotteria' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const existing = await getOrCreateLotteryRow(supabase)
  if (!existing) return NextResponse.json({ error: 'Impossibile creare la riga lotteria' }, { status: 500 })

  const participants = Math.min(500, Math.max(2, parseInt(body.participants_count) || 2))
  const winner = Math.min(participants, Math.max(1, parseInt(body.winner_number) || 1))
  // Nuovo turno: se la lotteria viene (ri)attivata partendo da spenta, i numeri
  // assegnati ai clienti al checkout devono ripartire da 1.
  const isNewRound = body.is_active === true && existing.is_active !== true

  const { data, error } = await supabase.from('lottery').update({
    title: body.title || '',
    description: body.description || '',
    image_url: body.image_url || null,
    prize_type: body.prize_type || 'custom',
    prize_product_id: body.prize_type === 'product' ? (body.prize_product_id || null) : null,
    prize_coupon_id: body.prize_type === 'coupon' ? (body.prize_coupon_id || null) : null,
    prize_label: body.prize_label || '',
    participants_count: participants,
    winner_number: winner,
    ends_at: body.ends_at || null,
    is_active: body.is_active ?? false,
    status: body.is_active ? 'running' : 'draft',
    updated_at: new Date().toISOString(),
    ...(isNewRound ? { round_id: crypto.randomUUID() } : {}),
  }).eq('id', existing.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
EOF

python3 - << 'PYEOF'
import re
path = "components/admin/lottery-manager.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); setWinnerNumber(String(winnerNum)) }\n    else setError('Errore salvataggio')\n    setSaving(false)"
new = "    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); setWinnerNumber(String(winnerNum)) }\n    else {\n      const data = await res.json().catch(() => null)\n      setError(data?.error ? `Errore salvataggio: ${data.error}` : 'Errore salvataggio')\n    }\n    setSaving(false)"

if old not in content:
    print("ATTENZIONE: blocco da sostituire non trovato in lottery-manager.tsx, file lasciato invariato.")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("lottery-manager.tsx aggiornato correttamente.")
PYEOF

git add app/api/admin/lottery/route.ts components/admin/lottery-manager.tsx
git commit -m "fix: pannello lotteria si autoripara se la riga nel DB manca"
git push
