#!/bin/bash
set -e
cd "$(dirname "$0")" 2>/dev/null || true
cd ~/mgshop-casa

echo "Aggiorno components/shop/notify-banner.tsx (posizione e z-index)..."
python3 << 'PYEOF'
path = "components/shop/notify-banner.tsx"
with open(path, "r") as f:
    content = f.read()

old = """  return (
    <div className="fixed left-4 right-4 z-40 animate-slide-in-up" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>"""

new = """  // Posizionato sopra la bottom nav, la bollicina del menu flottante e la
  // scorciatoia carrello (che su alcune pagine si impilano fino a ~13.5rem
  // da fondo pagina): senza questo margine il banner veniva parzialmente
  // coperto su mobile. z-index più alto di tutti gli altri elementi fissi
  // così resta sempre leggibile, ed essendo "fixed" resta visibile anche
  // scorrendo la pagina finché non viene chiuso o attivato.
  return (
    <div className="fixed left-4 right-4 z-[60] animate-slide-in-up" style={{ bottom: 'calc(230px + env(safe-area-inset-bottom, 0px))' }}>"""

if old not in content:
    raise SystemExit("ANCHOR non trovato: il file è cambiato rispetto a quanto atteso, controllo manuale necessario")
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("components/shop/notify-banner.tsx aggiornato")
PYEOF

echo ""
echo "✅ Fatto! File modificato:"
echo "   - components/shop/notify-banner.tsx"
echo ""
echo "Ora testa in locale con: npm run dev (o meglio, su mobile dopo il push, per vedere il posizionamento reale)"
echo "Se va tutto bene:"
echo "   git add -A"
echo "   git commit -m 'Sposta il banner notifiche sopra bottom nav e menu flottante su mobile'"
echo "   git push"
