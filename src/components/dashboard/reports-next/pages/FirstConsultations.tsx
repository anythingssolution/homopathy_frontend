import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, Percent, RefreshCcw, Search, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import { DateBar } from '../DateBar';
import {
  fetchReportModule,
  formatReportWindowLabel,
  parseIsoDate,
  patientRecordsHref,
  rangeForFilter,
  type CustomRange,
} from '../lib';
import { useReportWindow } from '../useReportWindow';

const PAGE_SIZE = 25;

export default function FirstConsultationsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const navigate = useNavigate();
  const { token } = useAuth();
  const { dateFilter, setDateFilter } = useReportWindow('1_week');
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
    const range = rangeForFilter(dateFilter, customDateRange);
    try {
      const data = await fetchReportModule(token, 'appointments', range.from, range.to, { force });
      setRows(Array.isArray(data?.first_consultations) ? data.first_consultations : []);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((item) =>
      [item.patient_full_name, item.patient_mobile_no, item.treatment_name, item.branch_name, item.status, item.slot_name]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const cancelledRows = filtered.filter((item) => String(item.status || '').toLowerCase() === 'cancelled');
  const waitingRows = filtered.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    return status !== 'cancelled' && Number(item.is_consulted) !== 1;
  });
  const consultedRows = filtered.filter((item) => Number(item.is_consulted) === 1);
  const total = filtered.length;
  const consulted = consultedRows.length;
  const waiting = waitingRows.length;
  const cancelled = cancelledRows.length;
  const camePct = total > 0 ? Math.round((consulted / total) * 100) : 0;
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, dateLocale);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const visitMeta = (value: unknown) => {
    const visit = parseIsoDate(value);
    if (!visit) return { label: '—', hint: '' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - visit.getTime()) / 86400000);
    const label = visit.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (days === 0) return { label, hint: t('reports_next.first_consults.today_hint') };
    if (days === 1) return { label, hint: t('reports_next.first_consults.yesterday_hint') };
    if (days > 1) return { label, hint: t('reports_next.first_consults.days_ago', { days }) };
    return { label, hint: t('reports_next.first_consults.in_days', { days: Math.abs(days) }) };
  };

  const openPatientRecord = (item: any) => {
    const href = patientRecordsHref(item);
    if (href) navigate(href);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.first_consults.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.first_consults.subtitle')}</p>
      </div>
      <DateBar
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRange={setCustomDateRange}
        onRefresh={() => void load(true)}
        loading={loading}
        showPrint
      />
      <p className="text-[11px] font-semibold text-slate-400">
        {t('reports_next.first_consults.hint')}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <SummaryMetricCard
          title={t('reports_next.total')}
          value={total}
          icon={CalendarCheck}
          theme="teal"
          subtitle={windowLabel}
        />
        <SummaryMetricCard
          title={t('reports_next.completed')}
          value={consulted}
          icon={CheckCircle2}
          theme="green"
          subtitle={windowLabel}
        />
        <SummaryMetricCard
          title={t('reports_next.pending')}
          value={waiting}
          icon={Clock}
          theme="amber"
          subtitle={windowLabel}
        />
        <SummaryMetricCard
          title={t('reports_next.cancelled')}
          value={cancelled}
          icon={XCircle}
          theme="rose"
          subtitle={windowLabel}
        />
        <SummaryMetricCard
          title={t('reports_next.consultation_rate')}
          value={`${camePct}%`}
          icon={Percent}
          theme="blue"
          subtitle={windowLabel}
        />
      </div>
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
              placeholder={t('reports_next.first_consults.search')}
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
            {t('reports_next.first_consults.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">{t('reports_next.first_consults.col_patient')}</th>
                  <th className="px-5 py-3">{t('reports_next.first_consults.col_visit')}</th>
                  <th className="px-5 py-3">{t('reports_next.first_consults.col_slot')}</th>
                  <th className="px-5 py-3">{t('reports_next.first_consults.col_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slice.map((item: any, idx: number) => {
                  const meta = visitMeta(item.appointment_date);
                  const seen = Number(item.is_consulted) === 1;
                  return (
                    <tr
                      key={`${item.appointment_id}-${idx}`}
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
                      <td className="px-5 py-3">
                        <p className="text-xs font-black text-[#2d8789]">{meta.label}</p>
                        {meta.hint && (
                          <p className="text-[10px] font-bold text-slate-400">{meta.hint}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-slate-600">{item.slot_name || '—'}</td>
                      <td className="px-5 py-3">
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            String(item.status || '').toLowerCase() === 'cancelled'
                              ? 'text-rose-500'
                              : seen
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                          }`}
                        >
                          {item.status || '—'}
                        </p>
                        {seen && (
                          <p className="text-[10px] font-bold text-emerald-600">
                            {t('reports_next.first_consults.seen')}
                          </p>
                        )}
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
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="cursor-pointer text-xs font-black uppercase text-[#549E9E] disabled:opacity-40"
            >
              {t('reports_next.prev')}
            </button>
            <button
              type="button"
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="cursor-pointer text-xs font-black uppercase text-[#549E9E] disabled:opacity-40"
            >
              {t('reports_next.next')}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
