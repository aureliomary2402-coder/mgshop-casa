-- Note private dell'admin sui prodotti (es. "dove mi rifornisco").
-- Tabella SEPARATA da products apposta: molte pagine pubbliche leggono
-- products con select('*'), quindi una colonna lì finirebbe visibile ai clienti.
-- RLS attiva e nessuna policy: nessun accesso da anon/authenticated, solo
-- dal server con la service role (API admin protette dal login).
create table if not exists product_admin_notes (
  product_id uuid primary key references products(id) on delete cascade,
  supplier_note text not null default '',
  updated_at timestamptz default now()
);
alter table product_admin_notes enable row level security;
