"use client";

type ListPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export default function ListPagination({
  page,
  pageCount,
  onPageChange,
  label = "items",
}: ListPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="list-pagination" aria-label={`${label} pages`}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        title="Previous page"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15 18 9 12l6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount - 1}
        aria-label="Next page"
        title="Next page"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </nav>
  );
}
