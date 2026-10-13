import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Send,
  UserRound,
  X,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatAgeValue } from '../../../../utils/ageDisplay';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
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
type ReportSendStatus = 'SENT' | 'NOT_SENT';
type ReportSendFilter = 'ALL' | ReportSendStatus | 'UNMARKED';

type TestRegisterRow = {
  consultation_test_id: number | string;
  test_source?: string;
  report_source_type?: 'CONSULTATION' | 'BILL';
  report_source_id?: number | string;
  bill_id?: number;
  bill_number?: string;
  recommended_at?: string;
  consultation_id: number | null;
  appointment_id: number | null;
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
  patient_age_display?: string | null;
  patient_date_of_birth?: string | null;
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
  report_send_status?: ReportSendStatus | null;
  report_not_sent_reason?: string | null;
  report_status_marked_at?: string | null;
  report_status_marked_by_name?: string | null;
};

type VisitGroup = {
  key: string;
  dateKey: string;
  sequence: number;
  appointmentId: number;
  first: TestRegisterRow;
  tests: TestRegisterRow[];
};

type ReportStatusModalState = {
  group: VisitGroup;
  selectedKey: string;
  status: ReportSendStatus;
  reason: string;
};

const TEST_STATUS_COLORS: Record<RegisterStatus, string> = {
  REVIEWED: '#10B981',
  REPORT_PENDING: '#F59E0B',
  REMOVED: '#94A3B8',
};

const REPORT_SEND_COLORS: Record<Exclude<ReportSendFilter, 'ALL'>, string> = {
  SENT: '#059669',
  NOT_SENT: '#EF4444',
  UNMARKED: '#0EA5E9',
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
  const { token, branchScope, user } = useAuth();
  const { addToast } = useNotifications();
  const roleCode = String(user?.role_code || '').toUpperCase();
  const role = String(user?.role || '').toLowerCase();
  const isReceptionist = roleCode === 'REC' || role === 'rec' || role === 'receptionist';
  const { dateFilter, setDateFilter } = useReportWindow('1_month');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [rows, setRows] = useState<TestRegisterRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RegisterStatus>('ALL');
  const [reportSendFilter, setReportSendFilter] = useState<ReportSendFilter>('ALL');
  const [testFilter, setTestFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportModal, setReportModal] = useState<ReportStatusModalState | null>(null);
  const [savingReportStatus, setSavingReportStatus] = useState(false);
  const [reportStatusError, setReportStatusError] = useState('');

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
  }, [search, statusFilter, reportSendFilter, testFilter, dateFilter, customDateRange]);

  const testNames = useMemo(
    () => [...new Set(rows.map((row) => String(row.test_name || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [rows],
  );

  const allGroups = useMemo<VisitGroup[]>(() => {
    const map = new Map<string, VisitGroup>();
    rows.forEach((row) => {
      const day = dateKey(row.appointment_date);
      const key = `${day}:${row.test_source === 'BILL' ? `bill-${row.bill_id}` : row.appointment_id}`;
      const current = map.get(key);
      if (current) current.tests.push(row);
      else map.set(key, { key, dateKey: day, sequence: 0, appointmentId: Number(row.appointment_id) || 0, first: row, tests: [row] });
    });

    const list = [...map.values()].sort((left, right) => {
      const dayOrder = right.dateKey.localeCompare(left.dateKey);
      if (dayOrder !== 0) return dayOrder;
      const leftToken = num(left.first.token_number) || Number.MAX_SAFE_INTEGER;
      const rightToken = num(right.first.token_number) || Number.MAX_SAFE_INTEGER;
      if (leftToken !== rightToken) return leftToken - rightToken;
      if (left.first.test_source === 'BILL' && right.first.test_source === 'BILL') return String(right.first.recommended_at).localeCompare(String(left.first.recommended_at)) || num(right.first.bill_id) - num(left.first.bill_id);
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
        const matchesReportSend = reportSendFilter === 'ALL'
          || (reportSendFilter === 'UNMARKED' ? !test.report_send_status : test.report_send_status === reportSendFilter);
        const matchesTest = testFilter === 'ALL' || test.test_name === testFilter;
        return matchesStatus && matchesReportSend && matchesTest;
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
  }, [allGroups, search, statusFilter, reportSendFilter, testFilter]);

  const pages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const visibleGroups = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeRows = rows.filter((row) => rowStatus(row) !== 'REMOVED');
  const pendingCount = activeRows.filter((row) => rowStatus(row) === 'REPORT_PENDING').length;
  const reviewedCount = activeRows.filter((row) => rowStatus(row) === 'REVIEWED').length;
  const totalAmount = activeRows.reduce((sum, row) => sum + num(row.amount), 0);
  const patientCount = allGroups.length;
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, dateLocale);
  const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const overview = useMemo(() => {
    const totalTests = rows.length;
    const activeTests = rows.filter((row) => rowStatus(row) !== 'REMOVED');
    const reviewedTests = rows.filter((row) => rowStatus(row) === 'REVIEWED').length;
    const pendingTests = rows.filter((row) => rowStatus(row) === 'REPORT_PENDING').length;
    const removedTests = rows.filter((row) => rowStatus(row) === 'REMOVED').length;
    const sentReports = activeTests.filter((row) => row.report_send_status === 'SENT').length;
    const notSentReports = activeTests.filter((row) => row.report_send_status === 'NOT_SENT').length;
    const sendPendingReports = activeTests.length - sentReports - notSentReports;
    return {
      totalTests,
      activeTests: activeTests.length,
      status: [
        {
          key: 'REVIEWED' as const,
          name: t('reports_next.test_register.status_done_chart'),
          value: reviewedTests,
          percent: percent(reviewedTests, totalTests),
          color: TEST_STATUS_COLORS.REVIEWED,
        },
        {
          key: 'REPORT_PENDING' as const,
          name: t('reports_next.test_register.status_pending_chart'),
          value: pendingTests,
          percent: percent(pendingTests, totalTests),
          color: TEST_STATUS_COLORS.REPORT_PENDING,
        },
        {
          key: 'REMOVED' as const,
          name: t('reports_next.test_register.status_cancelled_chart'),
          value: removedTests,
          percent: percent(removedTests, totalTests),
          color: TEST_STATUS_COLORS.REMOVED,
        },
      ],
      reportSend: [
        {
          key: 'SENT' as const,
          name: t('reports_next.test_register.report_sent'),
          value: sentReports,
          percent: percent(sentReports, activeTests.length),
          color: REPORT_SEND_COLORS.SENT,
        },
        {
          key: 'UNMARKED' as const,
          name: t('reports_next.test_register.report_send_pending'),
          value: sendPendingReports,
          percent: percent(sendPendingReports, activeTests.length),
          color: REPORT_SEND_COLORS.UNMARKED,
        },
        {
          key: 'NOT_SENT' as const,
          name: t('reports_next.test_register.report_not_sent'),
          value: notSentReports,
          percent: percent(notSentReports, activeTests.length),
          color: REPORT_SEND_COLORS.NOT_SENT,
        },
      ],
    };
  }, [rows, t]);

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

  const reportSourceKey = (row: TestRegisterRow) => {
    const sourceType = row.report_source_type || (row.test_source === 'BILL' ? 'BILL' : 'CONSULTATION');
    const sourceId = row.report_source_id || row.consultation_test_id;
    return `${sourceType}:${sourceId}`;
  };

  const reportStatusLabel = (status?: string | null) => {
    if (status === 'SENT') return t('reports_next.test_register.report_sent');
    if (status === 'NOT_SENT') return t('reports_next.test_register.report_not_sent');
    return t('reports_next.test_register.report_not_marked');
  };

  const reportStatusClass = (status?: string | null) => {
    if (status === 'SENT') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'NOT_SENT') return 'border-red-200 bg-red-50 text-red-700';
    return 'border-slate-200 bg-slate-50 text-slate-500';
  };

  const openPatientRecord = (item: TestRegisterRow) => {
    const href = patientRecordsHref(item);
    if (href) navigate(href);
  };

  const openReportStatusModal = (group: VisitGroup) => {
    const firstTest = group.tests[0];
    setReportStatusError('');
    setReportModal({
      group,
      selectedKey: reportSourceKey(firstTest),
      status: firstTest.report_send_status === 'NOT_SENT' ? 'NOT_SENT' : 'SENT',
      reason: firstTest.report_not_sent_reason || '',
    });
  };

  const selectedReportTest = reportModal
    ? reportModal.group.tests.find((test) => reportSourceKey(test) === reportModal.selectedKey) || reportModal.group.tests[0]
    : null;

  const saveReportSendStatus = async () => {
    if (!token || !reportModal || !selectedReportTest) return;
    const sourceType = selectedReportTest.report_source_type || (selectedReportTest.test_source === 'BILL' ? 'BILL' : 'CONSULTATION');
    const sourceId = Number(selectedReportTest.report_source_id || selectedReportTest.consultation_test_id);
    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      setReportStatusError(t('reports_next.test_register.report_status_source_error'));
      return;
    }
    if (reportModal.status === 'NOT_SENT' && !reportModal.reason.trim()) {
      setReportStatusError(t('reports_next.test_register.report_reason_required'));
      return;
    }

    setSavingReportStatus(true);
    setReportStatusError('');
    try {
      const response = await fetch('/api/v1/reports/test-register/report-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          status: reportModal.status,
          reason: reportModal.status === 'NOT_SENT' ? reportModal.reason.trim() : null,
          branch_id: branchScope?.selected_branch_id || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || t('reports_next.test_register.report_status_failed'));
      }
      const updated = payload.data?.row || {};
      const updatedKey = `${updated.source_type || sourceType}:${updated.source_id || sourceId}`;
      setRows((current) => current.map((row) => (
        reportSourceKey(row) === updatedKey
          ? {
              ...row,
              report_send_status: updated.report_send_status || reportModal.status,
              report_not_sent_reason: updated.report_not_sent_reason || null,
              report_status_marked_at: updated.report_status_marked_at || null,
              report_status_marked_by_name: updated.report_status_marked_by_name || null,
            }
          : row
      )));
      addToast(t('reports_next.test_register.report_status_saved'), 'success');
      setReportModal(null);
    } catch (saveError) {
      setReportStatusError(saveError instanceof Error ? saveError.message : t('reports_next.test_register.report_status_failed'));
    } finally {
      setSavingReportStatus(false);
    }
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
      const age = formatAgeValue(group.first.patient_age, group.first.patient_age_display, group.first.patient_date_of_birth, i18n.language);
      parts.push(
        <tr key={group.key} className={print ? 'break-inside-avoid' : 'align-top hover:bg-slate-50/80'}>
          <td className="px-4 py-3 text-xs font-black text-slate-500 tabular-nums">{group.sequence}</td>
          <td className="px-4 py-3">
            <span className="inline-flex min-w-[48px] justify-center rounded-lg bg-[#549E9E]/10 px-2 py-1 text-xs font-black text-[#2d8789]">
              {group.first.display_token_display || group.first.token_display || group.first.token_number || '—'}
            </span>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{group.first.test_source === 'BILL' ? group.first.bill_number : group.first.slot_name || ''}</p>
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
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${reportStatusClass(test.report_send_status)}`}>
                        {reportStatusLabel(test.report_send_status)}
                      </span>
                    </div>
                    {status === 'REVIEWED' && (
                      <p className="mt-1 max-w-md text-[11px] font-medium text-emerald-700 line-clamp-2">{test.finding_text}</p>
                    )}
                    {status === 'REMOVED' && test.void_reason && (
                      <p className="mt-1 text-[10px] font-medium text-slate-400">{test.void_reason}</p>
                    )}
                    {test.report_send_status === 'NOT_SENT' && test.report_not_sent_reason && (
                      <p className="mt-1 max-w-md text-[10px] font-medium text-red-600 line-clamp-2">{test.report_not_sent_reason}</p>
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
                {!isReceptionist && (
                  <>
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
                      onClick={() => group.first.test_source === 'BILL' ? openPatientRecord(group.first) : navigate(`/consult/${group.appointmentId}`, {
                        state: {
                          from: { pathname: location.pathname, search: location.search },
                        },
                      })}
                      title={group.first.test_source === 'BILL' ? 'View tests in patient record' : t('reports_next.test_register.open_consultation')}
                      className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:border-[#549E9E]/30 hover:bg-[#549E9E]/5 hover:text-[#2d8789]"
                    >
                      <Eye size={13} />
                      {group.first.test_source === 'BILL' ? 'Tests' : t('reports_next.test_register.consult_short')}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => openReportStatusModal(group)}
                  title={t('reports_next.test_register.report_send')}
                  className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500 transition-colors hover:border-[#549E9E]/30 hover:bg-[#549E9E]/5 hover:text-[#2d8789]"
                >
                  <Send size={13} />
                  {t('reports_next.test_register.report_send_short')}
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

            <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(420px,1.1fr)]">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">
                      {t('reports_next.test_register.test_status_overview')}
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{windowLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === 'ALL' ? 'border-[#549E9E]/30 bg-[#549E9E]/10 text-[#2d8789]' : 'border-slate-200 text-slate-400 hover:border-[#549E9E]/30 hover:text-[#2d8789]'}`}
                  >
                    {t('reports_next.test_register.all_statuses')}
                  </button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="relative h-44">
                    {overview.totalTests > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={overview.status.filter((item) => item.value > 0)} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={3}>
                              {overview.status.filter((item) => item.value > 0).map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name, item) => [`${value} (${item.payload.percent}%)`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-slate-900">{overview.totalTests}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {t('reports_next.test_register.tests')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-xs font-bold text-slate-400">
                        {t('reports_next.test_register.empty')}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {overview.status.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setStatusFilter(item.key)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${statusFilter === item.key ? 'border-[#549E9E]/40 bg-[#549E9E]/5' : 'border-slate-100 hover:border-[#549E9E]/25'}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="truncate text-xs font-black text-slate-700">{item.name}</span>
                        </span>
                        <span className="shrink-0 text-xs font-black tabular-nums text-slate-900">
                          {item.value} <span className="text-slate-400">({item.percent}%)</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">
                      {t('reports_next.test_register.report_send_overview')}
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {t('reports_next.test_register.active_tests_count', { count: overview.activeTests })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportSendFilter('ALL')}
                    className={`self-start rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${reportSendFilter === 'ALL' ? 'border-[#549E9E]/30 bg-[#549E9E]/10 text-[#2d8789]' : 'border-slate-200 text-slate-400 hover:border-[#549E9E]/30 hover:text-[#2d8789]'}`}
                  >
                    {t('reports_next.test_register.all_reports')}
                  </button>
                </div>
                <div className="mt-5 overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-4">
                    {overview.reportSend.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setReportSendFilter(item.key)}
                        title={`${item.name}: ${item.value} (${item.percent}%)`}
                        className="min-w-0 transition-opacity hover:opacity-80"
                        style={{
                          width: `${overview.activeTests > 0 ? item.percent : 0}%`,
                          backgroundColor: item.color,
                        }}
                        aria-label={`${item.name}: ${item.value} (${item.percent}%)`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {overview.reportSend.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setReportSendFilter(item.key)}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors ${reportSendFilter === item.key ? 'border-[#549E9E]/40 bg-[#549E9E]/5' : 'border-slate-100 hover:border-[#549E9E]/25'}`}
                    >
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="mt-2 block text-xl font-black tabular-nums text-slate-900">
                        {item.value}
                        <span className="ml-1 text-sm text-slate-400">({item.percent}%)</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
                    value={reportSendFilter}
                    onChange={(event) => setReportSendFilter(event.target.value as ReportSendFilter)}
                    className="cursor-pointer rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#549E9E]"
                    aria-label={t('reports_next.test_register.filter_report_send')}
                  >
                    <option value="ALL">{t('reports_next.test_register.all_reports')}</option>
                    <option value="SENT">{t('reports_next.test_register.report_sent')}</option>
                    <option value="NOT_SENT">{t('reports_next.test_register.report_not_sent')}</option>
                    <option value="UNMARKED">{t('reports_next.test_register.report_send_pending')}</option>
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
      {reportModal && selectedReportTest && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm no-print">
          <div role="dialog" aria-modal="true" aria-labelledby="test-report-send-heading" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 id="test-report-send-heading" className="text-sm font-black uppercase tracking-widest text-slate-900">
                  {t('reports_next.test_register.report_send_title')}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {reportModal.group.first.patient_full_name || '—'} · {reportModal.group.first.patient_mobile_no || '—'}
                </p>
              </div>
              <button type="button" onClick={() => setReportModal(null)} className="rounded-full bg-slate-100 p-2 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('reports_next.test_register.select_test')}</span>
                <select
                  value={reportModal.selectedKey}
                  onChange={(event) => {
                    const nextTest = reportModal.group.tests.find((test) => reportSourceKey(test) === event.target.value) || reportModal.group.tests[0];
                    setReportStatusError('');
                    setReportModal({
                      ...reportModal,
                      selectedKey: event.target.value,
                      status: nextTest.report_send_status === 'NOT_SENT' ? 'NOT_SENT' : 'SENT',
                      reason: nextTest.report_not_sent_reason || '',
                    });
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#549E9E]"
                >
                  {reportModal.group.tests.map((test) => (
                    <option key={reportSourceKey(test)} value={reportSourceKey(test)}>
                      {test.test_name} · {reportStatusLabel(test.report_send_status)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportStatusError('');
                    setReportModal({ ...reportModal, status: 'SENT', reason: '' });
                  }}
                  className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${reportModal.status === 'SENT' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                >
                  {t('reports_next.test_register.report_sent')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportStatusError('');
                    setReportModal({ ...reportModal, status: 'NOT_SENT' });
                  }}
                  className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${reportModal.status === 'NOT_SENT' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-200'}`}
                >
                  {t('reports_next.test_register.report_not_sent')}
                </button>
              </div>

              {reportModal.status === 'NOT_SENT' && (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('reports_next.test_register.not_sent_reason')}</span>
                  <textarea
                    value={reportModal.reason}
                    onChange={(event) => setReportModal({ ...reportModal, reason: event.target.value.slice(0, 500) })}
                    rows={4}
                    placeholder={t('reports_next.test_register.not_sent_reason_placeholder')}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#549E9E]"
                  />
                </label>
              )}

              {reportStatusError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {reportStatusError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReportModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void saveReportSendStatus()}
                  disabled={savingReportStatus}
                  className="rounded-xl bg-[#549E9E] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {savingReportStatus ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
