#!/bin/bash
# Estende le note private "dove rifornirmi" a Volantino e Promo (solo admin).
# Da eseguire dopo note-fornitore-admin.sh, dalla cartella del progetto.
set -e
cat > /tmp/note-fornitore2.patch <<'PATCH_EOF'
diff --git a/add-promo-item-notes.sql b/add-promo-item-notes.sql
new file mode 100644
index 0000000..3432606
--- /dev/null
+++ b/add-promo-item-notes.sql
@@ -0,0 +1,10 @@
+-- Note private admin per i prodotti "personalizzati" creati dentro la Promo
+-- (non esiste un prodotto del catalogo a cui collegarle). Tabella separata dai
+-- dati della promo, perche' quelli sono pubblici su /promo.
+-- RLS attiva senza policy: accessibile solo dal server con le API admin.
+create table if not exists promo_item_admin_notes (
+  item_id text primary key,
+  supplier_note text not null default '',
+  updated_at timestamptz default now()
+);
+alter table promo_item_admin_notes enable row level security;
diff --git a/app/api/admin/product-notes/route.ts b/app/api/admin/product-notes/route.ts
index 6987fc4..732d457 100644
--- a/app/api/admin/product-notes/route.ts
+++ b/app/api/admin/product-notes/route.ts
@@ -6,6 +6,8 @@ export const dynamic = 'force-dynamic'
 
 // Note private dell'admin (es. dove rifornirsi). Sempre protette dal login:
 // niente di qui deve mai arrivare ai clienti.
+// - note di prodotti del catalogo: chiave = id del prodotto
+// - note di prodotti personalizzati della Promo: chiave = "promo:<id voce>"
 async function isAuthenticated() {
   const cookieStore = await cookies()
   return cookieStore.get('admin_session')?.value === 'authenticated'
@@ -14,27 +16,33 @@ async function isAuthenticated() {
 export async function GET() {
   if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   const supabase = createAdminClient()
+  const map: Record<string, string> = {}
   const { data, error } = await supabase.from('product_admin_notes').select('product_id, supplier_note')
   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
-  const map: Record<string, string> = {}
   for (const row of data || []) map[row.product_id] = row.supplier_note
+  // Tabella delle note promo: se non e' ancora stata creata si ignora in silenzio
+  const { data: promoData } = await supabase.from('promo_item_admin_notes').select('item_id, supplier_note')
+  for (const row of promoData || []) map[`promo:${row.item_id}`] = row.supplier_note
   return NextResponse.json(map)
 }
 
 export async function PUT(request: NextRequest) {
   if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
-  const { product_id, supplier_note } = await request.json()
-  if (!product_id) return NextResponse.json({ error: 'product_id mancante' }, { status: 400 })
+  const { product_id, promo_item_id, supplier_note } = await request.json()
+  if (!product_id && !promo_item_id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
   const supabase = createAdminClient()
   const note = String(supplier_note ?? '').trim()
+  const table = promo_item_id ? 'promo_item_admin_notes' : 'product_admin_notes'
+  const column = promo_item_id ? 'item_id' : 'product_id'
+  const id = promo_item_id || product_id
   if (!note) {
-    const { error } = await supabase.from('product_admin_notes').delete().eq('product_id', product_id)
+    const { error } = await supabase.from(table).delete().eq(column, id)
     if (error) return NextResponse.json({ error: error.message }, { status: 500 })
     return NextResponse.json({ success: true })
   }
   const { error } = await supabase
-    .from('product_admin_notes')
-    .upsert({ product_id, supplier_note: note, updated_at: new Date().toISOString() })
+    .from(table)
+    .upsert({ [column]: id, supplier_note: note, updated_at: new Date().toISOString() })
   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
   return NextResponse.json({ success: true })
 }
diff --git a/components/admin/admin-notes.tsx b/components/admin/admin-notes.tsx
new file mode 100644
index 0000000..903088d
--- /dev/null
+++ b/components/admin/admin-notes.tsx
@@ -0,0 +1,65 @@
+"use client"
+
+import { useState, useEffect, useCallback } from 'react'
+import { Lock, Check } from 'lucide-react'
+
+// Note private dell'admin ("dove rifornirmi"). Arrivano da una API protetta dal
+// login e non sono mai inserite nei dati pubblici di prodotti, volantino o promo.
+// Chiave: id del prodotto, oppure "promo:<id voce>" per i prodotti personalizzati
+// creati dentro la Promo.
+export function useAdminNotes() {
+  const [notes, setNotes] = useState<Record<string, string>>({})
+  useEffect(() => {
+    fetch('/api/admin/product-notes')
+      .then(r => (r.ok ? r.json() : {}))
+      .then(n => setNotes(n && typeof n === 'object' ? n : {}))
+      .catch(() => {})
+  }, [])
+  const setNote = useCallback((key: string, value: string) => {
+    setNotes(prev => ({ ...prev, [key]: value }))
+  }, [])
+  return { notes, setNote }
+}
+
+export function AdminNoteInput({ noteKey, notes, setNote }: {
+  noteKey: string
+  notes: Record<string, string>
+  setNote: (key: string, value: string) => void
+}) {
+  const [saving, setSaving] = useState(false)
+  const [saved, setSaved] = useState(false)
+
+  const save = async () => {
+    setSaving(true)
+    try {
+      const idField = noteKey.startsWith('promo:') ? { promo_item_id: noteKey.slice(6) } : { product_id: noteKey }
+      const res = await fetch('/api/admin/product-notes', {
+        method: 'PUT',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ ...idField, supplier_note: notes[noteKey] || '' }),
+      })
+      if (!res.ok) throw new Error(String(res.status))
+      setSaved(true)
+      setTimeout(() => setSaved(false), 1500)
+    } catch {
+      alert('Salvataggio nota fallito. Hai creato le tabelle su Supabase?')
+    }
+    setSaving(false)
+  }
+
+  return (
+    <div className="relative">
+      <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 pointer-events-none" />
+      <input
+        value={notes[noteKey] || ''}
+        onChange={e => setNote(noteKey, e.target.value)}
+        onBlur={save}
+        placeholder="Dove rifornirmi (solo tu)"
+        title="Nota privata: visibile solo a te, i clienti non la vedono mai"
+        className="w-full text-[11px] border border-amber-200 bg-amber-50/70 rounded-lg pl-6 pr-6 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
+      />
+      {saving && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
+      {saved && !saving && <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />}
+    </div>
+  )
+}
diff --git a/components/admin/promo-manager.tsx b/components/admin/promo-manager.tsx
index 9cc172a..2c0098b 100644
--- a/components/admin/promo-manager.tsx
+++ b/components/admin/promo-manager.tsx
@@ -9,6 +9,7 @@ import type { Product, CustomizationOption } from '@/lib/types'
 import { ImageCropper } from './image-cropper'
 import { createCustomPromoId } from '@/lib/promo-custom-product'
 import { CustomizationOptionsEditor } from './customization-options-editor'
+import { useAdminNotes, AdminNoteInput } from './admin-notes'
 
 interface PromoItem {
   id: string
@@ -49,6 +50,7 @@ export function PromoManager() {
   const [uploading, setUploading] = useState(false)
   const [error, setError] = useState('')
   const [allProducts, setAllProducts] = useState<Product[]>([])
+  const { notes, setNote } = useAdminNotes()
   const [cropFile, setCropFile] = useState<File | null>(null)
   const [fetchingEdit, setFetchingEdit] = useState(false)
   const [cropAspect, setCropAspect] = useState(16 / 9)
@@ -265,7 +267,7 @@ export function PromoManager() {
   }
 
   const filteredProducts = allProducts.filter(p =>
-    p.name.toLowerCase().includes(productSearch.toLowerCase())
+    p.name.toLowerCase().includes(productSearch.toLowerCase()) || (notes[p.id] || '').toLowerCase().includes(productSearch.toLowerCase())
   )
 
   // Per i prodotti del negozio, nome/immagine/prezzo originale arrivano dal
@@ -465,6 +467,7 @@ export function PromoManager() {
                       <X className="w-4 h-4 text-red-400" />
                     </button>
                   </div>
+                  <AdminNoteInput noteKey={item.product_id ? item.product_id : `promo:${item.id}`} notes={notes} setNote={setNote} />
                   <textarea value={item.description || ''} onChange={e => updateDescription(item.id, e.target.value)}
                     className="w-full border border-cyan-200 bg-white rounded-lg p-2 text-xs resize-none h-12 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                     placeholder="Informazioni aggiuntive per questo prodotto (facoltativo) — il cliente le vede aprendo la scheda dalla pagina promo" />
diff --git a/components/admin/volantino-manager.tsx b/components/admin/volantino-manager.tsx
index 5c73e4e..47a432b 100644
--- a/components/admin/volantino-manager.tsx
+++ b/components/admin/volantino-manager.tsx
@@ -6,6 +6,7 @@ import { Input } from '@/components/ui/input'
 import { Button } from '@/components/ui/button'
 import Link from 'next/link'
 import type { Product } from '@/lib/types'
+import { useAdminNotes, AdminNoteInput } from './admin-notes'
 
 interface VolantinoItem {
   product_id: string
@@ -40,6 +41,7 @@ export function VolantinoManager() {
   const [deleting, setDeleting] = useState(false)
   const [error, setError] = useState('')
   const [allProducts, setAllProducts] = useState<Product[]>([])
+  const { notes, setNote } = useAdminNotes()
   const [productSearch, setProductSearch] = useState('')
   const [showProductPicker, setShowProductPicker] = useState(false)
   const pickerRef = useRef<HTMLDivElement>(null)
@@ -174,7 +176,7 @@ export function VolantinoManager() {
   }
 
   const filteredProducts = allProducts.filter(p =>
-    p.name.toLowerCase().includes(productSearch.toLowerCase())
+    p.name.toLowerCase().includes(productSearch.toLowerCase()) || (notes[p.id] || '').toLowerCase().includes(productSearch.toLowerCase())
   )
 
   const itemProducts = items
@@ -273,7 +275,8 @@ export function VolantinoManager() {
               {itemProducts.length > 0 && (
                 <div className="space-y-2 mb-3">
                   {itemProducts.map(({ item, product }) => (
-                    <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-cyan-100 bg-cyan-50">
+                    <div key={product.id} className="p-2.5 rounded-xl border border-cyan-100 bg-cyan-50 space-y-2">
+                     <div className="flex items-center gap-3">
                       {product.cover_image && <img src={product.cover_image} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
@@ -291,6 +294,8 @@ export function VolantinoManager() {
                       <button onClick={() => removeProduct(product.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                         <X className="w-4 h-4 text-red-400" />
                       </button>
+                     </div>
+                     <AdminNoteInput noteKey={product.id} notes={notes} setNote={setNote} />
                     </div>
                   ))}
                 </div>
@@ -322,6 +327,7 @@ export function VolantinoManager() {
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                             <p className="text-xs text-cyan-700">€{p.price.toFixed(2)}</p>
+                            {notes[p.id] && <p className="text-[10px] text-amber-600 truncate">🔒 {notes[p.id]}</p>}
                           </div>
                           {already && <span className="text-xs text-slate-400 font-bold shrink-0">Aggiunto</span>}
                         </button>
diff --git a/schema.sql b/schema.sql
index ec2881d..423f543 100644
--- a/schema.sql
+++ b/schema.sql
@@ -102,3 +102,11 @@ create table if not exists product_admin_notes (
   updated_at timestamptz default now()
 );
 alter table product_admin_notes enable row level security;
+
+-- Note private admin per i prodotti personalizzati della Promo. Vedi add-promo-item-notes.sql
+create table if not exists promo_item_admin_notes (
+  item_id text primary key,
+  supplier_note text not null default '',
+  updated_at timestamptz default now()
+);
+alter table promo_item_admin_notes enable row level security;
PATCH_EOF
git apply --whitespace=nowarn /tmp/note-fornitore2.patch && echo "Modifiche applicate."
