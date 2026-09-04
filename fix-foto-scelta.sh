#!/bin/bash
set -e
cd ~/mgshop-casa

cat > lib/image.ts << 'EOF'
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
EOF

python3 << 'PYEOF'
import re
path = "components/admin/products-manager.tsx"
with open(path) as f:
    content = f.read()

content = content.replace(
    "import { createCustomizationOptionId, normalizeChoices } from '@/lib/customization'",
    "import { createCustomizationOptionId, normalizeChoices } from '@/lib/customization'\nimport { compressImageFile } from '@/lib/image'",
    1
)

old = """    setUploadingIdx(idx)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) updateChoice(idx, { image_url: data.url })
    } catch { console.error('Upload foto scelta fallito') }
    setUploadingIdx(null)"""

new = """    setUploadingIdx(idx)
    try {
      const compressed = await compressImageFile(file)
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) updateChoice(idx, { image_url: data.url })
      else console.error('Upload foto scelta fallito:', data.error)
    } catch (e) { console.error('Upload foto scelta fallito', e) }
    setUploadingIdx(null)"""

if old not in content:
    raise SystemExit("ERRORE: blocco da sostituire non trovato in products-manager.tsx, nessuna modifica applicata")

content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("products-manager.tsx aggiornato correttamente")
PYEOF

git add lib/image.ts components/admin/products-manager.tsx
git commit -m "fix: comprimi foto scelta personalizzazione prima dell'upload (risolve caricamento fallito su foto pesanti da smartphone)"
git push

echo ""
echo "Fatto. Vercel farà il deploy automaticamente in 1-2 minuti."
