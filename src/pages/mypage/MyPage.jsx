import { Link } from 'react-router'

export default function MyPage({ profile }) {
  return (
    <section className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">마이페이지</p>
          <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
            {profile.name}
          </h1>
        </div>
        <Link
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover sm:w-auto"
          to="/mypage/edit"
        >
          프로필 수정
        </Link>
      </div>
      <dl className="m-0 grid gap-3 rounded-xl border border-border-default bg-surface-base p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">회원번호</dt>
          <dd className="m-0">{profile.member_number ?? '미부여'}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">연락처</dt>
          <dd className="m-0">{profile.phone}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">이메일</dt>
          <dd className="m-0">{profile.email}</dd>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
          <dt className="font-medium text-text-secondary">근무지/학교</dt>
          <dd className="m-0">{profile.workplace_or_school || '-'}</dd>
        </div>
      </dl>
    </section>
  )
}
