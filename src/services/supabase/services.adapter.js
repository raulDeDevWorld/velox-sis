import { servicesData } from '@/supabase/data'

export const servicesAdapter = {
  subscribeAll(setServices) {
    return servicesData.subscribeServices(setServices)
  },

  findAll(setServices) {
    return servicesData.selectServices().then(value => {
      setServices?.(value)
      return value
    })
  },

  save(serviceId, payload, callback) {
    return servicesData.upsertService(serviceId, payload, callback)
  },

  remove(serviceId, callback) {
    return servicesData.removeService(serviceId, callback)
  }
}
