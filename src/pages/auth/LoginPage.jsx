import { useState } from 'react'
import { signInWithOAuth } from '../../lib/auth'

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingProvider, setLoadingProvider] = useState('')

  async function signIn(provider) {
    setErrorMessage('')
    setLoadingProvider(provider)

    try {
      await signInWithOAuth(provider)
    } catch (error) {
      setErrorMessage(error.message)
      setLoadingProvider('')
    }
  }

  return (
    <main className="flex min-h-full flex-col overflow-y-auto px-4 py-8 md:p-6">
      <section className="m-auto w-full max-w-[440px] rounded-xl border border-border-default bg-surface-base p-6 md:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">봉사활동 및 교육 신청</p>
        <h1 className="text-4xl font-bold leading-tight text-text-primary md:text-6xl">
          Volunteer
        </h1>
        <p className="mt-4 text-sm text-text-secondary">
          OAuth 로그인 후 가입 정보를 입력하면 준회원으로 등록됩니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            className="min-h-[44px] w-full cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 md:w-auto"
            disabled={loadingProvider !== ''}
            type="button"
            onClick={() => signIn('google')}
          >
            {loadingProvider === 'google' ? 'Google 연결 중' : 'Google로 로그인'}
          </button>
          <button
            className="min-h-[44px] w-full cursor-pointer rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65 md:w-auto"
            disabled={loadingProvider !== ''}
            type="button"
            onClick={() => signIn('kakao')}
          >
            {loadingProvider === 'kakao' ? 'Kakao 연결 중' : 'Kakao로 로그인'}
          </button>
        </div>
        {errorMessage && <p className="mt-3.5 text-sm leading-normal text-status-error-text">{errorMessage}</p>}
      </section>
    </main>
  )
}
