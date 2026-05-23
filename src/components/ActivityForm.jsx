import { useState } from 'react'
import { useNavigate } from 'react-router'
import { X } from 'lucide-react'
import { createActivity, getActivityKind, updateActivity } from '../lib/activityApi'
import { getImageUrl, parseImagePaths, uploadActivityImages } from '../lib/storageApi'
import ImageWithFallback from './ImageWithFallback'

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

function toDateOnly(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const emptyForm = {
  title: '',
  description: '',
  location: '',
  application_deadline: '',
  starts_at: '',
  ends_at: '',
  capacity: '',
}

function buildInitial(initialData) {
  if (!initialData) return emptyForm
  return {
    title: initialData.title ?? '',
    description: initialData.description ?? '',
    location: initialData.location ?? '',
    application_deadline: toDatetimeLocal(initialData.application_deadline),
    starts_at: toDateOnly(initialData.starts_at),
    ends_at: toDateOnly(initialData.ends_at),
    capacity: String(initialData.capacity ?? ''),
  }
}

export default function ActivityForm({ table, redirectTo, sectionLabel, pageTitle, profile, initialData }) {
  const navigate = useNavigate()
  const kind = getActivityKind(table)
  const isEdit = !!initialData
  const [form, setForm] = useState(() => buildInitial(initialData))
  const [existingPaths, setExistingPaths] = useState(() => parseImagePaths(initialData?.image_path))
  const [newFiles, setNewFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function updateField(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files ?? [])
    setNewFiles((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))])
    e.target.value = ''
  }

  function removeExisting(index) {
    setExistingPaths((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewFile(index) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const title = form.title.trim()
    const location = form.location.trim()
    const capacity = parseInt(form.capacity, 10)

    if (!title || !location || !form.application_deadline || !form.starts_at || !form.ends_at || !form.capacity) {
      setSaving(false)
      setErrorMessage('모든 필수 항목을 입력해 주세요.')
      return
    }

    if (capacity < 1) {
      setSaving(false)
      setErrorMessage('정원은 1명 이상이어야 합니다.')
      return
    }

    let allPaths = [...existingPaths]

    if (newFiles.length > 0) {
      try {
        const newPaths = await uploadActivityImages(kind, newFiles.map(({ file }) => file))
        allPaths = [...allPaths, ...newPaths]
      } catch (error) {
        setSaving(false)
        setErrorMessage(error.message)
        return
      }
    }

    const payload = {
      title,
      description: form.description.trim() || null,
      image_path: allPaths.length > 0 ? JSON.stringify(allPaths) : null,
      location,
      application_deadline: new Date(form.application_deadline).toISOString(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      capacity,
    }

    let error

    try {
      if (isEdit) {
        await updateActivity(kind, initialData.id, payload)
      } else {
        await createActivity(kind, { ...payload, created_by: profile.id })
      }
    } catch (caughtError) {
      error = caughtError
    }

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    newFiles.forEach((f) => URL.revokeObjectURL(f.preview))
    navigate(redirectTo, { replace: true })
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
          {sectionLabel}
        </p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {pageTitle}
        </h1>
      </div>

      <form
        className="grid gap-4 rounded-xl border border-border-default bg-surface-base p-6 md:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-2 text-xs font-semibold text-text-secondary md:col-span-2">
          제목
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="title"
            required
            value={form.title}
            onChange={updateField}
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary md:col-span-2">
          설명
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border border-border-default bg-white px-3 py-2 text-text-primary placeholder:text-text-tertiary"
            name="description"
            value={form.description}
            onChange={updateField}
          />
        </label>

        <div className="grid gap-3 md:col-span-2">
          <p className="text-xs font-semibold text-text-secondary">이미지</p>
          <input
            className="block w-full text-sm text-text-primary file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-action-default file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-action-hover"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
          />
          {existingPaths.length > 0 || newFiles.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {existingPaths.map((path, i) => (
                <div key={`e-${i}`} className="group relative">
                  <ImageWithFallback
                    className="h-32 w-full rounded-lg object-cover"
                    src={getImageUrl(kind, path)}
                    alt=""
                  />
                  <button
                    className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-status-error-text text-white hover:opacity-80"
                    type="button"
                    onClick={() => removeExisting(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={`n-${i}`} className="group relative">
                  <img
                    className="h-32 w-full rounded-lg object-cover"
                    src={f.preview}
                    alt=""
                  />
                  <button
                    className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-status-error-text text-white hover:opacity-80"
                    type="button"
                    onClick={() => removeNewFile(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          장소
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="location"
            required
            value={form.location}
            onChange={updateField}
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          정원
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary placeholder:text-text-tertiary"
            name="capacity"
            type="number"
            min="1"
            required
            value={form.capacity}
            onChange={updateField}
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          신청 마감일
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary"
            name="application_deadline"
            type="datetime-local"
            required
            value={form.application_deadline}
            onChange={updateField}
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          시작일
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary"
            name="starts_at"
            type="date"
            required
            value={form.starts_at}
            onChange={updateField}
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold text-text-secondary">
          종료일
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white px-3 text-text-primary"
            name="ends_at"
            type="date"
            required
            value={form.ends_at}
            onChange={updateField}
          />
        </label>

        {errorMessage && (
          <p className="text-sm text-status-error-text md:col-span-2">{errorMessage}</p>
        )}

        <div className="flex flex-wrap gap-2.5 md:col-span-2">
          <button
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 sm:w-auto"
            disabled={saving}
            type="submit"
          >
            {saving ? '저장 중' : isEdit ? '저장' : '생성'}
          </button>
          <button
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle sm:w-auto"
            type="button"
            onClick={() => navigate(redirectTo)}
          >
            취소
          </button>
        </div>
      </form>
    </section>
  )
}
