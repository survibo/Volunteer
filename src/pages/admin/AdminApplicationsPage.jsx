import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { CheckCheck, Download, Search, X } from "lucide-react";
import TopLoadingBar from "../../components/TopLoadingBar";
import {
  decideApplications,
  getActivityMaybe,
  getActivityConfig,
  getActivityKind,
  listApplications,
} from "../../lib/activityApi";

const statusLabel = {
  pending: "신청 대기",
  accepted: "수락됨",
  rejected: "거절됨",
  cancelled: "취소됨",
};

const exportStatusOptions = [
  { value: "accepted", label: "수락됨" },
  { value: "rejected", label: "거절" },
  { value: "pending", label: "대기중" },
];

const filterStatusOptions = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기중" },
  { value: "accepted", label: "수락" },
  { value: "rejected", label: "거절" },
];

function applicantMemberLabel(user) {
  if (user?.member_number) {
    return user.member_number;
  }

  return "비회원";
}

function applicantMemberBadgeClass(user) {
  if (user?.role === "member" && user.member_number) {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function statusBadgeClass(status) {
  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatExportDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "applications";
}

function formatFilenameDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}`;
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-base p-4">
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default function AdminApplicationsPage({ table }) {
  const { id } = useParams();
  const kind = getActivityKind(table);
  const cfg = getActivityConfig(kind);
  const [activity, setActivity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStatuses, setExportStatuses] = useState(() => new Set(["accepted", "rejected", "pending"]));
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const activityData = await getActivityMaybe(kind, id);

        if (!mounted) return;

        setActivity(activityData);

        const appData = await listApplications(kind, id);

        if (!mounted) return;
        setApplications(appData);
      } catch (error) {
        alert(error.message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, kind]);

  const acceptedCount = applications.filter((app) => app.status === "accepted").length;
  const statusFilteredCount = statusFilter === "all"
    ? applications.length
    : applications.filter((app) => app.status === statusFilter).length;
  const filteredApplications = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        app.users?.name,
        applicantMemberLabel(app.users),
        app.users?.phone,
        app.users?.email,
        app.users?.workplace_or_school,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [applications, query, statusFilter]);

  function toggleSelect(appId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }

  async function handleDecide(applicationIds, nextStatus) {
    setProcessing(applicationIds.length === 1 ? applicationIds[0] : "batch");

    try {
      await decideApplications(kind, applicationIds, nextStatus);
      setSelectedIds(new Set());
      setApplications((prev) =>
        prev.map((a) =>
          applicationIds.includes(a.id) ? { ...a, status: nextStatus } : a
        )
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setProcessing(null);
    }
  }

  function openCancelConfirm(applicationIds) {
    setCancelConfirm({ applicationIds });
  }

  async function confirmCancelApplications() {
    if (!cancelConfirm) {
      return;
    }

    const { applicationIds } = cancelConfirm;
    setCancelConfirm(null);
    await handleDecide(applicationIds, "cancelled");
  }

  function toggleExportStatus(status) {
    setExportStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  async function exportApplications() {
  const XLSX = await import("xlsx");
  const selectedStatuses = [...exportStatuses];
  const rows = applications
    .filter((app) => selectedStatuses.includes(app.status))
    .map((app) => [
      app.users?.name ?? "",
      applicantMemberLabel(app.users),
      app.users?.workplace_or_school ?? "",
      app.users?.phone ?? "",
      app.users?.email ?? "",
      formatExportDate(app.created_at),
    ]);

  const worksheet = XLSX.utils.aoa_to_sheet([
    [`게시물: ${activity.title}`],
    [],
    ["이름", "회원번호", "소속", "전화번호", "이메일", "신청 일시"],
    ...rows,
  ]);
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  worksheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "신청 현황");
    XLSX.writeFile(workbook, `${safeFilename(activity.title)}_신청현황_${formatFilenameDate(new Date())}.xlsx`);
    setExportModalOpen(false);
  }

  if (loading) {
    return <TopLoadingBar />;
  }

  if (!activity) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-status-error-text">
            존재하지 않는 게시물입니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to={`${cfg.listPath}/${id}`}
        >
          {cfg.label}
        </Link>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          신청 현황
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{activity.title}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
          <SummaryItem label="모집 인원" value={`${activity.capacity}명`} />
          <SummaryItem label="총 신청" value={`${applications.length}명`} />
          <SummaryItem label="수락됨" value={`${acceptedCount}명`} />
        </div>
        <button
          className="mt-4 inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle"
          type="button"
          onClick={() => setExportModalOpen(true)}
        >
          <Download size={16} />
          Excel 추출
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed left-0 right-0 top-24 z-30 px-4 md:top-16 md:px-6">
          <div className="pointer-events-auto mx-auto flex max-w-[1040px] flex-wrap items-center gap-2.5 rounded-xl border border-border-default bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <span className="text-sm font-semibold text-text-primary">
              {selectedIds.size}명 선택
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
              disabled={processing === "batch"}
              type="button"
              onClick={() => handleDecide([...selectedIds], "accepted")}
            >
              <CheckCheck size={16} />
              수락
            </button>
            <button
              className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
              disabled={processing === "batch"}
              type="button"
              onClick={() => handleDecide([...selectedIds], "rejected")}
            >
              <X size={16} />
              거절
            </button>
            <button
              className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-secondary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65"
              disabled={processing === "batch"}
              type="button"
              onClick={() => openCancelConfirm([...selectedIds])}
            >
              신청 취소
            </button>
            </div>
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <strong>신청 내역이 없습니다.</strong>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                size={18}
              />
              <input
                className="min-h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-text-primary placeholder:text-text-tertiary"
                placeholder="이름, 회원번호, 전화번호..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <select
                className="min-h-11 w-28 rounded-lg border border-border-default bg-white px-3 text-sm font-medium text-text-primary"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {filterStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="min-w-14 text-right text-sm font-semibold text-text-secondary">
                {statusFilteredCount}명
              </span>
            </div>
          </div>
          {filteredApplications.length === 0 ? (
            <div className="rounded-xl border border-border-default bg-surface-base p-6">
              <strong>검색 결과가 없습니다.</strong>
            </div>
          ) : null}
          {filteredApplications.map((app) => {
            return (
              <div
                key={app.id}
                className={`rounded-xl border bg-surface-base p-5 ${
                  selectedIds.has(app.id)
                    ? "border-action-default"
                    : "border-border-default"
                }`}
              >
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      className="h-4 w-4"
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      onChange={() => toggleSelect(app.id)}
                    />
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-text-primary">
                          {app.users?.name ?? "-"}
                        </p>
                        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${applicantMemberBadgeClass(app.users)}`}>
                          {applicantMemberLabel(app.users)}
                        </span>
                      </div>
                      <dl className="grid gap-1 text-sm text-text-secondary sm:grid-cols-2">
                        <div className="grid gap-0.5">
                          <dd className="m-0 text-text-secondary">
                            전화번호: {app.users?.phone ?? "-"}
                          </dd>
                        </div>
                        <div className="grid gap-0.5">
                          <dd className="m-0 break-all text-text-secondary">
                            이메일: {app.users?.email ?? "-"}
                          </dd>
                        </div>
                        <div className="grid gap-0.5 sm:col-span-2">
                          <dd className="m-0 text-text-secondary">
                            소속: {app.users?.workplace_or_school ?? "-"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </label>
                  <span className={`shrink-0 rounded-xl border px-3 py-1.5 text-sm font-bold ${statusBadgeClass(app.status)}`}>
                    {statusLabel[app.status]}
                  </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pl-7">
                    <button
                      className="min-h-[36px] cursor-pointer rounded-lg bg-action-default px-4 text-sm font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65"
                      disabled={processing === app.id}
                      type="button"
                      onClick={() => handleDecide([app.id], "accepted")}
                    >
                      수락
                    </button>
                    <button
                      className="min-h-[36px] cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-progress disabled:opacity-65"
                      disabled={processing === app.id}
                      type="button"
                      onClick={() => handleDecide([app.id], "rejected")}
                    >
                      거절
                    </button>
                    <button
                      className="min-h-[36px] cursor-pointer rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-secondary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65"
                      disabled={processing === app.id}
                      type="button"
                      onClick={() => openCancelConfirm([app.id])}
                    >
                      신청 취소
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {cancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCancelConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
              신청 취소
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              선택한 신청을 취소할까요?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {cancelConfirm.applicationIds.length}건의 신청 상태가 취소됨으로 변경됩니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={processing !== null}
                type="button"
                onClick={confirmCancelApplications}
              >
                신청 취소
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                type="button"
                onClick={() => setCancelConfirm(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
              Excel 추출
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              추출할 신청 상태를 선택하세요.
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {exportStatusOptions.map((option) => {
                const selected = exportStatuses.has(option.value);
                return (
                  <button
                    key={option.value}
                    className={
                      selected
                        ? "min-h-[38px] rounded-lg bg-action-default px-4 text-sm font-semibold text-white"
                        : "min-h-[38px] rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-secondary hover:bg-surface-subtle"
                    }
                    type="button"
                    onClick={() => toggleExportStatus(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              이름, 회원번호, 소속, 전화번호, 이메일, 신청 일시가 포함됩니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                disabled={exportStatuses.size === 0}
                type="button"
                onClick={exportApplications}
              >
                추출
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                type="button"
                onClick={() => setExportModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
