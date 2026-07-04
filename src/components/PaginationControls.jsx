import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

export default function PaginationControls({
  page,
  total,
  onPageChange,
  pageSize = PAGE_SIZE,
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="grid justify-items-center gap-2 pt-2">
      <div className="inline-flex items-center gap-3  bg-white px-3 py-1 ">
        <button
          className="flex h-9 w-9 cursor-pointer items-center justify-center text-text-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          disabled={page <= 1}
          aria-label="이전 페이지"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-16 text-center text-sm font-bold text-text-primary">
          {page} / {totalPages}
        </span>
        <button
          className="flex h-9 w-9 cursor-pointer items-center justify-center  text-text-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          disabled={page >= totalPages}
          aria-label="다음 페이지"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-xs font-medium text-text-tertiary">
        {start}-{end} / {total}
      </p>
    </div>
  );
}
