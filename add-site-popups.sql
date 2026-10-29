-- Pop up messaggi mostrati ai clienti (gestiti dal pannello admin).
-- RLS attiva e nessuna policy: nessun accesso diretto da anon/authenticated,
-- si legge e scrive solo dal server con la service role (API pubblica che
-- espone solo i pop up attivi + API admin protetta dal login).
create table if not exists site_popups (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  message text not null default '',
  button_label text,
  button_link text,
  frequency text not null default 'session' check (frequency in ('session', 'once')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table site_popups enable row level security;
