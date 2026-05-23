import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Link as LinkIcon, Pencil, Users } from "lucide-react";
import {
  applyToActivity,
  cancelOwnApplication,
  getActivity,
  getActivityConfig,
  getActivityKind,
  getMyApplication,
} from "../../lib/activityApi";
import { getImageUrl, parseImagePaths } from "../../lib/storageApi";
import ImageWithFallback from "../../components/ImageWithFallback";
import ImageViewer from "../../components/ImageViewer";
import TopLoadingBar from "../../components/TopLoadingBar";
import { deadlineDdayText, formatDateTime } from "../../lib/dateUtils";

const statusLabel = {
  pending: "신청 대기",
  accepted: "수락됨",
  rejected: "거절됨",
  cancelled: "취소됨",
};

export default function ActivityDetailPage({ table, profile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const kind = getActivityKind(table);
  const cfg = getActivityConfig(kind);
  const [activity, setActivity] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

  const [linkCopied, setLinkCopied] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);

  const imageUrls = activity
    ? parseImagePaths(activity.image_path).map((p) => getImageUrl(kind, p))
    : [];

  const deadlinePassed = activity
    ? new Date(activity.application_deadline) <= new Date()
    : true;
  const canApply = activity && !deadlinePassed;
  const myPendingApp = application?.status === "pending";
  const myCancelledApp = application?.status === "cancelled";

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const activityData = await getActivity(kind, id);

        if (!mounted) return;
        setActivity(activityData);

        const appData = await getMyApplication(kind, id, profile.id);

        if (!mounted) return;
        setApplication(appData);
      } catch (error) {
        if (mounted) setErrorMessage(error.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, kind, profile.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function handleApply() {
    setSaving(true);
    setErrorMessage("");

    try {
      const nextApplication = await applyToActivity(
        kind,
        id,
        profile.id,
        application
      );
      setApplication(nextApplication);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    setErrorMessage("");

    try {
      await cancelOwnApplication(kind, application.id);
      setApplication((prev) => ({ ...prev, status: "cancelled" }));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (errorMessage && !activity) {
    return <ErrorState message={errorMessage} />;
  }

  if (!activity) {
    return <ErrorState message="존재하지 않는 게시물입니다." />;
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="mb-2 inline-block text-xs font-semibold uppercase tracking-wider text-action-default hover:underline"
          to={cfg.listPath}
        >
          {cfg.label}
        </Link>
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          {activity.title}
        </h1>
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
              type="button"
              onClick={() => navigate(`${cfg.adminEditPath}/${id}`)}
            >
              <Pencil size={16} />
              수정
            </button>
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
              type="button"
              onClick={() =>
                navigate(`${cfg.adminApplicationsPath}/${id}/applications`)
              }
            >
              <Users size={16} />
              신청 현황
            </button>
            <button
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
            >
              <LinkIcon size={16} />
              {linkCopied ? "복사됨" : "링크"}
            </button>
          </div>
        )}
      </div>
      {imageUrls.length > 0 && (
        <div className="flex flex-col gap-3">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              className="w-full cursor-pointer rounded-xl p-0 text-left"
              type="button"
              onClick={() => setViewerIndex(i)}
            >
              <ImageWithFallback
                className="w-full rounded-xl border border-border-default"
                src={url}
                alt={`${activity.title} ${i + 1}`}
              />
            </button>
          ))}
        </div>
      )}
      <dl className="grid gap-4 rounded-xl border border-border-default bg-surface-base p-6">
        {activity.description && (
          <div className="grid gap-1">
            <dt className="text-xs font-semibold text-text-secondary">설명</dt>
            <dd className="m-0 whitespace-pre-wrap text-sm text-text-primary">
              {activity.description}
            </dd>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">장소</dt>
          <dd className="m-0 text-sm text-text-primary">{activity.location}</dd>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">시작일</dt>
          <dd className="m-0 text-sm text-text-primary">
            {formatDateTime(activity.starts_at)}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">종료일</dt>
          <dd className="m-0 text-sm text-text-primary">
            {formatDateTime(activity.ends_at)}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">
            신청 마감일
          </dt>
          <dd className="m-0 flex flex-wrap items-center gap-2 text-sm text-text-primary">
            <span>{formatDateTime(activity.application_deadline)}</span>
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              {deadlineDdayText(activity.application_deadline, now)}
            </span>
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">정원</dt>
          <dd className="m-0 text-sm text-text-primary">
            {activity.capacity}명
          </dd>
        </div>
      </dl>

      {errorMessage && (
        <p className="text-sm leading-normal text-status-error-text">
          {errorMessage}
        </p>
      )}

      {application && !myCancelledApp ? (
        <div className="rounded-xl border border-border-default bg-surface-base p-6">
          <p className="text-sm text-text-secondary">
            신청 상태:{" "}
            <span className="font-semibold text-text-primary">
              {statusLabel[application.status]}
            </span>
          </p>
          {application.status === "accepted" && activity.chat_link && (
            <a
              className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover"
              href={activity.chat_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              오픈채팅방 입장
            </a>
          )}
          {myPendingApp && !deadlinePassed && (
            <button
              className="mt-4 min-h-[44px] cursor-pointer rounded-xl bg-status-error-bg px-5 font-semibold text-status-error-text hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
              disabled={saving}
              type="button"
              onClick={handleCancel}
            >
              {saving ? "취소 중" : "신청 취소"}
            </button>
          )}
        </div>
      ) : null}
      {canApply && (!application || myCancelledApp) ? (
        <button
          className="min-h-[44px] w-full cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 md:w-auto"
          disabled={saving}
          type="button"
          onClick={handleApply}
        >
          {saving ? "신청 중" : "신청하기"}
        </button>
      ) : null}
      {viewerIndex !== null && (
        <ImageViewer
          images={imageUrls}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </section>
  );
}

function LoadingState() {
  return <TopLoadingBar />;
}

function ErrorState({ message }) {
  return (
    <section className="grid gap-6">
      <div className="rounded-xl border border-border-default bg-surface-base p-6">
        <p className="text-sm text-status-error-text">{message}</p>
      </div>
    </section>
  );
}
