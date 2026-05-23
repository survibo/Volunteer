import { useEffect, useState } from "react";
import { Link } from "react-router";
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

function ActivityCard({ activity }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-base p-5">
      <h3 className="text-lg font-bold text-text-primary">{activity.title}</h3>
      <div className="mt-3 grid gap-1.5 text-sm text-text-secondary">
        <p>{activity.location}</p>
        <p>
          {formatDate(activity.starts_at)} ~ {formatDate(activity.ends_at)}
        </p>
        <p>마감 {formatDate(activity.application_deadline)}</p>
        <p>정원 {activity.capacity}명</p>
      </div>
      {activity.description && (
        <p className="mt-3 text-sm text-text-secondary line-clamp-2">
          {activity.description}
        </p>
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

export default function ActivityList({
  table,
  sectionLabel,
  pageTitle,
  createLabel,
  createPath,
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
      if (mounted) {
        setActivities(data);
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [table]);

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
                  <ActivityCard key={activity.id} activity={activity} />
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
