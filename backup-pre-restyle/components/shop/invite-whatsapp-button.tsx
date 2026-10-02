"use client"

import { WhatsAppIcon } from '@/components/shop/social-icons'

// Bottone "Invita un amico su WhatsApp": apre WhatsApp con un messaggio già
// scritto che contiene il numero dell'invitante (quello che l'amico dovrà
// inserire nel carrello) e il link del sito. Lo sconto resta gestito da
// /api/checkout: qui cambia solo il modo di condividere l'invito.
export function InviteWhatsAppButton({ phone }: { phone: string }) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
  const text =
    `Ciao! Ordino da MGShop Casa: prodotti per la casa e la pulizia portati direttamente a casa, e paghi alla consegna. ` +
    `Al tuo primo ordine inserisci il mio numero (${phone}) nel carrello e hai subito il 5% di sconto: ${siteUrl}`
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white"
      style={{ background: '#16a34a' }}
    >
      <WhatsAppIcon size={16} /> Invita un amico su WhatsApp
    </a>
  )
}
