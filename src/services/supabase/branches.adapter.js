import { branchesData } from '@/supabase/data'

export const branchesAdapter = {
  subscribeAll(setBranches) {
    return branchesData.subscribeBranches(setBranches)
  },

  findAll(setBranches) {
    return branchesData.selectBranches().then(value => {
      setBranches?.(value)
      return value
    })
  },

  save(branchId, payload, callback) {
    return branchesData.saveBranch(branchId, payload, callback)
  },

  remove(branchId, callback) {
    return branchesData.removeBranch(branchId, callback)
  }
}
