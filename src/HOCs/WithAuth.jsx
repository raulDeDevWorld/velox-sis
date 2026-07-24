'use client'

import LoaderWithLogo from '@/components/LoaderWithLogo'
import { useUser } from '@/context'

export function WithAuth(Component) {
  function AuthenticatedComponent(props) {
    const { user, userDB } = useUser()

    if (!user || !userDB) return <LoaderWithLogo />
    return <Component {...props} />
  }

  AuthenticatedComponent.displayName = `WithAuth(${Component.displayName || Component.name || 'Component'})`
  return AuthenticatedComponent
}
