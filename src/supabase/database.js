import { supabase } from './client'
import {
  branchesData,
  customersData,
  ordersData,
  servicesData,
  settingsData,
  splitPath,
  cleanPath
} from './data'
import { subscribeToTable } from './data/core'

function normalizeCollection(collection) {
  return ({
    users: 'usuarios',
    user: 'usuarios',
    clientes: 'usuarios',
    customers: 'usuarios',
    branches: 'sucursales',
    servicios: 'servicios',
    services: 'servicios',
    settings: 'perfil',
    orders: 'tareas'
  })[collection] || collection
}

function tableFor(collection) {
  return ({
    usuarios: 'profiles',
    sucursales: 'branches',
    servicios: 'services',
    perfil: 'business_settings',
    tareas: 'orders',
    producto: null
  })[normalizeCollection(collection)]
}

async function selectCollection(collection, id) {
  const normalized = normalizeCollection(collection)

  if (normalized === 'usuarios') return customersData.selectProfilesAndCustomers(id)
  if (normalized === 'sucursales') return branchesData.selectBranches(id)
  if (normalized === 'servicios') return servicesData.selectServices(id)
  if (normalized === 'perfil') return settingsData.selectSettings()
  if (normalized === 'tareas') return ordersData.selectOrders(id)
  if (normalized === 'producto') return {}

  throw new Error(`Coleccion no soportada: ${collection}`)
}

async function fetchPath(path) {
  const [collection, first, second] = splitPath(path)
  return selectCollection(collection, second || first)
}

function readUserData(path, setData, callback) {
  const [collection] = splitPath(path)
  const table = tableFor(collection)

  return subscribeToTable(table, async active => {
    try {
      const value = await fetchPath(path)
      if (active) setData?.(value)
      callback?.(value)
      return value
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
      return null
    }
  })
}

async function readUserDataOnce(path, setData, callback) {
  try {
    const value = await fetchPath(path)
    setData?.(value)
    callback?.(value)
    return value
  } catch (error) {
    console.error('Error leyendo Supabase:', error)
    callback?.(null, error)
    return null
  }
}

async function writeUserData(path, value, callback) {
  const [collection, first, second] = splitPath(path)
  const normalized = normalizeCollection(collection)
  const id = second || first

  if (normalized === 'usuarios') return customersData.upsertProfileOrCustomer(id, value, callback)
  if (normalized === 'sucursales') return branchesData.saveBranch(id, value, callback)
  if (normalized === 'servicios') return servicesData.upsertService(id, value, callback)
  if (normalized === 'perfil') return settingsData.upsertSettings(value, callback)
  if (normalized === 'tareas') return ordersData.upsertOrder(id, value, second ? first : undefined, callback)
  if (normalized === 'producto') return {}

  throw new Error(`Coleccion no soportada: ${collection}`)
}

async function removeData(path, setUserSuccess, callback) {
  if (typeof setUserSuccess === 'string') {
    path = `${cleanPath(path)}/${setUserSuccess}`
    setUserSuccess = undefined
  }
  if (typeof setUserSuccess === 'function' && callback === undefined) {
    callback = setUserSuccess
    setUserSuccess = undefined
  }

  try {
    const [collection, first, second] = splitPath(path)
    const normalized = normalizeCollection(collection)
    const id = second || first

    if (normalized === 'usuarios') return customersData.removeProfileOrCustomer(id, callback)
    if (normalized === 'sucursales') return branchesData.removeBranch(id, callback)
    if (normalized === 'servicios') return servicesData.removeService(id, callback)
    if (normalized === 'tareas') return ordersData.removeOrder(id, callback)
    if (normalized === 'producto') {
      callback?.()
      return undefined
    }

    throw new Error('Ruta de borrado invalida')
  } catch (error) {
    setUserSuccess?.('repeat')
    throw error
  }
}

async function readUserDataLength(path, callback) {
  const [collection, first] = splitPath(path)
  const normalized = normalizeCollection(collection)

  if (normalized === 'tareas') return ordersData.countOrdersByBranch(first, callback)

  const table = tableFor(normalized)
  if (!table) {
    callback?.(0)
    return 0
  }

  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (['usuarios', 'sucursales', 'servicios'].includes(normalized)) query = query.is('deleted_at', null)

  const { count, error } = await query
  if (error) throw error
  callback?.(count || 0)
  return count || 0
}

async function getSpecificData(path, setData, callback) {
  const value = await fetchPath(path)
  setData?.(value)
  callback?.()
  return value
}

async function getSpecificDataEq(path, child, expected, setData, callback) {
  const value = await fetchPath(path)
  const filtered = Object.fromEntries(Object.entries(value || {}).filter(([, row]) => row?.[child] === expected))
  setData?.(filtered)
  callback?.()
  return filtered
}

export { readUserData, readUserDataOnce, readUserDataLength, removeData, getSpecificData, getSpecificDataEq, writeUserData }
