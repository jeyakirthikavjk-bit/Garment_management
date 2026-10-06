import React from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Reusable Luxury-styled Pagination Component
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showPageSize = true,
  showItemCount = true,
  className = '',
  style = {}
}) {
  const { t } = useSettings();

  const computedStart = startIndex !== undefined ? startIndex : totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const computedEnd = endIndex !== undefined ? endIndex : Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with smart sliding window and ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const leftSiblingIndex = Math.max(currentPage - 1, 2);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages - 1);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    pages.push(1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      // Near start
      for (let i = 2; i <= 4; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      // Near end
      pages.push('...');
      for (let i = totalPages - 3; i < totalPages; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      // In middle
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalItems === 0) {
    return (
      <div className={`pagination-container ${className}`} style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', ...style }}>
        <span style={{ fontSize: '12px', color: 'var(--text-gray)' }}>
          {t('showingZeroEntries', 'Showing 0 entries')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`pagination-container ${className}`}
      style={{
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'var(--bg-main)',
        border: '1px solid var(--border-light)',
        ...style
      }}
    >
      {/* Left: Summary and Rows per Page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {showItemCount && (
          <span style={{ fontSize: '12.5px', color: 'var(--text-gray)' }}>
            {t('showingEntries', 'Showing')}{' '}
            <strong style={{ color: 'var(--text-dark)' }}>{computedStart}</strong> -{' '}
            <strong style={{ color: 'var(--text-dark)' }}>{computedEnd}</strong>{' '}
            {t('ofTotal', 'of')}{' '}
            <strong style={{ color: 'var(--accent-terracotta)' }}>{totalItems}</strong>{' '}
            {t('records', 'entries')}
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
              {t('rowsPerPage', 'Rows per page')}:
            </label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card-solid)',
                color: 'var(--text-dark)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title={t('firstPage', 'First Page')}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 6px',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            background: currentPage === 1 ? 'var(--bg-subtle)' : 'var(--bg-card-solid)',
            color: currentPage === 1 ? 'var(--text-gray)' : 'var(--text-dark)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          «
        </button>

        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title={t('prevPage', 'Previous Page')}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 8px',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            background: currentPage === 1 ? 'var(--bg-subtle)' : 'var(--bg-card-solid)',
            color: currentPage === 1 ? 'var(--text-gray)' : 'var(--text-dark)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          ‹
        </button>

        {/* Numbered Page Buttons */}
        {pageNumbers.map((num, idx) => {
          if (num === '...') {
            return (
              <span
                key={`dots-${idx}`}
                style={{
                  padding: '0 6px',
                  color: 'var(--text-gray)',
                  fontSize: '13px',
                  fontWeight: 600,
                  userSelect: 'none'
                }}
              >
                ...
              </span>
            );
          }

          const isActive = num === currentPage;
          return (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 8px',
                borderRadius: '8px',
                border: isActive ? '1px solid var(--accent-gold)' : '1px solid var(--border-gold-subtle)',
                background: isActive
                  ? 'var(--accent-maroon)'
                  : 'var(--bg-card-solid)',
                color: isActive ? '#FAF6F0' : 'var(--text-dark)',
                fontSize: '12px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(107, 30, 43, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {num}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title={t('nextPage', 'Next Page')}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 8px',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            background: currentPage === totalPages ? 'var(--bg-subtle)' : 'var(--bg-card-solid)',
            color: currentPage === totalPages ? 'var(--text-gray)' : 'var(--text-dark)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          ›
        </button>

        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title={t('lastPage', 'Last Page')}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 6px',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            background: currentPage === totalPages ? 'var(--bg-subtle)' : 'var(--bg-card-solid)',
            color: currentPage === totalPages ? 'var(--text-gray)' : 'var(--text-dark)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          »
        </button>
      </div>
    </div>
  );
}
export { Pagination };
