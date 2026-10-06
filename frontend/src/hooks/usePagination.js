import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook to handle pagination for any array of items.
 *
 * @param {Array} items - The full list of items to paginate.
 * @param {number} initialPageSize - Default number of items per page.
 * @returns Object containing pagination state and helpers.
 */
export function usePagination(items = [], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If items change and current page exceeds total pages, clamp to totalPages or 1
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const handlePageChange = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const handlePageSizeChange = (newSize) => {
    const size = Number(newSize) || initialPageSize;
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage: handlePageChange,
    setPage: handlePageChange,
    onPageChange: handlePageChange,
    pageSize,
    setPageSize: handlePageSizeChange,
    onPageSizeChange: handlePageSizeChange,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex
  };
}
export default usePagination;
