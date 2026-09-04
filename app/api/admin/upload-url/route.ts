import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Le funzioni serverless di Vercel rifiutano richieste sopra ~4.5MB: un
// video passato dentro una FormData a /api/upload arriva quindi troncato
// ("failed to parse body as formdata"). Per i file pesanti serve invece un
// upload diretto dal browser a Supabase Storage: qui generiamo solo un URL
// firmato (richiesta leggerissima, nessun file coinvolto), poi il client fa
// l'upload vero e proprio direttamente verso Supabase, senza passare da Vercel.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileName: originalName } = await request.json()
    if (!originalName) return NextResponse.json({ error: 'Nome file mancante' }, { status: 400 })

    const ext = String(originalName).split('.').pop()?.toLowerCase() || 'bin'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from('images').createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)

    // createSignedUploadUrl a volte restituisce un percorso relativo (a
    // seconda della versione della libreria): lo rendiamo sempre assoluto,
    // così il browser può chiamarlo direttamente senza ambiguità.
    const absoluteSignedUrl = data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}${data.signedUrl.startsWith('/') ? '' : '/'}${data.signedUrl}`

    return NextResponse.json({ path, token: data.token, signedUrl: absoluteSignedUrl, publicUrl: urlData.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore sconosciuto' }, { status: 500 })
  }
}
