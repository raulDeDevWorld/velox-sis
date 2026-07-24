import { supabase } from '../client'
import { insertOrUpdate, subscribeToTables } from './core'

const PROFILES_TABLE = 'profiles'
const CUSTOMERS_TABLE = 'customers'
const PROFILE_SELECT = '*,branches:primary_branch_id(name)'

export function profileToLegacy(row) {
  if (!row) return null
  return {
    uuid: row.id, uid: row.id, nombre: row.full_name, email: row.email, CI: row.document_number,
    direccion: row.address, whatsapp: row.whatsapp, rol: row.role,
    bloqueado: row.blocked, activo: row.active, sucursal: row.branches?.name || 'No asignado',
    'sucursal uuid': row.primary_branch_id
  }
}

export function customerToLegacy(row) {
  if (!row) return null
  return {
    uuid: row.id, uid: row.profile_id || row.id, authUserId: row.profile_id, nombre: row.full_name, email: row.email, CI: row.document_number,
    direccion: row.address, whatsapp: row.whatsapp, rol: 'Cliente',
    bloqueado: false, activo: row.active, sucursal: 'No asignado', 'sucursal uuid': null
  }
}

function mergeProfilesAndCustomers(profiles = [], customers = []) {
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]))
  const linkedProfileIds = new Set(
    customers.map(customer => customer.profile_id).filter(Boolean)
  )
  const visibleProfiles = profiles.filter(profile =>
    profile.role !== 'Cliente' || !linkedProfileIds.has(profile.id)
  )

  return {
    ...Object.fromEntries(customers.map(row => {
      const linkedProfile = profilesById.get(row.profile_id)
      const canonicalCustomer = {
        ...row,
        email: row.email || linkedProfile?.email || null
      }
      return [row.id, customerToLegacy(canonicalCustomer)]
    })),
    ...Object.fromEntries(visibleProfiles.map(row => [row.id, profileToLegacy(row)]))
  }
}

export async function selectProfilesAndCustomers(id) {
  if (id) {
    const { data: profile, error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .select(PROFILE_SELECT)
      .eq('id', id)
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (profileError) throw profileError
    if (profile) return profileToLegacy(profile)

    const { data: customer, error: customerError } = await supabase
      .from(CUSTOMERS_TABLE)
      .select('*')
      .eq('profile_id', id)
      .eq('active', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (customerError) throw customerError
    return customerToLegacy(customer)
  }

  const [{ data: profiles, error: profilesError }, { data: customers, error: customersError }] = await Promise.all([
    supabase.from(PROFILES_TABLE).select(PROFILE_SELECT).eq('active', true).is('deleted_at', null),
    supabase.from(CUSTOMERS_TABLE).select('*').eq('active', true).is('deleted_at', null)
  ])
  if (profilesError) throw profilesError
  if (customersError) throw customersError

  return mergeProfilesAndCustomers(profiles, customers)
}

export async function selectInactivePeople(type) {
  if (type === 'customers') {
    const { data, error } = await supabase
      .from(CUSTOMERS_TABLE)
      .select('*')
      .eq('active', false)
      .is('deleted_at', null)
      .order('full_name')
    if (error) throw error
    return (data || []).map(customerToLegacy)
  }

  if (type === 'profiles') {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select(PROFILE_SELECT)
      .eq('active', false)
      .in('role', ['Admin', 'Personal'])
      .is('deleted_at', null)
      .order('full_name')
    if (error) throw error
    return (data || []).map(profileToLegacy)
  }

  throw new Error('Tipo de persona no soportado.')
}

export function subscribeProfilesAndCustomers(setCustomers, callback) {
  return subscribeToTables([PROFILES_TABLE, CUSTOMERS_TABLE], async active => {
    try {
      const value = await selectProfilesAndCustomers()
      if (active) setCustomers?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export function subscribeProfileOrCustomer(id, setCustomer, callback) {
  return subscribeToTables([PROFILES_TABLE, CUSTOMERS_TABLE], async active => {
    try {
      const value = await selectProfilesAndCustomers(id)
      if (active) setCustomer?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export async function upsertProfileOrCustomer(id, value, callback) {
  const [
    { data: existingCustomer, error: customerError },
    { data: existingProfile, error: profileError }
  ] = await Promise.all([
    supabase.from(CUSTOMERS_TABLE).select('id,profile_id,document_number,whatsapp').eq('id', id).maybeSingle(),
    supabase.from(PROFILES_TABLE).select('id,role').eq('id', id).maybeSingle()
  ])
  if (customerError) throw customerError
  if (profileError) throw profileError

  if (existingProfile && value?.rol && value.rol !== existingProfile.role) {
    const { error } = await supabase.rpc('transition_user_role', {
      p_auth_user_id: id,
      p_target_role: value.rol,
      p_branch_id: value['sucursal uuid'] || null
    })
    if (error) throw error
    callback?.(value)
    return value
  }

  if (existingCustomer) {
    if (value?.rol && value.rol !== 'Cliente') {
      if (!existingCustomer.profile_id) {
        throw new Error('Este cliente necesita una cuenta registrada antes de convertirse en personal.')
      }
      const { error } = await supabase.rpc('transition_user_role', {
        p_auth_user_id: existingCustomer.profile_id,
        p_target_role: value.rol,
        p_branch_id: value['sucursal uuid'] || null
      })
      if (error) throw error
      callback?.(value)
      return value
    }

    if ('CI' in value || 'whatsapp' in value) {
      const identity = await validateCustomerIdentity(value.CI ?? existingCustomer.document_number, value.whatsapp ?? existingCustomer.whatsapp)
      if (identity?.status === 'exact_match' && identity.customer_id && identity.customer_id !== id) {
        throw new Error('Estos datos pertenecen a otro cliente.')
      }
      if (!['new_allowed', 'exact_match'].includes(identity?.status)) {
        throw new Error(identity?.message || 'CI y WhatsApp no son consistentes.')
      }
    }

    const row = {
      full_name: value.nombre,
      document_number: value.CI,
      address: value.direccion,
      whatsapp: value.whatsapp
    }
    Object.keys(row).forEach(key => row[key] === undefined && delete row[key])
    await insertOrUpdate(CUSTOMERS_TABLE, id, row)
    callback?.(value)
    return value
  }

  if (value?.rol === 'Cliente') {
    const { data, error } = await supabase.rpc('register_customer_profile', {
      p_profile_id: id,
      p_name: value.nombre,
      p_document: value.CI,
      p_address: value.direccion,
      p_whatsapp: value.whatsapp
    })
    if (error) throw error
    callback?.({ ...value, customer_id: data })
    return { ...value, customer_id: data }
  }

  const row = {}
  if ('nombre' in value) row.full_name = value.nombre
  if ('CI' in value) row.document_number = value.CI
  if ('direccion' in value) row.address = value.direccion
  if ('whatsapp' in value) row.whatsapp = value.whatsapp
  if ('rol' in value) row.role = value.rol
  if ('bloqueado' in value) row.blocked = value.bloqueado
  if ('sucursal uuid' in value) row.primary_branch_id = value['sucursal uuid'] || null

  await insertOrUpdate(PROFILES_TABLE, id, row)

  callback?.(value)
  return value
}

export async function validateCustomerIdentity(documentNumber, whatsapp) {
  const { data, error } = await supabase.rpc('customer_identity_status', {
    p_document: documentNumber,
    p_whatsapp: whatsapp
  })
  if (error) throw error
  return data
}

export async function removeProfileOrCustomer(id, callback) {
  const { data: customer, error: customerError } = await supabase.from(CUSTOMERS_TABLE).select('id').eq('id', id).maybeSingle()
  if (customerError) throw customerError
  const { error } = await supabase.rpc('deactivate_person_record', {
    p_table: customer ? CUSTOMERS_TABLE : PROFILES_TABLE,
    p_id: id
  })
  if (error) throw error
  callback?.()
}

export async function reactivateProfileOrCustomer(type, id, callback) {
  const table = type === 'customers' ? CUSTOMERS_TABLE : PROFILES_TABLE
  const { error } = await supabase.rpc('reactivate_person_record', {
    p_table: table,
    p_id: id
  })
  if (error) throw error
  callback?.()
}
