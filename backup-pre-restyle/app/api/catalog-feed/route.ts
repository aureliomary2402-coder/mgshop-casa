import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function csvEscape(value: string): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function stripHtml(text: string | null): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export async function GET() {
  const supabaseAdmin = createAdminClient()

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, cover_image, is_active, torna_presto')
    .order('name', { ascending: true })

  if (error) {
    return new NextResponse('Errore nel recupero prodotti: ' + error.message, { status: 500 })
  }

  const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand']
  const rows = [headers.join(',')]

  for (const p of products || []) {
    if (!p.cover_image) continue

    const availability = p.is_active && !p.torna_presto ? 'in stock' : 'out of stock'
    const description = stripHtml(p.description) || p.name
    const price = `${Number(p.price).toFixed(2)} EUR`
    const link = `https://mgshop-2.vercel.app/prodotto/${p.id}`

    const row = [
      p.id,
      csvEscape(p.name),
      csvEscape(description.slice(0, 5000)),
      availability,
      'new',
      price,
      link,
      p.cover_image,
      'MGShop Casa',
    ]
    rows.push(row.join(','))
  }

  return new NextResponse(rows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
