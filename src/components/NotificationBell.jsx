import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Bell, Check } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications'

function formatRelativeTime(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function getNotificationLink(notification) {
  const data = notification.data ?? {}
  switch (notification.type) {
    case 'application_status':
    case 'application_received':
      if (data.activity_type === 'education') return '/mylist?tab=education'
      return '/mylist?tab=volunteer'
    case 'activity_reminder':
    case 'activity_cancelled':
    case 'activity_updated':
      if (data.activity_type === 'education') return '/education'
      return '/volunteer'
    case 'deadline_approaching':
      if (data.activity_type === 'education') return '/education'
      return '/volunteer'
    default:
      return null
  }
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications(userId)
  const { data: unreadCount = 0 } = useUnreadCount(userId)
  const markAsRead = useMarkAsRead(userId)
  const markAllAsRead = useMarkAllAsRead(userId)

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleNotificationClick(notification) {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }
    const link = getNotificationLink(notification)
    if (link) navigate(link)
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-subtle hover:text-action-default"
        aria-label="알림"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-tight text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-0 right-0 top-16 z-50 mx-auto max-h-[70vh] w-full max-w-md overflow-y-auto border-b border-border-default bg-white shadow-lg md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96 md:rounded-xl md:border md:shadow-xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-border-default bg-white px-4 py-3">
            <span className="text-sm font-bold text-text-primary">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-action-default hover:text-action-hover"
              >
                <Check size={14} />
                모두 읽음
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-action-default border-t-transparent" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border-default">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle ${
                    !n.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="shrink-0 pt-1">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        !n.is_read ? 'bg-blue-500' : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-sm text-text-tertiary">
              <Bell size={32} className="mb-2 opacity-40" />
              알림이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
