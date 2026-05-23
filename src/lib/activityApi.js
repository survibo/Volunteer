import { supabase } from './supabase'

export const activityConfigs = {
  volunteer: {
    table: 'volunteer_activities',
    applicationTable: 'volunteer_applications',
    foreignKey: 'volunteer_activity_id',
    userRelation: 'volunteer_applications_user_id_fkey',
    cancelRpc: 'cancel_own_volunteer_application',
    decideRpc: 'decide_volunteer_application',
    listPath: '/volunteer',
    adminEditPath: '/admin/volunteer',
    adminApplicationsPath: '/admin/volunteer',
    label: '봉사활동',
  },
  education: {
    table: 'educations',
    applicationTable: 'education_applications',
    foreignKey: 'education_id',
    userRelation: 'education_applications_user_id_fkey',
    cancelRpc: 'cancel_own_education_application',
    decideRpc: 'decide_education_application',
    listPath: '/education',
    adminEditPath: '/admin/education',
    adminApplicationsPath: '/admin/education',
    label: '교육',
  },
}

const tableToKind = {
  volunteer_activities: 'volunteer',
  educations: 'education',
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

async function fetchActivity(kind, id, { maybe = false } = {}) {
  const cfg = getActivityConfig(kind)
  const query = supabase
    .from(cfg.table)
    .select('*')
    .eq('id', id)

  const { data, error } = maybe ? await query.maybeSingle() : await query.single()
  throwIfError(error)

  return data
}

export function getActivityKind(table) {
  const kind = tableToKind[table]
  if (!kind) {
    throw new Error(`Unsupported activity table: ${table}`)
  }
  return kind
}

export function getActivityConfig(kind) {
  const config = activityConfigs[kind]
  if (!config) {
    throw new Error(`Unsupported activity kind: ${kind}`)
  }
  return config
}

export async function listActivities(kind) {
  const cfg = getActivityConfig(kind)
  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .order('created_at', { ascending: false })

  throwIfError(error)

  return data ?? []
}

export async function listApplicantCounts(kind, activityIds) {
  if (activityIds.length === 0) {
    return {}
  }

  const cfg = getActivityConfig(kind)
  const { data, error } = await supabase
    .from(cfg.applicationTable)
    .select(cfg.foreignKey)
    .in(cfg.foreignKey, activityIds)
    .neq('status', 'cancelled')
    .neq('status', 'rejected')

  throwIfError(error)

  const counts = {}
  for (const row of data ?? []) {
    counts[row[cfg.foreignKey]] = (counts[row[cfg.foreignKey]] ?? 0) + 1
  }
  return counts
}

export async function getActivity(kind, id) {
  return fetchActivity(kind, id)
}

export async function getActivityMaybe(kind, id) {
  return fetchActivity(kind, id, { maybe: true })
}

export async function createActivity(kind, payload) {
  const cfg = getActivityConfig(kind)
  const { error } = await supabase.from(cfg.table).insert(payload)

  throwIfError(error)
}

export async function updateActivity(kind, id, payload) {
  const cfg = getActivityConfig(kind)
  const { error } = await supabase.from(cfg.table).update(payload).eq('id', id)

  throwIfError(error)
}

export async function deleteActivity(kind, id) {
  const cfg = getActivityConfig(kind)
  const { error } = await supabase.from(cfg.table).delete().eq('id', id)

  throwIfError(error)
}

export async function getMyApplication(kind, activityId, userId) {
  const cfg = getActivityConfig(kind)
  const { data, error } = await supabase
    .from(cfg.applicationTable)
    .select('*')
    .eq(cfg.foreignKey, activityId)
    .eq('user_id', userId)
    .maybeSingle()

  throwIfError(error)

  return data
}

export async function applyToActivity(kind, activityId, userId, existingApplication) {
  const cfg = getActivityConfig(kind)

  if (existingApplication?.status === 'cancelled') {
    const { data, error } = await supabase
      .from(cfg.applicationTable)
      .update({
        status: 'pending',
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        decided_at: null,
        decided_by: null,
      })
      .eq('id', existingApplication.id)
      .select('*')
      .single()

    throwIfError(error)

    return data
  }

  const { data, error } = await supabase
    .from(cfg.applicationTable)
    .insert({
      [cfg.foreignKey]: activityId,
      user_id: userId,
      status: 'pending',
    })
    .select('*')
    .single()

  throwIfError(error)

  return data
}

export async function cancelOwnApplication(kind, applicationId) {
  const cfg = getActivityConfig(kind)
  const { error } = await supabase.rpc(cfg.cancelRpc, {
    application_id: applicationId,
  })

  throwIfError(error)
}

export async function listApplications(kind, activityId) {
  const cfg = getActivityConfig(kind)
  const { data, error } = await supabase
    .from(cfg.applicationTable)
    .select(`*, users!${cfg.userRelation}(name, role, member_number, phone, email, workplace_or_school)`)
    .eq(cfg.foreignKey, activityId)
    .order('created_at', { ascending: false })

  throwIfError(error)

  return data ?? []
}

export async function decideApplications(kind, applicationIds, nextStatus) {
  const cfg = getActivityConfig(kind)

  for (const applicationId of applicationIds) {
    const { error } = await supabase.rpc(cfg.decideRpc, {
      application_id: applicationId,
      next_status: nextStatus,
    })

    throwIfError(error)
  }
}
