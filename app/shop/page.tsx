import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { CategorySidebar } from '@/components/shop/category-sidebar'
import { ProductGrid } from '@/components/shop/product-grid'
import { LoyaltyBanner } from '@/components/shop/loyalty-banner'
import { LotteryTicketCard } from '@/components/shop/lottery-ticket-card'
import { SortDropdown } from '@/components/shop/sort-dropdown'
import { RecentlyViewed } from '@/components/shop/recently-viewed'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Truck } from 'lucide-react'
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

        {/* Due strisce sottili: compaiono solo se fedeltà / lotteria sono attive */}
        <div className="mb-6 flex flex-col gap-3 empty:hidden">
          <LoyaltyBanner strip />
          <LotteryTicketCard strip />
        </div>

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

        <section className="relative mt-16 overflow-hidden rounded-[34px] border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-7 sm:p-12">
          <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-cyan-200/30 blur-[80px]" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-700">
                <Truck size={17} />
                Consegna locale
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-cyan-950 sm:text-4xl">
                Tu ordini.
                <br />
                Noi te lo portiamo a casa.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                Consegna gratuita ad Aci Sant&apos;Antonio. Per i paesi etnei e le zone vicine è previsto un piccolo contributo di consegna.
              </p>
            </div>
            <Link
              href="/consegne"
              className="group inline-flex shrink-0 items-center gap-3 rounded-2xl bg-cyan-600 px-6 py-4 text-sm font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition hover:-translate-y-0.5 hover:bg-cyan-500"
            >
              Scopri la consegna
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}
