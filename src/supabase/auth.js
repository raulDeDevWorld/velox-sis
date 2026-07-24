import { supabase } from './client'

function mapUser(user) {
  return user ? { ...user, uid: user.id, uuid: user.id } : null
}

function onAuth(setUserProfile) {
  let active = true
  supabase.auth.getSession().then(({ data, error }) => {
    if (!active) return
    if (error) {
      console.error('No se pudo recuperar la sesion:', error)
      setUserProfile(null)
      return
    }
    setUserProfile(mapUser(data.session?.user))
  })
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (active) setUserProfile(mapUser(session?.user))
  })
  return () => {
    active = false
    data.subscription.unsubscribe()
  }
}

async function signUpWithEmail(email, password, setUserProfile, setUserSuccess, callback) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    setUserSuccess?.(error.message)
    callback?.(true)
    return { data, error }
  }

  // With email confirmation enabled Supabase returns a user, but no authenticated
  // session. Treating that user as logged in makes every RLS write fail.
  if (!data.session) {
    setUserProfile(null)
    setUserSuccess?.('Revisa tu correo y confirma tu cuenta antes de continuar.')
    callback?.(false, { confirmationRequired: true })
    return { data, error: null, confirmationRequired: true }
  }

  setUserProfile(mapUser(data.user))
  callback?.(false, { confirmationRequired: false })
  return { data, error }
}

async function signInWithEmail(email, password, setUserProfile) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  setUserProfile(error ? null : mapUser(data.user))
  return { data, error }
}

async function handleSignOut() { return supabase.auth.signOut() }

async function sendPasswordReset(email, callback) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/Restablecer`
  })
  if (error) throw error
  callback?.()
}

export { onAuth, signUpWithEmail, signInWithEmail, handleSignOut, sendPasswordReset }
