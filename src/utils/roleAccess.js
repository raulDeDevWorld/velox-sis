const ROLE_ACCESS = Object.freeze({
  admin: Object.freeze({
    routes: '*',
    capabilities: Object.freeze(['admin', 'dashboard:all', 'orders:manage', 'catalog:manage', 'people:manage', 'settings:manage'])
  }),
  personal: Object.freeze({
    routes: Object.freeze(['/', '/Dashboard', '/Pendientes', '/Tracking', '/Politicas']),
    capabilities: Object.freeze(['dashboard:branch', 'orders:manage'])
  }),
  cliente: Object.freeze({
    routes: Object.freeze(['/', '/Pendientes', '/Tracking', '/Politicas']),
    capabilities: Object.freeze(['orders:own:read', 'services:consult'])
  })
})

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

export function canViewAllBranchReports(role) {
  return hasCapability(role, 'dashboard:all')
}

export function assignedBranchId(profile) {
  return profile?.['sucursal uuid']
    || profile?.primary_branch_id
    || profile?.branch_id
    || ''
}

export function hasCapability(role, capability) {
  const access = ROLE_ACCESS[normalizeRole(role)]
  return Boolean(access?.capabilities.includes(capability))
}

export function canAccessRoute(role, pathname) {
  if (!role || !pathname) return false
  const routes = ROLE_ACCESS[normalizeRole(role)]?.routes
  return routes === '*' || Boolean(routes?.includes(pathname))
}

export function homeRouteForRole(role) {
  return normalizeRole(role) === 'cliente' ? '/Pendientes' : '/Dashboard'
}
