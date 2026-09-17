import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductPageClient } from './product-page-client'

// Titolo/descrizione/anteprima social specifici per ogni prodotto (prima
// tutte le pagine prodotto condividevano lo stesso titolo generico del
// sito: Google non riusciva a distinguerle e i link condivisi su WhatsApp
// non mostravano foto/nome del prodotto).
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, description, cover_image')
    .eq('id', params.id)
    .single()

  if (!product) {
    return {
      title: 'Prodotto non trovato - MGShop Casa',
      description: 'Il tuo negozio di articoli per la casa',
    }
  }

  const title = `${product.name} - MGShop Casa`
  const description = product.description
    ? product.description.slice(0, 160)
    : `Scopri ${product.name} su MGShop Casa, il tuo negozio di articoli per la casa.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.cover_image ? [{ url: product.cover_image }] : undefined,
    },
  }
}

export default function ProductPage() {
  return <ProductPageClient />
}
