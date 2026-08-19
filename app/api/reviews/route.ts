import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, comment, admin_reply, admin_reply_at, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const count = data?.length || 0
  const average = count > 0 ? data!.reduce((s, r) => s + r.rating, 0) / count : 0

  return NextResponse.json({ reviews: data || [], average, count })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { customer_name, phone_number, rating, comment } = body

  if (!customer_name || !String(customer_name).trim()) {
    return NextResponse.json({ error: 'Nome mancante' }, { status: 400 })
  }
  const ratingNum = Number(rating)
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'Valutazione non valida' }, { status: 400 })
  }
  if (!comment || !String(comment).trim()) {
    return NextResponse.json({ error: 'Commento mancante' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      customer_name: String(customer_name).trim(),
      phone_number: phone_number ? String(phone_number).trim() : null,
      rating: ratingNum,
      comment: String(comment).trim(),
    })
    .select('id, customer_name, rating, comment, admin_reply, admin_reply_at, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await sendPushToAdmin(
      '⭐ Nuova recensione',
      `${customer_name} ha lasciato ${ratingNum} stelle: ${String(comment).trim().slice(0, 80)}`,
      '/mgadmin-panel'
    )
  } catch (e) {
    console.error('Notifica recensione fallita:', e)
  }

  return NextResponse.json(data)
}
