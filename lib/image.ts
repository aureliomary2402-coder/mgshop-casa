export function optimizeImage(url: string | null, width = 400): string | null {
  if (!url) return null
  if (url.includes('supabase.co/storage')) {
    const base = url.split('?')[0]
    return `${base}?width=${width}&quality=75&format=webp`
  }
  return url
}

// Comprime una foto lato client prima di caricarla: le foto moderne (specie
// da smartphone) possono pesare diversi MB, ma le funzioni serverless di
// Vercel accettano corpi richiesta fino a ~4.5MB. Senza questa compressione
// il caricamento fallisce in silenzio (errore "no boundary found in
// multipart body", perché la richiesta viene troncata). Ridisegnando la foto
// su un canvas la convertiamo anche in JPEG, così i formati non standard
// (es. HEIC di iPhone) diventano un formato che il browser sa sempre mostrare.
export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    // Se il browser non riesce a decodificare il file (es. formato non
    // supportato) torniamo il file originale così l'upload prosegue comunque.
    return file
  }
}
