import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const schema = readFileSync(new URL('../supabase/migrations/001_initial.sql', import.meta.url), 'utf8')
const splitVeloxMigration = readFileSync(new URL('../supabase/migrations/002_split_velox_surcharges.sql', import.meta.url), 'utf8')
const personalPage = readFileSync(new URL('../src/app/(with-auth)/Personal/page.jsx', import.meta.url), 'utf8')
const receptionPage = readFileSync(new URL('../src/app/(with-auth)/page.jsx', import.meta.url), 'utf8')
const hardening = readFileSync(new URL('../supabase/harden_personal_permissions.sql', import.meta.url), 'utf8')

test('canonical schema links customer accounts directly to Supabase Auth', () => {
  assert.match(
    schema,
    /profile_id uuid unique references auth\.users\(id\) on delete set null/
  )
})

test('person lifecycle uses reversible activation RPCs', () => {
  assert.match(schema, /create function public\.deactivate_person_record/)
  assert.match(schema, /create function public\.reactivate_person_record/)
  assert.match(schema, /No puedes desactivar al último administrador activo/)
  assert.match(schema, /No puedes cambiar el rol del último administrador activo/)
})

test('first-admin bootstrap is not exposed to authenticated users', () => {
  assert.match(schema, /grant execute on function public\.bootstrap_first_admin\(text\) to service_role/)
  assert.doesNotMatch(
    schema,
    /grant execute on function public\.bootstrap_first_admin\(text\) to authenticated/
  )
})

test('internal customer identity details are not exposed', () => {
  assert.match(schema, /create function public\.customer_identity_status_internal/)
  assert.doesNotMatch(
    schema,
    /grant execute on function public\.customer_identity_status_internal\(text, text\) to authenticated/
  )
})

test('new orders require a non-empty item collection', () => {
  assert.match(schema, /v_existing\.id is null and p_items is null/)
  assert.match(schema, /v_existing\.id is null and jsonb_array_length\(p_items\) = 0/)
  assert.match(schema, /message = 'ORDER_ITEMS_REQUIRED'/)
})

test('Velox migration defines the final RPC explicitly and enforces pricing rules', () => {
  assert.match(splitVeloxMigration, /create or replace function public\.upsert_order_with_items/)
  assert.match(splitVeloxMigration, /velox_same_day_surcharge/)
  assert.match(splitVeloxMigration, /velox_later_surcharge/)
  assert.match(splitVeloxMigration, /velox_unit_surcharge_snapshot/)
  assert.match(splitVeloxMigration, /PICKUP_DATE_IN_PAST/)
  assert.match(splitVeloxMigration, /ORDER_ITEMS_REQUIRED_FOR_PRICING_CHANGE/)
  assert.match(splitVeloxMigration, /::time <= time '12:00'/)
  assert.doesNotMatch(splitVeloxMigration, /pg_get_functiondef|regexp_replace\(v_definition/)
})

test('canonical Velox schema stores an immutable type and unit-price snapshot', () => {
  assert.match(schema, /create type public\.velox_type as enum \('same_day', 'later'\)/)
  assert.match(schema, /velox_type public\.velox_type/)
  assert.match(schema, /velox_unit_surcharge_snapshot numeric/)
  assert.doesNotMatch(schema, /^\s*is_velox boolean/m)
  assert.doesNotMatch(schema, /^\s*velox_surcharge numeric/m)
})

test('Personal page contains no call to an undefined redirect helper', () => {
  assert.doesNotMatch(personalPage, /\bredirect\s*\(/)
})

test('mobile reception keeps the catalog separate from the order workflow', () => {
  assert.match(receptionPage, /const isCatalogStep = currentHash === '' \|\| currentHash === '#'/)
  assert.match(receptionPage, /const isServicesStep = currentHash === '#Services'/)
  assert.match(receptionPage, /const isServicesView = isCatalogStep \|\| isServicesStep/)
  assert.match(receptionPage, /!isCustomer && isCatalogStep/)
  assert.match(receptionPage, /window\.history\.pushState\(null, '', window\.location\.pathname\)/)
  assert.match(receptionPage, /href='#Services' className=\{stepLinkClass\(isServicesView\)\}/)
  assert.doesNotMatch(receptionPage, /Volver a servicios|Volver al cliente/)
})

test('personal cannot mutate customers directly or read other staff profiles', () => {
  assert.match(schema, /create policy customers_admin_update/)
  assert.doesNotMatch(schema, /create policy customers_staff_update/)
  assert.match(schema, /or \(active and id = auth\.uid\(\)\)/)
  assert.match(hardening, /drop policy if exists customers_staff_update/)
  assert.match(hardening, /create policy customers_admin_update/)
})
