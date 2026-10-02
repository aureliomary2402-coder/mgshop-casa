import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  if (!phone) return NextResponse.json({ error: 'phone richiesto' }, { status: 400 })
  const normalized = normalizePhone(phone)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('phone_normalized', normalized)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { phone_number, customer_name, message } = body
  if (!phone_number || !message || !String(message).trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  const normalized = normalizePhone(phone_number)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      phone_normalized: normalized,
      phone_number,
      customer_name: customer_name || null,
      sender: 'customer',
      message: String(message).trim(),
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await sendPushToAdmin(
      '💬 Nuovo messaggio in chat',
      `${customer_name || phone_number}: ${String(message).trim().slice(0, 80)}`,
      '/mgadmin-panel'
    )
  } catch (e) {
    console.error('Notifica chat fallita:', e)
  }

  return NextResponse.json(data)
}
