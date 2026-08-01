import { supabase } from '../client'
import { subscribeToTables } from './core'

const TABLE = 'business_settings'
const CATALOG_TABLES = {
  categories: 'service_categories',
  receptionMethods: 'reception_methods'
}

const catalogTable = (kind) => {
  const table = CATALOG_TABLES[kind]
  if (!table) throw new Error(`Catálogo no soportado: ${kind}`)
  return table
}

export function settingsToLegacy(settings, categories = [], receptionMethods = []) {
  return {
    whatsapp: settings?.whatsapp || '',
    categoria: categories.map(row => row.name),
    'recepcion por': receptionMethods.map(row => row.name),
    adicionalDia: settings?.velox_same_day_surcharge || 0,
    adicionalPosterior: settings?.velox_later_surcharge ?? 0,
    url: settings?.qr_image_url || ''
  }
}

export async function selectSettings() {
  const [{ data: settings, error: settingsError }, { data: categories, error: categoriesError }, { data: reception, error: receptionError }] = await Promise.all([
    supabase.from(TABLE).select('*').eq('id', true).maybeSingle(),
    supabase.from('service_categories').select('name').is('deleted_at', null).eq('active', true).order('sort_order').order('name'),
    supabase.from('reception_methods').select('name').is('deleted_at', null).eq('active', true).order('sort_order').order('name')
  ])
  if (settingsError) throw settingsError
  if (categoriesError) throw categoriesError
  if (receptionError) throw receptionError
  return settingsToLegacy(settings, categories, reception)
}

export async function selectCatalog() {
  const [{ data: categories, error: categoriesError }, { data: receptionMethods, error: receptionError }] = await Promise.all([
    supabase.from('service_categories').select('*').is('deleted_at', null).order('sort_order').order('name'),
    supabase.from('reception_methods').select('*').is('deleted_at', null).order('sort_order').order('name')
  ])
  if (categoriesError) throw categoriesError
  if (receptionError) throw receptionError

  return {
    categories: categories || [],
    receptionMethods: receptionMethods || []
  }
}

export function subscribeSettings(setSettings, callback) {
  return subscribeToTables([TABLE, 'service_categories', 'reception_methods'], async active => {
    try {
      const value = await selectSettings()
      if (active) setSettings?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export async function upsertSettings(value, callback) {
  const row = {
    id: true,
    whatsapp: value.whatsapp,
    velox_same_day_surcharge: value.adicionalDia,
    velox_later_surcharge: value.adicionalPosterior,
    qr_image_url: value.url
  }
  Object.keys(row).forEach(key => row[key] === undefined && delete row[key])
  const { error } = await supabase.from(TABLE).upsert(row)
  if (error) throw error

  callback?.(value)
  return value
}

export async function upsertCatalogItem(kind, item) {
  const table = catalogTable(kind)
  const name = String(item.name || '').trim()
  if (!name) throw new Error('El nombre es requerido.')

  const row = {
    name,
    active: item.active !== false,
    deleted_at: null,
    deleted_by: null
  }
  if (item.sort_order !== undefined) row.sort_order = Number(item.sort_order || 0)

  if (item.id) {
    const { error } = await supabase.from(table).update(row).eq('id', item.id)
    if (error) throw error
    return { ...item, ...row }
  }

  const { data: existing, error: readError } = await supabase
    .from(table)
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (readError) throw readError

  const query = existing
    ? supabase.from(table).update(row).eq('id', existing.id).select('*').single()
    : supabase.from(table).insert(row).select('*').single()

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function toggleCatalogItem(kind, id, active) {
  const table = catalogTable(kind)
  const { data, error } = await supabase
    .from(table)
    .update({ active: Boolean(active) })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}
