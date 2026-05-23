export default function EducationPage() {
  return (
    <section className="grid gap-[18px]">
      <p className="mb-2.5 text-[13px] font-extrabold text-[var(--accent-dark)]">교육</p>
      <h1 className="text-[30px] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] md:text-[48px]">
        모집 중인 교육
      </h1>
      <div className="rounded-[var(--radius-lg)] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] ring-1 ring-white/60 backdrop-blur-xl">
        <strong>등록된 교육이 없습니다.</strong>
        <p className="mt-2 text-[var(--text-secondary)]">관리자가 교육을 개설하면 이곳에 표시됩니다.</p>
      </div>
    </section>
  )
}
