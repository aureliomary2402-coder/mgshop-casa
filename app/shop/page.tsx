import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { CategorySidebar } from '@/components/shop/category-sidebar'
import { ProductGrid } from '@/components/shop/product-grid'
import { LoyaltyBanner } from '@/components/shop/loyalty-banner'
import { LotteryTicketCard } from '@/components/shop/lottery-ticket-card'
import { SortDropdown } from '@/components/shop/sort-dropdown'
import { RecentlyViewed } from '@/components/shop/recently-viewed'
import { Suspense } from 'react'
import type { Product, Category, Banner } from '@/lib/types'

export const revalidate = 0

const PAGE_SIZE = 30

async function getData(searchParams: { q?: string; categoria?: string; ordina?: string }) {
  const supabase = createAdminClient()
  const [{ data: banners }, { data: categories }] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
    supabase.from('categories').select('*').order('name'),
  ])
  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true)
  query = searchParams.ordina === 'prezzo_asc' ? query.order('price', { ascending: true })
    : searchParams.ordina === 'prezzo_desc' ? query.order('price', { ascending: false })
    : searchParams.ordina === 'nome' ? query.order('name', { ascending: true })
    : query.order('created_at', { ascending: false })
  if (searchParams.categoria) {
    const cat = (categories || []).find((c: Category) => c.slug === searchParams.categoria)
    if (cat) query = query.eq('category_id', cat.id)
  }
  // Stessa ricerca "intelligente" per parole dell'API /api/shop/products:
  // ogni parola cercata deve comparire in nome, descrizione, parole chiave
  // o categoria del prodotto.
  if (searchParams.q) {
    const parole = searchParams.q.trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[%_]/g, ''))
    for (const parola of parole) {
      if (!parola) continue
      const { data: catMatch } = await supabase.from('categories').select('id').ilike('name', `%${parola}%`)
      const catIds = (catMatch || []).map((c: { id: string }) => c.id)
      const condizioni = [`name.ilike.%${parola}%`, `description.ilike.%${parola}%`, `keywords.ilike.%${parola}%`]
      if (catIds.length) condizioni.push(`category_id.in.(${catIds.join(',')})`)
      query = query.or(condizioni.join(','))
    }
  }

  query = query.range(0, PAGE_SIZE - 1)

  const { data: products, count } = await query
  return { banners: banners || [], products: products || [], categories: categories || [], count: count || 0 }
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; ordina?: string }> }) {
  const params = await searchParams
  const { banners, products, categories, count } = await getData(params)

  return (
    <main className="mg-shop-v5">

      <HeroBanner banners={banners as Banner[]} />

      <div className="mg-shop-v5-shell">

        <section className="mg-shop-v5-intro">
          <div className="mg-shop-v5-intro-copy">
            <span className="mg-shop-v5-eyebrow">MGSHOP · CATALOGO ONLINE</span>
            <h2>Esplora il nostro shop</h2>
            <p>
              Tutto quello che ti serve per la casa, la persona e il bucato.
              Scegli, aggiungi al carrello e ricevi il tuo ordine comodamente.
            </p>
          </div>

          <div className="mg-shop-v5-counter">
            <strong>{count}</strong>
            <span>prodott{count === 1 ? 'o' : 'i'}</span>
          </div>
        </section>

        <section className="mg-shop-v5-layout">

          <aside className="mg-shop-v5-sidebar">
            <div className="mg-shop-v5-sidebar-label">
              <span>ESPLORA</span>
              <span className="mg-shop-v5-sidebar-dot" />
            </div>

            <CategorySidebar categories={categories as Category[]} />

            <div className="mg-shop-v5-side-note">
              <span>⚡</span>
              <div>
                <strong>Trova quello che cerchi</strong>
                <small>Usa la ricerca o scegli una categoria.</small>
              </div>
            </div>
          </aside>

          <div className="mg-shop-v5-content">

            <div className="mg-shop-v5-featured">
              <LotteryTicketCard />
              <LoyaltyBanner />
            </div>

            <Suspense>
              <RecentlyViewed />
            </Suspense>

            {products.length === 0 ? (
              <section className="mg-shop-v5-empty">
                <div className="mg-shop-v5-empty-orb">🔍</div>
                <span>RICERCA</span>
                <h3>Nessun prodotto trovato</h3>
                <p>Prova a modificare la ricerca o a scegliere un'altra categoria.</p>
              </section>
            ) : (
              <>
                <section className="mg-shop-v5-products-head">
                  <div>
                    <span>CATALOGO</span>
                    <h3>
                      {params.q
                        ? <>Risultati per <strong>“{params.q}”</strong></>
                        : params.categoria
                          ? <>Prodotti selezionati</>
                          : <>Scopri i prodotti</>}
                    </h3>
                  </div>

                  <Suspense>
                    <SortDropdown />
                  </Suspense>
                </section>

                <ProductGrid
                  initialProducts={products as Product[]}
                  count={count}
                  q={params.q}
                  categoria={params.categoria}
                  ordina={params.ordina}
                />
              </>
            )}

          </div>
        </section>

      </div>
    </main>
  )
}
