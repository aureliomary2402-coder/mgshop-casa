import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired, getTakenLotteryNumbers } from '@/lib/lottery'
import { LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'
import { isCustomPromoProductId } from '@/lib/promo-custom-product'
import { sendPushToAdmin } from '@/lib/push'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total, coupon_code, ticket_number_choices, delivery_method, delivery_address } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Il metodo di consegna è "ritiro" (di default) o "consegna": in quel
    // caso l'indirizzo è obbligatorio, altrimenti l'ordine non è gestibile.
    const deliveryMethod = delivery_method === 'consegna' ? 'consegna' : 'ritiro'
    const deliveryAddress = deliveryMethod === 'consegna' ? String(delivery_address || '').trim() : null
    if (deliveryMethod === 'consegna' && !deliveryAddress)
      return NextResponse.json({ error: 'Inserisci l\'indirizzo di consegna' }, { status: 400 })

    const supabase = createAdminClient()

    // Il "biglietto lotteria" è una voce speciale nel carrello: non è un
    // prodotto vero (niente magazzino, niente riga in order_items). Che il
    // cliente compri solo biglietti o li aggiunga insieme ad altri prodotti,
    // il meccanismo di assegnazione dei numeri è sempre lo stesso.
    const ticketItem = items.find((i: { product: { id: string } }) => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    const ticketQty = ticketItem ? Math.max(0, parseInt(ticketItem.quantity) || 0) : 0
    const realItems = items.filter((i: { product: { id: string } }) => i.product.id !== LOTTERY_TICKET_PRODUCT_ID)

    let lottery: any = null
    let ticketNumbers: number[] = []
    if (ticketQty > 0) {
      const { data: lotteryRow } = await supabase.from('lottery').select('*').limit(1).single()
      lottery = lotteryRow ? await autoArchiveIfExpired(supabase, lotteryRow) : null

      // Il prezzo del biglietto arriva dal carrello del cliente, ma potrebbe
      // essere rimasto in cache da prima che l'admin cambiasse il prezzo
      // (il carrello resta salvato nel browser). Controlliamo che coincida
      // con quello impostato ora nel pannello admin: se non coincide,
      // blocchiamo l'ordine invece di venderlo al prezzo sbagliato.
      if (lottery) {
        const currentPrice = lottery.ticket_price != null ? Number(lottery.ticket_price) : 1
        const sentPrice = Number(ticketItem?.product?.price)
        if (Number.isFinite(sentPrice) && Math.abs(sentPrice - currentPrice) > 0.001) {
          return NextResponse.json({
            error: 'Il prezzo del biglietto lotteria è cambiato: aggiorna la pagina e riprova',
            ticket_price_changed: true,
            ticket_price: currentPrice,
          }, { status: 409 })
        }
      }

      if (lottery?.is_active && lottery.round_id) {
        const taken = await getTakenLotteryNumbers(supabase, lottery.round_id)

        // Numeri scelti dal cliente (facoltativi): li validiamo PRIMA di
        // creare l'ordine, così se qualcuno non è più disponibile il
        // cliente può sceglierne un altro senza lasciare ordini a metà.
        const rawChoices: number[] = Array.isArray(ticket_number_choices) ? ticket_number_choices : []
        const chosen: number[] = []
        const unavailable: number[] = []
        const seen = new Set<number>()
        for (const raw of rawChoices) {
          const n = parseInt(raw as any, 10)
          if (!Number.isInteger(n)) continue
          if (n < 1 || n > lottery.participants_count || taken.has(n) || seen.has(n)) {
            unavailable.push(n)
            continue
          }
          seen.add(n)
          chosen.push(n)
        }
        if (unavailable.length > 0) {
          return NextResponse.json({
            error: `Il numero ${unavailable.join(', ')} non è più disponibile: scegline un altro`,
            unavailable_numbers: unavailable,
          }, { status: 409 })
        }
        if (chosen.length > ticketQty) {
          return NextResponse.json({ error: 'Hai scelto più numeri di quanti biglietti stai acquistando' }, { status: 400 })
        }

        // I biglietti senza numero scelto vengono assegnati automaticamente
        // sul primo numero libero disponibile (stesso criterio di sempre,
        // solo che ora "libero" tiene conto anche dei numeri scelti a mano).
        const remaining = ticketQty - chosen.length
        const auto: number[] = []
        for (let n = 1; n <= lottery.participants_count && auto.length < remaining; n++) {
          if (!taken.has(n) && !seen.has(n)) { auto.push(n); seen.add(n) }
        }
        if (auto.length < remaining) {
          return NextResponse.json({ error: 'Non ci sono abbastanza numeri liberi per tutti i biglietti richiesti' }, { status: 409 })
        }

        ticketNumbers = [...chosen, ...auto]
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ phone_number, total, status: 'pending', is_ticket_only: realItems.length === 0, delivery_method: deliveryMethod, delivery_address: deliveryAddress })
      .select().single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    if (ticketNumbers.length > 0) {
      const { error: ticketsError } = await supabase.from('lottery_tickets').insert(
        ticketNumbers.map(n => ({
          round_id: lottery.round_id,
          lottery_number: n,
          order_id: order.id,
          phone_number,
        }))
      )
      if (ticketsError) {
        // Un altro cliente ha preso uno di questi numeri nello stesso
        // istante (raro, ma possibile con la scelta manuale): annulliamo
        // l'ordine appena creato invece di lasciarlo orfano, e chiediamo
        // di riprovare invece di far pagare un ordine senza biglietti validi.
        await supabase.from('orders').delete().eq('id', order.id)
        const raceLost = ticketsError.code === '23505'
        return NextResponse.json({
          error: raceLost ? 'Uno dei numeri scelti è stato appena preso da un altro cliente: riprova' : ticketsError.message,
        }, { status: raceLost ? 409 : 500 })
      }
    }

    if (realItems.length > 0) {
      const orderItems = realItems.map((item: { product: { id: string; name: string; price: number }; quantity: number; customization?: { option_id: string; label: string; value: string; price?: number }[]; unitPrice?: number }) => ({
        order_id: order.id,
        // I prodotti creati apposta per una promo (non presenti nel negozio)
        // non hanno una riga vera in "products": mettere qui il loro id
        // finto violerebbe il vincolo di chiave esterna. Nome e prezzo
        // restano comunque salvati sull'ordine per lo storico.
        product_id: isCustomPromoProductId(item.product.id) ? null : item.product.id,
        product_name: item.product.name,
        // Se la personalizzazione scelta aveva un prezzo proprio, è quello
        // il prezzo pagato per questa riga (calcolato lato client e già
        // presente nel carrello); altrimenti resta il prezzo base.
        product_price: typeof item.unitPrice === 'number' ? item.unitPrice : item.product.price,
        quantity: item.quantity,
        // Scelte di personalizzazione fatte dal cliente (colore, dimensione,
        // testo...): restano salvate sull'ordine anche se in futuro il
        // prodotto o le sue opzioni cambiano.
        customization: item.customization && item.customization.length > 0 ? item.customization : null,
        is_customized: !!(item.customization && item.customization.length > 0),
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

      // Scala le quantità dal magazzino (solo per i prodotti veri, quelli
      // personalizzati della promo non hanno un magazzino da scalare)
      for (const item of realItems) {
        if (isCustomPromoProductId(item.product.id)) continue
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .single()
        if (product && product.stock !== null) {
          const newStock = Math.max(0, product.stock - item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id)
        }
      }
    }

    if (coupon_code) {
      const { data: coupon } = await supabase.from('coupons').select('id, uses_count').eq('code', coupon_code).single()
      if (coupon) await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
    }

    // Notifica push: chiamata diretta (non un self-fetch) e sempre "await"-ata
    // prima di rispondere, altrimenti su Vercel la funzione può essere
    // congelata subito dopo il return e la notifica non parte mai.
    const itemsCount = realItems.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const hasCustomized = realItems.some((i: { customization?: unknown[] }) => i.customization && i.customization.length > 0)
    // Se almeno una scelta di personalizzazione aveva un prezzo impostato
    // dall'admin, il prezzo è già stato calcolato correttamente in automatico
    // e non serve contattare il cliente. L'avviso resta solo per le
    // personalizzazioni "vecchio stile" (senza prezzo per scelta, es. solo
    // testo libero) dove il prezzo va ancora concordato a parte.
    const needsManualPricing = realItems.some((i: { customization?: { price?: number }[] }) =>
      i.customization && i.customization.length > 0 && !i.customization.some(c => typeof c.price === 'number'))
    const customizedSuffix = needsManualPricing ? ' 🎨 con personalizzazioni: contatta il cliente per confermare il prezzo' : (hasCustomized ? ' 🎨 con personalizzazioni' : '')
    const notifBody = ticketQty > 0
      ? `${phone_number} — ${itemsCount} articoli + ${ticketQty} bigliett${ticketQty > 1 ? 'i' : 'o'} lotteria — €${total.toFixed(2)}${customizedSuffix}`
      : `${phone_number} — ${itemsCount} articoli — €${total.toFixed(2)}${customizedSuffix}`
    try {
      await sendPushToAdmin('Nuovo ordine ricevuto!', notifBody, '/mgadmin-panel')
    } catch (e) {
      console.error('Notifica nuovo ordine fallita:', e)
    }

    return NextResponse.json({ success: true, order, ticket_numbers: ticketNumbers })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
