import { settingsData } from '@/supabase/data'

export const settingsAdapter = {
  subscribe(setSettings) {
    return settingsData.subscribeSettings(setSettings)
  },

  find(setSettings) {
    return settingsData.selectSettings().then(value => {
      setSettings?.(value)
      return value
    })
  },

  save(payload, callback) {
    return settingsData.upsertSettings(payload, callback)
  },

  getCatalog() {
    return settingsData.selectCatalog()
  },

  saveCatalogItem(kind, item) {
    return settingsData.upsertCatalogItem(kind, item)
  },

  toggleCatalogItem(kind, id, active) {
    return settingsData.toggleCatalogItem(kind, id, active)
  }
}
