-- =====================================================================
-- Leak Sniper — White-label / branding configurable
-- Permite personalizar marca, color y textos por cliente desde Ajustes.
-- =====================================================================

alter table public.settings
  add column if not exists brand_name    text not null default 'Leak Sniper',
  add column if not exists accent_color  text not null default '#F5B500',
  add column if not exists login_tagline text not null default 'Inteligencia de filtraciones musicales.';
