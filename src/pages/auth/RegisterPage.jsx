import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { cancelRegistration, createPendingProfile, getCurrentProfile, getHomePath } from '../../lib/auth'
import { uploadAvatar } from '../../lib/storageApi'
import AvatarCropper from '../../components/AvatarCropper'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  address_detail: '',
  workplace_or_school: '',
  license_number: '',
  volunteer_experience: '',
  education_experience: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPostcode, setShowPostcode] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)

  function handlePostcodeComplete(data) {
    let fullAddress = data.address
    if (data.addressType === 'R') {
      const extra = [data.bname, data.buildingName].filter(Boolean).join(', ')
      if (extra) fullAddress += ` (${extra})`
    }
    setForm((current) => ({ ...current, address: fullAddress }))
    setShowPostcode(false)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const result = await getCurrentProfile()

        if (!mounted) {
          return
        }

        if (!result.session) {
          navigate('/', { replace: true })
          return
        }

        if (result.profile) {
          navigate(getHomePath(result.profile), { replace: true })
          return
        }

        setSession(result.session)
        setForm((current) => ({
          ...current,
          email: result.user.email ?? '',
          name: result.user.user_metadata?.full_name ?? result.user.user_metadata?.name ?? '',
        }))
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

    return () => {
      mounted = false
    }
  }, [navigate])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const name = form.name.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const address = form.address.trim()
    const address_detail = form.address_detail.trim() || ''
    const workplace_or_school = form.workplace_or_school.trim()
    const license_number = form.license_number.trim() || null
    const volunteer_experience = form.volunteer_experience.trim() || null
    const education_experience = form.education_experience.trim() || null

    if (!name || !phone || !email || !address || !address_detail || !workplace_or_school) {
      setSaving(false)
      setErrorMessage('필수 항목을 모두 입력해 주세요.')
      return
    }

    let avatar_path = null
    if (avatarFile) {
      try {
        avatar_path = await uploadAvatar(avatarFile)
      } catch (error) {
        setSaving(false)
        setErrorMessage('사진 업로드에 실패했습니다: ' + error.message)
        return
      }
    }

    const payload = {
      id: session.user.id,
      role: 'pending',
      name,
      phone,
      email,
      address,
      address_detail,
      workplace_or_school,
      license_number,
      volunteer_experience,
      education_experience,
      avatar_path,
    }

    try {
      await createPendingProfile(payload)
      navigate(getHomePath({ role: 'pending' }), { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setErrorMessage('')

    try {
      await cancelRegistration()
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen flex-col overflow-y-auto px-4 py-8 md:p-6">
        <section className="m-auto w-full max-w-[380px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
          <p className="text-sm text-text-secondary">가입 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="flex h-screen flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[720px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">가입 정보</p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          회원 가입
        </h1>
        <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>이름 <span className="text-status-error-text">*</span></span>
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="name"
              required
              value={form.name}
              onChange={updateField}
            />
          </label>
          <div className="col-span-full grid gap-3">
            <p className="text-xs font-semibold text-text-secondary">증명사진</p>
            <input
              className="block w-full text-sm text-text-primary file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-action-default file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-action-hover"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setCropSrc(URL.createObjectURL(file))
                }
                e.target.value = ''
              }}
            />
            {avatarPreview && (
              <div className="relative w-32">
                <img className="h-32 w-32 rounded-full object-cover" src={avatarPreview} alt="" />
                <button
                  className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-status-error-text text-white hover:opacity-80"
                  type="button"
                  onClick={() => {
                    setAvatarFile(null)
                    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                    setAvatarPreview(null)
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {cropSrc && (
            <AvatarCropper
              imageSrc={cropSrc}
              onCropComplete={(blob, error) => {
                URL.revokeObjectURL(cropSrc)
                setCropSrc(null)
                if (error) {
                  setErrorMessage(error)
                  return
                }
                setAvatarFile(blob)
                setAvatarPreview(URL.createObjectURL(blob))
              }}
              onCancel={() => {
                URL.revokeObjectURL(cropSrc)
                setCropSrc(null)
              }}
            />
          )}
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>연락처 <span className="text-status-error-text">*</span></span>
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="phone"
              required
              value={form.phone}
              onChange={updateField}
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>이메일 <span className="text-status-error-text">*</span></span>
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="email"
              required
              type="email"
              value={form.email}
              onChange={updateField}
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>주소 <span className="text-status-error-text">*</span></span>
            <div className="flex gap-2">
              <input
                className="min-h-11 flex-1 rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
                name="address"
                required
                readOnly
                value={form.address}
                placeholder="주소 검색 버튼을 눌러주세요"
              />
              <button
                className="min-h-11 cursor-pointer rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover"
                type="button"
                onClick={() => setShowPostcode(true)}
              >
                검색
              </button>
            </div>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>상세주소 <span className="text-status-error-text">*</span></span>
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="address_detail"
              required
              value={form.address_detail}
              onChange={updateField}
              placeholder="건물명, 동/호수 등"
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            <span>근무지 or 학교명 <span className="text-status-error-text">*</span></span>
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="workplace_or_school"
              required
              value={form.workplace_or_school}
              onChange={updateField}
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-text-secondary">
            면허번호
            <input
              className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
              name="license_number"
              value={form.license_number}
              onChange={updateField}
              inputMode="numeric"
            />
          </label>
          <label className="col-span-full grid gap-2 text-xs font-semibold text-text-secondary">
            봉사활동 이력
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
              name="volunteer_experience"
              value={form.volunteer_experience}
              onChange={updateField}
              placeholder="이전 봉사활동 경험이 있다면 입력해 주세요."
              rows={3}
            />
          </label>
          <label className="col-span-full grid gap-2 text-xs font-semibold text-text-secondary">
            교육 이력
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
              name="education_experience"
              value={form.education_experience}
              onChange={updateField}
              placeholder="수료한 교육이나 관련 교육 이력이 있다면 입력해 주세요."
              rows={3}
            />
          </label>
          {errorMessage && <p className="col-span-full text-sm leading-normal text-status-error-text">{errorMessage}</p>}
          <button
            className="col-span-full min-h-[44px] cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
            disabled={saving}
            type="submit"
          >
            {saving ? '등록 중' : '회원 등록'}
          </button>
          <button
            className="col-span-full min-h-[44px] cursor-pointer rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
            type="button"
            disabled={saving || cancelling}
            onClick={() => setShowCancelConfirm(true)}
          >
            {cancelling ? '취소 중' : '회원가입 취소하기'}
          </button>
        </form>

        {showCancelConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowCancelConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
                회원가입 취소
              </p>
              <h2 className="text-lg font-bold text-text-primary">
                정말 취소하시겠어요?
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                가입 정보가 저장되지 않으며 이전 화면으로 돌아갑니다.
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                  disabled={cancelling}
                  type="button"
                  onClick={handleCancel}
                >
                  {cancelling ? '취소 중' : '취소하기'}
                </button>
                <button
                  className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {showPostcode && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12"
          onClick={() => setShowPostcode(false)}
        >
          <div
            className="w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <DaumPostcodeEmbed
              autoClose={false}
              onComplete={handlePostcodeComplete}
              style={{ width: '100%', height: 420 }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
