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

export function getHomePath(profile) {
  if (!profile) {
    return '/auth/register'
  }

  if (profile.role === 'admin') {
    return '/admin'
  }

  if (profile.role === 'pending') {
    return '/pending'
  }

  return '/volunteer'
}

export function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`
}
