import { useEffect, useState } from "react";
import { X } from "lucide-react";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("a2hs_dismissed") === "true";
  });

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [dismissed]);

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("a2hs_dismissed", "true");
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShow(false);
        setDeferredPrompt(null);
      }
    }
  }

  if (dismissed || isStandalone() || !show || !isMobile()) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="relative rounded-xl border border-border-default bg-surface-base p-4 shadow-lg">
        <button
          className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-text-tertiary hover:bg-surface-subtle hover:text-text-primary"
          type="button"
          onClick={handleDismiss}
        >
          <X size={14} />
        </button>

        {deferredPrompt ? (
          <div>
            <p className="text-sm font-semibold text-text-primary">
              앱으로 설치하기
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              더 빠르게 이용하려면 홈화면에 추가하세요.
            </p>
            <button
              className="mt-3 min-h-[38px] w-full cursor-pointer rounded-lg bg-action-default text-sm font-semibold text-white hover:bg-action-hover"
              type="button"
              onClick={handleInstall}
            >
              홈화면에 추가
            </button>
          </div>
        ) : isIOS() ? (
          <div>
            <p className="text-sm font-semibold text-text-primary">
              홈화면에 추가
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Safari의 공유 버튼{" "}
              <span className="inline-block rounded bg-surface-subtle px-1 text-xs">
                ⬆️
              </span>
              을 누르고 <strong>홈화면에 추가</strong>를 선택하세요.
            </p>
            <button
              className="mt-3 min-h-[38px] w-full cursor-pointer rounded-lg border border-border-default text-sm font-medium text-text-primary hover:bg-surface-subtle"
              type="button"
              onClick={handleDismiss}
            >
              나중에
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-text-primary">
              앱으로 설치하기
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              더 빠르게 이용하려면 홈화면에 추가하세요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="min-h-[38px] flex-1 cursor-pointer rounded-lg bg-action-default text-sm font-semibold text-white hover:bg-action-hover"
                type="button"
                onClick={handleDismiss}
              >
                괜찮아요
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
