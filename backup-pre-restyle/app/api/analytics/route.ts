import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

function isAdminPath(page: string) {
  return page.startsWith('/mgadmin-panel')
}

// Crawler/bot noti che eseguono JavaScript: non vanno contati come visite.
const BOT_PATTERNS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|pinterest|linkedinbot|embedly|quora link preview|showyoubot|outbrain|w3c_validator|google-inspectiontool|adsbot|mediapartners|googleweblight|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|yandex|baidu|duckduckbot|bingpreview|headlesschrome|phantomjs|puppeteer|playwright/i

function detectBot(userAgent: string) {
  if (!userAgent) return true
  return BOT_PATTERNS.test(userAgent)
}

// Registra o aggiorna il visitatore. Conta una nuova visita se sono
// passati più di 30 minuti dall'ultima attività.
async function trackVisitor(
  supabase: ReturnType<typeof createAdminClient>,
  visitorId: string
) {
  const now = new Date()
  const { data: v } = await supabase
    .from('visitors')
    .select('visits, last_seen')
    .eq('visitor_id', visitorId)
    .maybeSingle()

  if (!v) {
    await supabase.from('visitors').insert({ visitor_id: visitorId, visits: 1 })
    return { returning: false, visits: 1 }
  }

  const gap = now.getTime() - new Date(v.last_seen).getTime()
  const visits = gap > 30 * 60 * 1000 ? v.visits + 1 : v.visits
  await supabase
    .from('visitors')
    .update({ visits, last_seen: now.toISOString() })
    .eq('visitor_id', visitorId)
  return { returning: visits > 1, visits }
}

export async function POST(request: NextRequest) {
  try {
    const { page, sessionId, visitorId, tz, screen } = await request.json()
    if (!page) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    const admin = isAdminPath(page)

    const userAgent = request.headers.get('user-agent') || ''
    const isBot = detectBot(userAgent)
    const vid = typeof visitorId === 'string' && visitorId.length <= 64 ? visitorId : null

    await supabase.from('page_views').insert({
      page,
      is_admin: admin,
      session_id: sessionId || null,
      user_agent: userAgent || null,
      is_bot: isBot,
      visitor_id: vid,
      timezone: typeof tz === 'string' ? tz.slice(0, 60) : null,
      screen: typeof screen === 'string' ? screen.slice(0, 20) : null,
    })

    let returning = false
    let visits = 1
    if (vid && !admin && !isBot) {
      const r = await trackVisitor(supabase, vid)
      returning = r.returning
      visits = r.visits
    }

    // Pulizia di sicurezza: ogni tanto elimina i log più vecchi di 48 ore.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      supabase.from('page_views').delete().lt('created_at', cutoff).then(() => {})
      supabase.from('visit_notify_dedup').delete().lt('created_at', cutoff).then(() => {})
    }

    // Notifica push solo per visite reali, una volta per sessione.
    if (!admin && !isBot && sessionId) {
      const { data: settings } = await supabase
        .from('visit_notification_settings')
        .select('enabled')
        .eq('id', 1)
        .single()

      if (settings?.enabled) {
        const { error: dedupError } = await supabase
          .from('visit_notify_dedup')
          .insert({ session_id: sessionId })

        if (!dedupError) {
          const body = returning
            ? `Visitatore di ritorno (${visits}ª visita) su ${page}`
            : `Nuovo visitatore su ${page}`
          await sendPushToAdmin('Nuova visita sul sito', body, '/mgadmin-panel').catch((e) =>
            console.error('Notifica nuova visita fallita:', e)
          )
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
