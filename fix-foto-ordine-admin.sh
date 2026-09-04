#!/bin/bash
set -e
cd ~/mgshop-casa

python3 << 'PYEOF'
path = "components/admin/orders-manager.tsx"
with open(path) as f:
    content = f.read()

old = '''                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100">
                        {item.product_image
                          ? <img src={optimizeImage(item.product_image, 96) || item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
                      </div>'''

new = '''                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100">
                        {item.product_image
                          ? <img src={optimizeImage(item.product_image, 96) || item.product_image} alt={item.product_name} width={48} height={48} className="absolute inset-0 w-full h-full object-contain object-center block" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
                      </div>'''

if old not in content:
    raise SystemExit("ERRORE: blocco da sostituire non trovato in orders-manager.tsx, nessuna modifica applicata")

content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("orders-manager.tsx aggiornato correttamente")
PYEOF

git add components/admin/orders-manager.tsx
git commit -m "fix: foto prodotto nell'ordine ricevuto (admin) si adatta al riquadro invece di apparire ingrandita/ritagliata"
git push

echo ""
echo "Fatto. Vercel farà il deploy automaticamente in 1-2 minuti."
