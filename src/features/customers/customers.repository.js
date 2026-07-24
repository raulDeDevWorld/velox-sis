import { customersAdapter } from '@/services/supabase'

export const customersRepository = {
  subscribeAll(setCustomers) {
    return customersAdapter.subscribeAll(setCustomers)
  },

  subscribeById(userId, setCustomer) {
    return customersAdapter.subscribeById(userId, setCustomer)
  },

  getAll(setCustomers) {
    return customersAdapter.findAll(setCustomers)
  },

  getById(userId, setCustomer) {
    return customersAdapter.findById(userId, setCustomer)
  },

  getInactive(type) {
    return customersAdapter.findInactive(type)
  },

  async save(userId, payload, callback) {
    return customersAdapter.save(userId, payload, callback)
  },

  async validateIdentity(documentNumber, whatsapp) {
    return customersAdapter.validateIdentity(documentNumber, whatsapp)
  },

  async remove(userId, callback) {
    return customersAdapter.remove(userId, callback)
  },

  async reactivate(type, userId, callback) {
    return customersAdapter.reactivate(type, userId, callback)
  }
}
