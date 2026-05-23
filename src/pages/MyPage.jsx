import { Link } from 'react-router'

export default function MyPage({ profile }) {
  return (
    <section className="grid gap-[18px]">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">마이페이지</p>
          <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
            {profile.name}
          </h1>
        </div>
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] sm:w-auto"
          to="/mypage/edit"
        >
          연락처/이메일 수정
        </Link>
      </div>
      <dl className="m-0 grid gap-3 rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-bold text-[var(--text-secondary)]">회원번호</dt>
          <dd className="m-0">{profile.member_number ?? '미부여'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-bold text-[var(--text-secondary)]">연락처</dt>
          <dd className="m-0">{profile.phone}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-bold text-[var(--text-secondary)]">이메일</dt>
          <dd className="m-0">{profile.email}</dd>
        </div>
      </dl>
    </section>
  )
}
