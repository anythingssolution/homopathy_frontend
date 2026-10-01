import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileClock,
  RefreshCcw,
  Search,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import { DateBar } from '../DateBar';
import {
  fetchReportModule,
  formatReportWindowLabel,
  num,
  parseIsoDate,
  patientRecordsHref,
  rangeForFilter,
  rupee,
  type CustomRange,
} from '../lib';
import { useReportWindow } from '../useReportWindow';

const PAGE_SIZE = 40;

type RegisterStatus = 'REPORT_PENDING' | 'REVIEWED' | 'REMOVED';

type TestRegisterRow = {
  consultation_test_id: number;
  consultation_id: number;
  appointment_id: number;
  appointment_date: string;
  test_name: string;
  amount: number | string;
  dispense_status?: string | null;
  void_reason?: string | null;
  finding_text?: string | null;
  finding_notes?: string | null;
  interpreted_at?: string | null;
  patient_full_name?: string | null;
  patient_age?: number | string | null;
  patient_gender?: string | null;
  patient_mobile_no?: string | null;
  fk_patient_id?: number | null;
  patient_uuid?: string | null;
  doctor_name?: string | null;
  treatment_name?: string | null;
  slot_name?: string | null;
  token_number?: number | null;
  display_token_display?: string | null;
  token_display?: string | null;
};

type VisitGroup = {
  key: string;
  dateKey: string;
  sequence: number;
  appointmentId: number;
  first: TestRegisterRow;
  tests: TestRegisterRow[];
};

const rowStatus = (row: TestRegisterRow): RegisterStatus => {
  if (String(row.dispense_status || '').toUpperCase() === 'VOID') return 'REMOVED';
  if (String(row.finding_text || '').trim()) return 'REVIEWED';
  return 'REPORT_PENDING';
};

const dateKey = (value: unknown) => {
  const parsed = parseIsoDate(value);
  if (!parsed) return String(value || '').slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatGender = (value: unknown, t: (key: string) => string) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'M' || normalized === 'MALE') return t('reports_next.test_register.male');
  if (normalized === 'F' || normalized === 'FEMALE') return t('reports_next.test_register.female');
  return String(value || '—');
};

export default function TestRegisterPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const navigate = useNavigate();
  const location = useLocation();
  const { token, branchScope } = useAuth();
  const { dateFilter, setDateFilter } = useReportWindow('1_month');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [rows, setRows] = useState<TestRegisterRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RegisterStatus>('ALL');
  const [testFilter, setTestFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const range = rangeForFilter(dateFilter, customDateRange);
    try {
      const data = await fetchReportModule(token, 'test-register', range.from, range.to, {
        force,
        branchId: branchScope?.selected_branch_id || undefined,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, branchScope?.selected_branch_id, dateFilter, customDateRange, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, testFilter, dateFilter, customDateRange]);

  const testNames = useMemo(
    () => [...new Set(rows.map((row) => String(row.test_name || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [rows],
  );

  const allGroups = useMemo<VisitGroup[]>(() => {
    const map = new Map<string, VisitGroup>();
    rows.forEach((row) => {
      const day = dateKey(row.appointment_date);
      const key = `${day}:${row.appointment_id}`;
      const current = map.get(key);
      if (current) current.tests.push(row);
      else map.set(key, { key, dateKey: day, sequence: 0, appointmentId: row.appointment_id, first: row, tests: [row] });
    });

    const list = [...map.values()].sort((left, right) => {
      const dayOrder = right.dateKey.localeCompare(left.dateKey);
      if (dayOrder !== 0) return dayOrder;
      const leftToken = num(left.first.token_number) || Number.MAX_SAFE_INTEGER;
      const rightToken = num(right.first.token_number) || Number.MAX_SAFE_INTEGER;
      if (leftToken !== rightToken) return leftToken - rightToken;
      return left.appointmentId - right.appointmentId;
    });

    const daySequence = new Map<string, number>();
    return list.map((group) => {
      const sequence = (daySequence.get(group.dateKey) || 0) + 1;
      daySequence.set(group.dateKey, sequence);
      return { ...group, sequence };
    });
  }, [rows]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allGroups.flatMap((group) => {
      const matchingTests = group.tests.filter((test) => {
        const matchesStatus = statusFilter === 'ALL' || rowStatus(test) === statusFilter;
        const matchesTest = testFilter === 'ALL' || test.test_name === testFilter;
        return matchesStatus && matchesTest;
      });
      if (matchingTests.length === 0) return [];

      const haystack = [
        group.first.patient_full_name,
        group.first.patient_mobile_no,
        group.first.display_token_display,
        group.first.token_display,
        group.first.token_number,
        group.first.doctor_name,
        group.first.treatment_name,
        ...group.tests.map((test) => test.test_name),
      ].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) return [];
      return [{ ...group, tests: matchingTests }];
    });
  }, [allGroups, search, statusFilter, testFilter]);

  const pages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const visibleGroups = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeRows = rows.filter((row) => rowStatus(row) !== 'REMOVED');
  const pendingCount = activeRows.filter((row) => rowStatus(row) === 'REPORT_PENDING').length;
  const reviewedCount = activeRows.filter((row) => rowStatus(row) === 'REVIEWED').length;
  const totalAmount = activeRows.reduce((sum, row) => sum + num(row.amount), 0);
  const patientCount = allGroups.length;
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, dateLocale);

  const formatDate = (value: unknown) => {
    const parsed = parseIsoDate(value);
    return parsed
      ? parsed.toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      : String(value || '—');
  };

  const statusLabel = (status: RegisterStatus) => t(`reports_next.test_register.status_${status.toLowerCase()}`);
  const statusClass = (status: RegisterStatus) => {
    if (status === 'REVIEWED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'REMOVED') return 'border-slate-200 bg-slate-100 text-slate-500';
    return 'border-amber-200 bg-amber-50 text-amber-700';
  };

  const openPatientRecord = (item: TestRegisterRow) => {
    const href = patientRecordsHref(item);
    if (href) navigate(href);
  };

  const renderRows = (groups: VisitGroup[], print = false) => {
    let activeDay = '';
    return groups.flatMap((group) => {
      const parts: React.ReactNode[] = [];
      if (group.dateKey !== activeDay) {
        activeDay = group.dateKey;
        parts.push(
          <tr key={`date:${group.dateKey}`} className={print ? 'bg-slate-100' : 'bg-[#549E9E]/10'}>
            <td colSpan={print ? 7 : 8} className="px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#2d8789]">
              {formatDate(group.first.appointment_date)}
            </td>
          </tr>,
        );
      }
      const activeAmount = group.tests.reduce(
        (sum, test) => sum + (rowStatus(test) === 'REMOVED' ? 0 : num(test.amount)),
        0,
      );
      const age = group.first.patient_age ? String(group.first.patient_age) : '—';
      parts.push(
        <tr key={group.key} className={print ? 'break-inside-avoid' : 'align-top hover:bg-slate-50/80'}>
          <td className="px-4 py-3 text-xs font-black text-slate-500 tabular-nums">{group.sequence}</td>
          <td className="px-4 py-3">
            <span className="inline-flex min-w-[48px] justify-center rounded-lg bg-[#549E9E]/10 px-2 py-1 text-xs font-black text-[#2d8789]">
              {group.first.display_token_display || group.first.token_display || group.first.token_number || '—'}
            </span>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{group.first.slot_name || ''}</p>
          </td>
          <td className="px-4 py-3">
            <p className="text-sm font-black text-slate-800">{group.first.patient_full_name || '—'}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{group.first.patient_mobile_no || '—'}</p>
          </td>
          <td className="px-4 py-3 text-xs font-bold text-slate-600">
            {age} / {formatGender(group.first.patient_gender, t)}
          </td>
          <td className="px-4 py-3 min-w-[210px]">
            <div className="space-y-2">
              {group.tests.map((test) => {
                const status = rowStatus(test);
                return (
                  <div key={test.consultation_test_id} className={status === 'REMOVED' ? 'opacity-60' : ''}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-black text-slate-700 ${status === 'REMOVED' ? 'line-through' : ''}`}>
                        {test.test_name}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${statusClass(status)}`}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    {status === 'REVIEWED' && (
                      <p className="mt-1 max-w-md text-[11px] font-medium text-emerald-700 line-clamp-2">{test.finding_text}</p>
                    )}
                    {status === 'REMOVED' && test.void_reason && (
                      <p className="mt-1 text-[10px] font-medium text-slate-400">{test.void_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
          <td className="px-4 py-3 text-xs font-black text-slate-700 tabular-nums">{rupee(activeAmount)}</td>
          <td className={`px-4 py-3 ${print ? '' : 'hidden xl:table-cell'}`}>
            <p className="text-xs font-bold text-slate-600">{group.first.doctor_name || '—'}</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">{group.first.treatment_name || ''}</p>
          </td>
          {!print && (
            <td className="no-print px-4 py-3">
              <div className="flex flex-col items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => openPatientRecord(group.first)}
                  title={t('reports_next.test_register.open_patient')}
                  className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:border-[#549E9E]/30 hover:bg-[#549E9E]/5 hover:text-[#2d8789]"
                >
                  <UserRound size={13} />
                  {t('reports_next.test_register.record_short')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/consult/${group.appointmentId}`, {
                    state: {
                      from: { pathname: location.pathname, search: location.search },
                    },
                  })}
                  title={t('reports_next.test_register.open_consultation')}
                  className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:border-[#549E9E]/30 hover:bg-[#549E9E]/5 hover:text-[#2d8789]"
                >
                  <Eye size={13} />
                  {t('reports_next.test_register.consult_short')}
                </button>
              </div>
            </td>
          )}
        </tr>,
      );
      return parts;
    });
  };

  const tableHead = (print = false) => (
    <thead>
      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <th className="px-4 py-3">{t('reports_next.test_register.col_sequence')}</th>
        <th className="px-4 py-3">{t('reports_next.test_register.col_token')}</th>
        <th className="px-4 py-3">{t('reports_next.test_register.col_patient')}</th>
        <th className="px-4 py-3">{t('reports_next.test_register.col_age_gender')}</th>
        <th className="px-4 py-3">{t('reports_next.test_register.col_tests')}</th>
        <th className="px-4 py-3">{t('reports_next.test_register.col_amount')}</th>
        <th className={`px-4 py-3 ${print ? '' : 'hidden xl:table-cell'}`}>{t('reports_next.test_register.col_doctor')}</th>
        {!print && <th className="px-4 py-3 no-print">{t('reports_next.test_register.col_actions')}</th>}
      </tr>
    </thead>
  );

  return (
    <>
      <div className="no-print space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('reports_next.test_register.title')}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.test_register.subtitle')}</p>
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
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryMetricCard
                title={t('reports_next.test_register.recommended')}
                value={rows.length}
                icon={ClipboardList}
                theme="teal"
                subtitle={t('reports_next.test_register.patient_count', { count: patientCount })}
              />
              <SummaryMetricCard
                title={t('reports_next.test_register.report_pending')}
                value={pendingCount}
                icon={FileClock}
                theme="amber"
                subtitle={windowLabel}
              />
              <SummaryMetricCard
                title={t('reports_next.test_register.reviewed')}
                value={reviewedCount}
                icon={CheckCircle2}
                theme="green"
                subtitle={windowLabel}
              />
              <SummaryMetricCard
                title={t('reports_next.test_register.amount')}
                value={rupee(totalAmount)}
                icon={Banknote}
                theme="blue"
                subtitle={t('reports_next.test_register.recommended_amount')}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex flex-col gap-3 border-b border-gray-50 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">{t('reports_next.test_register.register')}</h4>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">{t('reports_next.test_register.order_hint')}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                  <div className="relative min-w-0 flex-1 xl:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t('reports_next.test_register.search')}
                      className="w-full rounded-xl border border-gray-100 py-2 pl-9 pr-4 text-xs font-bold outline-none focus:border-[#549E9E]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'ALL' | RegisterStatus)}
                    className="cursor-pointer rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#549E9E]"
                    aria-label={t('reports_next.test_register.filter_status')}
                  >
                    <option value="ALL">{t('reports_next.test_register.all_statuses')}</option>
                    <option value="REPORT_PENDING">{t('reports_next.test_register.status_report_pending')}</option>
                    <option value="REVIEWED">{t('reports_next.test_register.status_reviewed')}</option>
                    <option value="REMOVED">{t('reports_next.test_register.status_removed')}</option>
                  </select>
                  <select
                    value={testFilter}
                    onChange={(event) => setTestFilter(event.target.value)}
                    className="cursor-pointer rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#549E9E]"
                    aria-label={t('reports_next.test_register.filter_test')}
                  >
                    <option value="ALL">{t('reports_next.test_register.all_tests')}</option>
                    {testNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>

              {visibleGroups.length === 0 ? (
                <p className="py-12 text-center text-sm font-semibold text-slate-400">{t('reports_next.test_register.empty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left">
                    {tableHead()}
                    <tbody className="divide-y divide-slate-50">{renderRows(visibleGroups)}</tbody>
                  </table>
                </div>
              )}

              {pages > 1 && (
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t('reports_next.window.showing', {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, filteredGroups.length),
                      total: filteredGroups.length,
                    })}
                  </p>
                  <div className="flex gap-3">
                    <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="cursor-pointer text-xs font-black uppercase text-[#549E9E] disabled:opacity-40">
                      {t('reports_next.prev')}
                    </button>
                    <button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)} className="cursor-pointer text-xs font-black uppercase text-[#549E9E] disabled:opacity-40">
                      {t('reports_next.next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <section className="print-only px-5 py-4 text-slate-900">
        <div className="mb-4 border-b-2 border-[#549E9E] pb-3">
          <h1 className="text-xl font-black">{t('reports_next.test_register.print_title')}</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {branchScope?.selected_branch?.branch_name || t('reports_next.active_branch')} · {windowLabel}
          </p>
        </div>
        {filteredGroups.length === 0 ? (
          <p className="py-10 text-center text-sm">{t('reports_next.test_register.empty')}</p>
        ) : (
          <table className="w-full border-collapse text-left text-[10px]">
            {tableHead(true)}
            <tbody className="divide-y divide-slate-200">{renderRows(filteredGroups, true)}</tbody>
          </table>
        )}
      </section>
    </>
  );
}
