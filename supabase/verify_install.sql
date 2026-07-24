-- Verificación no destructiva del esquema instalado.
-- Ejecutar después de 001_initial.sql desde Supabase SQL Editor.
do $$
declare
  v_missing text[];
begin
  select array_agg(required.name)
  into v_missing
  from (
    values
      ('profiles'),
      ('customers'),
      ('orders'),
      ('order_items'),
      ('service_prices'),
      ('order_status_history')
  ) as required(name)
  where to_regclass('public.' || required.name) is null;

  if v_missing is not null then
    raise exception 'Faltan tablas requeridas: %', array_to_string(v_missing, ', ');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'active' and is_nullable = 'NO'
  ) then
    raise exception 'profiles.active no está instalado correctamente.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'active' and is_nullable = 'NO'
  ) then
    raise exception 'customers.active no está instalado correctamente.';
  end if;

  if to_regprocedure('public.bootstrap_first_admin(text)') is null
     or to_regprocedure('public.transition_user_role(uuid,text,uuid)') is null
     or to_regprocedure('public.deactivate_person_record(text,uuid)') is null
     or to_regprocedure('public.reactivate_person_record(text,uuid)') is null
     or to_regprocedure('public.upsert_order_with_items(uuid,uuid,jsonb,jsonb)') is null then
    raise exception 'Faltan funciones operativas requeridas.';
  end if;

  if has_function_privilege('authenticated', 'public.bootstrap_first_admin(text)', 'EXECUTE') then
    raise exception 'bootstrap_first_admin no debe ser ejecutable por authenticated.';
  end if;

  if has_function_privilege('authenticated', 'public.customer_identity_status_internal(text,text)', 'EXECUTE') then
    raise exception 'customer_identity_status_internal está expuesta incorrectamente.';
  end if;

  if not has_function_privilege('authenticated', 'public.customer_identity_status(text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.register_customer_profile(uuid,text,text,text,text)', 'EXECUTE') then
    raise exception 'Faltan permisos para el registro de clientes.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_admin_update' and cmd = 'UPDATE'
  ) then
    raise exception 'La política limitada de actualización de clientes no está instalada.';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_staff_update'
  ) then
    raise exception 'Personal todavia conserva actualizacion directa sobre customers.';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename in ('customers', 'profiles')
      and cmd = 'DELETE'
  ) then
    raise exception 'Clientes o perfiles conservan una política DELETE no permitida.';
  end if;

  raise notice 'Esquema Lavavelox verificado correctamente.';
end
$$;

select
  (select count(*) from public.profiles where role = 'Admin' and active and deleted_at is null) as administradores_activos,
  (select count(*) from public.customers where active and deleted_at is null) as clientes_activos,
  (select count(*) from public.profiles where active and deleted_at is null) as perfiles_activos;
