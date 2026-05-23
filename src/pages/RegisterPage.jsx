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

    navigate('/volunteer', { replace: true })
  }

  if (loading) {
    return (
      <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
        <section className="m-auto w-full max-w-[380px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
          <p className="text-sm text-text-secondary">가입 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[720px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">가입 정보</p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          준회원 등록
        </h1>
        <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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
            근무지 or 학교명
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
            />
          </label>
          {errorMessage && <p className="col-span-full mt-3.5 text-sm leading-normal text-status-error-text">{errorMessage}</p>}
          <button
            className="col-span-full min-h-[44px] cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
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
