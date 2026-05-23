import { supabase } from './supabase'

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return null
    }

    throw error
  }

  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function signInWithOAuth(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
    },
  })

  if (error) {
    throw error
  }
}

export async function exchangeOAuthCode(code) {
  if (!code) {
    return
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error && !error.message.toLowerCase().includes('invalid flow state')) {
    throw error
  }
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()

  if (!user) {
    return { session: null, user: null, profile: null }
  }

  const session = await getCurrentSession()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return { session, user, profile: data }
}

export async function createPendingProfile(payload) {
  const { error } = await supabase.from('users').insert(payload)

  if (error) {
    throw error
  }
}

export async function withdrawCurrentUser() {
  const { error } = await supabase.rpc('withdraw_current_user')

  if (error) {
    throw error
  }
}

export async function updateOwnProfile(payload) {
  const { error } = await supabase.rpc('update_own_profile', {
    new_name: payload.name,
    new_phone: payload.phone,
    new_email: payload.email,
    new_address: payload.address,
    new_address_detail: payload.address_detail ?? '',
    new_workplace_or_school: payload.workplace_or_school,
    new_license_number: payload.license_number,
  })

  if (error) {
    throw error
  }
}

export function getHomePath(profile) {
  if (!profile) {
    return '/auth/register'
  }

  if (profile.role === 'admin') {
    return '/admin'
  }

  if (profile.role === 'pending') {
    return '/volunteer'
  }

  return '/volunteer'
}

export function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`
}
