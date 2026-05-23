export default function AdminPage() {
  return (
    <section className="grid gap-[18px]">
      <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">관리자</p>
      <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
        관리자 대시보드
      </h1>
      <div className="rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl">
        <strong>관리 기능 준비 중</strong>
        <p className="mt-2 text-[var(--text-secondary)]">회원 승인, 봉사활동, 교육 관리는 이 영역에서 확장합니다.</p>
      </div>
    </section>
  )
}
