import { useSearchParams } from 'react-router-dom';
import { parseReportWindow } from './lib';

export function useReportWindow(fallback: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = parseReportWindow(searchParams.get('window'), fallback);
  const fromCard = searchParams.get('from') === 'now';

  const setDateFilter = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('window', value);
      next.delete('from');
      return next;
    }, { replace: true });
  };

  return { dateFilter, setDateFilter, fromCard };
}
