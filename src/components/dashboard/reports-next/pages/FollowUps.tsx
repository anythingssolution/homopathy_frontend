import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { WindowBanner } from '../WindowBanner';
import { fetchReportModule, parseIsoDate, rangeForFollowUpFilter, type CustomRange } from '../lib';
import { useReportWindow } from '../useReportWindow';

const PAGE_SIZE = 25;

export default function FollowUpsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const navigate = useNavigate();
  const { token } = useAuth();
  const { dateFilter, setDateFilter, fromCard } = useReportWindow('3_months');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const range = rangeForFollowUpFilter(dateFilter, customDateRange);
    try {
      const data = await fetchReportModule(token, 'clinical', range.from, range.to, { force });
      setRows(Array.isArray(data?.followup_due) ? data.followup_due : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, dateFilter, customDateRange, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter]);

  const range = useMemo(
    () => rangeForFollowUpFilter(dateFilter, customDateRange),
    [dateFilter, customDateRange],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const from = parseIsoDate(range.from);
    const to = parseIsoDate(range.to);
    return rows.filter((item) => {
      const due = parseIsoDate(item.due_date);
      if (from && to && due && (due < from || due > to)) {
        return false;
      }
      return [item.patient_full_name, item.patient_mobile_no, item.treatment_name, item.branch_name, item.status]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, range]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dueMeta = (value: unknown) => {
    const due = parseIsoDate(value);
    if (!due) return { label: '—', hint: '', overdue: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    const label = due.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (days < 0) return { label, hint: t('reports_next.follow_ups.overdue_by', { days: Math.abs(days) }), overdue: true };
    if (days === 0) return { label, hint: t('reports_next.follow_ups.due_today_hint'), overdue: false };
    return { label, hint: t('reports_next.follow_ups.in_days', { days }), overdue: false };
  };

  const openPatientRecord = (item: any) => {
    const search = String(item.patient_mobile_no || item.patient_full_name || '').trim();
    if (!search) return;
    const params = new URLSearchParams({ search });
    if (item.fk_patient_id) params.set('patient_id', String(item.fk_patient_id));
    navigate(`/patient-records?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.follow_ups.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.follow_ups.subtitle')}</p>
      </div>
      <DateBar
        mode="due"
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRange={setCustomDateRange}
        onRefresh={() => void load(true)}
        loading={loading}
        showPrint
      />
      <WindowBanner mode="due" dateFilter={dateFilter} count={filtered.length} fromCard={fromCard} />
      <p className="text-[11px] font-semibold text-slate-400">
        {dateFilter === 'overdue'
          ? t('reports_next.follow_ups.hint_overdue')
          : t('reports_next.follow_ups.hint_upcoming')}
      </p>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex justify-end no-print">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('reports_next.follow_ups.search')}
              className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E]"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
          </div>
        ) : slice.length === 0 ? (
            <p className="py-16 text-center text-sm font-semibold text-slate-400">
              {dateFilter === 'overdue' ? t('reports_next.follow_ups.empty_overdue') : t('reports_next.follow_ups.empty')}
            </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">{t('reports_next.follow_ups.col_patient')}</th>
                  <th className="px-5 py-3">{t('reports_next.follow_ups.col_treatment')}</th>
                  <th className="px-5 py-3">{t('reports_next.follow_ups.col_due')}</th>
                  <th className="px-5 py-3">{t('reports_next.follow_ups.col_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slice.map((item: any, idx: number) => {
                  const meta = dueMeta(item.due_date);
                  return (
                  <tr
                    key={`${item.followup_id}-${idx}`}
                    onClick={() => openPatientRecord(item)}
                    className="cursor-pointer hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-black text-[#2d8789]">{item.patient_full_name}</p>
                      {item.patient_mobile_no ? (
                        <p className="text-[11px] font-semibold text-slate-400">{item.patient_mobile_no}</p>
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-400">—</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-600">{item.treatment_name}</td>
                    <td className="px-5 py-3">
                      <p className={`text-xs font-black ${meta.overdue ? 'text-amber-600' : 'text-[#2d8789]'}`}>
                        {meta.label}
                      </p>
                      {meta.hint && (
                        <p className={`text-[10px] font-bold ${meta.overdue ? 'text-amber-500' : 'text-slate-400'}`}>
                          {meta.hint}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {item.status || '—'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="no-print flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t('reports_next.window.showing', {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </p>
            <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-xs font-black uppercase text-[#549E9E] disabled:opacity-40">
              {t('reports_next.prev')}
            </button>
            <button type="button" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="text-xs font-black uppercase text-[#549E9E] disabled:opacity-40">
              {t('reports_next.next')}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
