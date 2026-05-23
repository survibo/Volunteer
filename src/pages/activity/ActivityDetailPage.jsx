import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

const config = {
  volunteer_activities: {
    applicationTable: 'volunteer_applications',
    foreignKey: 'volunteer_activity_id',
    cancelRpc: 'cancel_own_volunteer_application',
    listPath: '/volunteer',
    label: '봉사활동',
  },
  educations: {
    applicationTable: 'education_applications',
    foreignKey: 'education_id',
    cancelRpc: 'cancel_own_education_application',
    listPath: '/education',
    label: '교육',
  },
}

const statusLabel = {
  pending: '신청 대기',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
}

export default function ActivityDetailPage({ table, profile }) {
  const { id } = useParams()
  const cfg = config[table]
  const [activity, setActivity] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const deadlinePassed = activity ? new Date(activity.application_deadline) <= new Date() : true
  const isClosed = activity?.is_closed ?? true
  const canApply = activity && !deadlinePassed && !isClosed
  const myPendingApp = application?.status === 'pending'

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const { data: activityData } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single()

        if (!mounted) return
        setActivity(activityData)

        const { data: appData } = await supabase
          .from(cfg.applicationTable)
          .select('*')
          .eq(cfg.foreignKey, id)
          .eq('user_id', profile.id)
          .maybeSingle()

        if (!mounted) return
        setApplication(appData)
      } catch (error) {
        if (mounted) setErrorMessage(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [id, table, cfg.foreignKey, cfg.applicationTable, profile.id])

  async function handleApply() {
    setSaving(true)
    setErrorMessage('')

    const { error } = await supabase.from(cfg.applicationTable).insert({
      [cfg.foreignKey]: id,
      user_id: profile.id,
      status: 'pending',
    })

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const { data } = await supabase
      .from(cfg.applicationTable)
      .select('*')
      .eq(cfg.foreignKey, id)
      .eq('user_id', profile.id)
      .single()

    setApplication(data)
  }

  async function handleCancel() {
    setSaving(true)
    setErrorMessage('')

    const { error } = await supabase.rpc(cfg.cancelRpc, {
      application_id: application.id,
    })

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setApplication((prev) => ({ ...prev, status: 'cancelled' }))
  }

  if (loading) {
    return <LoadingState />
  }

  if (errorMessage && !activity) {
    return <ErrorState message={errorMessage} />
  }

  if (!activity) {
    return <ErrorState message="존재하지 않는 게시물입니다." />
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to={cfg.listPath}
        >
          {cfg.label}
        </Link>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {activity.title}
        </h1>
      </div>

      <dl className="grid gap-3 rounded-xl border border-border-default bg-surface-base p-6">
        {activity.description && (
          <div className="grid gap-1">
            <dt className="text-xs font-semibold text-text-secondary">설명</dt>
            <dd className="m-0 whitespace-pre-wrap text-sm text-text-primary">{activity.description}</dd>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">장소</dt>
          <dd className="m-0 text-sm text-text-primary">{activity.location}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">시작일</dt>
          <dd className="m-0 text-sm text-text-primary">{formatDate(activity.starts_at)}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">종료일</dt>
          <dd className="m-0 text-sm text-text-primary">{formatDate(activity.ends_at)}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">신청 마감일</dt>
          <dd className="m-0 text-sm text-text-primary">{formatDate(activity.application_deadline)}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">정원</dt>
          <dd className="m-0 text-sm text-text-primary">{activity.capacity}명</dd>
        </div>
      </dl>

      {errorMessage && (
        <p className="text-sm leading-normal text-status-error-text">{errorMessage}</p>
      )}

      {application ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">
            신청 상태:{' '}
            <span className="font-semibold text-text-primary">{statusLabel[application.status]}</span>
          </p>
          {myPendingApp && !deadlinePassed && (
            <button
              className="mt-4 min-h-[44px] cursor-pointer rounded-xl bg-status-error-bg px-5 font-semibold text-status-error-text hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
              disabled={saving}
              type="button"
              onClick={handleCancel}
            >
              {saving ? '취소 중' : '신청 취소'}
            </button>
          )}
        </div>
      ) : canApply ? (
        <button
          className="min-h-[44px] w-full cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 md:w-auto"
          disabled={saving}
          type="button"
          onClick={handleApply}
        >
          {saving ? '신청 중' : '신청하기'}
        </button>
      ) : null}
    </section>
  )
}

function LoadingState() {
  return (
    <section className="grid gap-6">
      <div className="rounded-xl border border-border-default bg-surface-base p-6">
        <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
      </div>
    </section>
  )
}

function ErrorState({ message }) {
  return (
    <section className="grid gap-6">
      <div className="rounded-xl border border-border-default bg-surface-base p-6">
        <p className="text-sm text-status-error-text">{message}</p>
      </div>
    </section>
  )
}
