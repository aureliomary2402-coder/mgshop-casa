#!/bin/bash
# Aggiunge le note private "dove rifornirmi" ai prodotti (solo admin).
# Esegui dalla cartella del progetto: cd ~/mgshop-casa-main && bash note-fornitore-admin.sh
set -e
cat > /tmp/note-fornitore.patch <<'PATCH_EOF'
diff --git a/add-product-admin-notes.sql b/add-product-admin-notes.sql
new file mode 100644
index 0000000..bcc5213
--- /dev/null
+++ b/add-product-admin-notes.sql
@@ -0,0 +1,11 @@
+-- Note private dell'admin sui prodotti (es. "dove mi rifornisco").
+-- Tabella SEPARATA da products apposta: molte pagine pubbliche leggono
+-- products con select('*'), quindi una colonna lì finirebbe visibile ai clienti.
+-- RLS attiva e nessuna policy: nessun accesso da anon/authenticated, solo
+-- dal server con la service role (API admin protette dal login).
+create table if not exists product_admin_notes (
+  product_id uuid primary key references products(id) on delete cascade,
+  supplier_note text not null default '',
+  updated_at timestamptz default now()
+);
+alter table product_admin_notes enable row level security;
diff --git a/app/api/admin/product-notes/route.ts b/app/api/admin/product-notes/route.ts
new file mode 100644
index 0000000..6987fc4
--- /dev/null
+++ b/app/api/admin/product-notes/route.ts
@@ -0,0 +1,40 @@
+import { NextRequest, NextResponse } from 'next/server'
+import { createAdminClient } from '@/lib/supabase/admin'
+import { cookies } from 'next/headers'
+
+export const dynamic = 'force-dynamic'
+
+// Note private dell'admin (es. dove rifornirsi). Sempre protette dal login:
+// niente di qui deve mai arrivare ai clienti.
+async function isAuthenticated() {
+  const cookieStore = await cookies()
+  return cookieStore.get('admin_session')?.value === 'authenticated'
+}
+
+export async function GET() {
+  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+  const supabase = createAdminClient()
+  const { data, error } = await supabase.from('product_admin_notes').select('product_id, supplier_note')
+  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
+  const map: Record<string, string> = {}
+  for (const row of data || []) map[row.product_id] = row.supplier_note
+  return NextResponse.json(map)
+}
+
+export async function PUT(request: NextRequest) {
+  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+  const { product_id, supplier_note } = await request.json()
+  if (!product_id) return NextResponse.json({ error: 'product_id mancante' }, { status: 400 })
+  const supabase = createAdminClient()
+  const note = String(supplier_note ?? '').trim()
+  if (!note) {
+    const { error } = await supabase.from('product_admin_notes').delete().eq('product_id', product_id)
+    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
+    return NextResponse.json({ success: true })
+  }
+  const { error } = await supabase
+    .from('product_admin_notes')
+    .upsert({ product_id, supplier_note: note, updated_at: new Date().toISOString() })
+  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
+  return NextResponse.json({ success: true })
+}
diff --git a/components/admin/products-manager.tsx b/components/admin/products-manager.tsx
index 8862c67..f34c232 100644
--- a/components/admin/products-manager.tsx
+++ b/components/admin/products-manager.tsx
@@ -1,7 +1,7 @@
 "use client"
 
 import { useState, useEffect } from 'react'
-import { Plus, Pencil, Trash2, Images, ToggleLeft, ToggleRight, ImageIcon, Search, X, Package, AlertTriangle, Clock, Palette, GripVertical, Tag, Check } from 'lucide-react'
+import { Plus, Pencil, Trash2, Images, ToggleLeft, ToggleRight, ImageIcon, Search, X, Package, AlertTriangle, Clock, Palette, GripVertical, Tag, Check, Lock } from 'lucide-react'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { ProductImagesManager } from './product-images-manager'
@@ -205,21 +205,28 @@ export function ProductsManager() {
   const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all')
   const [savingKeywordsId, setSavingKeywordsId] = useState<string | null>(null)
   const [savedKeywordsId, setSavedKeywordsId] = useState<string | null>(null)
+  // Note private dell'admin (dove rifornirsi): vengono da una API protetta e
+  // non fanno mai parte dei dati dei prodotti mostrati ai clienti.
+  const [notes, setNotes] = useState<Record<string, string>>({})
+  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
+  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)
 
   useEffect(() => { fetchAll() }, [])
 
   const fetchAll = async () => {
-    const [p, c] = await Promise.all([
+    const [p, c, n] = await Promise.all([
       fetch('/api/admin/products').then(r => r.json()),
       fetch('/api/admin/categories').then(r => r.json()),
+      fetch('/api/admin/product-notes').then(r => r.ok ? r.json() : {}).catch(() => ({})),
     ])
     setProducts(p)
+    setNotes(n && typeof n === 'object' ? n : {})
     setCategories(c)
     setLoading(false)
   }
 
   const filteredProducts = products.filter(p => {
-    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
+    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (notes[p.id] || '').toLowerCase().includes(search.toLowerCase())
     const matchesCategory = filterCategory === '' || p.category_id === filterCategory
     const matchesStock = filterStock === 'all' ? true
       : filterStock === 'out' ? p.stock === 0
@@ -361,6 +368,17 @@ export function ProductsManager() {
     setSavingKeywordsId(null)
   }
 
+  const handleNoteSave = async (productId: string) => {
+    setSavingNoteId(productId)
+    try {
+      const res = await fetch('/api/admin/product-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, supplier_note: notes[productId] || '' }) })
+      if (!res.ok) throw new Error(String(res.status))
+      setSavedNoteId(productId)
+      setTimeout(() => setSavedNoteId(id => (id === productId ? null : id)), 1500)
+    } catch { alert('Salvataggio nota fallito. Hai creato la tabella product_admin_notes su Supabase?') }
+    setSavingNoteId(null)
+  }
+
   if (managingImagesFor) return <ProductImagesManager productId={managingImagesFor} onBack={() => setManagingImagesFor(null)} />
   if (loading) return <div className="text-center py-12 text-slate-400">Caricamento...</div>
 
@@ -573,7 +591,7 @@ export function ProductsManager() {
       <div className="flex gap-2">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
-          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto..." className="pl-9 pr-9" />
+          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto o fornitore..." className="pl-9 pr-9" />
           {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
         </div>
         <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
@@ -652,6 +670,25 @@ export function ProductsManager() {
                   <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
                 )}
               </div>
+
+              {/* Nota privata: dove rifornirsi. Visibile solo qui, nel pannello admin */}
+              <div className="relative">
+                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 pointer-events-none" />
+                <input
+                  value={notes[p.id] || ''}
+                  onChange={e => setNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
+                  onBlur={() => handleNoteSave(p.id)}
+                  placeholder="Dove rifornirmi (solo tu)"
+                  title="Nota privata: visibile solo a te, i clienti non la vedono mai"
+                  className="w-full text-[11px] border border-amber-200 bg-amber-50/50 rounded-lg pl-6 pr-6 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
+                />
+                {savingNoteId === p.id && (
+                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
+                )}
+                {savedNoteId === p.id && savingNoteId !== p.id && (
+                  <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
+                )}
+              </div>
             </div>
           </div>
         ))}
diff --git a/schema.sql b/schema.sql
index b17528d..ec2881d 100644
--- a/schema.sql
+++ b/schema.sql
@@ -94,3 +94,11 @@ create policy "Public read banners" on banners for select using (is_active = tru
 
 -- Supabase Storage: crea bucket "images" pubblico dalla dashboard
 -- Storage > New bucket > nome: images > Public: ON
+
+-- Note private admin sui prodotti (dove rifornirsi). Vedi add-product-admin-notes.sql
+create table if not exists product_admin_notes (
+  product_id uuid primary key references products(id) on delete cascade,
+  supplier_note text not null default '',
+  updated_at timestamptz default now()
+);
+alter table product_admin_notes enable row level security;
PATCH_EOF
git apply --whitespace=nowarn /tmp/note-fornitore.patch && echo "Modifiche applicate."
echo "Ora: 1) esegui add-product-admin-notes.sql nel SQL Editor di Supabase, 2) git add . && git commit -m \"Note private fornitore\" && git push"
