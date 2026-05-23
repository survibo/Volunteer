import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="grid gap-[18px]">
      <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">404</p>
      <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
        페이지를 찾을 수 없습니다.
      </h1>
      <Link
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] md:w-auto"
        to="/volunteer"
      >
        홈으로 이동
      </Link>
    </section>
  )
}
