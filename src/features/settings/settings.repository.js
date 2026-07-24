import { settingsAdapter } from '@/services/supabase'

export const settingsRepository = {
  subscribe(setSettings) {
    return settingsAdapter.subscribe(setSettings)
  },

  get(setSettings) {
    return settingsAdapter.find(setSettings)
  },

  async save(payload, callback) {
    return settingsAdapter.save(payload, callback)
  },

  getCatalog() {
    return settingsAdapter.getCatalog()
  },

  saveCatalogItem(kind, item) {
    return settingsAdapter.saveCatalogItem(kind, item)
  },

  toggleCatalogItem(kind, id, active) {
    return settingsAdapter.toggleCatalogItem(kind, id, active)
  }
}
