-- =====================================================================
-- Leak Sniper — Esquema inicial (Supabase / Postgres)
-- Tablas + RLS + Realtime + Seed
-- White-label: The Orchard (Sony Music)
-- =====================================================================

-- Necesario para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ARTISTS
-- ---------------------------------------------------------------------
create table if not exists public.artists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  status      text not null default 'active' check (status in ('active','paused')),
  risk_level  text not null default 'medio' check (risk_level in ('alto','medio','bajo')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- KEYWORDS
-- ---------------------------------------------------------------------
create table if not exists public.keywords (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.artists(id) on delete cascade,
  term        text not null,
  platform    text not null default 'youtube' check (platform in ('youtube','spotify','all')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists keywords_artist_id_idx on public.keywords(artist_id);

-- ---------------------------------------------------------------------
-- LEAKS
-- ---------------------------------------------------------------------
create table if not exists public.leaks (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  keyword_id    uuid references public.keywords(id) on delete set null,
  platform      text not null default 'youtube',
  external_id   text not null,
  url           text,
  title         text,
  channel       text,
  thumbnail_url text,
  views         integer default 0,
  published_at  timestamptz,
  detected_at   timestamptz not null default now(),
  status        text not null default 'nueva' check (status in ('nueva','revisada','takedown_enviado','resuelta')),
  score         integer default 0,
  -- Dedup: external_id es único por plataforma
  unique (platform, external_id)
);
create index if not exists leaks_artist_id_idx on public.leaks(artist_id);
create index if not exists leaks_status_idx    on public.leaks(status);
create index if not exists leaks_detected_idx  on public.leaks(detected_at desc);

-- ---------------------------------------------------------------------
-- SCAN_RUNS
-- ---------------------------------------------------------------------
create table if not exists public.scan_runs (
  id                 uuid primary key default gen_random_uuid(),
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  artists_scanned    integer default 0,
  keywords_scanned   integer default 0,
  youtube_units_used integer default 0,
  leaks_found        integer default 0,
  triggered_by       text not null default 'cron' check (triggered_by in ('cron','manual')),
  status             text not null default 'ok' check (status in ('ok','error')),
  error_message      text
);
create index if not exists scan_runs_started_idx on public.scan_runs(started_at desc);

-- ---------------------------------------------------------------------
-- SETTINGS (fila singleton, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                    integer primary key default 1 check (id = 1),
  scan_interval_hours   integer not null default 1,
  daily_quota_limit     integer not null default 10000,
  unit_cost_per_search  integer not null default 100,
  alert_threshold_views integer not null default 1000,
  client_name           text not null default 'The Orchard',
  youtube_api_key       text,
  spotify_client_id     text,
  spotify_client_secret text,
  updated_at            timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY — solo usuarios autenticados leen/escriben
-- (el service_role usado por /api/scan ignora RLS automáticamente)
-- =====================================================================
alter table public.artists   enable row level security;
alter table public.keywords  enable row level security;
alter table public.leaks     enable row level security;
alter table public.scan_runs enable row level security;
alter table public.settings  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['artists','keywords','leaks','scan_runs','settings']
  loop
    execute format('drop policy if exists "auth_all_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "auth_all_%1$s" on public.%1$s
         for all
         to authenticated
         using (true)
         with check (true);', t);
  end loop;
end $$;

-- =====================================================================
-- REALTIME — emitir cambios de leaks (notificaciones in-panel en vivo)
-- =====================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.leaks;
  exception
    when duplicate_object then null;
    when undefined_object then
      create publication supabase_realtime for table public.leaks;
  end;
end $$;

-- =====================================================================
-- SEED
-- =====================================================================
insert into public.settings (id) values (1)
on conflict (id) do nothing;

insert into public.artists (name, slug, status, risk_level, notes)
values ('Jere Klein', 'jere-klein', 'active', 'alto',
        'Artista chileno de alto perfil. Riesgo alto de filtraciones pre-lanzamiento.')
on conflict (slug) do nothing;

insert into public.keywords (artist_id, term, platform, active)
select a.id, k.term, 'youtube', true
from public.artists a
cross join (values
  ('Jere Klein leak'),
  ('Jere Klein filtración'),
  ('Jere Klein nueva canción'),
  ('Jere Klein unreleased'),
  ('Jere Klein snippet'),
  ('Jere Klein adelanto'),
  ('Jere Klein sin lanzar'),
  ('Jere Klein preview 2026')
) as k(term)
where a.slug = 'jere-klein'
on conflict do nothing;
