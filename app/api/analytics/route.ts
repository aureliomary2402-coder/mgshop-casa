import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

function isAdminPath(page: string) {
  return page.startsWith('/mgadmin-panel')
}

export async function POST(request: NextRequest) {
  try {
    const { page, sessionId } = await request.json()
    if (!page) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    const admin = isAdminPath(page)

    await supabase.from('page_views').insert({
      page,
      is_admin: admin,
      session_id: sessionId || null,
    })

    // Pulizia di sicurezza (fallback nel caso il job automatico su Supabase
    // non sia attivo): ogni tanto elimina i log più vecchi di 48 ore.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      supabase.from('page_views').delete().lt('created_at', cutoff).then(() => {})
      supabase.from('visit_notify_dedup').delete().lt('created_at', cutoff).then(() => {})
    }

    // Notifica push solo per le visite al negozio (non al pannello admin),
    // una sola volta per sessione, e solo se le notifiche sono attive.
    if (!admin && sessionId) {
      const { data: settings } = await supabase
        .from('visit_notification_settings')
        .select('enabled')
        .eq('id', 1)
        .single()

      if (settings?.enabled) {
        const { error: dedupError } = await supabase
          .from('visit_notify_dedup')
          .insert({ session_id: sessionId })

        // Se l'insert va a buon fine è una sessione nuova -> notifica.
        // Se fallisce (chiave già presente) vuol dire che questa sessione
        // ha già generato una notifica: non inviarne un'altra.
        if (!dedupError) {
          sendPushToAdmin(
            'Nuova visita sul sito',
            `Un visitatore è entrato su ${page}`,
            '/mgadmin-panel'
          ).catch(() => {})
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
