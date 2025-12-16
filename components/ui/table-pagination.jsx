'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Composant de pagination réutilisable pour les tableaux
 * @param {Object} props
 * @param {number} props.currentPage - Page actuelle (commence à 1)
 * @param {number} props.totalPages - Nombre total de pages
 * @param {number} props.totalItems - Nombre total d'éléments
 * @param {number} props.itemsPerPage - Éléments par page
 * @param {function} props.onPageChange - Callback appelé avec le nouveau numéro de page
 * @param {function} props.onItemsPerPageChange - Callback optionnel pour changer le nombre d'éléments par page
 * @param {number[]} props.itemsPerPageOptions - Options pour le nombre d'éléments par page
 * @param {boolean} props.showItemsPerPage - Afficher le sélecteur d'éléments par page
 * @param {string} props.className - Classes CSS additionnelles
 */
export default function TablePagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 15,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 15, 25, 50],
  showItemsPerPage = true,
  className = ''
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={`px-4 py-3 border-t bg-gray-50 flex items-center justify-between ${className}`}>
      {/* Info + Items per page */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          {totalItems === 0 ? '0 résultat' : `${startItem}-${endItem} sur ${totalItems}`}
        </span>

        {showItemsPerPage && onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className="h-7 px-2 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {itemsPerPageOptions.map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Première page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Première page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Page précédente */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numéros de page */}
          <div className="flex items-center gap-0.5 mx-1">
            {getPageNumbers().map((page, i) => (
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-medium rounded transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Page suivante */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dernière page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Dernière page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
