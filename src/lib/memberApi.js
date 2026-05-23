import { supabase } from './supabase'

function throwIfError(error) {
  if (error) {
    throw error
  }
}

const memberSelect = 'id, role, member_number, name, phone, email, address, workplace_or_school, license_number, approved_at, created_at'

export async function listMembers() {
  const { data, error } = await supabase
    .from('users')
    .select(memberSelect)
    .order('created_at', { ascending: false })

  throwIfError(error)

  return data ?? []
}

export async function getMember(id) {
  const { data, error } = await supabase
    .from('users')
    .select(memberSelect)
    .eq('id', id)
    .single()

  throwIfError(error)

  return data
}

export async function approveMember(id, memberNumber) {
  const { error } = await supabase.rpc('approve_member', {
    target_user_id: id,
    member_number: memberNumber,
  })

  throwIfError(error)

  return getMember(id)
}

export async function cancelMemberApproval(id) {
  const { error } = await supabase
    .from('users')
    .update({
      role: 'pending',
      member_number: null,
      approved_at: null,
      approved_by: null,
    })
    .eq('id', id)
    .eq('role', 'member')

  throwIfError(error)

  return getMember(id)
}

export async function grantAdmin(id, memberNumber) {
  const { error } = await supabase.rpc('grant_admin', {
    target_user_id: id,
    member_number: memberNumber,
  })

  throwIfError(error)

  return getMember(id)
}
