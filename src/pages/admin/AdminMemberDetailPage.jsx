import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router'
import TopLoadingBar from '../../components/TopLoadingBar'
import { downloadMemberCert } from '../../lib/pdfCert'
import {
  useMember,
  useApproveMember,
  useCancelMemberApproval,
  useGrantAdmin,
  useSetUserChip,
  useSetUserMemo,
} from '../../hooks/useMembers'
import UserAvatar from '../../components/UserAvatar'

const CHIP_COLORS = [
  { name: '빨강', value: 'red', bg: '#EF4444' },
  { name: '주황', value: 'orange', bg: '#F97316' },
  { name: '노랑', value: 'yellow', bg: '#EAB308' },
  { name: '초록', value: 'green', bg: '#22C55E' },
  { name: '파랑', value: 'blue', bg: '#3B82F6' },
  { name: '남색', value: 'indigo', bg: '#6366F1' },
  { name: '보라', value: 'purple', bg: '#A855F7' },
  { name: '분홍', value: 'pink', bg: '#EC4899' },
  { name: '갈색', value: 'brown', bg: '#92400E' },
  { name: '회색', value: 'gray', bg: '#6B7280' },
]

const CHIP_STYLES = {
  red:    { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
  orange: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  yellow: { bg: '#FEFCE8', border: '#FEF08A', text: '#A16207' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  blue:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  indigo: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
  purple: { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE' },
  pink:   { bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D' },
  brown:  { bg: '#FFF7ED', border: '#FED7AA', text: '#92400E' },
  gray:   { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' },
}

function parseChip(value) {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

function roleLabel(role) {
  if (role === 'admin') return '관리자'
  if (role === 'member') return '정회원'
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
      title: '회원번호를 입력해 주세요',
      description: `${memberName}님을 회원으로 전환합니다. 형식: YY-NNNN`,
      confirmText: '회원 부여',
      variant: 'primary',
    }
  }

  if (action === 'admin') {
    return {
      title: '관리자로 부여할까요?',
      description: `${memberName}님을 관리자로 전환합니다.`,
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
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [memberNumberInput, setMemberNumberInput] = useState('')

  const {
    data: member,
    isLoading,
    isError,
    error: queryError,
  } = useMember(id)
  const approveMutation = useApproveMember()
  const cancelMutation = useCancelMemberApproval()
  const grantMutation = useGrantAdmin()
  const chipMutation = useSetUserChip()
  const memoMutation = useSetUserMemo()

  const [memoOpen, setMemoOpen] = useState(false)
  const [memoDraft, setMemoDraft] = useState('')
  const [memoError, setMemoError] = useState('')
  const [memoSaved, setMemoSaved] = useState(false)
  const [chipColor, setChipColor] = useState('')
  const [chipLabel, setChipLabel] = useState('')

  useEffect(() => {
    if (member && memoOpen) {
      setMemoDraft(member.memo ?? '')
    }
  }, [member?.memo, memoOpen])

  useEffect(() => {
    const chip = parseChip(member?.user_chip)
    setChipColor(chip?.color ?? '')
    setChipLabel(chip?.label ?? '')
  }, [member?.user_chip])

  const processing = approveMutation.isPending || cancelMutation.isPending || grantMutation.isPending || chipMutation.isPending || memoMutation.isPending

  async function handleConfirmAction() {
    if (!confirmAction) return

    setErrorMessage('')

    if (confirmAction === 'approve') {
      if (!memberNumberInput.match(/^\d{2}-\d{4}$/)) {
        setErrorMessage('회원번호 형식이 올바르지 않습니다. (YY-NNNN)')
        return
      }
      approveMutation.mutate(
        { id, memberNumber: memberNumberInput },
        {
          onSuccess: () => {
            setConfirmAction(null)
            setMemberNumberInput('')
          },
          onError: (error) => setErrorMessage(error.message),
        }
      )
    } else if (confirmAction === 'admin') {
      grantMutation.mutate(
        { id, memberNumber: memberNumberInput || undefined },
        {
          onSuccess: () => {
            setConfirmAction(null)
            setMemberNumberInput('')
          },
          onError: (error) => setErrorMessage(error.message),
        }
      )
    } else {
      cancelMutation.mutate(
        { id },
        {
          onSuccess: () => {
            setConfirmAction(null)
            setMemberNumberInput('')
          },
          onError: (error) => setErrorMessage(error.message),
        }
      )
    }
  }

  if (isLoading) {
    return <TopLoadingBar />
  }

  if (isError || !member) {
    return (
      <section className="grid gap-5 sm:gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-5 sm:p-6">
          <p className="text-sm text-status-error-text">{queryError?.message || '회원을 찾을 수 없습니다.'}</p>
        </div>
      </section>
    )
  }

  const confirmContent = confirmAction
    ? getConfirmContent(confirmAction, member.name)
    : null

  return (
    <section className="grid gap-5 sm:gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to="/admin"
        >
          회원 목록
        </Link>
        <div className="flex items-center gap-4">
          <UserAvatar avatarPath={member.avatar_path} />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
              {member.name}
            </h1>
            <span className="rounded-lg bg-surface-subtle px-2 py-1 text-xs font-semibold text-text-secondary">
              {roleLabel(member.role)}
            </span>
          </div>
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
          <Link
            className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle"
            to={`/admin/members/${id}/history`}
          >
            활동 내역
          </Link>
          {member.role !== 'pending' && (
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65"
              disabled={downloading}
              type="button"
              onClick={async () => {
                setDownloading(true)
                try {
                  await downloadMemberCert(member)
                } catch (e) {
                  setErrorMessage(e.message)
                } finally {
                  setDownloading(false)
                }
              }}
            >
              {downloading ? '생성 중' : '회원증 PDF'}
            </button>
          )}
        </div>
        {errorMessage && (
          <p className="mt-3 text-sm text-status-error-text">{errorMessage}</p>
        )}
      </div>

      <dl className="m-0 grid gap-4 rounded-xl border border-border-default bg-surface-base p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">회원번호</dt>
          <dd className="m-0">{member.member_number ?? '미부여'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">연락처</dt>
          <dd className="m-0">{member.phone}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">이메일</dt>
          <dd className="m-0 break-all">{member.email}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">주소</dt>
          <dd className="m-0">{member.address}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">상세주소</dt>
          <dd className="m-0">{member.address_detail || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">근무지/학교</dt>
          <dd className="m-0">{member.workplace_or_school || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">면허번호</dt>
          <dd className="m-0">{member.license_number || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">생년월일</dt>
          <dd className="m-0">{member.birthday || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">봉사활동 이력</dt>
          <dd className="m-0 whitespace-pre-line">{member.volunteer_experience || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">교육 이력</dt>
          <dd className="m-0 whitespace-pre-line">{member.education_experience || '-'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">가입일</dt>
          <dd className="m-0">{formatDate(member.created_at)}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">승인일</dt>
          <dd className="m-0">{formatDate(member.approved_at)}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-border-default bg-surface-base p-5 sm:p-6">
        <p className="mb-3 text-sm font-semibold text-text-secondary">사용자 칩</p>

        {(chipColor && chipLabel) && (
          <div className="mb-3">
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: CHIP_STYLES[chipColor]?.bg ?? '#F9FAFB',
                borderColor: CHIP_STYLES[chipColor]?.border ?? '#E5E7EB',
                color: CHIP_STYLES[chipColor]?.text ?? '#374151',
              }}
            >
              {chipLabel}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {CHIP_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={processing}
              className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-all hover:scale-110 disabled:cursor-progress disabled:opacity-65 ${chipColor === c.value ? 'border-text-primary' : 'border-border-default'}`}
              style={{ backgroundColor: c.bg }}
              title={c.name}
              onClick={() => setChipColor(c.value)}
            />
          ))}
        </div>

        {chipColor && (
          <div className="mt-3 grid gap-2.5">
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-sm text-text-primary placeholder:text-text-tertiary"
              placeholder="칩 텍스트 (최대 10자)"
              maxLength={10}
              value={chipLabel}
              onChange={(e) => setChipLabel(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={processing || !chipLabel}
                className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
                onClick={() =>
                  chipMutation.mutate({ id, color: chipColor, label: chipLabel })
                }
              >
                저장
              </button>
              {parseChip(member?.user_chip) && (
                <button
                  type="button"
                  disabled={processing}
                  className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65"
                  onClick={() => chipMutation.mutate({ id, color: '', label: '' })}
                >
                  없음
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border-default bg-surface-base p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-secondary">메모</p>
          <button
            type="button"
            className="inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white px-3 text-xs font-medium text-text-primary hover:bg-surface-subtle"
            onClick={() => setMemoOpen(!memoOpen)}
          >
            {memoOpen ? '닫기' : member.memo ? '수정' : '작성'}
          </button>
        </div>
        {memoOpen && (
          <div className="mt-3 grid gap-2.5">
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-border-default bg-white p-3 text-sm text-text-primary placeholder:text-text-tertiary"
              placeholder="메모를 입력하세요"
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              autoFocus
            />
            {memoError && (
              <p className="text-sm text-status-error-text">{memoError}</p>
            )}
            {memoSaved && (
              <p className="text-sm text-status-success-text">저장됨</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={processing}
                className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
                onClick={() => {
                  setMemoError('')
                  setMemoSaved(false)
                  memoMutation.mutate(
                    { id, memoText: memoDraft },
                    {
                      onSuccess: () => {
                        setMemoSaved(true)
                        setTimeout(() => setMemoSaved(false), 2000)
                      },
                      onError: (e) => setMemoError(e.message),
                    },
                  )
                }}
              >
                저장
              </button>
              <button
                type="button"
                disabled={processing}
                className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-lg border border-border-default bg-white px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
                onClick={() => {
                  setMemoDraft(member.memo ?? '')
                  setMemoOpen(false)
                  setMemoError('')
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
        {!memoOpen && member.memo && (
          <p className="mt-2 whitespace-pre-line text-sm text-text-primary">
            {member.memo.split('\n')[0]}
            {member.memo.includes('\n') && (
              <button
                type="button"
                className="inline cursor-pointer text-text-tertiary hover:underline"
                onClick={() => setMemoOpen(true)}
              >
                {' '}... 더보기
              </button>
            )}
          </p>
        )}
      </div>

      {member.role !== 'admin' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6">
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
            className="w-full max-w-sm rounded-xl bg-surface-base p-5 shadow-lg sm:p-6"
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
            {confirmAction === 'approve' && (
              <input
                className="mt-4 min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
                placeholder="YY-NNNN (예: 25-0001)"
                value={memberNumberInput}
                onChange={(e) => setMemberNumberInput(e.target.value)}
                autoFocus
              />
            )}
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
