import { Link } from 'react-router'

export default function PendingPage({ profile }) {
  return (
    <section className="grid gap-[18px]">
      <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">승인 대기</p>
      <h1 className="max-w-3xl text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
        {profile.name}님, 준회원 등록이 완료되었습니다.
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
        가입비 확인 후 관리자가 회원번호를 부여합니다. 준회원 상태에서도 봉사활동과 교육 신청은 이용할 수 있습니다.
      </p>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-5 font-extrabold text-white shadow-[0_12px_26px_rgba(22,101,52,0.22)] hover:bg-[#14532d] md:w-auto"
          to="/volunteer"
        >
          봉사활동 보기
        </Link>
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/70 px-5 font-extrabold text-[var(--text-primary)] hover:border-[var(--border-strong)] md:w-auto"
          to="/education"
        >
          교육 보기
        </Link>
      </div>
    </section>
  )
}
