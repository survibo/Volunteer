import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Pencil, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function remainingText(deadline) {
  const diff = new Date(deadline) - new Date()
  if (diff <= 0) return '마감됨'

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (days > 0) return `D-${days}`
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`
  return `${minutes}분 남음`
}

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

const appTableMap = {
  volunteer_activities: { table: 'volunteer_applications', fk: 'volunteer_activity_id' },
  educations: { table: 'education_applications', fk: 'education_id' },
}

function ActivityCard({ activity, detailPath, adminEditBasePath, isAdmin }) {
  const navigate = useNavigate();

  return (
    <div
      className="relative cursor-pointer rounded-xl border border-border-default bg-surface-base p-5 hover:bg-surface-subtle"
      onClick={() => navigate(`${detailPath}/${activity.id}`)}
    >
      <h3 className="text-lg font-bold text-text-primary">{activity.title}</h3>
      <div className="mt-3 grid gap-1.5 text-sm text-text-secondary">
        <p>마감 {formatDate(activity.application_deadline)}</p>
        <p className="text-status-error-text">{remainingText(activity.application_deadline)}</p>
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

async function fetchActivities(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

async function fetchApplicantCounts(table, activityIds) {
  if (activityIds.length === 0) return {}
  const appCfg = appTableMap[table]
  if (!appCfg) return {}

  const { data } = await supabase
    .from(appCfg.table)
    .select(`${appCfg.fk}, count`)
    .in(appCfg.fk, activityIds)
    .neq('status', 'cancelled')
    .neq('status', 'rejected')

  const counts = {}
  for (const row of data ?? []) {
    counts[row[appCfg.fk]] = (counts[row[appCfg.fk]] ?? 0) + 1
  }
  return counts
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
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("recruiting");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await fetchActivities(table);
      if (!mounted) return

      const counts = isAdmin
        ? await fetchApplicantCounts(table, data.map((a) => a.id))
        : {}

      if (!mounted) return
      setActivities(data.map((a) => ({ ...a, _applicantCount: counts[a.id] ?? 0 })));
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [table, isAdmin]);

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
          <div className="rounded-xl border border-border-default bg-surface-base p-6">
            <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
          </div>
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
                  <ActivityCard key={activity.id} activity={activity} detailPath={detailBasePath} adminEditBasePath={isAdmin ? `/admin${detailBasePath}` : null} isAdmin={isAdmin} />
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
