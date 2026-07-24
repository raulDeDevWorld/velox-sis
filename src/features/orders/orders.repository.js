import { ordersAdapter } from '@/services/supabase'

export const ordersRepository = {
  subscribeAll(setOrders) {
    return ordersAdapter.subscribeAll(setOrders)
  },

  subscribeByBranch(branchId, setOrders) {
    return ordersAdapter.subscribeByBranch(branchId, setOrders)
  },

  getAll(setOrders) {
    return ordersAdapter.findAll(setOrders)
  },

  getByBranch(branchId, setOrders) {
    return ordersAdapter.findByBranch(branchId, setOrders)
  },

  resolveQrPath(path, setOrder) {
    return ordersAdapter.findByLegacyPath(path, setOrder)
  },

  async save(branchId, orderId, payload, callback) {
    return ordersAdapter.save(branchId, orderId, payload, callback)
  },

  async remove(branchId, orderId, callback) {
    return ordersAdapter.remove(branchId, orderId, callback)
  },

  async countByBranch(branchId, callback) {
    return ordersAdapter.countByBranch(branchId, callback)
  }
}
