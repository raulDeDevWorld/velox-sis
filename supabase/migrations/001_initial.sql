-- Lavavelox: esquema canónico para una instalación nueva.
-- Ejecutar una sola vez después de supabase/reset.sql.
begin;

create extension if not exists pgcrypto;

create type public.order_status as enum ('Pendiente', 'Concluido', 'Entregado', 'Cancelado');
create type public.payment_method as enum ('Efectivo', 'QR', 'Transferencia', 'Tarjeta', 'Otro');
create type public.velox_type as enum ('same_day', 'later');

create table public.app_roles (
  name text primary key,
  description text,
  permissions jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into public.app_roles (name, description, permissions) values
  ('Admin', 'Acceso completo al negocio', '{"manage_all": true}'),
  ('Personal', 'Operación por sucursal', '{"manage_branch_orders": true}'),
  ('Cliente', 'Cliente autenticado', '{"read_own_orders": true}')
on conflict (name) do nothing;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text not null,
  whatsapp text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  document_number text,
  address text,
  whatsapp text,
  role text not null references public.app_roles(name),
  primary_branch_id uuid references public.branches(id) on delete set null,
  blocked boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (not active or role in ('Admin', 'Personal'))
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references auth.users(id) on delete set null,
  email text,
  full_name text not null,
  document_number text,
  address text,
  whatsapp text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (document_number is not null or whatsapp is not null)
);

create table public.business_settings (
  id boolean primary key default true check (id),
  whatsapp text,
  velox_same_day_surcharge numeric(12,2) not null default 0 check (velox_same_day_surcharge >= 0),
  velox_later_surcharge numeric(12,2) not null default 0 check (velox_later_surcharge >= 0),
  qr_image_url text,
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.reception_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

insert into public.business_settings (id, whatsapp, velox_same_day_surcharge, velox_later_surcharge)
values (true, '', 0, 0)
on conflict (id) do nothing;

insert into public.service_categories (name, sort_order) values
  ('Chompas', 0), ('Poleras', 1), ('Busos', 2), ('Sabanas', 3)
on conflict (name) do nothing;

insert into public.reception_methods (name, sort_order) values
  ('Kilo', 0), ('Prenda', 1)
on conflict (name) do nothing;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alternate_name_1 text,
  alternate_name_2 text,
  description text,
  category_id uuid references public.service_categories(id) on delete set null,
  reception_method_id uuid references public.reception_methods(id) on delete set null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create table public.service_prices (
  service_id uuid not null references public.services(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  regular_price numeric(12,2) not null default 0 check (regular_price >= 0),
  immediate_price numeric(12,2) not null default 0 check (immediate_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (service_id, branch_id)
);

create sequence public.order_number_seq;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  branch_id uuid not null references public.branches(id),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_document text,
  customer_address text,
  customer_whatsapp text,
  status public.order_status not null default 'Pendiente',
  total numeric(12,2) not null check (total >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  reception_payment_amount numeric(12,2) not null default 0 check (reception_payment_amount >= 0),
  reception_payment_method public.payment_method,
  reception_paid_at timestamptz,
  delivery_payment_amount numeric(12,2) not null default 0 check (delivery_payment_amount >= 0),
  delivery_payment_method public.payment_method,
  delivery_paid_at timestamptz,
  amount_paid numeric(12,2) generated always as (reception_payment_amount + delivery_payment_amount) stored,
  balance numeric(12,2) generated always as (total - discount - reception_payment_amount - delivery_payment_amount) stored,
  velox_type public.velox_type,
  velox_unit_surcharge_snapshot numeric(12,2) not null default 0 check (velox_unit_surcharge_snapshot >= 0),
  velox_surcharge_snapshot numeric(12,2) not null default 0 check (velox_surcharge_snapshot >= 0),
  pickup_at timestamptz not null,
  delivered_at timestamptz,
  delivered_by uuid references auth.users(id),
  receiver_name text,
  receiver_document text,
  receiver_whatsapp text,
  delivery_notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (total - discount - reception_payment_amount - delivery_payment_amount >= 0),
  check (
    (velox_type is null and velox_unit_surcharge_snapshot = 0 and velox_surcharge_snapshot = 0)
    or velox_type is not null
  ),
  check (
    (reception_payment_amount = 0 and reception_payment_method is null)
    or
    (reception_payment_amount > 0 and reception_payment_method is not null)
  ),
  check (
    (reception_payment_amount = 0 and reception_paid_at is null)
    or
    (reception_payment_amount > 0 and reception_paid_at is not null)
  ),
  check (
    (delivery_payment_amount = 0 and delivery_payment_method is null)
    or
    (delivery_payment_amount > 0 and delivery_payment_method is not null)
  ),
  check (
    (delivery_payment_amount = 0 and delivery_paid_at is null)
    or
    (delivery_payment_amount > 0 and delivery_paid_at is not null)
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  surcharge numeric(12,2) not null default 0 check (surcharge >= 0),
  observation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid default auth.uid() references auth.users(id),
  changed_at timestamptz not null default now(),
  notes text
);

create index profiles_branch_idx on public.profiles(primary_branch_id) where active and deleted_at is null;
create index services_category_idx on public.services(category_id) where deleted_at is null;
create index orders_branch_status_idx on public.orders(branch_id, status) where deleted_at is null;
create index orders_customer_idx on public.orders(customer_id) where deleted_at is null;
create index orders_created_at_idx on public.orders(created_at desc) where deleted_at is null;
create index order_items_order_idx on public.order_items(order_id);
create index status_history_order_idx on public.order_status_history(order_id, changed_at desc);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger branches_updated before update on public.branches for each row execute function public.touch_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.touch_updated_at();
create trigger categories_updated before update on public.service_categories for each row execute function public.touch_updated_at();
create trigger reception_methods_updated before update on public.reception_methods for each row execute function public.touch_updated_at();
create trigger services_updated before update on public.services for each row execute function public.touch_updated_at();
create trigger prices_updated before update on public.service_prices for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.touch_updated_at();
create trigger items_updated before update on public.order_items for each row execute function public.touch_updated_at();

create function public.current_role() returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and active and deleted_at is null and blocked = false limit 1),
    (select 'Cliente' from public.customers where profile_id = auth.uid() and active and deleted_at is null limit 1)
  )
$$;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() = 'Admin', false)
$$;

create function public.can_access_branch(p_branch_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_admin()
    or (
      public.current_role() = 'Personal'
      and p_branch_id = (select primary_branch_id from public.profiles where id = auth.uid() and active and deleted_at is null and blocked = false)
    ),
    false
  )
$$;

create function public.soft_delete_record(p_table text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if p_table not in ('branches', 'service_categories', 'reception_methods', 'services', 'orders') then
    raise exception 'Tabla no soportada: %', p_table;
  end if;

  execute format('update public.%I set deleted_at = now(), deleted_by = auth.uid() where id = $1 and deleted_at is null', p_table)
  using p_id;
end $$;

create function public.normalize_customer_document(p_value text)
returns text
language sql immutable as $$
  select nullif(regexp_replace(lower(trim(coalesce(p_value, ''))), '[\s\.-]', '', 'g'), '')
$$;

create function public.normalize_customer_whatsapp(p_value text)
returns text
language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), 8), '')
$$;

create unique index customers_document_normalized_unique_idx
  on public.customers(public.normalize_customer_document(document_number))
  where deleted_at is null and public.normalize_customer_document(document_number) is not null;

create unique index customers_whatsapp_normalized_unique_idx
  on public.customers(public.normalize_customer_whatsapp(whatsapp))
  where deleted_at is null and public.normalize_customer_whatsapp(whatsapp) is not null;

create function public.customer_identity_status_internal(
  p_document text,
  p_whatsapp text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_document text := public.normalize_customer_document(p_document);
  v_whatsapp text := public.normalize_customer_whatsapp(p_whatsapp);
  v_document_customer public.customers;
  v_whatsapp_customer public.customers;
begin
  if v_whatsapp is null then
    return jsonb_build_object(
      'status', 'missing_required',
      'message', 'WhatsApp es requerido para validar al cliente.'
    );
  end if;

  select * into v_document_customer
  from public.customers
  where deleted_at is null
    and public.normalize_customer_document(document_number) = v_document
  order by created_at asc
  limit 1;

  select * into v_whatsapp_customer
  from public.customers
  where deleted_at is null
    and public.normalize_customer_whatsapp(whatsapp) = v_whatsapp
  order by created_at asc
  limit 1;

  if v_document is null then
    if v_whatsapp_customer.id is null then
      return jsonb_build_object(
        'status', 'new_allowed',
        'message', 'Cliente nuevo permitido.'
      );
    end if;

    return jsonb_build_object(
      'status', 'exact_match',
      'message', 'Cliente existente validado por WhatsApp.',
      'customer_id', v_whatsapp_customer.id,
      'profile_id', v_whatsapp_customer.profile_id,
      'customer_name', v_whatsapp_customer.full_name,
      'document_number', v_whatsapp_customer.document_number,
      'whatsapp', v_whatsapp_customer.whatsapp
    );
  end if;

  if v_document_customer.id is null and v_whatsapp_customer.id is null then
    return jsonb_build_object(
      'status', 'new_allowed',
      'message', 'Cliente nuevo permitido.'
    );
  end if;

  if v_document_customer.id is not null and v_whatsapp_customer.id is not null then
    if v_document_customer.id = v_whatsapp_customer.id then
      return jsonb_build_object(
        'status', 'exact_match',
        'message', 'Cliente existente validado.',
        'customer_id', v_document_customer.id,
        'profile_id', v_document_customer.profile_id,
        'customer_name', v_document_customer.full_name,
        'document_number', v_document_customer.document_number,
        'whatsapp', v_document_customer.whatsapp
      );
    end if;

    return jsonb_build_object(
      'status', 'split_identity_conflict',
      'message', 'El CI y el WhatsApp pertenecen a clientes diferentes. Corrige los datos antes de continuar.',
      'document_customer_id', v_document_customer.id,
      'whatsapp_customer_id', v_whatsapp_customer.id
    );
  end if;

  if v_document_customer.id is not null then
    return jsonb_build_object(
      'status', 'document_conflict',
      'message', 'Este CI ya está registrado con otro WhatsApp. Introduce el WhatsApp registrado o corrige los datos.',
      'customer_id', v_document_customer.id,
      'customer_name', v_document_customer.full_name,
      'registered_whatsapp', v_document_customer.whatsapp
    );
  end if;

  return jsonb_build_object(
    'status', 'whatsapp_conflict',
    'message', 'Este WhatsApp ya está registrado con otro CI. Introduce el CI correcto o corrige los datos.',
    'customer_id', v_whatsapp_customer.id,
    'customer_name', v_whatsapp_customer.full_name,
    'registered_document', v_whatsapp_customer.document_number
  );
end $$;

create function public.customer_identity_status(
  p_document text,
  p_whatsapp text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  v_result := public.customer_identity_status_internal(p_document, p_whatsapp);

  if public.current_role() in ('Admin', 'Personal') then
    return v_result;
  end if;

  if v_result->>'status' = 'missing_required' then
    return jsonb_build_object(
      'status', 'missing_required',
      'message', 'WhatsApp es requerido para validar al cliente.'
    );
  end if;

  return jsonb_build_object(
    'status', 'allowed',
    'message', 'Los datos serán validados al completar el registro.'
  );
end $$;

create function public.ensure_customer(
  p_name text,
  p_document text,
  p_address text,
  p_whatsapp text,
  p_profile_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_status jsonb;
  v_status_code text;
  v_customer_id uuid;
  v_existing_profile_id uuid;
begin
  v_status := public.customer_identity_status_internal(p_document, p_whatsapp);
  v_status_code := v_status->>'status';

  if v_status_code = 'missing_required' then
    raise exception '%', v_status->>'message';
  end if;

  if v_status_code in ('document_conflict', 'whatsapp_conflict', 'split_identity_conflict') then
    raise exception '%', v_status->>'message';
  end if;

  if v_status_code = 'exact_match' then
    v_customer_id := (v_status->>'customer_id')::uuid;

    select profile_id into v_existing_profile_id
    from public.customers
    where id = v_customer_id;

    if p_profile_id is not null and v_existing_profile_id is not null and v_existing_profile_id <> p_profile_id then
      raise exception 'Este cliente ya está vinculado a otra cuenta.';
    end if;

    update public.customers
    set full_name = coalesce(nullif(p_name, ''), full_name),
        document_number = coalesce(nullif(p_document, ''), document_number),
        address = coalesce(nullif(p_address, ''), address),
        whatsapp = coalesce(nullif(p_whatsapp, ''), whatsapp),
        profile_id = coalesce(p_profile_id, profile_id),
        active = case
          when profile_id is null
            or not exists (
              select 1 from public.profiles p
              where p.id = public.customers.profile_id
                and p.active
                and p.deleted_at is null
            )
          then true
          else active
        end
    where id = v_customer_id;

    return v_customer_id;
  end if;

  insert into public.customers(profile_id, full_name, document_number, address, whatsapp)
  values (p_profile_id, p_name, p_document, p_address, p_whatsapp)
  returning id into v_customer_id;

  return v_customer_id;
end $$;

create function public.register_customer_profile(
  p_profile_id uuid,
  p_name text,
  p_document text,
  p_address text,
  p_whatsapp text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_email text;
  v_status jsonb;
begin
  if auth.uid() is null or p_profile_id <> auth.uid() then
    raise exception 'No autorizado para completar este registro.';
  end if;

  select email into v_email from auth.users where id = p_profile_id;

  if exists (
    select 1 from public.profiles
    where id = p_profile_id and active and role in ('Admin', 'Personal') and deleted_at is null
  ) then
    raise exception 'Esta cuenta pertenece al personal y no puede registrarse como cliente.';
  end if;

  select id into v_customer_id
  from public.customers
  where profile_id = p_profile_id
  for update;

  if v_customer_id is not null then
    update public.customers
    set email = v_email,
        full_name = coalesce(nullif(trim(p_name), ''), full_name),
        document_number = nullif(trim(p_document), ''),
        address = nullif(trim(p_address), ''),
        whatsapp = coalesce(nullif(trim(p_whatsapp), ''), whatsapp),
        active = true,
        deleted_at = null,
        deleted_by = null
    where id = v_customer_id;
    return v_customer_id;
  end if;

  v_status := public.customer_identity_status_internal(p_document, p_whatsapp);
  if v_status->>'status' not in ('new_allowed', 'exact_match') then
    raise exception 'Los datos no pudieron validarse. Revisa el CI y WhatsApp o contacta al negocio.';
  end if;
  if v_status->>'status' = 'exact_match'
     and v_status->>'profile_id' is not null
     and (v_status->>'profile_id')::uuid <> p_profile_id then
    raise exception 'Los datos no pudieron validarse. Revisa el CI y WhatsApp o contacta al negocio.';
  end if;

  v_customer_id := public.ensure_customer(p_name, p_document, p_address, p_whatsapp, p_profile_id);
  update public.customers
  set email = v_email, active = true, deleted_at = null, deleted_by = null
  where id = v_customer_id;
  return v_customer_id;
end $$;

create function public.transition_user_role(
  p_auth_user_id uuid,
  p_target_role text,
  p_branch_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_customer public.customers;
  v_profile public.profiles;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el tipo de usuario.';
  end if;
  if p_target_role not in ('Cliente', 'Personal', 'Admin') then
    raise exception 'Rol de destino no válido.';
  end if;
  if p_target_role = 'Personal' and p_branch_id is null then
    raise exception 'Debes asignar una sucursal antes de convertir al cliente en personal.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_auth_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('lavavelox:active-admins', 0));
  select email into v_email from auth.users where id = p_auth_user_id;
  if v_email is null then
    raise exception 'La persona necesita una cuenta de acceso para cambiar de tipo.';
  end if;

  select * into v_customer from public.customers
  where profile_id = p_auth_user_id and deleted_at is null for update;
  select * into v_profile from public.profiles
  where id = p_auth_user_id and deleted_at is null for update;

  if v_profile.role = 'Admin'
     and p_target_role <> 'Admin'
     and (select count(*) from public.profiles where role = 'Admin' and active and deleted_at is null) <= 1 then
    raise exception 'No puedes cambiar el rol del último administrador activo.';
  end if;

  if p_target_role in ('Admin', 'Personal') then
    if v_customer.id is null and v_profile.id is null then
      raise exception 'No se encontraron datos para crear el perfil de personal.';
    end if;
    insert into public.profiles(
      id, email, full_name, document_number, address, whatsapp,
      role, primary_branch_id, blocked, active, deleted_at, deleted_by
    ) values (
      p_auth_user_id, v_email,
      coalesce(v_customer.full_name, v_profile.full_name),
      coalesce(v_customer.document_number, v_profile.document_number),
      coalesce(v_customer.address, v_profile.address),
      coalesce(v_customer.whatsapp, v_profile.whatsapp),
      p_target_role, p_branch_id, false, true, null, null
    )
    on conflict (id) do update set
      email = excluded.email,
      full_name = excluded.full_name,
      document_number = excluded.document_number,
      address = excluded.address,
      whatsapp = excluded.whatsapp,
      role = excluded.role,
      primary_branch_id = excluded.primary_branch_id,
      blocked = false,
      active = true,
      deleted_at = null,
      deleted_by = null;
    update public.customers set active = false where profile_id = p_auth_user_id;
  else
    if v_customer.id is null then
      if v_profile.id is null then
        raise exception 'No se encontraron datos para crear el cliente.';
      end if;
      insert into public.customers(
        profile_id, email, full_name, document_number, address, whatsapp, active
      ) values (
        p_auth_user_id, v_email, v_profile.full_name, v_profile.document_number,
        v_profile.address, v_profile.whatsapp, true
      ) returning * into v_customer;
    else
      update public.customers
      set email = coalesce(email, v_email), active = true, deleted_at = null, deleted_by = null
      where id = v_customer.id;
    end if;
    update public.profiles set active = false where id = p_auth_user_id;
  end if;

  return jsonb_build_object('auth_user_id', p_auth_user_id, 'role', p_target_role);
end $$;

create function public.deactivate_person_record(
  p_table text,
  p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede desactivar personas.';
  end if;
  if p_table not in ('profiles', 'customers') then
    raise exception 'Entidad no soportada: %', p_table;
  end if;

  if p_table = 'profiles' then
    perform pg_advisory_xact_lock(hashtextextended('lavavelox:active-admins', 0));
    select role into v_role
    from public.profiles
    where id = p_id and active and deleted_at is null
    for update;

    if v_role = 'Admin'
       and (select count(*) from public.profiles where role = 'Admin' and active and deleted_at is null) <= 1 then
      raise exception 'No puedes desactivar al último administrador activo.';
    end if;

    update public.profiles set active = false where id = p_id and deleted_at is null;
  else
    update public.customers set active = false where id = p_id and deleted_at is null;
  end if;
end $$;

create function public.reactivate_person_record(
  p_table text,
  p_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_auth_user_id uuid;
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede reactivar personas.';
  end if;
  if p_table not in ('profiles', 'customers') then
    raise exception 'Entidad no soportada: %', p_table;
  end if;

  if p_table = 'profiles' then
    select id, role into v_auth_user_id, v_role
    from public.profiles
    where id = p_id and deleted_at is null
    for update;

    if v_auth_user_id is null or v_role not in ('Admin', 'Personal') then
      raise exception 'El perfil de personal no existe o no es válido.';
    end if;

    update public.profiles set active = true where id = p_id;
    update public.customers set active = false where profile_id = v_auth_user_id and deleted_at is null;
  else
    select profile_id into v_auth_user_id
    from public.customers
    where id = p_id and deleted_at is null
    for update;

    if not found then
      raise exception 'El cliente no existe.';
    end if;

    if v_auth_user_id is not null and exists (
      select 1 from public.profiles
      where id = v_auth_user_id and active and deleted_at is null
    ) then
      raise exception 'Esta cuenta está activa como personal. Cambia su rol desde la sección Personal.';
    end if;

    update public.customers set active = true where id = p_id;
  end if;
end $$;

create function public.bootstrap_first_admin(
  p_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_auth_user_id uuid;
  v_customer public.customers;
begin
  perform pg_advisory_xact_lock(hashtextextended('lavavelox:first-admin', 0));

  if exists (
    select 1 from public.profiles
    where role = 'Admin' and active and deleted_at is null
  ) then
    raise exception 'El primer administrador ya fue creado.';
  end if;

  select id into v_auth_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_auth_user_id is null then
    raise exception 'No existe una cuenta de Auth con ese correo.';
  end if;

  select * into v_customer
  from public.customers
  where profile_id = v_auth_user_id and deleted_at is null
  for update;

  if v_customer.id is null then
    raise exception 'La cuenta debe completar primero su registro como cliente.';
  end if;

  insert into public.profiles(
    id, email, full_name, document_number, address, whatsapp,
    role, primary_branch_id, blocked, active
  ) values (
    v_auth_user_id, trim(p_email), v_customer.full_name,
    v_customer.document_number, v_customer.address, v_customer.whatsapp,
    'Admin', null, false, true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    document_number = excluded.document_number,
    address = excluded.address,
    whatsapp = excluded.whatsapp,
    role = 'Admin',
    primary_branch_id = null,
    blocked = false,
    active = true,
    deleted_at = null,
    deleted_by = null;

  update public.customers set active = false where id = v_customer.id;
  return v_auth_user_id;
end $$;

create function public.upsert_order_with_items(
  p_order_id uuid,
  p_branch_id uuid,
  p_order jsonb,
  p_items jsonb default '[]'::jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.orders;
  v_order public.orders;
  v_customer_id uuid;
  v_customer_profile_id uuid;
  v_status public.order_status;
  v_total numeric(12,2);
  v_velox_total numeric(12,2);
  v_pickup_at timestamptz;
  v_velox_type public.velox_type;
  v_pricing_changed boolean;
  v_velox_unit_surcharge numeric(12,2);
  v_regular_price numeric(12,2);
  v_item_surcharge numeric(12,2);
  v_service_name text;
  v_item jsonb;
begin
  if not public.can_access_branch(p_branch_id) then
    raise exception 'No autorizado para esta sucursal';
  end if;

  select * into v_existing from public.orders where id = p_order_id and deleted_at is null;

  if v_existing.id is null and p_items is null then
    raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_REQUIRED';
  end if;

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_ORDER_ITEMS_PAYLOAD';
  end if;

  if v_existing.id is null and jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_REQUIRED';
  end if;

  v_status := coalesce((p_order->>'status')::public.order_status, v_existing.status, 'Pendiente'::public.order_status);
  v_total := coalesce((p_order->>'total')::numeric, v_existing.total, 0);
  v_pickup_at := coalesce(nullif(p_order->>'pickup_at', '')::timestamptz, v_existing.pickup_at);
  v_pricing_changed := v_existing.id is null or p_order ? 'pickup_at' or p_order ? 'velox_type' or p_order ? 'is_velox';

  if v_existing.id is null and v_pickup_at is null then
    raise exception using errcode = 'P0001', message = 'PICKUP_DATE_REQUIRED';
  end if;

  if (v_existing.id is null or p_order ? 'pickup_at')
     and (v_pickup_at at time zone 'America/La_Paz')::date
       < (now() at time zone 'America/La_Paz')::date then
    raise exception using errcode = 'P0001', message = 'PICKUP_DATE_IN_PAST';
  end if;

  if v_pricing_changed then
    if (v_pickup_at at time zone 'America/La_Paz')::date
       = (now() at time zone 'America/La_Paz')::date then
      v_velox_type := 'same_day'::public.velox_type;
    elsif p_order ? 'velox_type' then
      v_velox_type := nullif(p_order->>'velox_type', '')::public.velox_type;
    elsif p_order ? 'is_velox' then
      v_velox_type := case when coalesce((p_order->>'is_velox')::boolean, false)
        then 'later'::public.velox_type else null end;
    else
      v_velox_type := null;
    end if;

    if v_velox_type = 'same_day'
       and (v_pickup_at at time zone 'America/La_Paz')::date
         <> (now() at time zone 'America/La_Paz')::date then
      raise exception using errcode = 'P0001', message = 'INVALID_VELOX_TYPE_FOR_PICKUP';
    end if;

    if v_existing.id is not null and p_items is null then
      raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_REQUIRED_FOR_PRICING_CHANGE';
    end if;

    select case v_velox_type
      when 'same_day' then velox_same_day_surcharge
      when 'later' then velox_later_surcharge
      else 0
    end
    into v_velox_unit_surcharge
    from public.business_settings
    where id = true;
  else
    v_velox_type := v_existing.velox_type;
    v_velox_unit_surcharge := v_existing.velox_unit_surcharge_snapshot;
  end if;
  v_velox_unit_surcharge := coalesce(v_velox_unit_surcharge, 0);
  v_velox_total := coalesce(v_existing.velox_surcharge_snapshot, 0);

  if p_items is not null then
    if jsonb_array_length(p_items) = 0 then
      raise exception 'La orden debe tener al menos un item.';
    end if;

    if exists (
      select 1 from jsonb_array_elements(p_items) item
      where nullif(item->>'service_id', '') is null
        or coalesce((item->>'quantity')::numeric, 0) <= 0
    ) then
      raise exception using errcode = 'P0001', message = 'INVALID_ORDER_ITEM';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_items) item
      left join public.services s on s.id = (item->>'service_id')::uuid
      where s.id is null or not s.active or s.deleted_at is not null
    ) then
      raise exception using errcode = 'P0001', message = 'SERVICE_NOT_AVAILABLE';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_items) item
      left join public.service_prices sp
        on sp.service_id = (item->>'service_id')::uuid
       and sp.branch_id = p_branch_id
      where sp.service_id is null
    ) then
      raise exception using errcode = 'P0001', message = 'SERVICE_PRICE_MISSING';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_items) item
      join public.service_prices sp
        on sp.service_id = (item->>'service_id')::uuid
       and sp.branch_id = p_branch_id
      where coalesce((item->>'unit_price')::numeric, -1) is distinct from sp.regular_price
         or coalesce((item->>'surcharge')::numeric, -1) is distinct from
            v_velox_unit_surcharge
    ) then
      raise exception using errcode = 'P0001', message = 'SERVICE_PRICE_CHANGED';
    end if;

    select
      coalesce(sum(
        (item->>'quantity')::numeric
        * (sp.regular_price + v_velox_unit_surcharge)
      ), 0),
      coalesce(sum(
        (item->>'quantity')::numeric
        * v_velox_unit_surcharge
      ), 0)
    into v_total, v_velox_total
    from jsonb_array_elements(p_items) item
    join public.service_prices sp
      on sp.service_id = (item->>'service_id')::uuid
     and sp.branch_id = p_branch_id;
  end if;

  if coalesce((p_order->>'discount')::numeric, v_existing.discount, 0)
     + coalesce((p_order->>'reception_payment_amount')::numeric, v_existing.reception_payment_amount, 0)
     + coalesce((p_order->>'delivery_payment_amount')::numeric, v_existing.delivery_payment_amount, 0)
     > v_total then
    raise exception using errcode = 'P0001', message = 'PAYMENT_EXCEEDS_TOTAL';
  end if;

  if public.current_role() = 'Cliente' then
    v_customer_profile_id := auth.uid();
  else
    v_customer_profile_id := null;
  end if;

  v_customer_id := public.ensure_customer(
    coalesce(p_order->>'customer_name', v_existing.customer_name),
    nullif(coalesce(p_order->>'customer_document', v_existing.customer_document), ''),
    nullif(coalesce(p_order->>'customer_address', v_existing.customer_address), ''),
    nullif(coalesce(p_order->>'customer_whatsapp', v_existing.customer_whatsapp), ''),
    v_customer_profile_id
  );

  if v_existing.id is null then
    insert into public.orders (
      id, branch_id, customer_id, customer_name, customer_document,
      customer_address, customer_whatsapp, status, total, discount,
      reception_payment_amount, reception_payment_method, reception_paid_at,
      delivery_payment_amount, delivery_payment_method, delivery_paid_at,
      velox_type, velox_unit_surcharge_snapshot, velox_surcharge_snapshot,
      pickup_at, receiver_name, receiver_document,
      receiver_whatsapp, delivery_notes, delivered_at, delivered_by, created_by
    ) values (
      p_order_id, p_branch_id, v_customer_id, p_order->>'customer_name',
      p_order->>'customer_document', p_order->>'customer_address', p_order->>'customer_whatsapp',
      v_status, v_total,
      coalesce((p_order->>'discount')::numeric, 0),
      coalesce((p_order->>'reception_payment_amount')::numeric, 0),
      nullif(p_order->>'reception_payment_method', '')::public.payment_method,
      case when coalesce((p_order->>'reception_payment_amount')::numeric, 0) > 0 then coalesce(nullif(p_order->>'reception_paid_at', '')::timestamptz, now()) else null end,
      coalesce((p_order->>'delivery_payment_amount')::numeric, 0),
      nullif(p_order->>'delivery_payment_method', '')::public.payment_method,
      case when coalesce((p_order->>'delivery_payment_amount')::numeric, 0) > 0 then coalesce(nullif(p_order->>'delivery_paid_at', '')::timestamptz, now()) else null end,
      v_velox_type,
      v_velox_unit_surcharge,
      v_velox_total,
      v_pickup_at,
      p_order->>'receiver_name',
      p_order->>'receiver_document', p_order->>'receiver_whatsapp', p_order->>'delivery_notes',
      case when v_status = 'Entregado' then coalesce(nullif(p_order->>'delivered_at', '')::timestamptz, now()) else null end,
      case when v_status = 'Entregado' then coalesce(nullif(p_order->>'delivered_by', '')::uuid, auth.uid()) else null end,
      auth.uid()
    )
    returning * into v_order;

    insert into public.order_status_history(order_id, previous_status, new_status, changed_by)
    values (p_order_id, null, v_status, auth.uid());
  else
    update public.orders
    set branch_id = p_branch_id,
        customer_id = v_customer_id,
        customer_name = coalesce(p_order->>'customer_name', customer_name),
        customer_document = coalesce(p_order->>'customer_document', customer_document),
        customer_address = coalesce(p_order->>'customer_address', customer_address),
        customer_whatsapp = coalesce(p_order->>'customer_whatsapp', customer_whatsapp),
        status = v_status,
        total = v_total,
        discount = coalesce((p_order->>'discount')::numeric, discount),
        reception_payment_amount = coalesce((p_order->>'reception_payment_amount')::numeric, reception_payment_amount),
        reception_payment_method = coalesce(nullif(p_order->>'reception_payment_method', '')::public.payment_method, reception_payment_method),
        reception_paid_at = case
          when coalesce((p_order->>'reception_payment_amount')::numeric, reception_payment_amount) > 0
            then coalesce(nullif(p_order->>'reception_paid_at', '')::timestamptz, reception_paid_at, now())
          else null
        end,
        delivery_payment_amount = coalesce((p_order->>'delivery_payment_amount')::numeric, delivery_payment_amount),
        delivery_payment_method = coalesce(nullif(p_order->>'delivery_payment_method', '')::public.payment_method, delivery_payment_method),
        delivery_paid_at = case
          when coalesce((p_order->>'delivery_payment_amount')::numeric, delivery_payment_amount) > 0
            then coalesce(nullif(p_order->>'delivery_paid_at', '')::timestamptz, delivery_paid_at, now())
          else null
        end,
        velox_type = v_velox_type,
        velox_unit_surcharge_snapshot = v_velox_unit_surcharge,
        velox_surcharge_snapshot = v_velox_total,
        pickup_at = v_pickup_at,
        receiver_name = coalesce(p_order->>'receiver_name', receiver_name),
        receiver_document = coalesce(p_order->>'receiver_document', receiver_document),
        receiver_whatsapp = coalesce(p_order->>'receiver_whatsapp', receiver_whatsapp),
        delivery_notes = coalesce(p_order->>'delivery_notes', delivery_notes),
        delivered_at = case when v_status = 'Entregado' and delivered_at is null then coalesce(nullif(p_order->>'delivered_at', '')::timestamptz, now()) else delivered_at end,
        delivered_by = case when v_status = 'Entregado' and delivered_by is null then coalesce(nullif(p_order->>'delivered_by', '')::uuid, auth.uid()) else delivered_by end
    where id = p_order_id
    returning * into v_order;

    if v_existing.status is distinct from v_status then
      insert into public.order_status_history(order_id, previous_status, new_status, changed_by)
      values (p_order_id, v_existing.status, v_status, auth.uid());
    end if;
  end if;

  if p_items is not null then
    delete from public.order_items where order_id = p_order_id;
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      select
        s.name,
        sp.regular_price
      into v_service_name, v_regular_price
      from public.services s
      join public.service_prices sp
        on sp.service_id = s.id
       and sp.branch_id = p_branch_id
      where s.id = (v_item->>'service_id')::uuid;
      v_item_surcharge := v_velox_unit_surcharge;

      insert into public.order_items(order_id, service_id, service_name, quantity, unit_price, surcharge, observation)
      values (
        p_order_id,
        nullif(v_item->>'service_id', '')::uuid,
        v_service_name,
        (v_item->>'quantity')::numeric,
        v_regular_price,
        v_item_surcharge,
        v_item->>'observation'
      );
    end loop;
  end if;

  return v_order;
end $$;

alter table public.app_roles enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.business_settings enable row level security;
alter table public.service_categories enable row level security;
alter table public.reception_methods enable row level security;
alter table public.services enable row level security;
alter table public.service_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy roles_read on public.app_roles for select to authenticated using (true);
create policy roles_admin on public.app_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy branches_read on public.branches for select to authenticated using (deleted_at is null);
create policy branches_admin on public.branches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_read on public.profiles for select to authenticated
  using (
    deleted_at is null
    and (
      public.is_admin()
      or (active and id = auth.uid())
    )
  );
create policy profiles_admin_insert on public.profiles for insert to authenticated with check (public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy customers_read on public.customers for select to authenticated
  using (deleted_at is null and (public.is_admin() or public.current_role() = 'Personal' or (profile_id = auth.uid() and active)));
create policy customers_admin_update on public.customers for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy settings_read on public.business_settings for select to authenticated using (true);
create policy settings_admin on public.business_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_read on public.service_categories for select to authenticated using (active and deleted_at is null or public.is_admin());
create policy categories_admin on public.service_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reception_read on public.reception_methods for select to authenticated using (active and deleted_at is null or public.is_admin());
create policy reception_admin on public.reception_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy services_read on public.services for select to authenticated using (deleted_at is null and (active or public.is_admin()));
create policy services_admin on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prices_read on public.service_prices for select to authenticated
  using (
    public.is_admin()
    or public.current_role() = 'Cliente'
    or public.can_access_branch(branch_id)
  );
create policy prices_admin on public.service_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy orders_read on public.orders for select to authenticated
  using (
    deleted_at is null
    and (
      public.can_access_branch(branch_id)
      or exists (
        select 1
        from public.customers c
        where c.id = customer_id
          and c.profile_id = auth.uid()
          and c.active
          and c.deleted_at is null
      )
    )
  );
create policy orders_insert on public.orders for insert to authenticated with check (created_by = auth.uid() and public.can_access_branch(branch_id));
create policy orders_update on public.orders for update to authenticated using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy orders_delete_admin on public.orders for delete to authenticated using (public.is_admin());

create policy items_read on public.order_items for select to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and o.deleted_at is null));
create policy items_write on public.order_items for all to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and public.can_access_branch(o.branch_id)))
  with check (exists(select 1 from public.orders o where o.id = order_id and public.can_access_branch(o.branch_id)));

create policy history_read on public.order_status_history for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      left join public.customers c on c.id = o.customer_id
      where o.id = order_id
        and (
          public.can_access_branch(o.branch_id)
          or (c.profile_id = auth.uid() and c.active and c.deleted_at is null)
        )
    )
  );
create policy history_write on public.order_status_history for insert to authenticated
  with check (exists(select 1 from public.orders o where o.id = order_id and public.can_access_branch(o.branch_id)));

create function public.update_customer_and_upsert_order(
  p_order_id uuid,
  p_branch_id uuid,
  p_order jsonb,
  p_items jsonb,
  p_customer_id uuid,
  p_original_document text,
  p_original_whatsapp text
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_customer public.customers;
  v_order public.orders;
begin
  if not public.can_access_branch(p_branch_id) then
    raise exception 'No autorizado para esta sucursal';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id and active and deleted_at is null
  for update;

  if v_customer.id is null then
    raise exception 'El cliente seleccionado ya no está activo.';
  end if;

  if public.normalize_customer_document(v_customer.document_number)
       is distinct from public.normalize_customer_document(p_original_document)
     or public.normalize_customer_whatsapp(v_customer.whatsapp)
       is distinct from public.normalize_customer_whatsapp(p_original_whatsapp) then
    raise exception 'Los datos del cliente cambiaron. Vuelve a seleccionarlo antes de registrar la orden.';
  end if;

  update public.customers
  set full_name = coalesce(nullif(trim(p_order->>'customer_name'), ''), full_name),
      document_number = nullif(trim(p_order->>'customer_document'), ''),
      address = nullif(trim(p_order->>'customer_address'), ''),
      whatsapp = coalesce(nullif(trim(p_order->>'customer_whatsapp'), ''), whatsapp)
  where id = p_customer_id;

  v_order := public.upsert_order_with_items(p_order_id, p_branch_id, p_order, p_items);
  return v_order;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_access_branch(uuid) to authenticated;
grant execute on function public.soft_delete_record(text, uuid) to authenticated;
grant execute on function public.normalize_customer_document(text) to authenticated;
grant execute on function public.normalize_customer_whatsapp(text) to authenticated;
grant execute on function public.customer_identity_status(text, text) to authenticated;
grant execute on function public.register_customer_profile(uuid, text, text, text, text) to authenticated;
grant execute on function public.transition_user_role(uuid, text, uuid) to authenticated;
grant execute on function public.deactivate_person_record(text, uuid) to authenticated;
grant execute on function public.reactivate_person_record(text, uuid) to authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
grant execute on function public.upsert_order_with_items(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_customer_and_upsert_order(uuid, uuid, jsonb, jsonb, uuid, text, text) to authenticated;

revoke insert, update, delete on public.orders from authenticated;
revoke insert, update, delete on public.order_items from authenticated;
revoke insert, update, delete on public.order_status_history from authenticated;

insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true) on conflict (id) do nothing;
create policy assets_read on storage.objects for select using (bucket_id = 'public-assets');
create policy assets_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'public-assets' and public.is_admin());
create policy assets_admin_update on storage.objects for update to authenticated using (bucket_id = 'public-assets' and public.is_admin());
create policy assets_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'public-assets' and public.is_admin());

alter publication supabase_realtime add table
  public.profiles,
  public.customers,
  public.branches,
  public.business_settings,
  public.service_categories,
  public.reception_methods,
  public.services,
  public.service_prices,
  public.orders,
  public.order_items,
  public.order_status_history;

commit;
