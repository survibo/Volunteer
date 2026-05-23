import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCurrentProfile, getHomePath } from '../lib/auth'
import { supabase } from '../lib/supabase'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  workplace_or_school: '',
  license_number: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

    const payload = {
      id: session.user.id,
      role: 'pending',
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      workplace_or_school: form.workplace_or_school.trim(),
      license_number: form.license_number.trim() || null,
    }

    const { error } = await supabase.from('users').insert(payload)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    navigate('/pending', { replace: true })
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
        <section className="w-full max-w-[380px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
          <p className="text-base leading-relaxed text-[var(--text-secondary)]">가입 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
      <section className="w-full max-w-[720px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
        <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">가입 정보</p>
        <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
          준회원 등록
        </h1>
        <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
            이름
            <input
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
              name="name"
              required
              value={form.name}
              onChange={updateField}
            />
          </label>
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
          <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
            주소
            <input
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
              name="address"
              required
              value={form.address}
              onChange={updateField}
            />
          </label>
          <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
            근무지 or 학교명
            <input
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
              name="workplace_or_school"
              required
              value={form.workplace_or_school}
              onChange={updateField}
            />
          </label>
          <label className="grid gap-2 text-[13px] font-bold text-[var(--text-secondary)]">
            면허번호
            <input
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-[var(--text-primary)] shadow-inner"
              name="license_number"
              value={form.license_number}
              onChange={updateField}
            />
          </label>
          {errorMessage && <p className="col-span-full mt-3.5 text-sm leading-normal text-[var(--red)]">{errorMessage}</p>}
          <button
            className="col-span-full min-h-[44px] cursor-pointer rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] disabled:cursor-progress disabled:opacity-65"
            disabled={saving}
            type="submit"
          >
            {saving ? '등록 중' : '준회원 등록'}
          </button>
        </form>
      </section>
    </main>
  )
}
