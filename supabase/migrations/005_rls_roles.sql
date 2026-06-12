-- =====================================================================
-- Leak Sniper — RLS por rol: solo ADMIN modifica configuración.
-- Lectura: cualquier usuario autenticado. Escritura de gestión: admin.
-- (leaks queda escribible por cualquier autenticado: triage operativo.)
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Reemplaza las políticas "auth_all_*" por: SELECT (todos auth) + escritura solo admin
do $$
declare t text;
begin
  foreach t in array array['artists','keywords','official_channels','settings'] loop
    execute format('drop policy if exists "auth_all_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_ins" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_upd" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_del" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_ins" on public.%1$s for insert to authenticated with check (public.is_admin());', t);
    execute format('create policy "%1$s_upd" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin());', t);
    execute format('create policy "%1$s_del" on public.%1$s for delete to authenticated using (public.is_admin());', t);
  end loop;
end $$;
