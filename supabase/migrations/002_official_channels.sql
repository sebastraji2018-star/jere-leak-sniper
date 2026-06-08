-- =====================================================================
-- Leak Sniper — Canales oficiales (lista blanca)
-- Los videos de estos canales NO se marcan como filtraciones.
-- =====================================================================

create table if not exists public.official_channels (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.artists(id) on delete cascade,
  platform    text not null default 'youtube' check (platform in ('youtube','spotify','all')),
  name        text not null,            -- nombre del canal (channelTitle) a excluir
  channel_id  text,                     -- opcional: ID exacto del canal (ej. UC...)
  created_at  timestamptz not null default now()
);
create index if not exists official_channels_artist_id_idx on public.official_channels(artist_id);

alter table public.official_channels enable row level security;

drop policy if exists "auth_all_official_channels" on public.official_channels;
create policy "auth_all_official_channels" on public.official_channels
  for all
  to authenticated
  using (true)
  with check (true);

-- Seed: canal oficial de Jere Klein (ajustable desde el panel)
insert into public.official_channels (artist_id, platform, name)
select a.id, 'youtube', 'Jere Klein'
from public.artists a
where a.slug = 'jere-klein'
on conflict do nothing;
