import { Link } from 'react-router'

export default function PendingPage({ profile }) {
  return (
    <section className="grid gap-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">승인 대기</p>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight text-text-primary md:text-5xl">
        {profile.name}님, 준회원 등록이 완료되었습니다.
      </h1>
      <p className="max-w-2xl text-sm text-text-secondary">
        가입비 확인 후 관리자가 회원번호를 부여합니다. 준회원 상태에서도 봉사활동과 교육 신청은 이용할 수 있습니다.
      </p>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover md:w-auto"
          to="/volunteer"
        >
          봉사활동 보기
        </Link>
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle md:w-auto"
          to="/education"
        >
          교육 보기
        </Link>
      </div>
    </section>
  )
}
