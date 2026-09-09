import VisitListPrint from './VisitListPrint';
import useListPagination from './useListPagination';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { Link } from 'react-router-dom';
import { AlertCircle, Banknote, CreditCard, Phone, Printer, RefreshCcw, Search, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import CustomDatePicker from '../../CustomDatePicker';
import Pagination from '../../Pagination';
import AppointmentTokenBadge from '../../AppointmentTokenBadge';
import PaymentReceipt from '../../PaymentReceipt';
import { formatReceiptDateTime, receiptFromPayments, type PaymentReceiptData } from '../../../utils/paymentReceipt';
import { FilterDropdown } from '../doctor-reports/components/FilterDropdown';
import { fetchReportModule, type CustomRange } from '../reports-next/lib';
import VisitDrawer from './VisitDrawer';
import { ConsultantsPanel, MixBar, SessionPanel } from './BreakdownPanels';
import {
  billCategory,
  paymentSource,
  isOlderDuePayment,
  consultantTotals,
  daysBetween,
  fetchBillPayments,
  fetchBillRows,
  groupVisits,
  filterVisits,
  withPreviousPayments,
  money,
  moneyExact,
  rangeForLocalFilter,
  topMedicines,
  type AgeingFilter,
  type VisitRow,
  type WorkTab,
} from './lib';

const VISITS_PAGE_SIZE = 10;

const DATE_PRESETS = [
  { id: 'today', labelKey: 'bills_next.today' },
  { id: '1_week', labelKey: 'bills_next.week' },
  { id: '1_month', labelKey: 'bills_next.month' },
  { id: 'custom', labelKey: 'bills_next.custom' },
] as const;

export default function BillsNext() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token, branchScope } = useAuth();

  const [dateFilter, setDateFilter] = useState('today');
  const [customRange, setCustomRange] = useState<CustomRange>({ from: '', to: '' });
  const [tab, setTab] = useState<WorkTab>('attention');
  const [ageing, setAgeing] = useState<AgeingFilter>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [printList, setPrintList] = useState(false);
  const closeListPrint = useCallback(() => setPrintList(false), []);
  const [showRecovered, setShowRecovered] = useState(false);
  const [visitsPage, setVisitsPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeBills, setRangeBills] = useState<any[]>([]);
  const [dueBills, setDueBills] = useState<any[]>([]);
  const [todayBills, setTodayBills] = useState<any[]>([]);
  const [receivedPayments, setReceivedPayments] = useState<any[]>([]);
  const [collectionReceipt, setCollectionReceipt] = useState<PaymentReceiptData | null>(null);
  const [reports, setReports] = useState<any>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null);
  const [visitDetail, setVisitDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const range = useMemo(() => rangeForLocalFilter(dateFilter, customRange), [dateFilter, customRange]);
  const today = useMemo(() => rangeForLocalFilter('today', { from: '', to: '' }), []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const needToday = range.from !== today.from || range.to !== today.to;
      const [inRange, outstanding, billing, todayRows, receipts] = await Promise.all([
        fetchBillRows(token, { from_date: range.from, to_date: range.to }),
        fetchBillRows(token, { outstanding: 'true' }),
        fetchReportModule(token, 'billing', range.from, range.to, { force: true, branchBilling: true }),
        needToday ? fetchBillRows(token, { from_date: today.from, to_date: today.to }) : Promise.resolve(null),
        fetchBillPayments(token, { from_date: range.from, to_date: range.to }),
      ]);
      setRangeBills(inRange);
      setDueBills(outstanding);
      setReports(billing);
      setTodayBills(todayRows || inRange);
      setReceivedPayments(receipts);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bills_next.fetch_failed'));
      setRangeBills([]);
      setDueBills([]);
      setTodayBills([]);
      setReceivedPayments([]);
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, [token, range.from, range.to, today.from, today.to, t, branchScope?.selected_branch_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visits = useMemo(() => groupVisits(rangeBills), [rangeBills]);
  const todayVisits = useMemo(() => groupVisits(todayBills), [todayBills]);

  const previousPayments = useMemo(() => receivedPayments.filter(isOlderDuePayment), [receivedPayments]);

  const cockpit = useMemo(() => {
    const billed = visits.reduce((sum, row) => sum + row.grand_total, 0);
    const paidOnBills = visits.reduce((sum, row) => sum + row.grand_paid, 0);
    const collected = receivedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const pendingInRange = visits.reduce((sum, row) => sum + row.grand_pending, 0);
    const recovered = previousPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const cash = receivedPayments.filter((p) => p.payment_mode === 'CASH').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const online = receivedPayments.filter((p) => p.payment_mode === 'ONLINE').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const consult = visits.reduce((sum, row) => sum + row.consult_total, 0);
    const medicine = visits.reduce((sum, row) => sum + row.medicine_total, 0);
    const openDues = dueBills.reduce((sum, bill) => sum + Number(bill.pending_amount || 0), 0);
    const duePatients = new Set(dueBills.map((bill) => String(bill.patient_id || bill.bill_id))).size;
    const collectionPct = billed <= 0 ? 0 : Math.min(100, Math.round((paidOnBills / billed) * 100));
    return {
      billed,
      collected,
      pendingInRange,
      recovered,
      cash,
      online,
      consult,
      medicine,
      tests: visits.reduce((sum, row) => sum + row.test_total, 0),
      courier: visits.reduce((sum, row) => sum + row.courier_total, 0),
      openDues,
      duePatients,
      dueCount: dueBills.length,
      collectionPct,
      visitCount: visits.length,
    };
  }, [visits, rangeBills, dueBills, previousPayments, receivedPayments]);

  const todayDuePatients = useMemo(() => {
    const todayIds = new Set(todayVisits.map((row) => Number(row.patient_id)).filter(Boolean));
    return dueBills.filter((bill) => todayIds.has(Number(bill.patient_id)));
  }, [todayVisits, dueBills]);

  const filteredDues = useMemo(() => {
    const q = search.toLowerCase().trim();
    return dueBills
      .map((bill) => ({ ...bill, days_unpaid: daysBetween(bill.appointment_date || bill.created_at) }))
      .filter((bill) => {
        if (ageing === 'week') return bill.days_unpaid <= 7;
        if (ageing === 'month') return bill.days_unpaid > 7 && bill.days_unpaid <= 30;
        if (ageing === 'older') return bill.days_unpaid > 30;
        return true;
      })
      .filter((bill) => {
        if (!q) return true;
        return [bill.patient_full_name, bill.patient_mobile_no, bill.bill_number, bill.auid, bill.treatment_name]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.days_unpaid - a.days_unpaid || Number(b.pending_amount || 0) - Number(a.pending_amount || 0));
  }, [dueBills, ageing, search]);

  const filteredVisits = useMemo(
    () => {
      if (category !== 'all' && category !== 'previous_pending') return filterVisits(visits, category, search);
      const combined = withPreviousPayments(category === 'all' ? visits : [], previousPayments);
      return filterVisits(combined, 'all', search);
    },
    [visits, previousPayments, search, category],
  );

  const visitsTotalPages = Math.max(1, Math.ceil(filteredVisits.length / VISITS_PAGE_SIZE));
  const currentVisitsPage = Math.min(visitsPage, visitsTotalPages);
  const pagedVisits = filteredVisits.slice(
    (currentVisitsPage - 1) * VISITS_PAGE_SIZE,
    currentVisitsPage * VISITS_PAGE_SIZE,
  );

  useEffect(() => {
    setVisitsPage(1);
  }, [search, category, range.from, range.to, branchScope?.selected_branch_id]);

  useEffect(() => {
    setVisitsPage((page) => Math.min(page, visitsTotalPages));
  }, [visitsTotalPages]);

  const practice = useMemo(() => consultantTotals(reports?.revenue_by_consultant), [reports]);
  const medicines = useMemo(() => topMedicines(reports?.revenue_by_medicine, Infinity), [reports]);
  const mixMax = Math.max(cockpit.consult, cockpit.medicine, cockpit.tests, cockpit.courier, 1);
  const recoveredPagination = useListPagination(previousPayments, `${range.from}:${range.to}:${branchScope?.selected_branch_id}:${showRecovered}`);
  const listScope = `${range.from}:${range.to}:${branchScope?.selected_branch_id}:${tab}`;
  const duesPagination = useListPagination(filteredDues, `${listScope}:${search}:${ageing}`);
  const medicinesPagination = useListPagination(medicines, listScope);


  const openVisit = async (entry: VisitRow) => {
    setSelectedVisit(entry);
    setDetailLoading(true);
    setVisitDetail(null);
    try {
      if (entry.appointment_id) {
        const response = await fetch(`/api/v1/bills/appointment/${entry.appointment_id}/summary?billing_scope=branch`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.ok && result.success) {
          setVisitDetail(result.data);
          return;
        }
      }
      const billIds = entry.bills.map((bill) => Number(bill.bill_id)).filter(Boolean);
      const detailed = await Promise.all(billIds.map(async (billId) => {
        const response = await fetch(`/api/v1/bills/${billId}?billing_scope=branch`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load bill');
        return result.data;
      }));
      const bills = detailed.filter(Boolean);
      const payments = Array.from(new Map(bills.flatMap((bill: any) => [
        ...(bill.payments || []).map((payment: any) => ({ ...payment, bill_id: bill.bill_id, bill_number: bill.bill_number })),
        ...(bill.previous_pending_settlements || []),
      ]).map((payment: any) => [payment.payment_id, payment])).values());
      setVisitDetail({
        appointment: entry,
        bills,
        payments,
        summary: {
          grand_total: entry.grand_total,
          grand_paid: entry.grand_paid,
          grand_pending: entry.grand_pending,
        },
      });
    } catch {
      setError(t('bills_next.extra.detail_error'));
      setSelectedVisit(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDueBill = (bill: any) => {
    const match = [...visits, ...todayVisits].find(
      (row) => (bill.appointment_id && Number(row.appointment_id) === Number(bill.appointment_id)) || row.bills.some((item) => Number(item.bill_id) === Number(bill.bill_id)),
    );
    void openVisit(match || groupVisits([bill])[0]);
  };

  const openCollectionReceipt = (payments: any[], patientName: string, mobile?: string | null) => {
    const data = receiptFromPayments({
      patientName,
      patientMobile: mobile,
      payments,
    });
    if (!data) return;
    setCollectionReceipt(data);
  };

  const openRecoveredBill = async (payment: any) => {
    try {
      const response = await fetch(`/api/v1/bills/${payment.bill_id}?billing_scope=branch`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error('Bill unavailable');
      const visit = groupVisits([result.data])[0];
      if (visit) void openVisit(visit);
    } catch {
      setError(t('bills_next.extra.detail_error'));
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const branchName = branchScope?.selected_branch?.branch_name || t('bills_next.this_branch');

  return (
    <div className="space-y-5 pb-10">
      {printList && <VisitListPrint rows={filteredVisits} branch={branchName} from={range.from} to={range.to}
        category={category === 'consultation' ? t('bills_next.extra.consultations') : t(`bills_next.extra.${category}`)}
        search={search} onClose={closeListPrint} />}

      {collectionReceipt && (
        <PaymentReceipt data={collectionReceipt} onClose={() => setCollectionReceipt(null)} />
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">{branchName}</p>
          <h1 className="text-2xl font-black text-slate-900">{t('bills_next.title')}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t('bills_next.subtitle')}</p>
        </div>
        {/* <Link
          to="/bills"
          className="text-[11px] font-black uppercase tracking-widest text-[#2d8789] hover:underline"
        >
          {t('bills_next.compare_old')}
        </Link> */}
      </div>

      <div className="bg-white/80 px-4 py-2 rounded-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
            {t('bills_next.timeframe')}
          </span>
          {DATE_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDateFilter(option.id)}
              className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                dateFilter === option.id
                  ? 'bg-[#549E9E] border-[#549E9E] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-[#549E9E]/30'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
          <div className="min-w-[140px]">
            <FilterDropdown
              hideLabel
              compact
              label={t('bills_next.more')}
              value={dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year' ? dateFilter : ''}
              onChange={setDateFilter}
              icon={Wallet}
              options={[
                { id: '2_months', label: t('bills_next.two_months') },
                { id: '3_months', label: t('bills_next.three_months') },
                { id: '6_months', label: t('bills_next.six_months') },
                { id: '1_year', label: t('bills_next.one_year') },
              ]}
            />
          </div>
          {dateFilter === 'custom' && (
            <div className="flex gap-2 items-center">
              <CustomDatePicker
                label=""
                value={customRange.from}
                onChange={(date) => setCustomRange((prev) => ({ ...prev, from: date }))}
                allowClear={false}
              />
              <span className="text-gray-400 text-xs font-bold">{t('bills_next.to')}</span>
              <CustomDatePicker
                label=""
                value={customRange.to}
                onChange={(date) => setCustomRange((prev) => ({ ...prev, to: date }))}
                allowClear={false}
                minDate={customRange.from}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border border-[#549E9E]/10"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} /> {t('bills_next.refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <p className="text-sm font-semibold text-slate-600 leading-relaxed">
        {t('bills_next.extra.insight', {
          collected: money(cockpit.collected),
          pct: cockpit.collectionPct,
          pending: money(cockpit.openDues),
          count: cockpit.duePatients,
          recovered: money(cockpit.recovered),
        })}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          label={t('bills_next.extra.received')}
          value={money(cockpit.collected)}
          sub={t('bills_next.extra.received_sub')}
        />
        <Metric
          label={t('bills_next.open_dues')}
          value={money(cockpit.openDues)}
          sub={t('bills_next.open_dues_sub', { count: cockpit.duePatients, bills: cockpit.dueCount })}
          emphasis
        />
        <Metric
          label={t('bills_next.old_dues')}
          value={money(cockpit.recovered)}
          sub={t('bills_next.old_dues_sub')}
          onClick={() => setShowRecovered((open) => !open)}
          expanded={showRecovered}
        />
        <Metric
          label={t('bills_next.collection_rate')}
          value={`${cockpit.collectionPct}%`}
          sub={t('bills_next.pending_in_range', { amount: money(cockpit.pendingInRange) })}
        />
      </div>

      {showRecovered && (
        <section id="recovered-payments" className="rounded-2xl border border-teal-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">{t('bills_next.old_dues')} · {moneyExact(cockpit.recovered)}</h2>
              <p className="mt-1 text-xs text-slate-500">{formatDate(range.from)} – {formatDate(range.to)} · {t('bills_next.recovered_note')}</p>
            </div>
            <button type="button" onClick={() => setShowRecovered(false)} className="text-xs font-bold text-slate-500">{t('common.close', 'Close')}</button>
          </div>
          {loading ? <p className="p-6 text-center">{t('common.loading', 'Loading...')}</p> : <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr>
                  <th className="p-3">{t('bills_next.col_paid_at', 'Paid at')}</th>
                  <th className="p-3">{t('bills_next.col_patient')}</th>
                  <th className="p-3">{t('bills_next.original_bill', 'Original bill')}</th>
                  <th className="p-3">{t('bills_next.payment_source.heading')}</th>
                  <th className="p-3 text-right">{t('bills_next.collected')}</th>
                  <th className="p-3 text-right">{t('bills_next.remaining_after_payment')}</th>
                  <th className="p-3"><span className="sr-only">{t('bills_next.open')}</span></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recoveredPagination.rows.map((payment) => <tr key={payment.payment_id}>
                    <td className="p-3 whitespace-nowrap">{formatReceiptDateTime(payment.collected_at, dateLocale)}</td>
                    <td className="p-3"><p className="font-bold">{payment.patient_full_name || '—'}</p><p className="mt-1 text-slate-500">{payment.patient_mobile_no}</p></td>
                    <td className="p-3"><p className="font-semibold">{payment.bill_number}</p><p className="mt-1 text-slate-500">{formatDate(payment.original_bill_date)}</p></td>
                    <td className="p-3"><span className="inline-block rounded bg-teal-50 px-2 py-1 font-semibold text-teal-700">{t(`bills_next.payment_source.${paymentSource(payment)}`)}</span>{payment.display_token_display && <p className="mt-1">Token {payment.display_token_display}</p>}</td>
                    <td className="p-3 text-right"><p className="font-bold text-emerald-700">{moneyExact(payment.amount)}</p><p className="mt-1 text-slate-500">{payment.payment_mode}</p></td>
                    <td className="p-3 text-right font-semibold">{payment.pending_after == null ? '—' : moneyExact(payment.pending_after)}</td>
                    <td className="p-3"><div className="flex flex-col gap-2 items-start">
                      <button type="button" onClick={() => openCollectionReceipt([payment], payment.patient_full_name || 'Patient', payment.patient_mobile_no)} className="font-bold text-teal-700">{t('bills_next.receipt', 'Payment Receipt')}</button>
                      <button type="button" onClick={() => void openRecoveredBill(payment)} className="font-semibold text-slate-500">{t('bills_next.original_bill', 'Original bill')}</button>
                    </div></td>
                  </tr>)}
                  {previousPayments.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">{t('bills_next.no_recovered')}</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination {...recoveredPagination.controls} />
          </>}
        </section>
      )}

      <p className="text-xs font-semibold text-slate-500">{t('bills_next.of_billed', { amount: moneyExact(cockpit.billed), visits: cockpit.visitCount })} · {t('bills_next.extra.bill_date_note')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t('bills_next.mix')}</p>
          <MixBar label={t('bills_next.consult')} value={cockpit.consult} max={mixMax} />
          <MixBar label={t('bills_next.medicine')} value={cockpit.medicine} max={mixMax} tone="violet" />
          <MixBar label={t('bills_next.tests')} value={cockpit.tests} max={mixMax} tone="amber" />
          <MixBar label={t('bills_next.extra.courier_charge')} value={cockpit.courier} max={mixMax} tone="sky" />
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('bills_next.cash')}</p>
              <p className="text-lg font-black text-slate-900">{money(cockpit.cash)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('bills_next.online')}</p>
              <p className="text-lg font-black text-slate-900">{money(cockpit.online)}</p>
            </div>
          </div>
        </div>
      </div>


      <div className="flex flex-wrap gap-2">
        {([
          { id: 'attention', label: t('bills_next.tab_attention'), count: cockpit.dueCount },
          { id: 'visits', label: t('bills_next.tab_visits'), count: cockpit.visitCount + previousPayments.length },
          { id: 'practice', label: t('bills_next.tab_practice') },
          { id: 'consultants', label: t('bills_next.tab_consultants') },
          { id: 'morning', label: t('bills_next.tab_morning') },
          { id: 'evening', label: t('bills_next.tab_evening') },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`cursor-pointer px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              tab === item.id
                ? 'bg-[#549E9E] border-[#549E9E] text-white'
                : 'bg-white border-gray-200 text-slate-500 hover:border-[#549E9E]/30'
            }`}
          >
            {item.label}
            {'count' in item && item.count != null ? ` (${item.count})` : ''}
          </button>
        ))}
      </div>

      {(tab === 'attention' || tab === 'visits') && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('bills_next.search')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-[#549E9E] bg-white"
          />
        </div>
      )}

      {tab === 'visits' && (
        <div className="flex flex-wrap gap-2">
          {['all', 'consultation', 'repeat', 'medical_only', 'courier', 'previous_pending'].map((kind) => (
            <button key={kind} onClick={() => setCategory(kind)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${category === kind ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-gray-200'}`}>
              {kind === 'consultation' ? t('bills_next.extra.consultations', 'Consultations') : t(`bills_next.extra.${kind}`)}
            </button>
          ))}
          <button type="button" disabled={loading || filteredVisits.length === 0} onClick={() => setPrintList(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 disabled:opacity-40">
            <Printer size={14} /> {t('bills_next.print_list', 'Print List')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
        </div>
      ) : tab === 'attention' ? (
        <div className="space-y-3">
          {todayDuePatients.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <p className="text-sm font-black text-amber-800">
                {t('bills_next.in_clinic_today', { count: new Set(todayDuePatients.map((row) => row.patient_id)).size })}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-700">{t('bills_next.in_clinic_today_sub')}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'all', label: t('bills_next.age_all') },
              { id: 'week', label: t('bills_next.age_week') },
              { id: 'month', label: t('bills_next.age_month') },
              { id: 'older', label: t('bills_next.age_older') },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAgeing(item.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  ageing === item.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {filteredDues.length === 0 ? (
              <p className="py-14 text-center text-sm font-semibold text-slate-400">
                {dueBills.length === 0 ? t('bills_next.no_dues') : t('bills_next.no_match')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-5 py-3">{t('bills_next.col_patient')}</th>
                      <th className="px-5 py-3">{t('bills_next.col_unpaid')}</th>
                      <th className="px-5 py-3">{t('bills_next.col_type')}</th>
                      <th className="px-5 py-3 text-right">{t('bills_next.pending')}</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {duesPagination.rows.map((bill) => {
                      const inClinic = todayDuePatients.some((row) => Number(row.bill_id) === Number(bill.bill_id) || Number(row.patient_id) === Number(bill.patient_id));
                      return (
                        <tr key={bill.bill_id} className={inClinic ? 'bg-amber-50/40' : ''}>
                          <td className="px-5 py-3 align-top">
                            <p className="text-sm font-black text-slate-800">{bill.patient_full_name || '—'}</p>
                            {bill.patient_mobile_no ? (
                              <a href={`tel:${bill.patient_mobile_no}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2d8789] hover:underline">
                                <Phone size={11} /> {bill.patient_mobile_no}
                              </a>
                            ) : (
                              <p className="text-[11px] text-slate-400">—</p>
                            )}
                            {inClinic && (
                              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                                {t('bills_next.here_today')}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <p className="text-xs font-black text-slate-800">{formatDate(bill.appointment_date)}</p>
                            <p className="text-[10px] font-bold text-amber-600">
                              {t('bills_next.days_open', { days: bill.days_unpaid })}
                            </p>
                            {bill.treatment_name && (
                              <p className="text-[11px] font-semibold text-slate-500">{bill.treatment_name}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top text-[11px] font-black uppercase tracking-widest text-slate-400">
                            {String(bill.bill_type || '').toUpperCase() === 'CONSULTATION'
                              ? t('bills_next.consult')
                              : t('bills_next.medicine')}
                          </td>
                          <td className="px-5 py-3 align-top text-right">
                            <p className="text-sm font-black text-amber-600">{moneyExact(bill.pending_amount)}</p>
                            <p className="text-[10px] font-bold text-slate-400">{moneyExact(bill.paid_amount)} {t('bills_next.paid_so_far')}</p>
                          </td>
                          <td className="px-5 py-3 align-top text-right">
                            <button
                              type="button"
                              onClick={() => openDueBill(bill)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#2d8789] hover:underline"
                            >
                              {t('bills_next.open')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination {...duesPagination.controls} />
          </div>
        </div>
      ) : tab === 'visits' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <p className="border-b border-gray-100 px-4 py-3 text-xs font-semibold text-slate-500">{t('bills_next.extra.sequence_note')}</p>
          {filteredVisits.length === 0 ? (
            <p className="py-14 text-center text-sm font-semibold text-slate-400">{t('bills_next.no_visits')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">{t('bills_next.extra.pos_token')}</th>
                    <th className="px-4 py-3">{t('bills_next.col_patient')}</th>
                    <th className="px-4 py-3">{t('bills_next.mix')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.collected')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.old_dues')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.pending')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pagedVisits.map((row) => (
                    row.previous_payment ? <tr key={row.group_key} className="bg-teal-50/40">
                      <td className="px-4 py-3"><span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700">{t('bills_next.extra.previous_pending')}</span></td>
                      <td className="px-4 py-3"><p className="text-sm font-black text-slate-800">{row.patient_full_name}</p><p className="text-[11px] text-slate-500">{formatReceiptDateTime(row.created_at, dateLocale)}</p></td>
                      <td className="px-4 py-3 text-xs text-slate-500"><p>{row.previous_payment.bill_number}</p><p>{t('bills_next.extra.previous_pending')} · {row.previous_payment.payment_mode}</p></td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-black text-teal-700">{moneyExact(row.paid_towards_previous_pending)}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.previous_payment.pending_after != null && <>{t('bills_next.pending')}: {moneyExact(row.previous_payment.pending_after)}</>}</td>
                      <td className="px-4 py-3 text-right"><button className="text-xs font-bold text-teal-700" onClick={() => openCollectionReceipt([row.previous_payment], row.patient_full_name || '', row.patient_mobile_no)}>{t('bills_next.receipt', 'Receipt')}</button><button className="ml-3 text-xs font-bold text-teal-700" onClick={() => void openRecoveredBill(row.previous_payment)}>{t('bills_next.original_bill', 'Original Bill')}</button></td>
                    </tr> :
                    <tr
                      key={row.group_key}
                      onClick={() => void openVisit(row)}
                      className={`cursor-pointer ${row.overall_payment_status === 'PARTIAL' ? 'bg-sky-50/60 hover:bg-sky-100/60' : row.overall_payment_status === 'UNPAID' ? 'bg-orange-50/60 hover:bg-orange-100/60' : 'hover:bg-[#549E9E]/[0.04]'}`}
                    >
                      <td className="px-4 py-3">
                        <AppointmentTokenBadge
                          tokenDisplay={row.display_token_display}
                          tokenNumber={row.token_number}
                          position={row.queue_position}
                          hideEmpty
                          compact
                        />
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Array.from(new Set(row.bills.map((bill) => billCategory({ ...bill, delivery_mode: null }))))
                            .filter((kind) => kind === 'repeat' || kind === 'medical_only')
                            .map((kind) => (
                              <span
                                key={kind}
                                className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-black ${kind === 'repeat' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}
                              >
                                {t(kind === 'repeat' ? 'bills_next.extra.repeat' : 'bills_next.extra.direct_medicine')}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-800">{row.patient_full_name || '—'}</p>

                        <p className="text-[11px] font-semibold text-slate-400">
                          {formatDate(row.appointment_date)}
                          {row.treatment_name ? ` · ${row.treatment_name}` : ''}
                        </p>
                        {row.consultation_completed_at && <p className="mt-1 text-[10px] font-semibold text-[#2d8789]">{t('bills_next.extra.consulted_at')}: {formatReceiptDateTime(row.consultation_completed_at, dateLocale)}</p>}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-500">
                        <p>{t('bills_next.consult')} {money(row.consult_total)}</p>
                        <p>{t('bills_next.medicine')} {money(row.medicine_total)}</p>
                        {row.test_total > 0 && <p>{t('bills_next.tests')} {money(row.test_total)}</p>}
                        {row.courier_total > 0 && <p>{t('bills_next.extra.courier_charge')} {money(row.courier_total)}</p>}
                        <p className="mt-1 text-[10px] text-[#2d8789]">{Array.from(new Set(row.bills.map(billCategory))).map((kind) => t(`bills_next.extra.${kind}`)).join(' · ')}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{moneyExact(row.grand_paid)}</td>
                      <td className="px-4 py-3 text-right text-sm font-black text-[#2d8789]">
                        {row.paid_towards_previous_pending > 0 ? moneyExact(row.paid_towards_previous_pending) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.grand_pending > 0 && (
                          <p className={`text-sm font-black ${row.overall_payment_status === 'PARTIAL' ? 'text-sky-700' : 'text-orange-700'}`}>
                            {moneyExact(row.grand_pending)}
                          </p>
                        )}
                        <StatusDot status={row.overall_payment_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#2d8789]">
                          {t('bills_next.open')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            currentPage={currentVisitsPage}
            totalPages={visitsTotalPages}
            onPageChange={setVisitsPage}
            totalItems={filteredVisits.length}
            pageSize={VISITS_PAGE_SIZE}
            alwaysShow
          />
        </div>
      ) : tab === 'practice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">{t('bills_next.practice_mix')}</h3>
              <p className="text-[11px] font-semibold text-slate-400">{t('bills_next.practice_mix_sub')}</p>
            </div>
            <MixBar label={t('bills_next.consult')} value={practice.consultation} max={Math.max(practice.gross, 1)} />
            <MixBar label={t('bills_next.medicine')} value={practice.medicine} max={Math.max(practice.gross, 1)} tone="violet" />
            <MixBar label={t('bills_next.tests')} value={practice.tests} max={Math.max(practice.gross, 1)} tone="amber" />
            <MixBar label={t('bills_next.courier')} value={practice.courier} max={Math.max(practice.gross, 1)} tone="sky" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <MiniStat label={t('bills_next.morning')} value={money(practice.morningGross)} />
              <MiniStat label={t('bills_next.evening')} value={money(practice.eveningGross)} />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="text-sm font-black text-slate-800">{t('bills_next.top_meds')}</h3>
            <p className="text-[11px] font-semibold text-slate-400 mb-4">{t('bills_next.top_meds_sub')}</p>
            {medicines.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-400">{t('bills_next.no_meds')}</p>
            ) : (
              <div className="space-y-2">
                {medicinesPagination.rows.map((med) => (
                  <div key={med.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{med.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {t('bills_next.qty_bills', { qty: med.qty, bills: med.bills })}
                      </p>
                    </div>
                    <p className="text-sm font-black text-emerald-600 shrink-0">{money(med.gross)}</p>
                  </div>
                ))}
              </div>
            )}
            <Pagination {...medicinesPagination.controls} />
          </div>
        </div>
      ) : tab === 'consultants' ? (
        <ConsultantsPanel key={listScope} consultant={reports?.revenue_by_consultant} />
      ) : tab === 'morning' ? (
        <SessionPanel key={listScope} slot="morning" consultant={reports?.revenue_by_consultant} medicine={reports?.revenue_by_medicine} />
      ) : tab === 'evening' ? (
        <SessionPanel key={listScope} slot="evening" consultant={reports?.revenue_by_consultant} medicine={reports?.revenue_by_medicine} />
      ) : null}

      <VisitDrawer
        visit={selectedVisit}
        detail={visitDetail}
        loading={detailLoading}
        patientDues={dueBills.filter((bill) => Number(bill.patient_id) === Number(selectedVisit?.patient_id))}
        onPrintReceipt={() => openCollectionReceipt(
          visitDetail?.payments || [],
          selectedVisit?.patient_full_name || visitDetail?.appointment?.patient_full_name || 'Patient',
          selectedVisit?.patient_mobile_no || visitDetail?.appointment?.patient_mobile_no,
        )}
        onClose={() => {
          setSelectedVisit(null);
          setVisitDetail(null);
        }}
      />
    </div>
  );
}

const Metric = ({
  label,
  value,
  sub,
  emphasis,
  onClick,
  expanded,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
  onClick?: () => void;
  expanded?: boolean;
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
  <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-expanded={expanded} aria-controls={onClick ? 'recovered-payments' : undefined} className={`text-left rounded-xl border p-4 ${onClick ? 'cursor-pointer hover:border-teal-400 focus-visible:outline-teal-600' : ''} ${emphasis ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-white'}`}>
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    {sub && <p className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</p>}
  </Tag>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-100 bg-slate-50/70 px-3 py-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-base font-black text-slate-800">{value}</p>
  </div>
);

const StatusDot = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    PARTIAL: 'border-sky-200 bg-sky-100 text-sky-800',
    UNPAID: 'border-orange-200 bg-orange-100 text-orange-800',
  };
  return <p className={`mt-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${map[status] || 'border-slate-200 text-slate-400'}`}>{status === 'PARTIAL' ? t('bills_next.pending', 'Pending') : status}</p>;
};
