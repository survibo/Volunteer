import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ImageViewer({ images, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const touchStartX = useRef(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose)
  const controlsTimer = useRef(null)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  function showControlsTemporarily() {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 2000)
  }

  function goNext() {
    showControlsTemporarily()
    setIndex((i) => Math.min(i + 1, images.length - 1))
  }
  function goPrev() {
    showControlsTemporarily()
    setIndex((i) => Math.max(i - 1, 0))
  }

  function close() {
    if (closedRef.current) return
    closedRef.current = true
    onCloseRef.current()
  }

  function handleClose() {
    if (closedRef.current) return
    window.history.back()
    setTimeout(close, 100)
  }

  useEffect(() => {
    window.history.pushState({ viewer: true }, "")
    controlsTimer.current = setTimeout(() => setShowControls(false), 2000)

    function handlePopState() {
      close()
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") handleClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(controlsTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    showControlsTemporarily()
  }

  function handleTouchEnd(e) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }

  const hasMultiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={handleClose}
      onMouseMove={showControlsTemporarily}
    >
      <div
        className="relative flex h-full w-full items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          className="max-h-full max-w-full object-contain"
          src={images[index]}
          alt={`${index + 1}/${images.length}`}
          draggable={false}
        />

        <div className={`transition-opacity duration-700 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {hasMultiple && index > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {hasMultiple && index < images.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext() }}
              aria-label="다음 이미지"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        <div className={`transition-opacity duration-700 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white pointer-events-none">
              {index + 1} / {images.length}
            </div>
          )}

          <button
            className="absolute bottom-4 right-4 cursor-pointer rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white hover:bg-black/70"
            type="button"
            onClick={async (e) => {
              e.stopPropagation()
              try {
                const res = await fetch(images[index])
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'photo.webp'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              } catch {
                // silent
              }
            }}
          >
            다운로드
          </button>
          <button
            className="absolute right-2 top-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            type="button"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
