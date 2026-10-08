-- Note private admin per i prodotti "personalizzati" creati dentro la Promo
-- (non esiste un prodotto del catalogo a cui collegarle). Tabella separata dai
-- dati della promo, perche' quelli sono pubblici su /promo.
-- RLS attiva senza policy: accessibile solo dal server con le API admin.
create table if not exists promo_item_admin_notes (
  item_id text primary key,
  supplier_note text not null default '',
  updated_at timestamptz default now()
);
alter table promo_item_admin_notes enable row level security;
