import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Banknote, CheckCircle2, Clock, Eye, IndianRupee, Printer, Search, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import Pagination from '../../../Pagination';
import PrescriptionPrint from '../../../PrescriptionPrint';
import ClinicBillPrint from '../../../print/ClinicBillPrint';
import { DateBar } from '../DateBar';
import { fetchReportModule, formatReportWindowLabel, parseIsoDate, patientRecordsHref, rangeForFilter, type CustomRange } from '../lib';
import { useReportWindow } from '../useReportWindow';
import { filterDispensingRows, type DispensingRow, type DispensaryRegister } from '../dispensaryRegister';

const PAGE_SIZE = 25;
const actionClass = 'inline-flex items-center gap-1.5 rounded-lg border border-[#549E9E]/30 bg-[#549E9E]/5 px-3 py-2 text-xs font-bold text-[#2d8789] disabled:opacity-40';
const cellClass = 'px-3 py-3';

export default function DispensaryPage() {
  const { t, i18n } = useTranslation();
  const label = (key: string, values?: Record<string, any>): string => String(t(`reports_next.dispensary.${key}`, values));
  const locale = i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token, branchScope } = useAuth();
  const branchId = Number(branchScope?.selected_branch_id) || undefined;
  const [params, setParams] = useSearchParams();
  const { dateFilter } = useReportWindow('3_months');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const view = params.get('view') === 'dispensed' ? 'dispensed' : 'pending';
  const search = params.get('search') || '';
  const type = ['REGULAR','DIRECT','REPEAT'].includes(params.get('type') || '') ? params.get('type')! : 'all';
  const payment = ['paid','pending'].includes(params.get('payment') || '') ? params.get('payment')! : 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<DispensaryRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [actionError, setActionError] = useState('');
  const detailRequest = useRef<AbortController | null>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');
  const prescriptionDialog = useRef<HTMLDivElement>(null);
  const [billPreview, setBillPreview] = useState<{ bill: any; patient: DispensingRow } | null>(null);
  const range = rangeForFilter(dateFilter, customDateRange);
  const windowLabel = formatReportWindowLabel(t, dateFilter, customDateRange, locale);
  const change = (values: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page');
    for (const [key,value] of Object.entries(values)) value ? next.set(key,value) : next.delete(key);
    return next;
  }, { replace: true });

  useEffect(() => {
    const controller = new AbortController();
    detailRequest.current?.abort(); setActionKey('');
    setLoading(true); setError(''); setData(null); setActionError(''); setPrescription(null); setBillPreview(null);
    if (!token || !branchId) { setLoading(false); return () => controller.abort(); }
    fetchReportModule(token, 'dispensary', range.from, range.to, { branchId, force: true, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || t('reports_next.fetch_failed')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); detailRequest.current?.abort(); };
  }, [token, branchId, range.from, range.to, revision, t]);

  useEffect(() => {
    if (!prescription) return;
    const previousBody = document.body.style.overflow;
    const previousHtml = document.documentElement.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new Event('lenis:stop'));
    prescriptionDialog.current?.focus();
    return () => {
      document.body.style.overflow = previousBody;
      document.documentElement.style.overflow = previousHtml;
      window.dispatchEvent(new Event('lenis:start'));
      previousFocus?.focus({ preventScroll: true });
    };
  }, [prescription]);

  useEffect(() => {
    if (!printing) return;
    const close = () => setPrinting(false);
    window.addEventListener('afterprint', close);
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => window.print()); });
    return () => { window.removeEventListener('afterprint',close); cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [printing]);

  const rows = useMemo(() => filterDispensingRows(view === 'pending' ? data?.pending || [] : data?.bills || [], search, view === 'pending' ? 'all' : type, view === 'pending' ? 'all' : payment), [data,view,search,type,payment]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page,pages);
  const money = (value: unknown) => `₹${(Number(value) || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const date = (value?: string) => parseIsoDate(value || '')?.toLocaleDateString(locale,{day:'2-digit',month:'short',year:'numeric'}) || '—';
  const summary = data?.summary;
  const patient = (row: DispensingRow) => <>
    <p className="text-sm font-black text-slate-800">{row.patient_full_name || '—'}</p>
    <p className="mt-1 text-xs font-bold text-[#2d8789]">{label('reg_no')}: {row.patient_uuid || '—'}</p>
    <p className="mt-1 text-xs text-slate-500">{row.patient_mobile_no || '—'}{row.family_member_id ? ` · ${label('family')}` : ''}</p>
  </>;
  const tokenBadge = (row: DispensingRow) => <div className="mt-1 flex flex-wrap items-center gap-1.5">
    {row.queue_position != null && <span className="rounded border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 text-[10px] font-black text-yellow-900">Pos #{row.queue_position}</span>}
    {row.display_token_display && <span className="text-xs font-black text-[#2d8789]">{row.display_token_display}</span>}
    <span className="text-[10px] text-slate-500">{row.slot_name}</span>
  </div>;
  const openDetail = async (row: DispensingRow) => {
    if (!token || actionKey) return;
    const controller = new AbortController();
    detailRequest.current = controller;
    setActionKey(String(row.bill_id || row.consultation_id)); setActionError('');
    try {
      const response = await fetch(row.bill_id ? `/api/v1/bills/${row.bill_id}?billing_scope=branch` : `/api/v1/doctors/consultations/${row.appointment_id}`, { headers:{ Authorization:`Bearer ${token}` }, signal: controller.signal });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !result.success) throw new Error(result.message || t('reports_next.fetch_failed'));
      if (row.bill_id) setBillPreview({bill:result.data,patient:row});
      else if (result.data?.consultation) setPrescription(result.data);
      else throw new Error(t('reports_next.fetch_failed'));
    } catch (err) { if (!controller.signal.aborted) setActionError(err instanceof Error ? err.message : t('reports_next.fetch_failed')); }
    finally { if (detailRequest.current === controller) { setActionKey(''); detailRequest.current = null; } }
  };
  const actions = (row: DispensingRow) => <div className="flex flex-col items-start gap-2">
    <button type="button" onClick={() => void openDetail(row)} disabled={Boolean(actionKey)} className={actionClass}><Eye size={14} />{actionKey === String(row.bill_id || row.consultation_id) ? t('common.loading') : label(row.bill_id ? 'view_bill' : 'view_prescription')}</button>
    <Link to={patientRecordsHref(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{label('record')}</Link>
  </div>;
  const table = (items: DispensingRow[], print = false) => <table className="w-full text-left">
    <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {(view === 'pending' ? ['date','token','patient','doctor_treatment','waiting'] : ['bill_date','patient_token','type_doctor','delivery','net_billed','paid_pending']).concat(print ? [] : ['actions']).map(key => <th key={key} className={cellClass}>{label(key)}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{items.map(row => <tr key={view === 'pending' ? row.consultation_id! : row.bill_id!} className="align-top hover:bg-slate-50/80">
      {view === 'pending' ? <>
        <td className={`${cellClass} whitespace-nowrap text-xs font-bold text-slate-600`}>{date(row.appointment_date)}</td>
        <td className={cellClass}>{tokenBadge(row)}</td>
        <td className={`${cellClass} min-w-[160px]`}>{patient(row)}</td>
        <td className={cellClass}><p className="text-xs font-bold text-slate-600">{row.doctor_name || '—'}</p><p className="mt-1 text-xs text-slate-500">{row.treatment_name || '—'}</p></td>
        <td className={cellClass}><span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{Number(row.waiting_days) > 0 ? label('days_waiting',{count:Number(row.waiting_days)}) : label('sent_today')}</span></td>
      </> : <>
        <td className={cellClass}><p className="whitespace-nowrap text-xs font-bold text-slate-600">{date(row.bill_date)}</p><p className="mt-1 text-[10px] text-slate-500">{row.bill_number}</p></td>
        <td className={`${cellClass} min-w-[170px]`}>{patient(row)}{tokenBadge(row)}</td>
        <td className={cellClass}><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{label(`type_${row.medicine_type?.toLowerCase()}`)}</span>{row.doctor_name && <p className="mt-2 text-xs text-slate-500">{row.doctor_name}</p>}</td>
        <td className={`${cellClass} text-xs font-bold text-slate-600`}>{label(row.delivery_mode === 'COURIER' ? 'courier' : 'hand')}</td>
        <td className={`${cellClass} whitespace-nowrap text-sm font-black text-slate-800`}>{money(row.total_amount)}</td>
        <td className={`${cellClass} whitespace-nowrap`}><p className="text-xs font-bold text-emerald-700">{label('paid')}: {money(row.paid_amount)}</p><p className={`mt-1 text-xs font-bold ${Number(row.pending_amount) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{label('pending_amount')}: {money(row.pending_amount)}</p></td>
      </>}
      {!print && <td className={cellClass}>{actions(row)}</td>}
    </tr>)}</tbody>
  </table>;

  return <>
    <div className="no-print space-y-5">
      <div><h1 className="text-2xl font-black text-slate-900">{label('title')}</h1><p className="mt-1 text-sm font-medium text-slate-500">{label('subtitle')}</p></div>
      <DateBar dateFilter={dateFilter} onDateFilter={value => change({window:value,from:''})} customDateRange={customDateRange} onCustomDateRange={value => { setCustomDateRange(value); change({}); }} onRefresh={() => setRevision(value => value + 1)} loading={loading} />
      <p className="text-xs font-medium text-slate-500">{label('date_note')}</p>
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{error}</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {(['pending','dispensed'] as const).map(key => <button key={key} type="button" aria-pressed={view === key} onClick={() => change({view:key,search:'',payment:'',type:''})} className={`rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#549E9E] ${view === key ? 'ring-2 ring-[#549E9E]' : 'hover:ring-2 hover:ring-[#549E9E]/30'}`}>
          <SummaryMetricCard title={label(key)} value={!summary ? '—' : key === 'pending' ? summary.pending_count : summary.dispensed_bills} icon={key === 'pending' ? Clock : CheckCircle2} theme={key === 'pending' ? 'amber' : 'green'} subtitle={key === 'pending' ? label('all_pending') : windowLabel} />
          <span className="block px-4 py-1.5 text-[10px] font-bold text-[#2d8789]">{label('view_list')}</span>
        </button>)}
        <SummaryMetricCard title={label('net_billed')} value={summary ? money(summary.net_billed) : '—'} icon={IndianRupee} theme="teal" subtitle={windowLabel} />
        <SummaryMetricCard title={label('paid_card')} value={summary ? money(summary.paid) : '—'} icon={Banknote} theme="green" subtitle={windowLabel} />
        <SummaryMetricCard title={label('pending_card')} value={summary ? money(summary.pending) : '—'} icon={Clock} theme="rose" subtitle={windowLabel} />
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{label('money_note')}</p>
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex gap-2">{(['pending','dispensed'] as const).map(key => <button key={key} type="button" onClick={() => change({view:key,search:'',type:'',payment:''})} className={`rounded-xl border px-4 py-2 text-xs font-bold ${view === key ? 'border-[#549E9E] bg-[#549E9E] text-white' : 'border-slate-200 text-slate-500'}`}>{label(key)}</button>)}</div>
          <div className="flex flex-wrap gap-2"><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={label('search')} placeholder={label('search')} value={search} onChange={event => change({search:event.target.value})} className="rounded-xl border border-gray-100 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#549E9E]" /></label><button type="button" onClick={() => setPrinting(true)} disabled={loading || !rows.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"><Printer size={14} />{t('reports_next.print')}</button></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">{loading ? t('common.loading') : label('list_count',{count:rows.length})} · {view === 'pending' ? label('all_pending') : `${date(range.from)} – ${date(range.to)}`}</p>
          {view === 'dispensed' && <div className="flex flex-wrap gap-2"><select aria-label={label('type_filter')} value={type} onChange={event => change({type:event.target.value})} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600">{['all','REGULAR','DIRECT','REPEAT'].map(key => <option key={key} value={key}>{label(`type_${key.toLowerCase()}`)}</option>)}</select><select aria-label={label('payment_filter')} value={payment} onChange={event => change({payment:event.target.value})} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600">{['all','paid','pending'].map(key => <option key={key} value={key}>{label(`payment_${key}`)}</option>)}</select></div>}
        </div>
        {actionError && <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}
        {loading ? <p className="p-12 text-center text-sm text-slate-400">{t('common.loading')}</p> : error ? null : rows.length ? <div className="overflow-x-auto">{table(rows.slice((safePage - 1)*PAGE_SIZE,safePage*PAGE_SIZE))}</div> : <p className="p-12 text-center text-sm text-slate-400">{label('empty')}</p>}
        <Pagination currentPage={safePage} totalPages={pages} onPageChange={value => change({page:String(value)})} totalItems={rows.length} pageSize={PAGE_SIZE} />
      </section>
      {data && <>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{(['bills','net_billed'] as const).map(key => <div key={key} className="h-[260px] rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-600">{label(key === 'bills' ? 'volume_chart' : 'billed_chart')}</h2>
          {data.trend.length ? <ResponsiveContainer width="100%" height="85%"><BarChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="date" tickFormatter={value => date(value).slice(0,6)} tick={{fontSize:10}} /><YAxis allowDecimals={key !== 'bills'} tick={{fontSize:10}} tickFormatter={value => key === 'bills' ? String(value) : `₹${Number(value).toLocaleString('en-IN')}`} width={key === 'bills' ? 35 : 75} /><Tooltip labelFormatter={value => date(String(value))} formatter={(value:number) => key === 'bills' ? [value,label('bills_count')] : [money(value),label('net_billed')]} /><Bar dataKey={key} fill={key === 'bills' ? '#10b981' : '#549E9E'} radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <p className="py-16 text-center text-xs text-slate-400">{label('no_bills')}</p>}
        </div>)}</div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5"><h2 className="text-xs font-black uppercase tracking-widest text-slate-600">{label('top_title')}</h2><p className="mt-1 text-xs text-slate-500">{label('top_note')}</p>
          {data.top_medicines.length ? <table className="mt-4 w-full text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-400"><th className="pb-2">{label('medicine')}</th><th className="pb-2 text-right">{label('bills_count')}</th></tr></thead><tbody>{data.top_medicines.map(item => <tr key={item.medicine_name} className="border-b border-slate-50"><td className="py-2 font-bold text-slate-600">{item.medicine_name}</td><td className="py-2 text-right font-black text-[#2d8789]">{item.bill_count}</td></tr>)}</tbody></table> : <p className="py-8 text-center text-xs text-slate-400">{label('no_bills')}</p>}
        </div>
      </>}
    </div>
    {printing && createPortal(<div className="print-only dispensary-register-print"><style>{'@media print{@page{size:A4 landscape;margin:12mm}}'}</style><h1>{label('title')} · {label(view)}</h1><p>{branchScope?.selected_branch?.branch_name} · {view === 'pending' ? label('all_pending') : `${date(range.from)} – ${date(range.to)}`} · {label('list_count',{count:rows.length})}</p>{view === 'dispensed' && <p>{label(`type_${type.toLowerCase()}`)} · {label(`payment_${payment}`)}</p>}{search && <p>{search}</p>}{table(rows,true)}</div>,document.body)}
    {billPreview && <ClinicBillPrint bills={[billPreview.bill]} patient={billPreview.patient} onClose={() => setBillPreview(null)} />}
    {prescription && createPortal(
      <div className="no-print fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 p-2 backdrop-blur-sm md:p-4">
        <div ref={prescriptionDialog} role="dialog" aria-modal="true" aria-labelledby="dispensary-prescription-title" tabIndex={-1}
          onKeyDown={event => {
            if (event.key === 'Escape') setPrescription(null);
            if (event.key !== 'Tab') return;
            const controls = prescriptionDialog.current?.querySelectorAll<HTMLElement>('button, [tabindex="0"]');
            if (!controls?.length) return;
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === prescriptionDialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }}
          className="flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl outline-none">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <h2 id="dispensary-prescription-title" className="text-sm font-bold text-slate-800">{t('patient_records.modal.prescription_preview', 'Prescription Preview')}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPrescriptionLang(value => value === 'en' ? 'hi' : 'en')} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold">{prescriptionLang === 'en' ? 'हिन्दी' : 'English'}</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#549E9E] px-4 py-2.5 text-xs font-bold text-white"><Printer size={16} />{t('patient_records.modal.action.print', 'Print')}</button>
              <button type="button" aria-label={label('close')} onClick={() => setPrescription(null)} className="rounded-lg bg-slate-100 p-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600"><X size={20} /></button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 md:p-6" data-lenis-prevent tabIndex={0} role="region" aria-label={t('patient_records.modal.prescription_preview', 'Prescription Preview')}>
            <div className="mx-auto min-h-[297mm] w-full min-w-[210mm] max-w-[210mm] bg-white p-4 shadow-lg md:p-8">
              <PrescriptionPrint consultation={prescription.consultation} appointment={prescription.appointment} lang={prescriptionLang} />
            </div>
          </div>
        </div>
      </div>,document.body)}
    {prescription && createPortal(<div className="print-only"><PrescriptionPrint consultation={prescription.consultation} appointment={prescription.appointment} lang={prescriptionLang} /></div>,document.body)}
    <style>{`@media print{.dispensary-register-print{font:10px Arial;color:#17202a}.dispensary-register-print table{width:100%;border-collapse:collapse;margin-top:12px}.dispensary-register-print th,.dispensary-register-print td{border:1px solid #d4d9df;padding:6px;text-align:left;vertical-align:top}.dispensary-register-print thead{display:table-header-group}.dispensary-register-print tr{break-inside:avoid}}`}</style>
  </>;
}
