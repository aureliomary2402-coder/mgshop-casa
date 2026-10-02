import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

// Se il sito ha un dominio personalizzato, sostituiscilo qui sotto
// (oppure imposta la variabile d'ambiente NEXT_PUBLIC_SITE_URL su Vercel).
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mgshop-2.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, updated_at')
    .eq('is_active', true)

  const productUrls = (products || []).map((p) => ({
    url: `${BASE_URL}/prodotto/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/promo`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/volantino`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  return [...staticUrls, ...productUrls]
}
