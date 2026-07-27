import { useState, useEffect, useCallback } from 'react';

type ReportModule = 'appointments' | 'clinical' | 'patients' | 'billing' | 'medical';

export function useReportData(token: string | null, module: ReportModule) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  const fetchReports = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    try {
      let toDateObj = new Date();
      let fromDateObj = new Date();

      if (dateFilter === 'custom') {
        if (customDateRange.from) fromDateObj = new Date(customDateRange.from);
        if (customDateRange.to) toDateObj = new Date(customDateRange.to);
      } else if (dateFilter === 'today') {
        // keep same
      } else if (dateFilter === '1_week') {
        fromDateObj.setDate(toDateObj.getDate() - 7);
      } else if (dateFilter === '1_month') {
        fromDateObj.setMonth(toDateObj.getMonth() - 1);
      } else if (dateFilter.endsWith('_months') || dateFilter.endsWith('_month')) {
        const num = parseInt(dateFilter.split('_')[0], 10);
        if (!isNaN(num)) {
          fromDateObj.setMonth(toDateObj.getMonth() - num);
        }
      } else if (dateFilter.endsWith('_years') || dateFilter.endsWith('_year')) {
        const num = parseInt(dateFilter.split('_')[0], 10);
        if (!isNaN(num)) {
          fromDateObj.setFullYear(toDateObj.getFullYear() - num);
        }
      }

      const params = new URLSearchParams({
        from: fromDateObj.toISOString().slice(0, 10),
        to: toDateObj.toISOString().slice(0, 10)
      });

      const res = await fetch(`/api/v1/reports/${module}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payload = await res.json();
      
      if (payload.success) {
        setData(payload.data);
      } else {
        setError(payload.message || 'Failed to fetch reports');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [module, dateFilter, customDateRange, token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports };
}
