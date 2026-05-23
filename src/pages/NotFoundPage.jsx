import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="grid gap-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">404</p>
      <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
        페이지를 찾을 수 없습니다.
      </h1>
      <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover md:w-auto"
        to="/volunteer"
      >
        홈으로 이동
      </Link>
    </section>
  )
}
