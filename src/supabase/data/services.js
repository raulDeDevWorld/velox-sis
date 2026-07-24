import { supabase } from '../client'
import { ensureNamedRow, insertOrUpdate, number, softDelete, subscribeToTables } from './core'

const TABLE = 'services'
const SELECT = '*,service_prices(*),service_categories(name),reception_methods(name)'

export function serviceToLegacy(row) {
  if (!row) return null
  const costs = {}
  for (const price of row.service_prices || []) {
    costs[`costo 24 hrs ${price.branch_id}`] = price.regular_price
    costs[`costo inmediato ${price.branch_id}`] = price.immediate_price
  }
  return {
    uuid: row.id, 'nombre 1': row.name,
    'nombre 2': row.alternate_name_1, 'nombre 3': row.alternate_name_2,
    'descripcion basica': row.description || '',
    categoria: row.service_categories?.name || '',
    'recepcion por': row.reception_methods?.name || '',
    url: row.image_url, activo: row.active, 'costos y entregas': costs
  }
}

export async function selectServices(id) {
  let query = supabase
    .from(TABLE)
    .select(SELECT)
    .is('deleted_at', null)
  if (id) query = query.eq('id', id).maybeSingle()
  const { data, error } = await query
  if (error) throw error
  return id ? serviceToLegacy(data) : Object.fromEntries((data || []).map(row => [row.id, serviceToLegacy(row)]))
}

export function subscribeServices(setServices, callback) {
  return subscribeToTables([TABLE, 'service_prices', 'service_categories', 'reception_methods'], async active => {
    try {
      const value = await selectServices()
      if (active) setServices?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export async function upsertService(id, value, callback) {
  const categoryId = await ensureNamedRow('service_categories', value.categoria)
  const receptionMethodId = await ensureNamedRow('reception_methods', value['recepcion por'])
  const row = {
    name: value['nombre 1'],
    alternate_name_1: value['nombre 2'],
    alternate_name_2: value['nombre 3'],
    description: value['descripcion basica'],
    category_id: categoryId,
    reception_method_id: receptionMethodId,
    image_url: value.url,
    active: value.activo
  }
  Object.keys(row).forEach(key => row[key] === undefined && delete row[key])
  await insertOrUpdate(TABLE, id, row)

  const costs = value['costos y entregas'] || {}
  const branchIds = new Set(Object.keys(costs).map(key => key.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)?.[0]).filter(Boolean))
  for (const branchId of branchIds) {
    const { error: priceError } = await supabase.from('service_prices').upsert({
      service_id: id, branch_id: branchId,
      regular_price: number(costs[`costo 24 hrs ${branchId}`]),
      immediate_price: number(costs[`costo inmediato ${branchId}`])
    })
    if (priceError) throw priceError
  }

  callback?.(value)
  return value
}

export async function removeService(id, callback) {
  await softDelete(TABLE, id)
  callback?.()
}
