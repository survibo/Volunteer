import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getOAuthRedirectUrl } from '../lib/auth'

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingProvider, setLoadingProvider] = useState('')

  async function signIn(provider) {
    setErrorMessage('')
    setLoadingProvider(provider)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoadingProvider('')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 md:p-6">
      <section className="w-full max-w-[440px] rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl md:p-8">
        <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">봉사활동 및 교육 신청</p>
        <h1 className="text-[32px] font-black leading-[1.04] tracking-normal text-[var(--text-primary)] md:text-[52px]">
          Volunteer
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
          OAuth 로그인 후 가입 정보를 입력하면 준회원으로 등록됩니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            className="min-h-[44px] w-full cursor-pointer rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] disabled:cursor-progress disabled:opacity-65 md:w-auto"
            disabled={loadingProvider !== ''}
            type="button"
            onClick={() => signIn('google')}
          >
            {loadingProvider === 'google' ? 'Google 연결 중' : 'Google로 로그인'}
          </button>
          <button
            className="min-h-[44px] w-full cursor-pointer rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/70 px-5 font-extrabold text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:cursor-progress disabled:opacity-65 md:w-auto"
            disabled={loadingProvider !== ''}
            type="button"
            onClick={() => signIn('kakao')}
          >
            {loadingProvider === 'kakao' ? 'Kakao 연결 중' : 'Kakao로 로그인'}
          </button>
        </div>
        {errorMessage && <p className="mt-3.5 text-sm leading-normal text-[var(--red)]">{errorMessage}</p>}
      </section>
    </main>
  )
}
