import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ImageViewer({ images, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isJumpResetting, setIsJumpResetting] = useState(false);
  const [usesDesktopPointer, setUsesDesktopPointer] = useState(false);
  const pointerStartX = useRef(null);
  const activePointerId = useRef(null);
  const pendingIndex = useRef(null);
  const resetAnimationFrame = useRef(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose)
  const controlsTimer = useRef(null)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)")
    const updatePointerMode = () => setUsesDesktopPointer(media.matches)

    updatePointerMode()
    media.addEventListener("change", updatePointerMode)

    return () => {
      media.removeEventListener("change", updatePointerMode)
    }
  }, [])

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
      cancelAnimationFrame(resetAnimationFrame.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePointerDown(e) {
    if (usesDesktopPointer || !hasMultiple) return
    if (e.target.closest("button")) return

    pointerStartX.current = e.clientX
    activePointerId.current = e.pointerId
    setIsDragging(true)
    setDragX(0)
    showControlsTemporarily()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!isDragging || activePointerId.current !== e.pointerId) return

    const nextDragX = e.clientX - pointerStartX.current
    const isPastStart = index === 0 && nextDragX > 0
    const isPastEnd = index === images.length - 1 && nextDragX < 0
    setDragX(isPastStart || isPastEnd ? nextDragX * 0.28 : nextDragX)
  }

  function handlePointerEnd(e) {
    if (!isDragging || activePointerId.current !== e.pointerId) return

    const diff = e.clientX - pointerStartX.current
    const targetIndex = diff < 0 ? index + 1 : index - 1
    const canChangeImage = targetIndex >= 0 && targetIndex < images.length
    const shouldChangeImage = canChangeImage && Math.abs(diff) > 70

    if (shouldChangeImage) {
      const slideWidth = e.currentTarget.clientWidth || window.innerWidth
      pendingIndex.current = targetIndex
      setDragX(diff < 0 ? -slideWidth : slideWidth)
      showControlsTemporarily()
    } else {
      setDragX(0)
    }

    pointerStartX.current = null
    activePointerId.current = null
    setIsDragging(false)
  }

  function handlePointerCancel() {
    pointerStartX.current = null
    activePointerId.current = null
    pendingIndex.current = null
    setIsDragging(false)
    setDragX(0)
  }

  function handleTrackTransitionEnd(e) {
    if (e.target !== e.currentTarget || pendingIndex.current === null) return

    const nextIndex = pendingIndex.current
    pendingIndex.current = null
    setIsJumpResetting(true)
    setIndex(nextIndex)
    setDragX(0)

    resetAnimationFrame.current = requestAnimationFrame(() => {
      resetAnimationFrame.current = requestAnimationFrame(() => {
        setIsJumpResetting(false)
      })
    })
  }

  const hasMultiple = images.length > 1;
  const showArrowButtons = hasMultiple && usesDesktopPointer;
  const adjacentImages = [
    { src: images[index - 1], position: "prev" },
    { src: images[index], position: "current" },
    { src: images[index + 1], position: "next" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={handleClose}
      onMouseMove={showControlsTemporarily}
    >
      <div
        className="relative flex h-full w-full touch-pan-y items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex h-full w-full ${usesDesktopPointer ? '' : 'cursor-grab touch-none'} ${isDragging || isJumpResetting ? '' : 'transition-transform duration-200 ease-out'}`}
          onTransitionEnd={handleTrackTransitionEnd}
          style={{ transform: `translateX(calc(-100% + ${dragX}px))` }}
        >
          {adjacentImages.map(({ src, position }) => (
            <div
              className="flex h-full w-full flex-none items-center justify-center"
              key={position}
            >
              {src && (
                <img
                  className="max-h-full max-w-full object-contain"
                  src={src}
                  alt={position === "current" ? `${index + 1}/${images.length}` : ""}
                  aria-hidden={position === "current" ? undefined : true}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>

        <div className={`transition-opacity duration-700 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {showArrowButtons && index > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {showArrowButtons && index < images.length - 1 && (
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
