import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { signOut, withdrawCurrentUser } from "../../lib/auth";
import { downloadMemberCert } from "../../lib/pdfCert";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function MyPage({ profile }) {
  const navigate = useNavigate();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showWithdrawFinalModal, setShowWithdrawFinalModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate("/", { replace: true });
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    await withdrawCurrentUser();
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <section className="grid gap-5 sm:gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
            내 정보
          </p>
          <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
            {profile.name}
          </h1>
        </div>
        <div className="flex gap-2.5">
          {profile.role !== "pending" && (
            <button
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center min-w-fit rounded-xl border border-border-default bg-white px-5 font-semibold text-text-primary hover:bg-surface-subtle disabled:cursor-progress disabled:opacity-65 sm:w-auto"
              disabled={pdfLoading}
              type="button"
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const blob = await downloadMemberCert(profile, true);
                  window.open(URL.createObjectURL(blob), "_blank");
                } catch (e) {
                  alert(e.message);
                } finally {
                  setPdfLoading(false);
                }
              }}
            >
              {pdfLoading ? "로딩 중" : "회원증"}
            </button>
          )}
          {profile.role === "pending" && (
            <Link
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border-default bg-white px-5 font-semibold text-text-primary hover:bg-surface-subtle sm:w-auto"
              to="/pending"
            >
              가입비 납부
            </Link>
          )}
          <Link
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover sm:w-auto"
            to="/mypage/edit"
          >
            프로필 수정
          </Link>
        </div>
      </div>
      <dl className="m-0 grid gap-4 rounded-xl border border-border-default bg-surface-base p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">회원번호</dt>
          <dd className="m-0">{profile.member_number ?? "미부여"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">연락처</dt>
          <dd className="m-0">{profile.phone}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">이메일</dt>
          <dd className="m-0">{profile.email}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">주소</dt>
          <dd className="m-0">{profile.address}</dd>
          <dd className="m-0">{profile.address_detail || "-"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">근무지/학교</dt>
          <dd className="m-0">{profile.workplace_or_school || "-"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">면허번호</dt>
          <dd className="m-0">{profile.license_number || "-"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">봉사활동 이력</dt>
          <dd className="m-0 whitespace-pre-line">{profile.volunteer_experience || "-"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">교육 이력</dt>
          <dd className="m-0 whitespace-pre-line">{profile.education_experience || "-"}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[120px_1fr] md:gap-3">
          <dt className="font-medium text-text-secondary">가입일</dt>
          <dd className="m-0">{formatDate(profile.created_at)}</dd>
        </div>
      </dl>
      <div className="border-t border-border-default pt-5 sm:pt-6">
        <button
          className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 sm:w-auto"
          type="button"
          onClick={() => setShowSignOutModal(true)}
        >
          로그아웃
        </button>
      </div>
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSignOutModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-5 shadow-lg sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
              로그아웃
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              로그아웃할까요?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              현재 계정에서 로그아웃하고 로그인 화면으로 이동합니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={signingOut}
                type="button"
                onClick={handleSignOut}
              >
                {signingOut ? "로그아웃 중" : "로그아웃"}
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                disabled={signingOut}
                type="button"
                onClick={() => setShowSignOutModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-status-error-text px-5 font-semibold text-white hover:opacity-80 sm:w-auto"
        type="button"
        onClick={() => setShowWithdrawModal(true)}
      >
        회원 탈퇴
      </button>

      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-5 shadow-lg sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
              회원 탈퇴
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              정말 탈퇴하시겠어요?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              모든 개인 정보가 삭제되며 복구할 수 없습니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={withdrawing}
                type="button"
                onClick={() => {
                  setShowWithdrawModal(false);
                  setShowWithdrawFinalModal(true);
                }}
              >
                탈퇴 진행
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                disabled={withdrawing}
                type="button"
                onClick={() => setShowWithdrawModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawFinalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowWithdrawFinalModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-5 shadow-lg sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-status-error-text">
              최종 확인
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              탈퇴를 최종 확정할까요?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              이 버튼을 누르면 계정과 개인 정보가 삭제됩니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-status-error-text px-5 font-semibold text-white hover:opacity-80 disabled:cursor-progress disabled:opacity-65"
                disabled={withdrawing}
                type="button"
                onClick={handleWithdraw}
              >
                {withdrawing ? "탈퇴 중" : "최종 탈퇴"}
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                disabled={withdrawing}
                type="button"
                onClick={() => setShowWithdrawFinalModal(false)}
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
