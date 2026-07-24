import { supabase } from '../client'

export const cleanPath = (path = '') => path.replace(/^\/+|\/+$/g, '').toLowerCase()
export const splitPath = path => cleanPath(path).split('/').filter(Boolean)
export const number = value => Number(value || 0)
export const nonEmpty = value => value === undefined || value === null || value === '' ? null : value

export function asError(error, operation) {
  if (error instanceof Error) return error
  const message = error?.message || error?.details || error?.hint || `${operation} fallo en Supabase`
  const normalized = new Error(message)
  normalized.name = error?.name || 'SupabaseError'
  normalized.code = error?.code
  normalized.details = error?.details
  normalized.hint = error?.hint
  return normalized
}

export async function insertOrUpdate(table, id, row) {
  const { data: existing, error: checkError } = await supabase.from(table).select('id').eq('id', id).maybeSingle()
  if (checkError) throw asError(checkError, `Lectura de ${table}`)

  const query = existing
    ? supabase.from(table).update(row).eq('id', id)
    : supabase.from(table).insert({ id, ...row })
  const { error } = await query
  if (error) throw asError(error, `Escritura en ${table}`)
}

export async function ensureNamedRow(table, name) {
  if (!name) return null
  const cleanName = String(name).trim()
  if (!cleanName) return null

  const { data: existing, error: readError } = await supabase
    .from(table)
    .select('id')
    .eq('name', cleanName)
    .maybeSingle()
  if (readError) throw readError
  if (existing) return existing.id

  const { data, error } = await supabase.from(table).insert({ name: cleanName }).select('id').single()
  if (error) throw error
  return data.id
}

export function subscribeToTables(tables, load) {
  let active = true

  load(active)
  const tableNames = [...new Set((tables || []).filter(Boolean))]
  if (!tableNames.length || typeof crypto === 'undefined' || !crypto.randomUUID) return () => { active = false }

  const channels = tableNames.map(table => supabase.channel(`${table}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => load(active))
      .subscribe())

  return () => {
    active = false
    channels.forEach(channel => supabase.removeChannel(channel))
  }
}

export function subscribeToTable(table, load) {
  return subscribeToTables([table], load)
}

export async function softDelete(table, id) {
  const { error } = await supabase.rpc('soft_delete_record', { p_table: table, p_id: id })
  if (error) throw error
}
