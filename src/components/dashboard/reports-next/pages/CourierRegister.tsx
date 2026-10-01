import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, Eye, IndianRupee, MapPin, PackageOpen, Printer, Search, Truck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import CourierSlipPrint, { type CourierSlipData } from '../../../print/CourierSlipPrint';
import Pagination from '../../../Pagination';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import { DateBar } from '../DateBar';
import { fetchReportModule, formatReportWindowLabel, num, parseIsoDate, patientRecordsHref, rangeForFilter, rupee, type CustomRange } from '../lib';
import { useReportWindow } from '../useReportWindow';

const PAGE_SIZE = 30;

type CourierRow = {
  bill_id: number; bill_number: string; appointment_id?: number | null; consultation_id?: number | null;
  fk_patient_id: number; fk_branch_id: number; patient_full_name: string; patient_mobile_no?: string | null;
  patient_uuid?: string | null; auid?: string | null; branch_name?: string | null; branch_address?: string | null;
  branch_contact_no?: string | null; doctor_name?: string | null; medicine_type: 'REGULAR' | 'REPEAT' | 'DIRECT';
  medicine_count: number | string; medicine_names?: string | null; booked_at: string; courier_address?: string | null;
  delivery_remark?: string | null; courier_partner?: string | null; tracking_no?: string | null;
  courier_gross: number | string; courier_discount: number | string; courier_net: number | string;
  total_amount: number | string; paid_amount: number | string; pending_amount: number | string; payment_status: string;
};

const dateKey = (value: unknown) => String(value || '').slice(0, 10);
const formatDateTime = (value: unknown, locale: string) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const toSlipData = (row: CourierRow): CourierSlipData => ({
  billNumber: row.bill_number, bookedAt: row.booked_at, branchId: row.fk_branch_id, branchName: row.branch_name,
  branchAddress: row.branch_address, branchContactNo: row.branch_contact_no, patientName: row.patient_full_name,
  patientMobileNo: row.patient_mobile_no, patientId: row.patient_uuid || row.auid, courierAddress: row.courier_address,
  courierPartner: row.courier_partner, trackingNo: row.tracking_no, medicineCount: row.medicine_count,
  medicineNames: row.medicine_names, deliveryRemark: row.delivery_remark,
});

export default function CourierRegisterPage() {
  const { t, i18n } = useTranslation();
  const { token, branchScope } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { dateFilter, setDateFilter } = useReportWindow('1_month');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [rows, setRows] = useState<CourierRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CourierRow | null>(null);
  const [slipRow, setSlipRow] = useState<CourierRow | null>(null);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true); setError('');
    const range = rangeForFilter(dateFilter, customDateRange);
    try {
      const data = await fetchReportModule(token, 'courier-register', range.from, range.to, { force, branchId: branchScope?.selected_branch_id || undefined });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (loadError) {
      setRows([]); setError(loadError instanceof Error ? loadError.message : t('reports_next.fetch_failed'));
    } finally { setLoading(false); }
  }, [token, branchScope?.selected_branch_id, dateFilter, customDateRange, t]);

  useEffect(() => { void load(false); }, [load]);
  useEffect(() => { setPage(1); }, [search, dateFilter, customDateRange]);

  const typeLabel = (type: CourierRow['medicine_type']) => t(`reports_next.courier_register.type_${type.toLowerCase()}`);
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.patient_full_name, row.patient_mobile_no, row.patient_uuid, row.auid, row.bill_number, row.tracking_no, row.courier_partner, row.courier_address, row.medicine_names].join(' ').toLowerCase().includes(needle));
  }, [rows, search]);
  const pages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visibleRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const regular = rows.filter((row) => row.medicine_type === 'REGULAR').length;
  const repeatDirect = rows.length - regular;
  const courierNet = rows.reduce((sum, row) => sum + num(row.courier_net), 0);
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, locale);

  const copyAddress = async (row: CourierRow) => {
    if (!row.courier_address) return;
    await navigator.clipboard.writeText(row.courier_address);
    addToast(t('reports_next.courier_register.address_copied'), 'success');
  };

  const renderRows = (list: CourierRow[], print = false) => {
    let activeDay = '';
    const daySequence = new Map<string, number>();
    return list.flatMap((row) => {
      const day = dateKey(row.booked_at);
      const sequence = (daySequence.get(day) || 0) + 1;
      daySequence.set(day, sequence);
      const output: React.ReactNode[] = [];
      if (day !== activeDay) {
        activeDay = day;
        const parsed = parseIsoDate(day);
        output.push(<tr key={`day-${day}`} className="bg-[#549E9E]/10"><td colSpan={print ? 7 : 8} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#2d8789]">{parsed ? parsed.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : day}</td></tr>);
      }
      output.push(<tr key={row.bill_id} className="align-top hover:bg-slate-50/80">
        <td className="px-3 py-3 text-xs font-black text-slate-400">{sequence}</td>
        <td className="px-3 py-3"><p className="text-xs font-black text-slate-800">{formatDateTime(row.booked_at, locale)}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{row.bill_number}</p><span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500">{typeLabel(row.medicine_type)}</span></td>
        <td className="min-w-[160px] px-3 py-3"><p className="text-xs font-black text-slate-800">{row.patient_full_name}</p><p className="mt-0.5 text-[10px] font-medium text-slate-400">{row.patient_mobile_no || '—'} · {row.patient_uuid || row.auid || '—'}</p></td>
        <td className="min-w-[210px] px-3 py-3"><p className="line-clamp-2 text-[11px] font-bold text-slate-600">{row.courier_address || t('reports_next.courier_register.no_address')}</p>{!print && row.courier_address && <button type="button" onClick={() => void copyAddress(row)} className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#2d8789]"><Copy size={10} />{t('reports_next.courier_register.copy')}</button>}</td>
        <td className="min-w-[145px] px-3 py-3"><p className="text-xs font-black text-slate-700">{row.courier_partner || '—'}</p><p className="mt-0.5 break-all text-[10px] font-bold text-sky-700">{row.tracking_no || t('reports_next.courier_register.no_tracking')}</p></td>
        <td className="px-3 py-3 text-xs font-black tabular-nums"><p className="text-slate-700">{rupee(row.courier_gross)}</p>{num(row.courier_discount) > 0 && <p className="text-[10px] text-amber-700">-{rupee(row.courier_discount)}</p>}<p className="text-[10px] text-[#2d8789]">{t('reports_next.courier_register.net')} {rupee(row.courier_net)}</p></td>
        <td className="px-3 py-3"><span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">{t('reports_next.courier_register.dispensed')}</span><p className="mt-1 max-w-[180px] truncate text-[10px] font-bold text-slate-500">{num(row.medicine_count)} {t('reports_next.courier_register.medicines')}</p></td>
        {!print && <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black uppercase text-slate-600 hover:text-[#2d8789]"><Eye size={12} />{t('reports_next.courier_register.view')}</button><button type="button" onClick={() => setSlipRow(row)} className="inline-flex items-center gap-1 rounded-lg bg-[#549E9E] px-2 py-1.5 text-[9px] font-black uppercase text-white"><Printer size={12} />{t('reports_next.courier_register.slip')}</button></div></td>}
      </tr>);
      return output;
    });
  };

  return <>
    <div className="no-print space-y-5">
      <div><h1 className="text-2xl font-black text-slate-900">{t('reports_next.courier_register.title')}</h1><p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.courier_register.subtitle')}</p></div>
      <DateBar dateFilter={dateFilter} onDateFilter={setDateFilter} customDateRange={customDateRange} onCustomDateRange={setCustomDateRange} onRefresh={() => void load(true)} loading={loading} showPrint />
      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><AlertCircle size={16} />{error}</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryMetricCard title={t('reports_next.courier_register.total_orders')} value={rows.length} icon={Truck} theme="teal" /><SummaryMetricCard title={t('reports_next.courier_register.regular_orders')} value={regular} icon={PackageOpen} theme="blue" /><SummaryMetricCard title={t('reports_next.courier_register.repeat_direct_orders')} value={repeatDirect} icon={PackageOpen} theme="amber" /><SummaryMetricCard title={t('reports_next.courier_register.net_charge')} value={rupee(courierNet)} icon={IndianRupee} theme="violet" /></div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-black text-slate-800">{t('reports_next.courier_register.register')}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{windowLabel} · {filteredRows.length} {t('reports_next.courier_register.orders')}</p></div><label className="relative min-w-[290px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('reports_next.courier_register.search')} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-bold outline-none focus:border-[#549E9E]" /></label></div>
        {loading ? <div className="p-16 text-center text-sm font-bold text-slate-400">{t('common.loading')}</div> : visibleRows.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400"><th className="px-3 py-3">#</th><th className="px-3 py-3">{t('reports_next.courier_register.col_booking')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_patient')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_address')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_tracking')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_charge')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_status')}</th><th className="px-3 py-3">{t('reports_next.courier_register.col_actions')}</th></tr></thead><tbody className="divide-y divide-slate-100">{renderRows(visibleRows)}</tbody></table></div> : <div className="flex flex-col items-center p-16 text-center"><PackageOpen size={34} className="text-slate-200" /><p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">{t('reports_next.courier_register.empty')}</p></div>}
        <Pagination currentPage={safePage} totalPages={pages} onPageChange={setPage} totalItems={filteredRows.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
    <div className="print-only courier-register-print"><h1>{t('reports_next.courier_register.print_title')}</h1><p>{windowLabel} · {filteredRows.length} {t('reports_next.courier_register.orders')}</p><table><thead><tr><th>#</th><th>{t('reports_next.courier_register.col_booking')}</th><th>{t('reports_next.courier_register.col_patient')}</th><th>{t('reports_next.courier_register.col_address')}</th><th>{t('reports_next.courier_register.col_tracking')}</th><th>{t('reports_next.courier_register.col_charge')}</th><th>{t('reports_next.courier_register.col_status')}</th></tr></thead><tbody>{renderRows(filteredRows, true)}</tbody></table></div>
    {selected && createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm no-print"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><p className="text-lg font-black text-slate-900">{selected.patient_full_name}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{selected.bill_number} · {typeLabel(selected.medicine_type)}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={18} /></button></div><div className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] font-black uppercase text-emerald-600">{t('reports_next.courier_register.status')}</p><p className="mt-1 text-sm font-black text-emerald-700">{t('reports_next.courier_register.dispensed')}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">{t('reports_next.courier_register.bill_total')}</p><p className="mt-1 text-lg font-black text-slate-800">{rupee(selected.total_amount)}</p><p className="text-[10px] font-bold text-slate-400">{selected.payment_status}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">{t('reports_next.courier_register.courier_charge')}</p><p className="mt-1 text-lg font-black text-[#2d8789]">{rupee(selected.courier_net)}</p></div></div><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-[#2d8789]" /><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('reports_next.courier_register.delivery_address')}</p><p className="mt-1 text-sm font-bold text-slate-700">{selected.courier_address || '—'}</p><p className="mt-1 text-xs text-slate-500">{selected.patient_mobile_no || '—'}</p></div></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('reports_next.courier_register.courier_tracking')}</p><p className="mt-2 text-sm font-black text-slate-700">{selected.courier_partner || '—'}</p><p className="mt-1 break-all text-xs font-bold text-sky-700">{selected.tracking_no || '—'}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('reports_next.courier_register.medicine_summary')}</p><p className="mt-2 text-xs font-bold text-slate-700">{selected.medicine_names || '—'}</p></div></div><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => navigate(patientRecordsHref(selected))} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">{t('reports_next.courier_register.patient_record')}</button><button type="button" onClick={() => setSlipRow(selected)} className="rounded-xl bg-[#549E9E] px-4 py-2 text-xs font-black text-white">{t('reports_next.courier_register.print_slip')}</button></div></div></div></div>, document.body)}
    {slipRow && <CourierSlipPrint data={toSlipData(slipRow)} onClose={() => setSlipRow(null)} />}
    <style>{`@media screen{.print-only{display:none}}@media print{.no-print{display:none!important}.print-only{display:block!important}.courier-register-print{font:10px Arial;color:#17202a}.courier-register-print h1{font-size:19px;margin:0 0 4px}.courier-register-print table{width:100%;border-collapse:collapse;margin-top:12px}.courier-register-print th,.courier-register-print td{border:1px solid #cbd5e1;padding:5px;text-align:left;vertical-align:top}.courier-register-print thead{display:table-header-group}.courier-register-print tr{break-inside:avoid}}`}</style>
  </>;
}
