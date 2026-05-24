import { supabase } from './supabase'

function throwIfError(error) {
  if (error) {
    throw error
  }
}

const memberSelect = 'id, role, member_number, name, phone, email, address, address_detail, workplace_or_school, license_number, birthday, volunteer_experience, education_experience, avatar_path, user_chip, memo, approved_at, created_at'

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
    new_member_number: memberNumber,
  })

  throwIfError(error)

  return getMember(id)
}

export async function cancelMemberApproval(id) {
  const { error } = await supabase.rpc('cancel_member_approval', {
    target_user_id: id,
  })

  throwIfError(error)

  return getMember(id)
}

export async function grantAdmin(id, memberNumber) {
  const { error } = await supabase.rpc('grant_admin', {
    target_user_id: id,
    new_member_number: memberNumber,
  })

  throwIfError(error)

  return getMember(id)
}

export async function setUserChip(id, color, label) {
  const { error } = await supabase.rpc('set_user_chip', {
    target_user_id: id,
    color,
    label,
  })
  throwIfError(error)
}

export async function setUserMemo(id, memoText) {
  const { error } = await supabase.rpc('set_user_memo', {
    target_user_id: id,
    memo_text: memoText,
  })
  throwIfError(error)
}
