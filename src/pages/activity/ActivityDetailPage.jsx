import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Link as LinkIcon, Pencil, Users } from "lucide-react";
import {
  getActivityConfig,
  getActivityKind,
} from "../../lib/activityApi";
import { useActivity, useApplyActivity, useCancelApplication, useMyApplication } from "../../hooks/useActivities";
import { getImageUrl, parseImagePaths } from "../../lib/storageApi";
import ImageWithFallback from "../../components/ImageWithFallback";
import ImageViewer from "../../components/ImageViewer";
import TopLoadingBar from "../../components/TopLoadingBar";
import { deadlineDdayText, formatDate, formatDateTime } from "../../lib/dateUtils";

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
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

  const [linkCopied, setLinkCopied] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
  } = useActivity(kind, id);
  const {
    data: application,
    isLoading: appLoading,
  } = useMyApplication(kind, id, profile.id);
  const applyMutation = useApplyActivity(kind);
  const cancelMutation = useCancelApplication(kind);

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
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleApply() {
    setErrorMessage("");
    applyMutation.mutate(
      { activityId: id, userId: profile.id, existingApp: application },
      {
        onError: (error) => setErrorMessage(error.message),
      }
    );
  }

  async function handleCancel() {
    setShowCancelModal(false)
    setErrorMessage("");
    cancelMutation.mutate(
      { appId: application.id },
      {
        onError: (error) => setErrorMessage(error.message),
      }
    );
  }

  if (activityLoading || appLoading) {
    return <LoadingState />;
  }

  if (activityError && !activity) {
    return <ErrorState message="데이터를 불러오는 중 오류가 발생했습니다." />;
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
      {application?.status === "accepted" && activity.chat_link && (
        <a
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover"
          href={activity.chat_link}
          target="_blank"
          rel="noopener noreferrer"
        >
          오픈채팅방 입장
        </a>
      )}
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
            {formatDate(activity.starts_at)}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
          <dt className="text-xs font-semibold text-text-secondary">종료일</dt>
          <dd className="m-0 text-sm text-text-primary">
            {formatDate(activity.ends_at)}
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
              {statusLabel[application?.status]}
            </span>
          </p>
          {application?.status === "accepted" && activity.chat_link && (
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
              disabled={cancelMutation.isPending}
              type="button"
              onClick={() => setShowCancelModal(true)}
            >
              {cancelMutation.isPending ? "취소 중" : "신청 취소"}
            </button>
          )}
        </div>
      ) : null}
      {canApply && (!application || myCancelledApp) ? (
        <button
          className="min-h-[44px] w-full cursor-pointer rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-progress disabled:opacity-65 md:w-auto"
          disabled={applyMutation.isPending}
          type="button"
          onClick={handleApply}
        >
          {applyMutation.isPending ? "신청 중" : "신청하기"}
        </button>
      ) : null}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
              신청 취소
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              정말 취소하시겠어요?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              "{activity.title}" 활동의 신청이 취소됩니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={cancelMutation.isPending}
                type="button"
                onClick={handleCancel}
              >
                {cancelMutation.isPending ? "취소 중" : "취소하기"}
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                type="button"
                onClick={() => setShowCancelModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
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
