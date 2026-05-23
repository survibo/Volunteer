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
    <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
      <section className="w-full max-w-[380px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
        <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">OAuth</p>
        <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
          처리 중
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{message}</p>
      </section>
    </main>
  )
}
