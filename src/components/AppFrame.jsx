import { Link, useLocation, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/pending", label: "대기" },
  { to: "/volunteer", label: "봉사활동" },
  { to: "/education", label: "교육" },
  { to: "/mypage", label: "마이페이지" },
];

const adminNavItem = { to: "/admin", label: "관리자" };

export default function AppFrame({ profile, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleNavItems =
    profile?.role === "admin" ? [...navItems, adminNavItem] : navItems;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 grid min-h-[72px] grid-cols-1 items-center gap-[18px] border-b border-white/70 bg-white/70 px-4 py-3.5 shadow-[0_10px_34px_rgba(20,32,24,0.08)] backdrop-blur-xl md:grid-cols-[auto_1fr_auto] md:px-6">
        <div className="flex items-center justify-between gap-2.5 text-sm font-bold text-[var(--text-secondary)] md:justify-start">
          <span className="text-black text-lg">{profile?.name}</span>
          <button
            className="min-h-[34px] cursor-pointer rounded-[var(--radius-pill)] border border-red-100 bg-red-100 px-3 font-bold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--accent-dark)]"
            type="button"
            onClick={handleSignOut}
          >
            로그아웃
          </button>
        </div>
        <nav className="flex flex-wrap gap-1.5" aria-label="주요 메뉴">
          {visibleNavItems.map((item) => (
            <Link
              className={
                location.pathname.startsWith(item.to)
                  ? "rounded-[var(--radius-pill)] bg-[var(--accent-dark)] px-3 py-2 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(22,101,52,0.22)]"
                  : "rounded-[var(--radius-pill)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--accent-dark)]"
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6 md:py-14">
        {children}
      </main>
    </div>
  );
}
