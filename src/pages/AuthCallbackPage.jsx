import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCurrentProfile, getHomePath } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('로그인 상태를 확인하고 있습니다.')

  useEffect(() => {
    let mounted = true

    async function routeAfterOAuth() {
      try {
        const code = new URLSearchParams(window.location.search).get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error && !error.message.toLowerCase().includes('invalid flow state')) {
            throw error
          }
        }

        const { session, profile } = await getCurrentProfile()

        if (!mounted) {
          return
        }

        if (!session) {
          navigate('/', { replace: true })
          return
        }

        navigate(getHomePath(profile), { replace: true })
      } catch (error) {
        if (mounted) {
          setMessage(error.message)
        }
      }
    }

    routeAfterOAuth()

    return () => {
      mounted = false
    }
  }, [navigate])

  return (
    <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[380px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">OAuth</p>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          처리 중
        </h1>
        <p className="mt-4 text-sm text-text-secondary">{message}</p>
      </section>
    </main>
  )
}
