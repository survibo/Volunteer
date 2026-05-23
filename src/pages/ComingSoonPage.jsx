import { Link } from 'react-router'

export default function ComingSoonPage() {
  return (
    <section className="grid gap-6">
      <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
        준비 중
      </h1>
      <div className="rounded-xl border border-border-default bg-surface-base p-6">
        <p className="text-sm text-text-secondary">해당 기능은 준비 중입니다.</p>
      </div>
      <Link
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover md:w-auto"
        to="/volunteer"
      >
        봉사활동 보기
      </Link>
    </section>
  )
}
