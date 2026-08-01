-- Modelo Velox persistente: tipo, tarifa unitaria y total históricos.
begin;

do $$ begin
  create type public.velox_type as enum ('same_day', 'later');
exception
  when duplicate_object then null;
end $$;

alter table public.business_settings
  add column if not exists velox_same_day_surcharge numeric(12,2) not null default 0
    check (velox_same_day_surcharge >= 0),
  add column if not exists velox_later_surcharge numeric(12,2) not null default 0
    check (velox_later_surcharge >= 0);

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_settings'
      and column_name = 'velox_surcharge'
  ) then
    execute $sql$
      update public.business_settings
      set velox_same_day_surcharge = velox_surcharge,
          velox_later_surcharge = velox_surcharge
      where velox_same_day_surcharge = 0
        and velox_later_surcharge = 0
        and velox_surcharge <> 0
    $sql$;
  end if;
end $$;

alter table public.orders
  add column if not exists velox_type public.velox_type,
  add column if not exists velox_unit_surcharge_snapshot numeric(12,2) not null default 0
    check (velox_unit_surcharge_snapshot >= 0);

-- Clasifica pedidos históricos según la fecha de recepción y conserva la tarifa
-- unitaria que ya quedó registrada en sus ítems.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'is_velox'
  ) then
    execute $sql$
      update public.orders o
      set velox_type = case
            when (o.pickup_at at time zone 'America/La_Paz')::date
               = (o.created_at at time zone 'America/La_Paz')::date
              then 'same_day'::public.velox_type
            else 'later'::public.velox_type
          end,
          velox_unit_surcharge_snapshot = coalesce(
            (select max(oi.surcharge) from public.order_items oi where oi.order_id = o.id),
            0
          )
      where o.is_velox and o.velox_type is null
    $sql$;
  end if;
end $$;

create or replace function public.upsert_order_with_items(
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
    elsif (v_pickup_at at time zone 'America/La_Paz')::date
          = (now() at time zone 'America/La_Paz')::date + 1
       and (v_pickup_at at time zone 'America/La_Paz')::time <= time '12:00' then
      v_velox_type := 'later'::public.velox_type;
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
         or coalesce((item->>'surcharge')::numeric, -1) is distinct from v_velox_unit_surcharge
    ) then
      raise exception using errcode = 'P0001', message = 'SERVICE_PRICE_CHANGED';
    end if;

    select
      coalesce(sum((item->>'quantity')::numeric * (sp.regular_price + v_velox_unit_surcharge)), 0),
      coalesce(sum((item->>'quantity')::numeric * v_velox_unit_surcharge), 0)
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
      v_velox_type, v_velox_unit_surcharge, v_velox_total, v_pickup_at,
      p_order->>'receiver_name', p_order->>'receiver_document',
      p_order->>'receiver_whatsapp', p_order->>'delivery_notes',
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
      select s.name, sp.regular_price
      into v_service_name, v_regular_price
      from public.services s
      join public.service_prices sp
        on sp.service_id = s.id and sp.branch_id = p_branch_id
      where s.id = (v_item->>'service_id')::uuid;

      v_item_surcharge := v_velox_unit_surcharge;
      insert into public.order_items(order_id, service_id, service_name, quantity, unit_price, surcharge, observation)
      values (
        p_order_id, nullif(v_item->>'service_id', '')::uuid, v_service_name,
        (v_item->>'quantity')::numeric, v_regular_price, v_item_surcharge,
        v_item->>'observation'
      );
    end loop;
  end if;

  return v_order;
end $$;

alter table public.orders drop column if exists is_velox;
alter table public.business_settings drop column if exists velox_surcharge;

commit;
