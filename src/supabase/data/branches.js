import { supabase } from '../client'
import { insertOrUpdate, softDelete, subscribeToTable } from './core'

const TABLE = 'branches'

export function branchToLegacy(row) {
  if (!row) return null
  return { uuid: row.id, nombre: row.name, direccion: row.address, whatsapp: row.whatsapp, ciudad: row.city }
}

export async function selectBranches(id) {
  let query = supabase.from(TABLE).select('*').is('deleted_at', null)
  if (id) query = query.eq('id', id).maybeSingle()
  const { data, error } = await query
  if (error) throw error
  return id ? branchToLegacy(data) : Object.fromEntries((data || []).map(row => [row.id, branchToLegacy(row)]))
}

export function subscribeBranches(setBranches, callback) {
  return subscribeToTable(TABLE, async active => {
    try {
      const value = await selectBranches()
      if (active) setBranches?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export async function saveBranch(id, value, callback) {
  const row = { name: value.nombre, address: value.direccion, whatsapp: value.whatsapp, city: value.ciudad }
  Object.keys(row).forEach(key => row[key] === undefined && delete row[key])
  await insertOrUpdate(TABLE, id, row)
  callback?.(value)
  return value
}

export async function removeBranch(id, callback) {
  await softDelete(TABLE, id)
  callback?.()
}
