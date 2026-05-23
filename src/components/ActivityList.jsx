import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Pencil, Users } from "lucide-react";
import { getActivityKind, listActivities, listApplicantCounts } from "../lib/activityApi";
import { deadlineDdayText, formatDateTime } from "../lib/dateUtils";
import TopLoadingBar from "./TopLoadingBar";

const filterOptions = [
  { value: "recruiting", label: "현재 모집중" },
  { value: "ongoing", label: "현재 진행중" },
  { value: "completed", label: "끝난 봉사활동" },
];

function categorize(activities) {
  const now = new Date();
  const groups = { recruiting: [], ongoing: [], completed: [] };

  for (const a of activities) {
    const deadline = new Date(a.application_deadline);
    const ends = new Date(a.ends_at);

    if (a.is_closed || ends <= now) {
      groups.completed.push(a);
    } else if (deadline > now) {
      groups.recruiting.push(a);
    } else {
      groups.ongoing.push(a);
    }
  }

  groups.recruiting.sort(
    (a, b) => new Date(a.starts_at) - new Date(b.starts_at)
  );
  groups.ongoing.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  groups.completed.sort((a, b) => new Date(b.ends_at) - new Date(a.ends_at));

  return groups;
}

function ActivityCard({ activity, detailPath, adminEditBasePath, isAdmin, now }) {
  const navigate = useNavigate();

  return (
    <div
      className="relative cursor-pointer rounded-xl border border-border-default bg-surface-base p-5 hover:bg-surface-subtle"
      onClick={() => navigate(`${detailPath}/${activity.id}`)}
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
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("recruiting");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await listActivities(kind);
      if (!mounted) return

      const counts = isAdmin
        ? await listApplicantCounts(kind, data.map((a) => a.id))
        : {}

      if (!mounted) return
      setActivities(data.map((a) => ({ ...a, _applicantCount: counts[a.id] ?? 0 })));
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [kind, isAdmin]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const groups = categorize(activities);
  const activeItems = groups[filter];
  const hasAny = activeItems.length > 0;

  return (
    <>
      <section className="grid gap-6">
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {pageTitle}
        </h1>

        {loading ? (
          <TopLoadingBar />
        ) : (
          <div className="grid gap-6">
            <div className="flex justify-end">
              <select
                className="rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {hasAny ? (
              <div className="grid gap-3">
                {activeItems.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} detailPath={detailBasePath} adminEditBasePath={isAdmin ? `/admin${detailBasePath}` : null} isAdmin={isAdmin} now={now} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border-default bg-surface-base p-6">
                <strong>등록된 항목이 없습니다.</strong>
                <p className="mt-2 text-sm text-text-secondary">
                  {isAdmin
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
