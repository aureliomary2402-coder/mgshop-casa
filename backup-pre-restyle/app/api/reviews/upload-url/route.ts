import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Versione pubblica (nessun login richiesto) dell'endpoint admin/upload-url:
// serve per i video allegati alle recensioni dai clienti. Le funzioni
// serverless di Vercel rifiutano corpi sopra ~4.5MB, quindi i video vanno
// caricati direttamente dal browser su Supabase Storage tramite un URL
// firmato generato qui (richiesta leggerissima, nessun file coinvolto).
export async function POST(request: NextRequest) {
  try {
    const { fileName: originalName } = await request.json()
    if (!originalName) return NextResponse.json({ error: 'Nome file mancante' }, { status: 400 })

    const ext = String(originalName).split('.').pop()?.toLowerCase() || 'bin'
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from('images').createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)

    const absoluteSignedUrl = data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}${data.signedUrl.startsWith('/') ? '' : '/'}${data.signedUrl}`

    return NextResponse.json({ path, token: data.token, signedUrl: absoluteSignedUrl, publicUrl: urlData.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Errore sconosciuto' }, { status: 500 })
  }
}
