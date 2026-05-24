import { Link } from 'react-router'

export default function PublicDetailFrame({ children }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-border-default bg-white px-4 py-3 md:px-6">
        <div className="min-w-0 text-sm font-bold text-text-secondary">
          <span className="text-black text-lg">K-SPARA</span>
        </div>
        <Link
          className="rounded-lg bg-action-default px-3 py-2 text-sm font-semibold text-white"
          to={`/?redirect=${encodeURIComponent(window.location.pathname)}`}
        >
          로그인
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6 md:py-14">
        {children}
      </main>
    </div>
  )
}
