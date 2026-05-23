import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import ActivityForm from '../../components/ActivityForm'

export default function AdminActivityEditPage({ table, redirectTo, sectionLabel, pageTitle, profile }) {
  const { id } = useParams()
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  if (loading) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-status-error-text">{errorMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <ActivityForm
      table={table}
      redirectTo={redirectTo}
      sectionLabel={sectionLabel}
      pageTitle={pageTitle}
      profile={profile}
      initialData={initialData}
    />
  )
}
