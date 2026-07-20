import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { ProductCard } from '@/components/shop/product-card'
import { LoyaltyBanner } from '@/components/shop/loyalty-banner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product, Category, Banner } from '@/lib/types'

export const revalidate = 0

const PAGE_SIZE = 30

async function getData(searchParams: { q?: string; categoria?: string; pagina?: string }) {
  const supabase = createAdminClient()
  const [{ data: banners }, { data: categories }] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
    supabase.from('categories').select('*').order('name'),
  ])
  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false })
  if (searchParams.categoria) {
    const cat = (categories || []).find((c: Category) => c.slug === searchParams.categoria)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)

  const page = Math.max(1, parseInt(searchParams.pagina || '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: products, count } = await query
  return { banners: banners || [], products: products || [], categories: categories || [], count: count || 0, page }
}

function buildPageHref(page: number, searchParams: { q?: string; categoria?: string }) {
  const params = new URLSearchParams()
  if (searchParams.q) params.set('q', searchParams.q)
  if (searchParams.categoria) params.set('categoria', searchParams.categoria)
  if (page > 1) params.set('pagina', String(page))
  const qs = params.toString()
  return `/shop${qs ? `?${qs}` : ''}`
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; pagina?: string }> }) {
  const params = await searchParams
  const { banners, products, categories, count, page } = await getData(params)
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  // Finestra di pagine da mostrare: prima, ultima, e un intorno della corrente
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)

  return (
    <main>
      <HeroBanner banners={banners as Banner[]} categories={categories as Category[]} />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <LoyaltyBanner />
        {products.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(8,145,178,0.08)' }}>
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-lg font-medium text-slate-600">Nessun prodotto trovato</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-children">
              {(products as Product[]).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-1.5 pt-4" aria-label="Paginazione">
                <Link href={buildPageHref(Math.max(1, page - 1), params)}
                  aria-disabled={page === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${page === 1 ? 'text-slate-300 pointer-events-none' : 'text-cyan-700 hover:bg-cyan-50'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </Link>

                {pageNumbers.map((n, i) => (
                  <span key={n} className="flex items-center">
                    {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="px-1 text-slate-300">…</span>}
                    <Link href={buildPageHref(n, params)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${n === page ? 'text-white' : 'text-slate-600 hover:bg-cyan-50'}`}
                      style={n === page ? { background: 'linear-gradient(135deg,#0891b2,#06b6d4)' } : undefined}>
                      {n}
                    </Link>
                  </span>
                ))}

                <Link href={buildPageHref(Math.min(totalPages, page + 1), params)}
                  aria-disabled={page === totalPages}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${page === totalPages ? 'text-slate-300 pointer-events-none' : 'text-cyan-700 hover:bg-cyan-50'}`}>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  )
}
