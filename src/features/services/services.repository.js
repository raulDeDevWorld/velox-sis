import { servicesAdapter } from '@/services/supabase'

export const servicesRepository = {
  subscribeAll(setServices) {
    return servicesAdapter.subscribeAll(setServices)
  },

  getAll(setServices) {
    return servicesAdapter.findAll(setServices)
  },

  async save(serviceId, payload, callback) {
    return servicesAdapter.save(serviceId, payload, callback)
  },

  async remove(serviceId, callback) {
    return servicesAdapter.remove(serviceId, callback)
  }
}
