import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listMyApplications } from '../../lib/activityApi'
import { formatDateTime } from '../../lib/dateUtils'
import TopLoadingBar from '../../components/TopLoadingBar'

const statusLabels = {
  pending: '승인 대기',
  accepted: '수락',
  rejected: '거절',
  cancelled: '취소',
}

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
}

export default function MyHistoryPage({ profile }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const data = await listMyApplications(profile.id)
      if (mounted) {
        setApplications(data)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [profile.id])

  if (loading) return <TopLoadingBar />

  const now = new Date()
  const current = applications.filter(
    (a) => a.status === 'pending' || (a.status === 'accepted' && new Date(a._activity.ends_at) > now)
  )
  const completed = applications.filter(
    (a) => a.status === 'accepted' && new Date(a._activity.ends_at) <= now
  )
  const other = applications.filter(
    (a) => a.status === 'rejected'
  )

  return (
    <section className="grid gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
          마이페이지
        </p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          활동 내역
        </h1>
      </div>

      <Section title="신청 내역" count={current.length} emptyMessage="신청한 활동이 없습니다.">
        {current.map((app) => (
          <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} />
        ))}
      </Section>

      <Section title="이수 내역" count={completed.length} emptyMessage="이수한 활동이 없습니다.">
        {completed.map((app) => (
          <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} />
        ))}
      </Section>

      {other.length > 0 && (
        <Section title="기타 내역" count={other.length} emptyMessage="">
          {other.map((app) => (
            <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} />
          ))}
        </Section>
      )}
    </section>
  )
}

function Section({ title, count, emptyMessage, children }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold text-text-primary">
        {title}
        <span className="ml-1.5 text-sm font-normal text-text-tertiary">{count}</span>
      </h2>
      {count === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6 text-sm text-text-secondary">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </div>
  )
}

function ApplicationCard({ app, now }) {
  const activity = app._activity
  const kindLabel = app.kind === 'volunteer' ? '봉사' : '교육'
  const isPast = new Date(activity.ends_at) <= now

  return (
    <Link
      to={`${app.detailPath}/${activity.id}`}
      className="block rounded-xl border border-border-default bg-surface-base p-5 transition-colors hover:bg-surface-subtle"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-text-primary">{activity.title}</h3>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyles[app.status]}`}
        >
          {statusLabels[app.status]}
        </span>
      </div>
      <div className="grid gap-1 text-sm text-text-secondary">
        <p>
          {kindLabel} · {activity.location}
        </p>
        <p>
          {formatDateTime(activity.starts_at)} ~ {formatDateTime(activity.ends_at)}
        </p>
        <p className="text-xs text-text-tertiary">
          {isPast ? '종료' : '진행중'}
        </p>
      </div>
    </Link>
  )
}
