import { ChevronLeft, ChevronRight } from "lucide-react";

const getPageNumbers = (currentPage, totalPages) => {
  const pages = [];
  const range = 1;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - range && i <= currentPage + range)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return pages;
};

const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                page === currentPage
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;
