import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { fetchReportModule, parseIsoDate, rangeForFilter, type CustomRange } from '../lib';

const PAGE_SIZE = 8;

const personKey = (item: any) =>
  String(item.person_key || `${item.fk_patient_id || item.patient_full_name}:${item.fk_patient_family_member_id || 0}`);

export default function FirstConsultationsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token } = useAuth();
  const [dateFilter, setDateFilter] = useState('1_week');
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

  const activeRows = filtered.filter((item) => String(item.status || '').toLowerCase() !== 'cancelled');
  const uniquePatients = new Set(activeRows.map(personKey)).size;
  const consulted = activeRows.filter((item) => Number(item.is_consulted) === 1).length;
  const camePct = uniquePatients > 0 ? Math.round((consulted / activeRows.length) * 100) : 0;

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
      <p className="text-[11px] font-semibold text-slate-400 -mt-2">
        {t('reports_next.first_consults.hint')}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Mini label={t('reports_next.first_consults.patients')} value={uniquePatients} />
        <Mini label={t('reports_next.first_consults.booked')} value={filtered.length} />
        <Mini label={t('reports_next.first_consults.consulted')} value={consulted} />
        <Mini label={t('reports_next.consultation_rate')} value={`${camePct}%`} />
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
                    <tr key={`${item.appointment_id}-${idx}`}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-black text-slate-800">{item.patient_full_name}</p>
                        {item.patient_mobile_no ? (
                          <a
                            href={`tel:${item.patient_mobile_no}`}
                            className="text-[11px] font-semibold text-[#2d8789] hover:underline cursor-pointer"
                          >
                            {item.patient_mobile_no}
                          </a>
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
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
          <div className="no-print flex justify-end gap-2 px-4 py-3 border-t border-slate-50">
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
        )}
      </div>
    </div>
  );
}

const Mini = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4">
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);
