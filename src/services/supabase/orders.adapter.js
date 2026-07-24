import { ordersData } from '@/supabase/data'

export const ordersAdapter = {
  subscribeAll(setOrders) {
    return ordersData.subscribeOrders(setOrders)
  },

  subscribeByBranch(branchId, setOrders) {
    return ordersData.subscribeOrdersByBranch(branchId, setOrders)
  },

  findAll(setOrders) {
    return ordersData.selectOrders().then(value => {
      setOrders?.(value)
      return value
    })
  },

  findByBranch(branchId, setOrders) {
    return ordersData.selectOrders(branchId).then(value => {
      setOrders?.(value)
      return value
    })
  },

  findByLegacyPath(path, setOrder) {
    const [, branchOrOrderId, orderId] = path.replace(/^\/+|\/+$/g, '').toLowerCase().split('/').filter(Boolean)
    return ordersData.selectOrders(orderId || branchOrOrderId).then(value => {
      setOrder?.(value)
      return value
    })
  },

  save(branchId, orderId, payload, callback) {
    return ordersData.upsertOrder(orderId, payload, branchId, callback)
  },

  remove(branchId, orderId, callback) {
    return ordersData.removeOrder(orderId, callback)
  },

  countByBranch(branchId, callback) {
    return ordersData.countOrdersByBranch(branchId, callback)
  }
}
