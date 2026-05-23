import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

export default function MyPageEditPage({ profile }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    phone: profile.phone ?? '',
    email: profile.email ?? '',
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

    const phone = form.phone.trim()
    const email = form.email.trim()

    if (!phone || !email) {
      setSaving(false)
      setErrorMessage('연락처와 이메일을 모두 입력해 주세요.')
      return
    }

    const { error } = await supabase.rpc('update_own_profile', {
      new_name: profile.name,
      new_phone: phone,
      new_email: email,
      new_address: profile.address,
      new_workplace_or_school: profile.workplace_or_school,
      new_license_number: profile.license_number,
    })

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    navigate('/mypage', { replace: true })
  }

  return (
    <section className="grid gap-[18px]">
      <div>
        <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">마이페이지</p>
        <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
          연락처/이메일 수정
        </h1>
      </div>

      <form
        className="grid gap-4 rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
          연락처
          <input
            className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
            name="phone"
            required
            value={form.phone}
            onChange={updateField}
          />
        </label>
        <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
          이메일
          <input
            className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
            name="email"
            required
            type="email"
            value={form.email}
            onChange={updateField}
          />
        </label>

        {errorMessage && <p className="text-sm leading-normal text-[var(--red)]">{errorMessage}</p>}

        <div className="flex flex-wrap gap-2.5">
          <button
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] disabled:cursor-progress disabled:opacity-65 sm:w-auto"
            disabled={saving}
            type="submit"
          >
            {saving ? '저장 중' : '저장'}
          </button>
          <Link
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/70 px-5 font-extrabold text-[var(--text-primary)] hover:border-[var(--border-strong)] sm:w-auto"
            to="/mypage"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  )
}
