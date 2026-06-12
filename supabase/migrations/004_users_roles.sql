-- =====================================================================
-- Leak Sniper — Multiusuario + roles (admin / viewer)
-- Cada persona tiene su cuenta; un perfil con rol controla los permisos.
-- =====================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede LEER los perfiles (para ver la lista de usuarios).
-- La ESCRITURA solo ocurre vía Server Actions con service_role (que ignora RLS).
drop policy if exists "profiles_read_auth" on public.profiles;
create policy "profiles_read_auth" on public.profiles
  for select to authenticated using (true);

-- Al crear un usuario en Auth, se crea automáticamente su perfil (rol viewer por defecto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: los usuarios existentes (ej. orchard) quedan como ADMIN.
insert into public.profiles (id, email, role)
select id, email, 'admin' from auth.users
on conflict (id) do update set role = 'admin';
