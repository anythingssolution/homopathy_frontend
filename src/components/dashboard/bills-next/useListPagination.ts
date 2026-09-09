import { useEffect, useState } from 'react';

export default function useListPagination<T>(rows: T[], resetKey = '') {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { setPage((value) => Math.min(value, totalPages)); }, [totalPages]);
  return {
    rows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    controls: { currentPage, totalPages, onPageChange: setPage, totalItems: rows.length, pageSize, alwaysShow: true },
  };
}
