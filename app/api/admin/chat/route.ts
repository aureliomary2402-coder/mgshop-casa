import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  const supabase = createAdminClient()

  if (phone) {
    // Thread completo di una conversazione
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('phone_normalized', phone)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Elenco conversazioni raggruppate per cliente
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conversations: Record<string, {
    phone_normalized: string
    phone_number: string
    customer_name: string | null
    last_message: string
    last_message_at: string
    unread: number
  }> = {}

  for (const m of data || []) {
    if (!conversations[m.phone_normalized]) {
      conversations[m.phone_normalized] = {
        phone_normalized: m.phone_normalized,
        phone_number: m.phone_number,
        customer_name: m.customer_name,
        last_message: m.message,
        last_message_at: m.created_at,
        unread: 0,
      }
    }
    if (m.sender === 'customer' && !m.read_by_admin) {
      conversations[m.phone_normalized].unread++
    }
    if (m.customer_name && !conversations[m.phone_normalized].customer_name) {
      conversations[m.phone_normalized].customer_name = m.customer_name
    }
  }

  const list = Object.values(conversations).sort((a, b) =>
    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )
  return NextResponse.json(list)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { phone_normalized, phone_number, customer_name, message } = body
  if (!phone_normalized || !message || !String(message).trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      phone_normalized,
      phone_number: phone_number || phone_normalized,
      customer_name: customer_name || null,
      sender: 'admin',
      message: String(message).trim(),
      read_by_admin: true,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { phone_normalized } = await request.json()
  if (!phone_normalized) return NextResponse.json({ error: 'phone_normalized richiesto' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('chat_messages')
    .update({ read_by_admin: true })
    .eq('phone_normalized', phone_normalized)
    .eq('sender', 'customer')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
