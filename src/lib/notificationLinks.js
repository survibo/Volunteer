export function getNotificationLink(notification) {
  const data = notification?.data ?? {}
  const kind = data.kind ?? data.activity_type
  const activityId = data.activity_id
  const activityBase = kind === 'education' ? '/education' : '/volunteer'

  switch (notification?.type) {
    case 'new_activity':
    case 'activity_reminder':
    case 'activity_cancelled':
    case 'activity_updated':
    case 'deadline_approaching':
      return activityId ? `${activityBase}/${activityId}` : activityBase
    case 'application_accepted':
    case 'application_rejected':
    case 'application_status':
    case 'application_received':
      return kind === 'education' ? '/mylist?tab=education' : '/mylist?tab=volunteer'
    case 'member_approved':
      return '/mypage'
    case 'new_member_registered':
      return data.user_id ? `/admin/members/${data.user_id}` : '/admin'
    case 'activity_capacity_full':
      if (!activityId) return '/admin'
      return kind === 'education'
        ? `/admin/education/${activityId}/applications`
        : `/admin/volunteer/${activityId}/applications`
    case 'new_admin_granted':
      return '/admin'
    default:
      return null
  }
}
