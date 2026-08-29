import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, MapPin, RefreshCcw, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { useReviewDate } from '../ReviewDateContext';
import { num } from '../lib';

const COLORS = ['#549E9E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

type CompareRow = {
  name: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
};

export default function ComparePage() {
  const { t } = useTranslation();
  const { token, branchScope } = useAuth();
  const { dateFilter, setDateFilter, customDateRange, setCustomDateRange, range } = useReviewDate();
  const [reportType, setReportType] = useState<'branch' | 'treatment'>('branch');
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !range.from || !range.to) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: reportType, from: range.from, to: range.to });
      if (branchScope?.selected_branch_id) {
        params.set('branch_id', String(branchScope.selected_branch_id));
      }
      const res = await fetch(`/api/v1/doctors/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || t('reports_next.fetch_failed'));
      const mapped: CompareRow[] = (payload.data || [])
        .map((row: any) => ({
          name: String(row.treatment_name || row.branch_name || '').trim() || '—',
          total: num(row.total_appointments),
          completed: num(row.completed_appointments),
          pending: num(row.pending_appointments),
          cancelled: num(row.cancelled_appointments),
        }))
        .filter((row: CompareRow) => row.total > 0)
        .sort((a: CompareRow, b: CompareRow) => b.total - a.total);
      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, reportType, range.from, range.to, branchScope?.selected_branch_id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const isTreatment = reportType === 'treatment';
  const maxTotal = useMemo(() => Math.max(...rows.map((row) => row.total), 1), [rows]);
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.compare.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.compare.subtitle')}</p>
      </div>
      <div className="no-print flex gap-2">
        <button
          type="button"
          onClick={() => setReportType('branch')}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border ${
            !isTreatment ? 'bg-[#549E9E] text-white border-[#549E9E]' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          <MapPin size={14} /> {t('reports_next.compare.branch')}
        </button>
        <button
          type="button"
          onClick={() => setReportType('treatment')}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border ${
            isTreatment ? 'bg-[#549E9E] text-white border-[#549E9E]' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          <Stethoscope size={14} /> {t('reports_next.compare.treatment')}
        </button>
      </div>
      <DateBar
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRange={setCustomDateRange}
        onRefresh={() => void load()}
        loading={loading}
      />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm font-semibold text-slate-400">{t('reports_next.empty_try_week')}</p>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">
              {isTreatment ? t('reports_next.compare.treatment_pop') : t('reports_next.compare.branch_perf')}
            </h4>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {t('reports_next.compare.explain', { total: grandTotal })}
            </p>
          </div>
          <div className="p-5 space-y-4">
            {rows.map((row, index) => {
              const width = Math.max(6, Math.round((row.total / maxTotal) * 100));
              const seenPct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
              return (
                <div key={row.name}>
                  <div className="flex items-end justify-between gap-3 mb-1.5">
                    <p className="text-sm font-black text-slate-800">{row.name}</p>
                    <p className="text-sm font-black text-[#2d8789] tabular-nums">{row.total}</p>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, backgroundColor: COLORS[index % COLORS.length] }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {isTreatment
                      ? t('reports_next.compare.seen_line', { seen: row.completed, pct: seenPct })
                      : t('reports_next.compare.branch_line', {
                          seen: row.completed,
                          pending: row.pending,
                          cancelled: row.cancelled,
                        })}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto border-t border-gray-50">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">
                    {isTreatment ? t('reports_next.compare.treatment') : t('reports_next.compare.branch')}
                  </th>
                  <th className="px-5 py-3 text-right">{t('reports_next.compare.col_booked')}</th>
                  <th className="px-5 py-3 text-right">{t('reports_next.compare.col_seen')}</th>
                  {isTreatment ? null : (
                    <>
                      <th className="px-5 py-3 text-right">{t('reports_next.pending')}</th>
                      <th className="px-5 py-3 text-right">{t('reports_next.cancelled')}</th>
                    </>
                  )}
                  <th className="px-5 py-3 text-right">{t('reports_next.compare.col_share')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => (
                  <tr key={`table-${row.name}`}>
                    <td className="px-5 py-3 text-sm font-black text-slate-800">{row.name}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold">{row.total}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">{row.completed}</td>
                    {isTreatment ? null : (
                      <>
                        <td className="px-5 py-3 text-right text-sm font-bold text-amber-600">{row.pending}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-rose-500">{row.cancelled}</td>
                      </>
                    )}
                    <td className="px-5 py-3 text-right text-xs font-black text-slate-500">
                      {grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
