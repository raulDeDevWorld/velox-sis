import { customersData } from '@/supabase/data'

export const customersAdapter = {
  subscribeAll(setCustomers) {
    return customersData.subscribeProfilesAndCustomers(setCustomers)
  },

  subscribeById(userId, setCustomer) {
    return customersData.subscribeProfileOrCustomer(userId, setCustomer)
  },

  findAll(setCustomers) {
    return customersData.selectProfilesAndCustomers().then(value => {
      setCustomers?.(value)
      return value
    })
  },

  findById(userId, setCustomer) {
    return customersData.selectProfilesAndCustomers(userId).then(value => {
      setCustomer?.(value)
      return value
    })
  },

  findInactive(type) {
    return customersData.selectInactivePeople(type)
  },

  save(userId, payload, callback) {
    return customersData.upsertProfileOrCustomer(userId, payload, callback)
  },

  validateIdentity(documentNumber, whatsapp) {
    return customersData.validateCustomerIdentity(documentNumber, whatsapp)
  },

  remove(userId, callback) {
    return customersData.removeProfileOrCustomer(userId, callback)
  },

  reactivate(type, userId, callback) {
    return customersData.reactivateProfileOrCustomer(type, userId, callback)
  }
}
