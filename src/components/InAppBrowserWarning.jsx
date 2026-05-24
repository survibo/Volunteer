import { useState } from 'react'
import { isInAppBrowser } from '../lib/detectBrowser'

export default function InAppBrowserWarning({ onClose }) {
  const [copied, setCopied] = useState(false)

  function openExternal() {
    const url = window.location.href
    if (/android/i.test(navigator.userAgent)) {
      const parsed = new URL(url)
      const intentUrl = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=com.android.chrome;end`
      window.location.href = intentUrl
    } else {
      // iOS: can't force open external browser directly
      copyUrl()
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
    }
  }

  function proceedHere() {
    onClose?.()
  }

  if (!isInAppBrowser()) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-surface-base p-5 shadow-lg sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-lg">
            ⚠️
          </span>
          <h2 className="text-lg font-bold text-text-primary">
            외부 브라우저가 필요합니다
          </h2>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          카카오톡 등 인앱 브라우저에서는 Google 로그인이 제한됩니다.
          아래 버튼으로 Safari나 Chrome에서 열어주세요.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover"
            onClick={openExternal}
          >
            {/android/i.test(navigator.userAgent)
              ? 'Chrome으로 열기'
              : 'Safari에서 열기'}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
            onClick={copyUrl}
          >
            {copied ? '복사됨' : '링크 복사'}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-secondary hover:bg-surface-subtle"
            onClick={proceedHere}
          >
            여기서 계속 진행
          </button>
        </div>
      </div>
    </div>
  )
}
