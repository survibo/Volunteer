import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CheckCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const config = {
  volunteer_activities: {
    applicationTable: 'volunteer_applications',
    foreignKey: 'volunteer_activity_id',
    decideRpc: 'decide_volunteer_application',
    listPath: '/volunteer',
    activityLabel: '봉사활동',
  },
  educations: {
    applicationTable: 'education_applications',
    foreignKey: 'education_id',
    decideRpc: 'decide_education_application',
    listPath: '/education',
    activityLabel: '교육',
  },
}

const statusLabel = {
  pending: '신청 대기',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
}

export default function AdminApplicationsPage({ table }) {
  const { id } = useParams()
  const cfg = config[table]
  const [activity, setActivity] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: activityData, error: activityError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!mounted) return

      if (!activityError && activityData) {
        setActivity(activityData)
      }

      const { data: appData } = await supabase
        .from(cfg.applicationTable)
        .select('*, users(name, phone, email, member_number)')
        .eq(cfg.foreignKey, id)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setApplications(appData ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [id, table, cfg.applicationTable, cfg.foreignKey])

  const cancellableIds = applications
    .filter((a) => a.status !== 'cancelled')
    .map((a) => a.id)
  const allSelected = cancellableIds.length > 0 && cancellableIds.every((aid) => selectedIds.has(aid))

  function toggleSelect(appId) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(appId)) {
        next.delete(appId)
      } else {
        next.add(appId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cancellableIds))
    }
  }

  async function handleDecide(applicationIds, nextStatus) {
    setProcessing('batch')

    for (const appId of applicationIds) {
      const { error } = await supabase.rpc(cfg.decideRpc, {
        application_id: appId,
        next_status: nextStatus,
      })

      if (error) {
        alert(error.message)
        setProcessing(null)
        return
      }
    }

    setProcessing(null)
    setSelectedIds(new Set())
    setApplications((prev) =>
      prev.map((a) =>
        applicationIds.includes(a.id) ? { ...a, status: nextStatus } : a
      )
    )
  }

  if (loading) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (!activity) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-status-error-text">존재하지 않는 게시물입니다.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to={`${cfg.listPath}/${id}`}
        >
          {cfg.activityLabel}
        </Link>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          신청 현황
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{activity.title}</p>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2.5 border-b border-border-default bg-surface-base px-4 py-3 md:-mx-6 md:px-6">
          <span className="text-sm font-medium text-text-secondary">
            {selectedIds.size}명 선택
          </span>
          <div className="ml-auto flex gap-2.5">
            <button
              className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
              disabled={processing === 'batch'}
              type="button"
              onClick={() => handleDecide([...selectedIds], 'accepted')}
            >
              <CheckCheck size={16} />
              수락
            </button>
            <button
              className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
              disabled={processing === 'batch'}
              type="button"
              onClick={() => handleDecide([...selectedIds], 'rejected')}
            >
              <X size={16} />
              거절
            </button>
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <strong>신청 내역이 없습니다.</strong>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-default bg-surface-base px-5 py-3 text-sm font-medium text-text-secondary hover:bg-surface-subtle">
            <input
              className="h-4 w-4"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            전체 선택
          </label>
          {applications.map((app) => {
            const isCancelled = app.status === 'cancelled'
            return (
              <div
                key={app.id}
                className={`rounded-xl border bg-surface-base p-5 ${
                  selectedIds.has(app.id) ? 'border-action-default' : 'border-border-default'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      className="h-4 w-4"
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      disabled={isCancelled}
                      onChange={() => !isCancelled && toggleSelect(app.id)}
                    />
                    <div className="grid gap-1">
                      <p className="font-bold text-text-primary">{app.users?.name}</p>
                      <p className="text-sm text-text-secondary">{app.users?.phone}</p>
                      {app.users?.email && (
                        <p className="text-sm text-text-tertiary">{app.users.email}</p>
                      )}
                      {app.users?.member_number && (
                        <p className="text-xs text-text-tertiary">
                          회원번호: {app.users.member_number}
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {!isCancelled ? (
                      <>
                        <button
                          className="min-h-[36px] cursor-pointer rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
                          disabled={processing === app.id}
                          type="button"
                          onClick={() => handleDecide([app.id], 'accepted')}
                        >
                          수락
                        </button>
                        <button
                          className="min-h-[36px] cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
                          disabled={processing === app.id}
                          type="button"
                          onClick={() => handleDecide([app.id], 'rejected')}
                        >
                          거절
                        </button>
                      </>
                    ) : (
                      <span className="rounded-lg bg-surface-subtle px-3 py-1.5 text-sm font-semibold text-text-tertiary">
                        {statusLabel[app.status]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
