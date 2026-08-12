export function optimizeImage(url: string | null, width = 400): string | null {
  if (!url) return null
  if (url.includes('supabase.co/storage')) {
    const base = url.split('?')[0]
    return `${base}?width=${width}&quality=75&format=webp`
  }
  return url
}
