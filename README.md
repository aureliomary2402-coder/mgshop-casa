# MGShop Casa — Setup

## 1. Supabase — Crea il database

Vai su https://supabase.com → il tuo progetto → **SQL Editor**
Copia e incolla tutto il contenuto di `schema.sql` ed eseguilo.

Poi vai su **Storage** → **New bucket**:
- Nome: `images`
- Public: ✅ ON

## 2. Variabili d'ambiente

Su Vercel → Settings → Environment Variables, aggiungi:

| Variabile | Dove trovarla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `ADMIN_PASSWORD` | Scegli tu una password sicura |

## 3. Deploy su Vercel

1. Vai su https://vercel.com → **Add New Project**
2. Carica lo zip oppure collega GitHub
3. Aggiungi le variabili d'ambiente
4. Clicca **Deploy**

## 4. Pannello admin

Vai su `https://il-tuo-sito.vercel.app/mgadmin-panel`
Inserisci la password che hai scelto.

## Funzionalità incluse

- 🛍️ Shop con catalogo prodotti, filtro per categoria e ricerca
- 🖼️ Slider banner homepage
- 📦 Scheda prodotto con galleria immagini
- 🛒 Carrello persistente (localStorage)
- 📋 Checkout con numero di telefono
- 🔧 Pannello admin protetto da password con:
  - Gestione prodotti (upload cover + URL)
  - Gestione categorie
  - Gestione banner
  - Gestione ordini con cambio stato
  - Galleria immagini per prodotto (upload file + URL)
- 💾 Immagini su Supabase Storage (niente Vercel Blob)
# test
