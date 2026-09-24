import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stessa normalizzazione usata in checkout, account-lookup ecc.
function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

// Verifica "a secco" (nessuna scrittura sul database) la stessa logica di
// sconto invito usata in /api/checkout, così il cliente vede subito se il
// numero inserito è valido e quale sconto avrà, prima di inviare l'ordine.
export async function POST(request: NextRequest) {
  try {
    const { phone_number, referred_by_phone } = await request.json()
    const rawPhone = typeof phone_number === 'string' ? phone_number.trim() : ''
    if (!rawPhone) return NextResponse.json({ error: 'Numero mancante' }, { status: 400 })

    const supabase = createAdminClient()
    const normalizedPhone = normalizePhone(rawPhone)
    const last8 = normalizedPhone.slice(-8)

    const { data: candidatePhoneOrders } = last8.length >= 6
      ? await supabase.from('orders').select('phone_number').ilike('phone_number', `%${last8}%`)
      : { data: [] as { phone_number: string }[] }
    const isFirstOrderForPhone = !(candidatePhoneOrders || []).some(o => normalizePhone(o.phone_number) === normalizedPhone)

    let referralDiscountPercent = 0
    let referralError: string | null = null

    const referredByRaw = typeof referred_by_phone === 'string' ? referred_by_phone.trim() : ''
    if (referredByRaw) {
      const normalizedReferrer = normalizePhone(referredByRaw)
      if (!normalizedReferrer || normalizedReferrer.length < 6) {
        referralError = 'Numero di chi ti ha invitato non valido'
      } else if (normalizedReferrer === normalizedPhone) {
        referralError = 'Non puoi inserire il tuo stesso numero come invitante'
      } else if (!isFirstOrderForPhone) {
        referralError = 'Lo sconto invito vale solo sul primo ordine'
      } else {
        const referrerLast8 = normalizedReferrer.slice(-8)
        const { data: referrerOrders } = await supabase.from('orders').select('phone_number').ilike('phone_number', `%${referrerLast8}%`)
        const referrerIsCustomer = (referrerOrders || []).some(o => normalizePhone(o.phone_number) === normalizedReferrer)
        if (!referrerIsCustomer) {
          referralError = 'Il numero di chi ti ha invitato non risulta tra i nostri clienti'
        } else {
          const { data: existingReferral } = await supabase.from('referrals').select('id').eq('referred_phone', normalizedPhone).maybeSingle()
          if (existingReferral) {
            referralError = 'Hai già usato uno sconto invito in precedenza'
          } else {
            referralDiscountPercent = 5
          }
        }
      }
    }

    // Sconto "premio pronto" per chi ha invitato un amico che ha già ordinato:
    // si applica in automatico al proprio numero, indipendentemente dal campo amico.
    let rewardDiscountPercent = 0
    if (referralDiscountPercent === 0) {
      const { data: readyReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_phone', normalizedPhone)
        .eq('status', 'reward_ready')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (readyReferral) rewardDiscountPercent = 10
    }

    return NextResponse.json({
      referral_discount_percent: referralDiscountPercent,
      referral_error: referralError,
      reward_discount_percent: rewardDiscountPercent,
      discount_percent: referralDiscountPercent || rewardDiscountPercent || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Errore di verifica' }, { status: 500 })
  }
}
