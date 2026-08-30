import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { Link } from 'react-router-dom';
import { AlertCircle, Banknote, CreditCard, Phone, RefreshCcw, Search, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import CustomDatePicker from '../../CustomDatePicker';
import AppointmentTokenBadge from '../../AppointmentTokenBadge';
import { FilterDropdown } from '../doctor-reports/components/FilterDropdown';
import { fetchReportModule, type CustomRange } from '../reports-next/lib';
import VisitDrawer from './VisitDrawer';
import {
  consultantTotals,
  daysBetween,
  fetchBillRows,
  groupVisits,
  money,
  moneyExact,
  rangeForLocalFilter,
  topMedicines,
  type AgeingFilter,
  type VisitRow,
  type WorkTab,
} from './lib';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeBills, setRangeBills] = useState<any[]>([]);
  const [dueBills, setDueBills] = useState<any[]>([]);
  const [todayBills, setTodayBills] = useState<any[]>([]);
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
      const [inRange, outstanding, billing, todayRows] = await Promise.all([
        fetchBillRows(token, { from_date: range.from, to_date: range.to }),
        fetchBillRows(token, { outstanding: 'true' }),
        fetchReportModule(token, 'billing', range.from, range.to, { force: true }),
        needToday ? fetchBillRows(token, { from_date: today.from, to_date: today.to }) : Promise.resolve(null),
      ]);
      setRangeBills(inRange);
      setDueBills(outstanding);
      setReports(billing);
      setTodayBills(todayRows || inRange);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bills_next.fetch_failed'));
      setRangeBills([]);
      setDueBills([]);
      setTodayBills([]);
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

  const cockpit = useMemo(() => {
    const billed = visits.reduce((sum, row) => sum + row.grand_total, 0);
    const collected = visits.reduce((sum, row) => sum + row.grand_paid, 0);
    const pendingInRange = visits.reduce((sum, row) => sum + row.grand_pending, 0);
    const recovered = visits.reduce((sum, row) => sum + row.paid_towards_previous_pending, 0);
    const cash = rangeBills.reduce((sum, bill) => sum + Number(bill.cash_amount || 0), 0);
    const online = rangeBills.reduce((sum, bill) => sum + Number(bill.online_amount || 0), 0);
    const consult = visits.reduce((sum, row) => sum + row.consult_total, 0);
    const medicine = visits.reduce((sum, row) => sum + row.medicine_total, 0);
    const openDues = dueBills.reduce((sum, bill) => sum + Number(bill.pending_amount || 0), 0);
    const duePatients = new Set(dueBills.map((bill) => String(bill.patient_id || bill.bill_id))).size;
    const collectionPct = billed <= 0 ? 0 : Math.min(100, Math.round((collected / billed) * 100));
    return {
      billed,
      collected,
      pendingInRange,
      recovered,
      cash,
      online,
      consult,
      medicine,
      openDues,
      duePatients,
      dueCount: dueBills.length,
      collectionPct,
      visitCount: visits.length,
    };
  }, [visits, rangeBills, dueBills]);

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

  const filteredVisits = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return visits;
    return visits.filter((row) =>
      [row.patient_full_name, row.patient_mobile_no, row.auid, row.treatment_name]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [visits, search]);

  const practice = useMemo(() => consultantTotals(reports?.revenue_by_consultant), [reports]);
  const medicines = useMemo(() => topMedicines(reports?.revenue_by_medicine), [reports]);
  const mixMax = Math.max(cockpit.consult, cockpit.medicine, 1);

  const openVisit = async (entry: VisitRow) => {
    setSelectedVisit(entry);
    setDetailLoading(true);
    setVisitDetail(null);
    try {
      if (entry.appointment_id) {
        const response = await fetch(`/api/v1/bills/appointment/${entry.appointment_id}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success) {
          setVisitDetail(result.data);
          return;
        }
      }
      const billIds = entry.bills.map((bill) => Number(bill.bill_id)).filter(Boolean);
      const detailed = await Promise.all(billIds.map(async (billId) => {
        const response = await fetch(`/api/v1/bills/${billId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        return result.success ? result.data : entry.bills.find((bill) => Number(bill.bill_id) === billId);
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
      setVisitDetail({ appointment: entry, bills: entry.bills, payments: [], summary: entry });
    } finally {
      setDetailLoading(false);
    }
  };

  const openDueBill = (bill: any) => {
    const match = [...visits, ...todayVisits].find(
      (row) => Number(row.appointment_id) === Number(bill.appointment_id) || row.bills.some((item) => Number(item.bill_id) === Number(bill.bill_id)),
    );
    void openVisit(match || groupVisits([bill])[0]);
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
        {t('bills_next.insight', {
          collected: money(cockpit.collected),
          pct: cockpit.collectionPct,
          pending: money(cockpit.openDues),
          count: cockpit.duePatients,
          recovered: money(cockpit.recovered),
        })}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          label={t('bills_next.collected')}
          value={money(cockpit.collected)}
          sub={t('bills_next.of_billed', { amount: money(cockpit.billed), visits: cockpit.visitCount })}
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
        />
        <Metric
          label={t('bills_next.collection_rate')}
          value={`${cockpit.collectionPct}%`}
          sub={t('bills_next.pending_in_range', { amount: money(cockpit.pendingInRange) })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t('bills_next.mix')}</p>
          <MixBar label={t('bills_next.consult')} value={cockpit.consult} max={mixMax} />
          <MixBar label={t('bills_next.medicine')} value={cockpit.medicine} max={mixMax} tone="violet" />
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
          { id: 'visits', label: t('bills_next.tab_visits'), count: cockpit.visitCount },
          { id: 'practice', label: t('bills_next.tab_practice') },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`cursor-pointer px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
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

      {tab !== 'practice' && (
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
                    {filteredDues.map((bill) => {
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
          </div>
        </div>
      ) : tab === 'visits' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {filteredVisits.length === 0 ? (
            <p className="py-14 text-center text-sm font-semibold text-slate-400">{t('bills_next.no_visits')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">{t('bills_next.col_token')}</th>
                    <th className="px-4 py-3">{t('bills_next.col_patient')}</th>
                    <th className="px-4 py-3">{t('bills_next.mix')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.collected')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.old_dues')}</th>
                    <th className="px-4 py-3 text-right">{t('bills_next.pending')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVisits.map((row) => (
                    <tr
                      key={row.group_key}
                      onClick={() => void openVisit(row)}
                      className={`cursor-pointer hover:bg-[#549E9E]/[0.04] ${row.grand_pending > 0 ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <AppointmentTokenBadge
                          tokenDisplay={row.display_token_display}
                          tokenNumber={row.token_number}
                          position={row.queue_position}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-800">{row.patient_full_name || '—'}</p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {formatDate(row.appointment_date)}
                          {row.treatment_name ? ` · ${row.treatment_name}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-500">
                        <p>{t('bills_next.consult')} {money(row.consult_total)}</p>
                        <p>{t('bills_next.medicine')} {money(row.medicine_total)}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{moneyExact(row.grand_paid)}</td>
                      <td className="px-4 py-3 text-right text-sm font-black text-[#2d8789]">
                        {row.paid_towards_previous_pending > 0 ? moneyExact(row.paid_towards_previous_pending) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={`text-sm font-black ${row.grand_pending > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {row.grand_pending > 0 ? moneyExact(row.grand_pending) : '—'}
                        </p>
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
        </div>
      ) : (
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
                {medicines.map((med) => (
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
          </div>
        </div>
      )}

      <VisitDrawer
        visit={selectedVisit}
        detail={visitDetail}
        loading={detailLoading}
        patientDues={dueBills.filter((bill) => Number(bill.patient_id) === Number(selectedVisit?.patient_id))}
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
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) => (
  <div className={`rounded-xl border p-4 ${emphasis ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-white'}`}>
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    {sub && <p className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</p>}
  </div>
);

const MixBar = ({
  label,
  value,
  max,
  tone = 'teal',
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'teal' | 'violet' | 'amber' | 'sky';
}) => {
  const colors = {
    teal: 'bg-[#549E9E]',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
  };
  const width = Number(value || 0) <= 0 ? 0 : Math.max(4, Math.round((Number(value || 0) / Math.max(max, 1)) * 100));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-black text-slate-800">{money(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-100 bg-slate-50/70 px-3 py-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-base font-black text-slate-800">{value}</p>
  </div>
);

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PAID: 'text-emerald-600',
    PARTIAL: 'text-sky-600',
    UNPAID: 'text-amber-600',
  };
  return <p className={`text-[10px] font-black uppercase tracking-widest ${map[status] || 'text-slate-400'}`}>{status}</p>;
};
