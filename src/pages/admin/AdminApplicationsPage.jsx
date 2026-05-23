import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CheckCheck, X } from "lucide-react";
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

function applicantMemberLabel(user) {
  if (user?.role === "member" && user.member_number) {
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
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-1 ring-red-100";
  }

  if (status === "cancelled") {
    return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
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

  const cancellableIds = applications
    .map((a) => a.id);
  const allSelected =
    cancellableIds.length > 0 &&
    cancellableIds.every((aid) => selectedIds.has(aid));

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

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cancellableIds));
    }
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

  if (loading) {
    return (
      <section className="grid gap-6">
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">불러오는 중입니다.</p>
        </div>
      </section>
    );
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
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2.5 border-b border-border-default bg-surface-base px-4 py-3 md:-mx-6 md:px-6">
          <span className="text-sm font-medium text-text-secondary">
            {selectedIds.size}명 선택
          </span>
          <div className="ml-auto flex gap-2.5">
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
      )}

      {applications.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <strong>신청 내역이 없습니다.</strong>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-default bg-surface-base px-5 py-3 text-sm font-medium text-text-secondary hover:bg-surface-subtle">
            <input
              className="h-4 w-4"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            전체 선택
          </label>
          {applications.map((app) => {
            return (
              <div
                key={app.id}
                className={`rounded-xl border bg-surface-base p-5 ${
                  selectedIds.has(app.id)
                    ? "border-action-default"
                    : "border-border-default"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(app.status)}`}>
                          {statusLabel[app.status]}
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
                  <div className="flex shrink-0 items-center gap-2.5">
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
    </section>
  );
}
