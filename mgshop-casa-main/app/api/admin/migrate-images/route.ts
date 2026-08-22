import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const maxDuration = 60

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] }

  // Fetch all products and product_images with old Vercel Blob URLs
  const { data: products } = await supabase
    .from('products')
    .select('id, name, cover_image')
    .like('cover_image', '%vercel-storage.com%')

  const { data: productImages } = await supabase
    .from('product_images')
    .select('id, image_url')
    .like('image_url', '%vercel-storage.com%')

  const { data: banners } = await supabase
    .from('banners')
    .select('id, image_url')
    .like('image_url', '%vercel-storage.com%')

  const allItems = [
    ...(products || []).map(p => ({ id: p.id, url: p.cover_image, table: 'products', field: 'cover_image', name: p.name })),
    ...(productImages || []).map(i => ({ id: i.id, url: i.image_url, table: 'product_images', field: 'image_url', name: i.id })),
    ...(banners || []).map(b => ({ id: b.id, url: b.image_url, table: 'banners', field: 'image_url', name: b.id })),
  ]

  for (const item of allItems) {
    if (!item.url) { results.skipped++; continue }

    try {
      // Download from Vercel Blob
      const response = await fetch(item.url, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        results.failed++
        results.errors.push(`${item.name}: HTTP ${response.status}`)
        continue
      }

      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
      const fileName = `migrated-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, buffer, { contentType, upsert: false })

      if (uploadError) {
        results.failed++
        results.errors.push(`${item.name}: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)

      // Update DB with new URL
      await supabase.from(item.table).update({ [item.field]: urlData.publicUrl }).eq('id', item.id)

      results.success++
    } catch (err) {
      results.failed++
      results.errors.push(`${item.name}: ${err instanceof Error ? err.message : 'errore sconosciuto'}`)
    }
  }

  return NextResponse.json({ ...results, total: allItems.length })
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .like('cover_image', '%vercel-storage.com%')

  const { count: imagesCount } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .like('image_url', '%vercel-storage.com%')

  const { count: bannersCount } = await supabase
    .from('banners')
    .select('*', { count: 'exact', head: true })
    .like('image_url', '%vercel-storage.com%')

  return NextResponse.json({
    products: productsCount || 0,
    product_images: imagesCount || 0,
    banners: bannersCount || 0,
    total: (productsCount || 0) + (imagesCount || 0) + (bannersCount || 0),
  })
}
