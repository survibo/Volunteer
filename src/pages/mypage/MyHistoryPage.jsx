import { Children, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMyApplications } from '../../hooks/useActivities'
import { formatDate } from '../../lib/dateUtils'
import PaginationControls, { PAGE_SIZE } from '../../components/PaginationControls'
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

const kindFilters = [
  { value: 'all', label: '전체' },
  { value: 'volunteer', label: '봉사' },
  { value: 'education', label: '교육' },
]

export default function MyHistoryPage({ profile, memberId, hideHeader, showAdminMemos = false }) {
  const [kindFilter, setKindFilter] = useState('all')
  const userId = memberId ?? profile.id
  const { data: applications = [], isLoading } = useMyApplications(userId, {
    includeAdminMemos: showAdminMemos,
  })

  const validApplications = useMemo(
    () => applications.filter((a) => a?.status && a?._activity),
    [applications]
  )
  const filtered = useMemo(() => {
    const items = kindFilter === 'all'
      ? validApplications
      : validApplications.filter((a) => a.kind === kindFilter)

    return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [validApplications, kindFilter])
  const now = useMemo(() => new Date(), [])
  const current = useMemo(
    () => filtered.filter(
      (a) => a.status === 'pending' || (a.status === 'accepted' && new Date(a._activity.ends_at) > now)
    ),
    [filtered, now]
  )
  const completed = useMemo(
    () => filtered.filter(
      (a) => a.status === 'accepted' && new Date(a._activity.ends_at) <= now
    ),
    [filtered, now]
  )
  const other = useMemo(
    () => filtered.filter((a) => a.status === 'rejected'),
    [filtered]
  )

  if (isLoading) return <TopLoadingBar />

  return (
    <section className="grid gap-6">
      {!hideHeader && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
            마이페이지
          </p>
          <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
            활동 내역
          </h1>
        </div>
      )}

      <div className="flex gap-1.5">
        {kindFilters.map((f) => (
          <button
            key={f.value}
            className={
              kindFilter === f.value
                ? 'rounded-lg bg-action-default px-3 py-2 text-sm font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle'
            }
            type="button"
            onClick={() => setKindFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Section key={`current-${kindFilter}`} title="신청 내역" count={current.length} emptyMessage="신청한 활동이 없습니다.">
        {current.map((app) => (
          <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} showAdminMemo={showAdminMemos} />
        ))}
      </Section>

      <Section key={`completed-${kindFilter}`} title="이수 내역" count={completed.length} emptyMessage="이수한 활동이 없습니다.">
        {completed.map((app) => (
          <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} showAdminMemo={showAdminMemos} />
        ))}
      </Section>

      {other.length > 0 && (
        <Section key={`other-${kindFilter}`} title="기타 내역" count={other.length} emptyMessage="">
          {other.map((app) => (
            <ApplicationCard key={`${app.kind}-${app.id}`} app={app} now={now} showAdminMemo={showAdminMemos} />
          ))}
        </Section>
      )}
    </section>
  )
}

function Section({ title, count, emptyMessage, children }) {
  const [page, setPage] = useState(1)
  const items = Children.toArray(children)
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
        <div className="grid gap-3">
          {visibleItems}
          <PaginationControls page={currentPage} total={count} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app, now, showAdminMemo }) {
  if (!app?._activity) {
    return null
  }

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
          {formatDate(activity.starts_at)} ~ {formatDate(activity.ends_at)}
        </p>
        <p className="text-xs text-text-tertiary">
          {isPast ? '종료' : '진행중'}
        </p>
      </div>
      {showAdminMemo && app.admin_memo && (
        <div className="mt-4 rounded-lg border border-border-default bg-surface-subtle p-3">
          <p className="text-xs font-semibold text-text-tertiary">관리자 메모</p>
          <p className="mt-2 whitespace-pre-wrap break-all text-sm text-text-primary">
            {app.admin_memo}
          </p>
        </div>
      )}
    </Link>
  )
}
