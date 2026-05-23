import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ActivityForm from '../../components/ActivityForm'

export default function AdminActivityEditPage({ table, redirectTo, sectionLabel, pageTitle, profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()

      if (!mounted) return

      if (error) {
        setErrorMessage(error.message)
      } else {
        setInitialData(data)
      }
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [id, table])

  async function handleDelete() {
    setDeleting(true)

    const { error } = await supabase.from(table).delete().eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      setDeleting(false)
      setShowDeleteModal(false)
      return
    }

    navigate(redirectTo, { replace: true })
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

  if (errorMessage && !initialData) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-status-error-text">{errorMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-6">
      <ActivityForm
        table={table}
        redirectTo={redirectTo}
        sectionLabel={sectionLabel}
        pageTitle={pageTitle}
        profile={profile}
        initialData={initialData}
      />
      <div className="border-t border-border-default pt-6">
        <button
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-600 hover:bg-red-100"
          type="button"
          onClick={() => setShowDeleteModal(true)}
        >
          <Trash2 size={18} />
          삭제하기
        </button>
      </div>
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-text-primary">삭제 확인</h2>
            <p className="mt-2 text-sm text-text-secondary">
              이 {sectionLabel}을(를) 삭제하시겠습니까?<br />
              관련된 모든 신청 내역도 함께 삭제됩니다.
            </p>
            {errorMessage && (
              <p className="mt-3 text-sm text-status-error-text">{errorMessage}</p>
            )}
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={deleting}
                type="button"
                onClick={handleDelete}
              >
                {deleting ? '삭제 중' : '삭제'}
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                type="button"
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
