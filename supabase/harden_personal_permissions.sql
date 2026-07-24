-- Aplica este archivo una vez en proyectos que ya ejecutaron 001_initial.sql.
-- Es idempotente: puede volver a ejecutarse sin duplicar políticas.

begin;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
for select to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or (active and id = auth.uid())
  )
);

drop policy if exists customers_staff_update on public.customers;
drop policy if exists customers_admin_update on public.customers;
create policy customers_admin_update on public.customers
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists prices_read on public.service_prices;
create policy prices_read on public.service_prices
for select to authenticated
using (
  public.is_admin()
  or public.current_role() = 'Cliente'
  or public.can_access_branch(branch_id)
);

commit;

