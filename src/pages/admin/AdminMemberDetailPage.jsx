import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { approveMember, cancelMemberApproval, getMember, grantAdmin } from '../../lib/memberApi'

function roleLabel(role) {
  if (role === 'admin') return '관리자'
  if (role === 'member') return '회원'
  return '준회원'
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function getConfirmContent(action, memberName) {
  if (action === 'approve') {
    return {
      title: '회원번호를 부여할까요?',
      description: `${memberName}님을 회원으로 전환하고 회원번호를 자동 부여합니다.`,
      confirmText: '회원 부여',
      variant: 'primary',
    }
  }

  if (action === 'admin') {
    return {
      title: '관리자로 부여할까요?',
      description: `${memberName}님을 관리자로 전환합니다. 회원번호가 없으면 자동으로 새 회원번호를 부여합니다.`,
      confirmText: '관리자 부여',
      variant: 'danger',
    }
  }

  return {
    title: '회원 부여를 취소할까요?',
    description: `${memberName}님을 준회원으로 되돌리고 기존 회원번호를 제거합니다.`,
    confirmText: '회원 취소',
    variant: 'danger',
  }
}

export default function AdminMemberDetailPage() {
  const { id } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const data = await getMember(id)
        if (mounted) {
          setMember(data)
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => { mounted = false }
  }, [id])

  async function handleConfirmAction() {
    if (!confirmAction) {
      return
    }

    setProcessing(true)
    setErrorMessage('')

    try {
      let nextMember

      if (confirmAction === 'approve') {
        nextMember = await approveMember(id)
      } else if (confirmAction === 'admin') {
        nextMember = await grantAdmin(id)
      } else {
        nextMember = await cancelMemberApproval(id)
      }

      setMember(nextMember)
      setConfirmAction(null)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">회원 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage || !member) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-status-error-text">{errorMessage || '회원을 찾을 수 없습니다.'}</p>
        </div>
      </section>
    )
  }

  const confirmContent = confirmAction
    ? getConfirmContent(confirmAction, member.name)
    : null

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to="/admin"
        >
          회원 목록
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
            {member.name}
          </h1>
          <span className="rounded-lg bg-surface-subtle px-2 py-1 text-xs font-semibold text-text-secondary">
            {roleLabel(member.role)}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {member.role === 'pending' && (
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
              disabled={processing}
              type="button"
              onClick={() => setConfirmAction('approve')}
            >
              회원 부여
            </button>
          )}
          {member.role === 'member' && (
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
              disabled={processing}
              type="button"
              onClick={() => setConfirmAction('cancel')}
            >
              회원 취소
            </button>
          )}
        </div>
        {errorMessage && (
          <p className="mt-3 text-sm text-status-error-text">{errorMessage}</p>
        )}
      </div>

      <dl className="m-0 grid gap-3 rounded-xl border border-border-default bg-surface-base p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">회원번호</dt>
          <dd className="m-0">{member.member_number ?? '미부여'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">연락처</dt>
          <dd className="m-0">{member.phone}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">이메일</dt>
          <dd className="m-0 break-all">{member.email}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">주소</dt>
          <dd className="m-0">{member.address}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">근무지/학교</dt>
          <dd className="m-0">{member.workplace_or_school || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">면허번호</dt>
          <dd className="m-0">{member.license_number || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">가입일</dt>
          <dd className="m-0">{formatDate(member.created_at)}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">승인일</dt>
          <dd className="m-0">{formatDate(member.approved_at)}</dd>
        </div>
      </dl>
      {member.role !== 'admin' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="mb-3 text-sm font-semibold text-red-700">관리자 권한</p>
          <button
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65 sm:w-auto"
            disabled={processing}
            type="button"
            onClick={() => setConfirmAction('admin')}
          >
            관리자 부여
          </button>
        </div>
      )}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
              회원 관리
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              {confirmContent.title}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {confirmContent.description}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className={
                  confirmContent.variant === 'primary'
                    ? 'inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65'
                    : 'inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65'
                }
                disabled={processing}
                type="button"
                onClick={handleConfirmAction}
              >
                {processing ? '처리 중' : confirmContent.confirmText}
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                disabled={processing}
                type="button"
                onClick={() => setConfirmAction(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
