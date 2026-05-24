import { useRegisterSW } from 'virtual:pwa-register/react'

const SW_UPDATE_INTERVAL = 30 * 60 * 1000

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => registration.update(), SW_UPDATE_INTERVAL)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-border-default bg-surface-base p-4 shadow-lg">
      <p className="flex-1 text-sm text-text-primary">
        {offlineReady
          ? '오프라인에서도 사용할 수 있습니다'
          : '새로운 버전이 있습니다. 업데이트하려면 새로고침을 눌러주세요.'}
      </p>
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-action-default px-3 py-1.5 text-sm font-medium text-action-foreground transition-colors hover:bg-action-hover"
        >
          새로고침
        </button>
      )}
      <button
        onClick={close}
        className="rounded-lg px-2 py-1.5 text-sm text-text-tertiary transition-colors hover:text-text-primary"
      >
        닫기
      </button>
    </div>
  )
}
