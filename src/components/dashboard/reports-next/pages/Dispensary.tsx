import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Banknote, CheckCircle2, Clock, RefreshCcw, Search, Ticket } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import { DateBar } from '../DateBar';
import {
  fetchReportModule,
  formatReportWindowLabel,
  num,
  patientRecordsHref,
  rangeForFilter,
  rupee,
  type CustomRange,
} from '../lib';
import { useReportWindow } from '../useReportWindow';

const PAGE_SIZE = 25;

export default function DispensaryPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const navigate = useNavigate();
  const { token } = useAuth();
  const { dateFilter, setDateFilter } = useReportWindow('3_months');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [data, setData] = useState<any>(null);
  const [prevSummary, setPrevSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const range = rangeForFilter(dateFilter, customDateRange);
    const days = Math.max(1, Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000));
    const prevTo = new Date(range.from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevTo.getDate() - days);
    try {
      const [current, previous] = await Promise.all([
        fetchReportModule(token, 'medical', range.from, range.to, { force }),
        fetchReportModule(token, 'medical', prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10), { force }),
      ]);
      setData(current);
      setPrevSummary(previous?.summary?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, dateFilter, customDateRange, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const ready = Array.isArray(data?.ready_prescriptions) ? data.ready_prescriptions : [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ready.filter((item: any) =>
      [item.patient_full_name, item.patient_mobile_no, item.doctor_name, item.treatment_name]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [ready, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = data?.summary?.[0] || {};
  const revenue = num(summary.total_pricing_amount);
  const prevRevenue = num(prevSummary?.total_pricing_amount);
  const revDelta = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
  const readyCount = num(summary.ready_prescriptions_count);
  const processedCount = num(summary.processed_prescriptions_count);
  const ticket =
    readyCount + processedCount > 0 ? revenue / (readyCount + processedCount) : 0;
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, dateLocale);

  const openPatientRecord = (item: any) => {
    const href = patientRecordsHref(item);
    if (href) navigate(href);
  };

  const trend = (data?.date_wise_summary || []).map((row: any) => ({
    date: new Date(row.appointment_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
    pending: num(row.ready_prescriptions_count),
    processed: num(row.processed_prescriptions_count),
    revenue: num(row.total_pricing_amount),
  }));

  const demand = (data?.lab_test_medicine_item || [])
    .slice()
    .sort((a: any, b: any) => num(b.total_items) - num(a.total_items))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.dispensary.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.dispensary.subtitle')}</p>
      </div>
      <DateBar
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRange={setCustomDateRange}
        onRefresh={() => void load(true)}
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
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryMetricCard
              title={t('reports_next.dispensary.ready')}
              value={readyCount}
              icon={Clock}
              theme="amber"
              subtitle={windowLabel}
            />
            <SummaryMetricCard
              title={t('reports_next.dispensary.processed')}
              value={processedCount}
              icon={CheckCircle2}
              theme="green"
              subtitle={windowLabel}
            />
            <SummaryMetricCard
              title={t('reports_next.dispensary.revenue')}
              value={rupee(revenue)}
              icon={Banknote}
              theme="teal"
              subtitle={windowLabel}
              trend={
                prevRevenue > 0
                  ? {
                      direction: revDelta >= 0 ? 'up' : 'down',
                      tone: revDelta >= 0 ? 'good' : 'bad',
                      label: t('reports_next.pct_vs_last', { pct: Math.abs(revDelta), dir: revDelta >= 0 ? '+' : '−' }),
                    }
                  : undefined
              }
            />
            <SummaryMetricCard
              title={t('reports_next.dispensary.ticket')}
              value={rupee(ticket)}
              icon={Ticket}
              theme="blue"
              subtitle={windowLabel}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">{t('reports_next.dispensary.queue')}</h4>
              <div className="relative max-w-xs w-full no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder={t('reports_next.dispensary.search')}
                  className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E]"
                />
              </div>
            </div>
            {slice.length === 0 ? (
              <p className="py-12 text-center text-sm font-semibold text-slate-400">{t('reports_next.dispensary.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-5 py-3">{t('reports_next.dispensary.col_token')}</th>
                      <th className="px-5 py-3">{t('reports_next.dispensary.col_patient')}</th>
                      <th className="px-5 py-3">{t('reports_next.dispensary.col_doctor')}</th>
                      <th className="px-5 py-3">{t('reports_next.dispensary.col_treatment')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {slice.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => openPatientRecord(item)}
                        className="cursor-pointer hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3 text-sm font-black text-[#2d8789]">{item.token_number || '—'}</td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-black text-[#2d8789]">{item.patient_full_name}</p>
                          <p className="text-[11px] text-slate-400">{item.patient_mobile_no || '—'}</p>
                        </td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-600">{item.doctor_name}</td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-500">{item.treatment_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 && (
              <div className="no-print flex items-center justify-between gap-2 px-4 py-3">
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

          {trend.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 h-[280px]">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2">{t('reports_next.dispensary.trends')}</h4>
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="processed" fill="#10b981" name={t('reports_next.dispensary.processed')} />
                  <Bar dataKey="pending" fill="#f59e0b" name={t('reports_next.dispensary.ready')} />
                  <Line dataKey="revenue" stroke="#549E9E" name={t('reports_next.dispensary.revenue')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {demand.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">{t('reports_next.dispensary.demand')}</h4>
              <ul className="space-y-2">
                {demand.map((item: any, idx: number) => (
                  <li key={idx} className="flex justify-between text-sm font-bold text-slate-600">
                    <span>{item.test_name || String(item.medicine_name || item.item_name || '—').toUpperCase()}</span>
                    <span className="text-[#2d8789]">{num(item.total_items)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
