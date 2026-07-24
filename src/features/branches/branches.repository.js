import { branchesAdapter } from '@/services/supabase'

export const branchesRepository = {
  subscribeAll(setBranches) {
    return branchesAdapter.subscribeAll(setBranches)
  },

  getAll(setBranches) {
    return branchesAdapter.findAll(setBranches)
  },

  async save(branchId, payload, callback) {
    return branchesAdapter.save(branchId, payload, callback)
  },

  async remove(branchId, callback) {
    return branchesAdapter.remove(branchId, callback)
  }
}
