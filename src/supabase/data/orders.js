import { supabase } from '../client'
import { nonEmpty, number, softDelete, subscribeToTable } from './core'

const TABLE = 'orders'
const SELECT = '*,branches(name),order_items(*),order_status_history(*)'

function formatOrderCode(orderNumber) {
  return String(orderNumber).padStart(4, '0')
}

function legacyPickupDate(value) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

function legacyPickupTime(value) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function orderToLegacy(row) {
  if (!row) return null
  const services = Object.fromEntries((row.order_items || []).map(item => [item.id, {
    uuid: item.service_id, 'nombre 1': item.service_name,
    cantidad: item.quantity, costo: item.unit_price, adicional: item.surcharge,
    observacion: item.observation
  }]))

  return {
    uuid: row.id, code: formatOrderCode(row.order_number),
    nombre: row.customer_name, CI: row.customer_document, direccion: row.customer_address,
    whatsapp: row.customer_whatsapp, estado: row.status, total: row.total,
    ac: row.amount_paid, descuento: row.discount, saldo: row.balance,
    reception_payment_amount: row.reception_payment_amount,
    reception_payment_method: row.reception_payment_method,
    reception_paid_at: row.reception_paid_at,
    delivery_payment_amount: row.delivery_payment_amount,
    delivery_payment_method: row.delivery_payment_method,
    delivery_paid_at: row.delivery_paid_at,
    ['metodo pago recepcion']: row.reception_payment_method,
    ['metodo pago entrega']: row.delivery_payment_method,
    velox: Boolean(row.velox_type), veloxType: row.velox_type, sucursal: row.branches?.name,
    pickup_at: row.pickup_at, delivered_at: row.delivered_at, delivered_by: row.delivered_by,
    adicional: row.velox_surcharge_snapshot,
    veloxUnitSurcharge: row.velox_unit_surcharge_snapshot,
    velox_surcharge_snapshot: row.velox_surcharge_snapshot,
    fechaDeEntrega: legacyPickupDate(row.pickup_at),
    ['fecha para recojo']: legacyPickupDate(row.pickup_at),
    ['hora para recojo']: legacyPickupTime(row.pickup_at),
    ['nombre receptor']: row.receiver_name,
    ['CI receptor']: row.receiver_document,
    ['whatsapp receptor']: row.receiver_whatsapp,
    ['observaciones entrega']: row.delivery_notes,
    ['fecha entrega']: row.delivered_at,
    'sucursal uuid': row.branch_id, servicios: services,
    date: new Date(row.created_at).getTime(), fecha: row.created_at,
    mes: new Date(row.created_at).toLocaleDateString('es-BO', { month: '2-digit', year: 'numeric' })
  }
}

export async function selectOrders(id) {
  let query = supabase
    .from(TABLE)
    .select(SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (id) query = query.or(`id.eq.${id},branch_id.eq.${id}`)
  const { data, error } = await query
  if (error) throw error
  const nested = {}
  for (const row of data || []) {
    nested[row.branch_id] ||= {}
    nested[row.branch_id][row.id] = orderToLegacy(row)
  }
  return nested
}

export function subscribeOrders(setOrders, callback) {
  return subscribeToTable(TABLE, async active => {
    try {
      const value = await selectOrders()
      if (active) setOrders?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

export function subscribeOrdersByBranch(branchId, setOrders, callback) {
  return subscribeToTable(TABLE, async active => {
    try {
      const value = await selectOrders(branchId)
      if (active) setOrders?.(value)
      callback?.(value)
    } catch (error) {
      console.error('Error leyendo Supabase:', error)
      callback?.(null, error)
    }
  })
}

function orderPayload(value) {
  const payload = {}

  if ('nombre' in value) payload.customer_name = value.nombre
  if ('CI' in value) payload.customer_document = nonEmpty(value.CI)
  if ('direccion' in value) payload.customer_address = nonEmpty(value.direccion)
  if ('whatsapp' in value) payload.customer_whatsapp = nonEmpty(value.whatsapp)
  if ('estado' in value) payload.status = value.estado
  if ('total' in value) payload.total = number(value.total)
  if ('descuento' in value) payload.discount = number(value.descuento)
  if ('reception_payment_amount' in value) payload.reception_payment_amount = number(value.reception_payment_amount)
  if ('reception_payment_method' in value) payload.reception_payment_method = value.reception_payment_method || null
  if ('reception_paid_at' in value) payload.reception_paid_at = value.reception_paid_at
  if ('delivery_payment_amount' in value) payload.delivery_payment_amount = number(value.delivery_payment_amount)
  if ('delivery_payment_method' in value) payload.delivery_payment_method = value.delivery_payment_method || null
  if ('delivery_paid_at' in value) payload.delivery_paid_at = value.delivery_paid_at
  if ('veloxType' in value) payload.velox_type = value.veloxType
  else if ('velox' in value) payload.is_velox = Boolean(value.velox)
  if ('velox_surcharge_snapshot' in value || 'adicional' in value) payload.velox_surcharge_snapshot = number(value.velox_surcharge_snapshot ?? value.adicional)
  if ('pickup_at' in value) payload.pickup_at = value.pickup_at
  if ('delivered_at' in value) payload.delivered_at = value.delivered_at
  if ('delivered_by' in value) payload.delivered_by = value.delivered_by
  if ('nombre receptor' in value) payload.receiver_name = value['nombre receptor']
  if ('CI receptor' in value) payload.receiver_document = value['CI receptor']
  if ('whatsapp receptor' in value) payload.receiver_whatsapp = value['whatsapp receptor']
  if ('observaciones entrega' in value) payload.delivery_notes = value['observaciones entrega']
  if ('metodo pago recepcion' in value || 'payment_method' in value) payload.reception_payment_method = value['metodo pago recepcion'] || value.payment_method || null
  if ('metodo pago entrega' in value) payload.delivery_payment_method = value['metodo pago entrega'] || null

  return payload
}

function orderItemsPayload(value) {
  if (!value.servicios) return null
  return Object.values(value.servicios).map(item => ({
    service_id: item.uuid || null,
    service_name: item['nombre 1'] || item.nombre,
    quantity: number(item.cantidad),
    unit_price: number(item.costo),
    surcharge: number(item.adicional),
    observation: item.observacion
  }))
}

export async function upsertOrder(id, value, pathBranchId, callback) {
  const branchId = value['sucursal uuid'] || pathBranchId
  if (!branchId) throw new Error('Sucursal requerida para guardar pedido')

  const payload = orderPayload(value)
  const items = orderItemsPayload(value)
  const hasSelectedCustomer = Boolean(value.selected_customer_id)
  const { error } = await supabase.rpc(
    hasSelectedCustomer ? 'update_customer_and_upsert_order' : 'upsert_order_with_items',
    hasSelectedCustomer
      ? {
          p_order_id: id,
          p_branch_id: branchId,
          p_order: payload,
          p_items: items,
          p_customer_id: value.selected_customer_id,
          p_original_document: value.selected_customer_document || null,
          p_original_whatsapp: value.selected_customer_whatsapp || null
        }
      : {
          p_order_id: id,
          p_branch_id: branchId,
          p_order: payload,
          p_items: items
        }
  )
  if (error) throw error

  const savedOrders = await selectOrders(id)
  const savedOrder = Object.values(savedOrders || {})
    .map(branchOrders => branchOrders?.[id])
    .find(Boolean)
  if (!savedOrder) throw new Error('ORDER_CONFIRMATION_NOT_FOUND')

  callback?.(savedOrder)
  return savedOrder
}

export async function removeOrder(id, callback) {
  await softDelete(TABLE, id)
  callback?.()
}

export async function countOrdersByBranch(branchId, callback) {
  let query = supabase.from(TABLE).select('*', { count: 'exact', head: true })
  if (branchId) query = query.eq('branch_id', branchId).is('deleted_at', null)
  const { count, error } = await query
  if (error) throw error
  callback?.(count || 0)
  return count || 0
}
