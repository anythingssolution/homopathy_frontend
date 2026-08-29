import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-white">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {t('common.page_of', { current: currentPage, total: totalPages })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg border transition-all ${
            currentPage === 1
              ? 'border-gray-100 text-gray-300 cursor-not-allowed'
              : 'border-gray-200 text-gray-600 hover:border-[#549E9E] hover:text-[#549E9E] cursor-pointer'
          }`}
        >
          <ChevronLeft size={16} />
        </button>
        
        {getPageNumbers().map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="text-gray-400 px-1">...</span>
          ) : (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(page as number)}
              className={`w-9 h-9 rounded-lg font-black text-xs transition-all cursor-pointer ${
                currentPage === page
                  ? 'bg-[#549E9E] text-white shadow-sm'
                  : 'text-gray-500 hover:bg-[#549E9E]/10 hover:text-[#549E9E]'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg border transition-all ${
            currentPage === totalPages
              ? 'border-gray-100 text-gray-300 cursor-not-allowed'
              : 'border-gray-200 text-gray-600 hover:border-[#549E9E] hover:text-[#549E9E] cursor-pointer'
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
