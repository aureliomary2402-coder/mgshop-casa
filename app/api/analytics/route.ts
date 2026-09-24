import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

function isAdminPath(page: string) {
  return page.startsWith('/mgadmin-panel')
}

// Elenco (non esaustivo) di crawler/bot noti che eseguono JavaScript e
// possono quindi finire registrati come "visite" nelle analitiche:
// Googlebot, Bingbot e altri motori di ricerca ormai renderizzano le
// pagine come un browser vero, eseguendo anche le fetch di tracciamento.
const BOT_PATTERNS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|pinterest|linkedinbot|embedly|quora link preview|showyoubot|outbrain|w3c_validator|google-inspectiontool|adsbot|mediapartners|googleweblight|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|yandex|baidu|duckduckbot|bingpreview|headlesschrome|phantomjs|puppeteer|playwright/i

function detectBot(userAgent: string) {
  if (!userAgent) return true // un browser vero manda sempre uno User-Agent
  return BOT_PATTERNS.test(userAgent)
}

// Vercel aggiunge automaticamente questi header con la geolocalizzazione
// approssimativa (dal suo edge network), senza bisogno di servizi esterni.
function getLocation(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || null
  const region = request.headers.get('x-vercel-ip-country-region') || null
  const cityRaw = request.headers.get('x-vercel-ip-city')
  const city = cityRaw ? decodeURIComponent(cityRaw) : null
  return { country, region, city }
}

export async function POST(request: NextRequest) {
  try {
    const { page, sessionId } = await request.json()
    if (!page) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    const admin = isAdminPath(page)

    const userAgent = request.headers.get('user-agent') || ''
    const isBot = detectBot(userAgent)
    const { country, region, city } = getLocation(request)

    await supabase.from('page_views').insert({
      page,
      is_admin: admin,
      session_id: sessionId || null,
      user_agent: userAgent || null,
      is_bot: isBot,
      country,
      region,
      city,
    })

    // Pulizia di sicurezza (fallback nel caso il job automatico su Supabase
    // non sia attivo): ogni tanto elimina i log più vecchi di 48 ore.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      supabase.from('page_views').delete().lt('created_at', cutoff).then(() => {})
      supabase.from('visit_notify_dedup').delete().lt('created_at', cutoff).then(() => {})
    }

    // Notifica push solo per le visite reali al negozio (non bot, non
    // pannello admin), una sola volta per sessione, e solo se le
    // notifiche sono attive.
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

        // Se l'insert va a buon fine è una sessione nuova -> notifica.
        // Se fallisce (chiave già presente) vuol dire che questa sessione
        // ha già generato una notifica: non inviarne un'altra.
        if (!dedupError) {
          await sendPushToAdmin(
            'Nuova visita sul sito',
            `Un visitatore è entrato su ${page}`,
            '/mgadmin-panel'
          ).catch((e) => console.error('Notifica nuova visita fallita:', e))
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
