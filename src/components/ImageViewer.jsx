import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ImageViewer({ images, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef(null);

  function goNext() {
    if (index < images.length - 1) setIndex(index + 1);
  }
  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
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
      onClick={onClose}
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

        {hasMultiple && index > 0 && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            type="button"
            onClick={goPrev}
            aria-label="이전 이미지"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        {hasMultiple && index < images.length - 1 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            type="button"
            onClick={goNext}
            aria-label="다음 이미지"
          >
            <ChevronRight size={28} />
          </button>
        )}

        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {index + 1} / {images.length}
          </div>
        )}

        <button
          className="absolute right-2 top-2 cursor-pointer rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
          type="button"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}
