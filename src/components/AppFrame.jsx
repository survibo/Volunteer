import { Link, useLocation } from "react-router";
import NotificationBell from "./NotificationBell";

const navItems = [
  { to: "/volunteer", label: "봉사" },
  { to: "/education", label: "교육" },
  { to: "/mylist", label: "활동 내역" },
  { to: "/mypage", label: "내 정보" },
];

const adminNavItem = { to: "/admin", label: "관리자" };

export default function AppFrame({ profile, children }) {
  const location = useLocation();
  const visibleNavItems =
    profile?.role === "admin" ? [...navItems, adminNavItem] : navItems;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 sticky top-0 z-10 grid min-h-16 grid-cols-[1fr_auto] items-center gap-2 border-b border-border-default bg-white px-4 py-3 md:grid-cols-[auto_1fr_auto] md:px-6">
        <div className="min-w-0 text-sm font-bold text-text-secondary">
          <span className="text-black text-lg">{profile?.name}</span>
        </div>
        <nav className="order-3 col-span-2 flex flex-wrap gap-1.5 md:order-none md:col-span-1" aria-label="주요 메뉴">
          {visibleNavItems.map((item) => (
            <Link
              className={
                location.pathname.startsWith(item.to)
                  ? "rounded-lg bg-action-default px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle hover:text-action-default"
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="justify-self-end">
          <NotificationBell userId={profile?.id} />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto mx-auto w-full max-w-[1040px] px-4 py-8 md:px-6 md:py-14">
        {children}
      </main>
    </div>
  );
}
