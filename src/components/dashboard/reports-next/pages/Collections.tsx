import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { fetchReportModule, num, parseIsoDate, rangeForFilter, rupee, type CustomRange } from '../lib';

const formatDate = (value: unknown, locale: string) => {
  const raw = String(value || '');
  if (!raw) return '—';
  const date = raw.includes('T') ? new Date(raw) : parseIsoDate(raw);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CollectionsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token } = useAuth();
  const [dateFilter, setDateFilter] = useState('1_month');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const range = rangeForFilter(dateFilter, customDateRange);
    try {
      setData(await fetchReportModule(token, 'billing', range.from, range.to, { force }));
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

  const rev = data?.total_revenue?.[0] || {};
  const billed = num(rev.total_amount);
  const paid = num(rev.paid_amount);
  const pending = num(rev.pending_amount);
  const collectionPct =
    billed <= 0 ? 0 : pending > 0 ? Math.min(99, Math.floor((paid / billed) * 100)) : 100;

  const dues = Array.isArray(data?.pending_amount) ? data.pending_amount : [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dues;
    return dues.filter((row: any) =>
      [row.patient_full_name, row.patient_mobile_no, row.bill_number, row.treatment_name, row.doctor_name]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [dues, search]);

  const typeLabel = (type: string) => {
    const key = String(type || '').toUpperCase();
    if (key === 'CONSULTATION') return t('reports_next.collections.type_consult');
    if (key === 'MEDICATION') return t('reports_next.collections.type_medicine');
    return type || '—';
  };

  const visitStory = (row: any) => {
    const visits = Math.max(1, num(row.visit_count));
    const unpaid = parseIsoDate(row.unpaid_visit_date || row.due_date);
    const last = parseIsoDate(row.last_visit_date);
    const cameBack =
      unpaid && last ? last.getTime() > unpaid.getTime() : false;
    if (visits <= 1) return t('reports_next.collections.story_once');
    if (cameBack) return t('reports_next.collections.story_returned');
    return t('reports_next.collections.story_no_return');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.collections.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.collections.subtitle')}</p>
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
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
        </div>
      ) : !data ? (
        <p className="py-16 text-center text-sm font-semibold text-slate-400">{t('reports_next.empty_try_week')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Mini
              label={t('reports_next.pending')}
              value={rupee(pending)}
              sub={t('reports_next.collections.open_dues', { count: dues.length })}
              emphasis
            />
            <Mini label={t('reports_next.collections.collected')} value={rupee(paid)} />
            <Mini
              label={t('reports_next.collections.total')}
              value={rupee(billed)}
              sub={t('reports_next.collections.rate_line', { pct: collectionPct })}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">
                  {t('reports_next.collections.dues')}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{t('reports_next.collections.dues_sub')}</p>
              </div>
              <div className="relative max-w-xs w-full no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('reports_next.collections.search')}
                  className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E]"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm font-semibold text-slate-400">
                {dues.length === 0 ? t('reports_next.collections.no_dues') : t('reports_next.collections.no_match')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[860px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-5 py-3">{t('reports_next.collections.col_patient')}</th>
                      <th className="px-5 py-3">{t('reports_next.collections.col_unpaid_on')}</th>
                      <th className="px-5 py-3">{t('reports_next.collections.col_visits')}</th>
                      <th className="px-5 py-3">{t('reports_next.collections.col_story')}</th>
                      <th className="px-5 py-3 text-right">{t('reports_next.collections.col_paid')}</th>
                      <th className="px-5 py-3 text-right">{t('reports_next.pending')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((row: any) => {
                      const visits = Math.max(1, num(row.visit_count));
                      const days = Math.max(0, num(row.days_unpaid));
                      return (
                        <tr key={row.bill_id}>
                          <td className="px-5 py-3 align-top">
                            <p className="text-sm font-black text-slate-800">{row.patient_full_name}</p>
                            {row.patient_mobile_no ? (
                              <a
                                href={`tel:${row.patient_mobile_no}`}
                                className="text-[11px] font-semibold text-[#2d8789] hover:underline"
                              >
                                {row.patient_mobile_no}
                              </a>
                            ) : (
                              <p className="text-[11px] text-slate-400">—</p>
                            )}
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {typeLabel(row.bill_type)}
                              {row.bill_number ? ` · ${row.bill_number}` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-3 align-top">
                            <p className="text-xs font-black text-slate-800">
                              {formatDate(row.unpaid_visit_date || row.due_date, dateLocale)}
                            </p>
                            <p className="text-[10px] font-bold text-amber-600">
                              {t('reports_next.collections.days_open', { days })}
                            </p>
                            {row.treatment_name && (
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{row.treatment_name}</p>
                            )}
                            {row.doctor_name && (
                              <p className="text-[10px] font-bold text-slate-400">{row.doctor_name}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <p className="text-xs font-black text-slate-800">
                              {t(
                                visits === 1
                                  ? 'reports_next.collections.visit_n'
                                  : 'reports_next.collections.visit_n_plural',
                                { count: visits },
                              )}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {t('reports_next.collections.last_visit', {
                                date: formatDate(row.last_visit_date || row.unpaid_visit_date, dateLocale),
                              })}
                            </p>
                          </td>
                          <td className="px-5 py-3 align-top max-w-xs">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{visitStory(row)}</p>
                            {num(row.paid_amount) > 0 && row.last_paid_at && (
                              <p className="mt-1 text-[10px] font-bold text-slate-400">
                                {t('reports_next.collections.last_paid', {
                                  date: formatDate(row.last_paid_at, dateLocale),
                                })}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top text-right">
                            <p className="text-xs font-bold text-emerald-600">{rupee(row.paid_amount)}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {t('reports_next.collections.of_billed', { amount: rupee(row.total_amount) })}
                            </p>
                          </td>
                          <td className="px-5 py-3 align-top text-right">
                            <p className="text-sm font-black text-amber-600">{rupee(row.pending_amount)}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {String(row.payment_status || '').toUpperCase() === 'PARTIAL'
                                ? t('reports_next.collections.partial')
                                : t('reports_next.collections.unpaid')}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const Mini = ({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string | number;
  sub?: string;
  emphasis?: boolean;
}) => (
  <div className={`rounded-xl border p-4 ${emphasis ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-white'}`}>
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    {sub && <p className="mt-1 text-[10px] font-bold text-[#2d8789]">{sub}</p>}
  </div>
);
