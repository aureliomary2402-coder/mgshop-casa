import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data: lottery, error } = await supabase.from('lottery').select('*').limit(1).single()
  if (error || !lottery) return NextResponse.json({ error: 'Nessuna lotteria trovata' }, { status: 404 })

  const { error: insertError } = await supabase.from('lottery_winners').insert({
    lottery_title: lottery.title,
    prize_label: lottery.prize_label,
    prize_image_url: lottery.image_url,
    winner_number: lottery.winner_number,
    participants_count: lottery.participants_count,
  })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const { error: resetError } = await supabase.from('lottery').update({
    is_active: false,
    status: 'draft',
    updated_at: new Date().toISOString(),
  }).eq('id', lottery.id)
  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
