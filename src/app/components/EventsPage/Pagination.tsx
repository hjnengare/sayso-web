"use client";

import { ChevronLeft, ChevronRight } from "react-feather";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === "number") {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || disabled}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
          currentPage === 1 || disabled
            ? "bg-off-white/50 text-charcoal/30 cursor-not-allowed"
            : "bg-gradient-to-br from-sage to-sage/80 hover:from-sage/90 hover:to-sage text-white hover:shadow-lg active:scale-95"
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-body-sm text-charcoal/50"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => handlePageClick(pageNum)}
              disabled={disabled}
              className={`min-w-[40px] h-10 px-4 rounded-full font-semibold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-md ${
                isActive
                  ? "bg-gradient-to-br from-sage to-sage/80 text-white shadow-lg scale-105"
                  : "bg-gradient-to-br from-sage/20 to-sage/10 hover:from-sage/40 hover:to-sage/20 text-charcoal hover:text-sage hover:shadow-lg active:scale-95"
              }`}
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              aria-label={`Go to page ${pageNum}`}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages || disabled}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-md ${
          currentPage === totalPages || disabled
            ? "bg-off-white/50 text-charcoal/30 cursor-not-allowed"
            : "bg-gradient-to-br from-sage to-sage/80 hover:from-sage/90 hover:to-sage text-white hover:shadow-lg active:scale-95"
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

