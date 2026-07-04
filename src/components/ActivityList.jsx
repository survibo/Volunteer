import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, Pencil, Users } from "lucide-react";
import { getActivityKind } from "../lib/activityApi";
import { useActivities, useApplicantCounts } from "../hooks/useActivities";
import { deadlineDdayText, formatDateTime } from "../lib/dateUtils";
import PaginationControls, { PAGE_SIZE } from "./PaginationControls";
import TopLoadingBar from "./TopLoadingBar";

const filterOptions = [
  { value: "recruiting", label: "모집중" },
  { value: "ongoing", label: "진행중" },
  { value: "completed", label: "종료" },
  { value: "all", label: "전체" },
];

function categorize(activities) {
  const now = new Date();
  const groups = { recruiting: [], ongoing: [], completed: [] };

  for (const a of activities) {
    const deadline = new Date(a.application_deadline);
    const ends = new Date(a.ends_at);

    const endsEnd = new Date(ends);
    endsEnd.setHours(23, 59, 59, 999);

    if (endsEnd <= now) {
      groups.completed.push(a);
    } else if (deadline >= now) {
      groups.recruiting.push(a);
    } else {
      groups.ongoing.push(a);
    }
  }

  groups.recruiting.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  groups.ongoing.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  groups.completed.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return groups;
}

function ActivityCard({
  activity,
  detailPath,
  adminEditBasePath,
  isAdmin,
  now,
}) {
  const navigate = useNavigate();
  const detailTo = `${detailPath}/${activity.id}`;

  function openDetail() {
    navigate(detailTo);
  }

  return (
    <div
      className="group relative cursor-pointer rounded-xl border border-border-default bg-surface-base p-5 pr-10 hover:bg-surface-subtle"
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail();
        }
      }}
    >
      <h3 className="text-lg font-bold text-text-primary">{activity.title}</h3>
      <div className="mt-3 grid gap-1.5 text-sm text-text-secondary">
        <p className="flex flex-wrap items-center gap-2">
          <span>마감: {formatDateTime(activity.application_deadline)}</span>
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
            {deadlineDdayText(activity.application_deadline, now)}
          </span>
        </p>
        <p>정원 {activity.capacity}명</p>
        {isAdmin && activity._applicantCount !== undefined && (
          <p className="flex items-center gap-1">
            <Users size={14} />
            신청 {activity._applicantCount}명
          </p>
        )}
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-action-default">
        자세히 보기
        <ChevronRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </div>
      {isAdmin && (
        <button
          className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-surface-subtle"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${adminEditBasePath}/${activity.id}`);
          }}
        >
          <Pencil size={16} />
        </button>
      )}
    </div>
  );
}

export default function ActivityList({
  table,
  sectionLabel,
  pageTitle,
  createLabel,
  createPath,
  detailBasePath,
  profile,
}) {
  const isAdmin = profile?.role === "admin";
  const kind = getActivityKind(table);
  const { data: activities = [], isLoading } = useActivities(kind);
  const activityIds = activities.map((a) => a.id);
  const { data: counts = {} } = useApplicantCounts(kind, activityIds);
  const activitiesWithCounts = isAdmin
    ? activities.map((a) => ({ ...a, _applicantCount: counts[a.id] ?? 0 }))
    : activities;
  const [filter, setFilter] = useState("recruiting");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const groups = categorize(activitiesWithCounts);
  const filterCounts = {
    recruiting: groups.recruiting.length,
    ongoing: groups.ongoing.length,
    completed: groups.completed.length,
    all: activitiesWithCounts.length,
  };

  let activeItems;
  if (filter === "all") {
    activeItems = [
      ...groups.recruiting,
      ...groups.ongoing,
      ...groups.completed,
    ];
  } else {
    activeItems = groups[filter];
  }

  const hasAny = activeItems.length > 0;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = activeItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <section className="grid gap-6">
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {pageTitle}
        </h1>

        {isLoading ? (
          <TopLoadingBar />
        ) : (
          <div className="grid gap-6">
            <div
              className="-mx-4 scrollbar-none flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0"
              role="group"
              aria-label={`${sectionLabel} 상태 필터`}
            >
              {filterOptions.map((opt) => {
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={
                      active
                        ? "shrink-0 rounded-lg bg-action-default px-3 py-2 text-sm font-semibold text-white"
                        : "shrink-0 rounded-lg border border-border-default bg-white px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle hover:text-action-default"
                    }
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(opt.value);
                      setPage(1);
                    }}
                  >
                    {opt.label}
                    <span
                      className={
                        active
                          ? "ml-1.5 text-white/80"
                          : "ml-1.5 text-text-tertiary"
                      }
                    >
                      {filterCounts[opt.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            {hasAny ? (
              <div className="grid gap-3">
                {visibleItems.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    detailPath={detailBasePath}
                    adminEditBasePath={
                      isAdmin ? `/admin${detailBasePath}` : null
                    }
                    isAdmin={isAdmin}
                    now={now}
                  />
                ))}
                <PaginationControls
                  page={currentPage}
                  total={activeItems.length}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border-default bg-surface-base p-6">
                <strong>
                  {filter === "recruiting"
                    ? "모집 중인 항목이 없습니다."
                    : filter === "ongoing"
                    ? "진행 중인 항목이 없습니다."
                    : filter === "completed"
                    ? "종료된 항목이 없습니다."
                    : "등록된 항목이 없습니다."}
                </strong>
                <p className="mt-2 text-sm text-text-secondary">
                  {filter === "recruiting"
                    ? isAdmin
                      ? `새 ${sectionLabel}을(를) 개설해 보세요.`
                      : "다른 필터를 선택해 보세요."
                    : isAdmin
                    ? `새 ${sectionLabel}을(를) 개설해 보세요.`
                    : `관리자가 ${sectionLabel}을(를) 개설하면 이곳에 표시됩니다.`}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      {isAdmin && createPath && (
        <Link
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-action-default text-2xl font-bold text-white shadow-lg hover:bg-action-hover active:bg-action-active"
          to={createPath}
          aria-label={createLabel}
        >
          +
        </Link>
      )}
    </>
  );
}
