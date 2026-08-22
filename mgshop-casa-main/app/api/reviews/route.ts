import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, comment, admin_reply, admin_reply_at, created_at, review_media(id, review_id, media_url, media_type, display_order, created_at)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supabase restituisce la relazione con il nome della tabella
  // (review_media): la rinominiamo in "media" per il frontend e la
  // ordiniamo secondo display_order.
  const reviews = (data || []).map((r: any) => {
    const { review_media, ...rest } = r
    return { ...rest, media: (review_media || []).sort((a: any, b: any) => a.display_order - b.display_order) }
  })

  const count = reviews.length
  const average = count > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / count : 0

  return NextResponse.json({ reviews, average, count })
}

// Max allegati per recensione, per evitare invii abnormi.
const MAX_MEDIA = 6

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { customer_name, phone_number, rating, comment, media } = body

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

  // Ogni voce deve avere un url valido e un tipo image/video; scartiamo
  // silenziosamente il resto invece di far fallire l'intera recensione.
  const mediaList: { media_url: string; media_type: 'image' | 'video' }[] = Array.isArray(media)
    ? media
        .filter((m: any) => m && typeof m.media_url === 'string' && m.media_url.trim() && (m.media_type === 'image' || m.media_type === 'video'))
        .slice(0, MAX_MEDIA)
        .map((m: any) => ({ media_url: String(m.media_url).trim(), media_type: m.media_type }))
    : []

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

  let savedMedia: any[] = []
  if (mediaList.length > 0) {
    const { data: mediaData, error: mediaError } = await supabase
      .from('review_media')
      .insert(mediaList.map((m, i) => ({ review_id: data.id, media_url: m.media_url, media_type: m.media_type, display_order: i })))
      .select('id, review_id, media_url, media_type, display_order, created_at')
    if (mediaError) console.error('Salvataggio media recensione fallito:', mediaError)
    else savedMedia = mediaData || []
  }

  try {
    await sendPushToAdmin(
      '⭐ Nuova recensione',
      `${customer_name} ha lasciato ${ratingNum} stelle: ${String(comment).trim().slice(0, 80)}`,
      '/mgadmin-panel'
    )
  } catch (e) {
    console.error('Notifica recensione fallita:', e)
  }

  return NextResponse.json({ ...data, media: savedMedia })
}
