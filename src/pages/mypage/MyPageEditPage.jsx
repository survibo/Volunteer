import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { updateOwnProfile } from '../../lib/auth'

export default function MyPageEditPage({ profile }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    address: profile.address ?? '',
    workplace_or_school: profile.workplace_or_school ?? '',
    license_number: profile.license_number ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
    const workplace_or_school = form.workplace_or_school.trim()
    const license_number = form.license_number.trim()

    if (!name || !phone || !email || !address) {
      setSaving(false)
      setErrorMessage('이름, 연락처, 이메일, 주소를 모두 입력해 주세요.')
      return
    }

    try {
      await updateOwnProfile({
        name,
        phone,
        email,
        address,
        workplace_or_school,
        license_number: license_number || null,
      })
      navigate('/mypage', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">마이페이지</p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          프로필 수정
        </h1>
      </div>

      <form
        className="grid gap-4 rounded-xl border border-border-default bg-surface-base p-6"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          이름
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="name"
            required
            value={form.name}
            onChange={updateField}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          연락처
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="phone"
            required
            value={form.phone}
            onChange={updateField}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          이메일
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
          주소
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="address"
            required
            value={form.address}
            onChange={updateField}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          근무지 또는 학교
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="workplace_or_school"
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
          />
        </label>

        {errorMessage && <p className="text-sm leading-normal text-status-error-text">{errorMessage}</p>}

        <div className="flex flex-wrap gap-2.5">
          <button
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 sm:w-auto"
            disabled={saving}
            type="submit"
          >
            {saving ? '저장 중' : '저장'}
          </button>
          <Link
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle sm:w-auto"
            to="/mypage"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  )
}
