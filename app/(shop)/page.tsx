import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { CategoryFilter } from '@/components/shop/category-filter'
import { ProductCard } from '@/components/shop/product-card'
import type { Product, Category, Banner } from '@/lib/types'

export const revalidate = 0

async function getData(searchParams: { categoria?: string; q?: string }) {
  const supabase = createAdminClient()
  const [{ data: banners }, { data: categories }] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
    supabase.from('categories').select('*').order('name'),
  ])

  let query = supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('created_at', { ascending: false })
  if (searchParams.categoria) {
    const cat = (categories || []).find((c: Category) => c.slug === searchParams.categoria)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)
  const { data: products } = await query

  return { banners: banners || [], categories: categories || [], products: products || [] }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const params = await searchParams
  const { banners, categories, products } = await getData(params)

  return (
    <main>
      <HeroBanner banners={banners as Banner[]} />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <CategoryFilter categories={categories as Category[]} />
        {products.length === 0 ? (
          <div className="text-center py-20 text-stone-400 animate-fade-in">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-lg font-medium">Nessun prodotto trovato</p>
            <p className="text-sm mt-1">Prova a cambiare categoria o ricerca</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-children">
            {(products as Product[]).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </main>
  )
}
