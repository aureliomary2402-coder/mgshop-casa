-- Tema del sito (Halloween / Originale / ...) gestito dal pannello admin.
-- Una sola riga: tema attivo + eventuale cambio programmato.
-- RLS attiva e nessuna policy: si legge/scrive solo dal server con la service role.
create table if not exists site_theme (
  id uuid primary key default gen_random_uuid(),
  active_theme text not null default 'halloween',
  next_theme text,
  switch_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table site_theme enable row level security;
insert into site_theme (active_theme)
select 'halloween' where not exists (select 1 from site_theme);
