import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, Eye, Printer, RefreshCcw, Search, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import Pagination from '../../../Pagination';
import PrescriptionPrint from '../../../PrescriptionPrint';
import { fetchReportModule, patientRecordsHref, parseIsoDate } from '../lib';
import { csvCell } from '../locationPatients';
import { filterNotReturned, type NotReturnedPatient } from '../notReturned';

const PAGE_SIZE = 25;
const BUCKETS = ['1_2', '2_3', '3_plus'] as const;

export default function NotReturnedPage() {
  const { t, i18n } = useTranslation();
  const label = (key: string, values?: Record<string, any>): string => String(t(`reports_next.not_returned.${key}`, values));
  const { token, branchScope } = useAuth();
  const branchId = Number(branchScope?.selected_branch_id) || undefined;
  const [params, setParams] = useSearchParams();
  const bucket = BUCKETS.includes(params.get('bucket') as any) ? params.get('bucket')! : 'all';
  const search = params.get('search') || '';
  const overdue = params.get('overdue') === '1';
  const unbooked = params.get('unbooked') === '1';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<{ as_of: string; rows: NotReturnedPatient[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [prescriptionLanguage, setPrescriptionLanguage] = useState<'en' | 'hi'>('en');
  const change = (values: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete('page');
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  }, { replace: true });

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    if (!token || !branchId) { setLoading(false); return () => controller.abort(); }
    fetchReportModule(token, 'not-returned', '', '', { branchId, force: true, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || t('reports_next.fetch_failed')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, branchId, revision, t]);

  useEffect(() => {
    if (!printing) return;
    const close = () => setPrinting(false);
    window.addEventListener('afterprint', close);
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => window.print()); });
    return () => { window.removeEventListener('afterprint', close); cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [printing]);

  const rows = data?.rows || [];
  const filtered = useMemo(() => filterNotReturned(data?.rows || [], bucket, search, overdue, unbooked), [data, bucket, search, overdue, unbooked]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visibleRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const date = (value?: string | null) => parseIsoDate(value || '')?.toLocaleDateString(i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || '—';
  const openPrescription = async (row: NotReturnedPatient) => {
    if (!token || previewLoading) return;
    setPreviewLoading(row.subject_key); setPreviewError('');
    try {
      const response = await fetch(`/api/v1/medical/prescriptions/${row.consultation_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || t('reports_next.fetch_failed'));
      setPrescription(result.data);
    } catch (err) { setPreviewError(err instanceof Error ? err.message : t('reports_next.fetch_failed')); }
    finally { setPreviewLoading(null); }
  };
  const exportCsv = () => {
    const header = ['reg_no','patient','mobile','last_visit','days_away','follow_up','treatment','medicine_taken','next_booked'].map(key => label(key));
    const csv = [header, ...filtered.map(row => [row.patient_uuid, row.patient_full_name, row.patient_mobile_no, row.last_visit_date, row.days_since_visit, row.due_date, row.treatment_name, row.last_medicine_date, row.next_appointment])].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `patients-not-returned-${data?.as_of || 'report'}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  const table = (items: NotReturnedPatient[], print = false) => <table className="w-full text-left"><thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
    {['patient','last_visit','follow_up','treatment', ...(print ? [] : ['actions'])].map(key => <th key={key} className="px-4 py-3">{label(key)}</th>)}
  </tr></thead><tbody className="divide-y divide-slate-100">{items.map(row => <tr key={row.subject_key} className="align-top hover:bg-slate-50/80">
    <td className="px-4 py-4"><p className="text-sm font-black text-[#2d8789]">{row.patient_full_name}</p><p className="mt-1 text-xs font-bold text-slate-600">{label('reg_no')}: {row.patient_uuid || '—'}</p><p className="mt-1 text-xs text-slate-500">{row.patient_mobile_no || '—'}</p>{row.family_member_id && <p className="mt-1 text-[10px] font-bold text-violet-600">{label('family_member')}{row.family_member_relationship ? ` · ${row.family_member_relationship}` : ''}</p>}</td>
    <td className="px-4 py-4"><p className="text-sm font-bold text-slate-700">{date(row.last_visit_date)}</p><p className="mt-1 text-xs font-bold text-slate-500">{label('days_away_value', { count: row.days_since_visit })}</p>{row.last_medicine_date && <p className="mt-2 text-[11px] font-bold text-sky-700">{label('medicine_taken')}: {date(row.last_medicine_date)}</p>}</td>
    <td className="px-4 py-4">{row.follow_up_chain_closed ? <p className="text-xs font-bold text-slate-500">{label('follow_up_closed')}</p> : row.due_date ? <><p className="text-xs font-bold text-slate-700">{date(row.due_date)}</p><p className={`mt-1 text-xs font-bold ${row.overdue_days > 0 ? 'text-amber-700' : 'text-[#2d8789]'}`}>{row.overdue_days > 0 ? label('overdue_days', { count: row.overdue_days }) : row.due_date === data?.as_of ? label('due_today') : label('not_due')}</p></> : <p className="text-xs text-slate-400">{label('no_due')}</p>}{row.next_appointment && <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700">{label('next_booked')}: {date(row.next_appointment)}</p>}</td>
    <td className="max-w-[240px] px-4 py-4"><p className="text-xs font-bold text-slate-600">{row.treatment_name || '—'}</p>{(row.disease || row.diagnosis) && <p className="mt-1 text-xs text-slate-500 break-words">{row.disease || row.diagnosis}</p>}</td>
    {!print && <td className="px-4 py-4"><div className="flex flex-col items-start gap-2">{row.workflow_status !== 'COMPLETED_NO_PRESCRIPTION' && <button type="button" disabled={Boolean(previewLoading)} onClick={() => void openPrescription(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#549E9E]/30 bg-[#549E9E]/5 px-3 py-2 text-xs font-bold text-[#2d8789] hover:bg-[#549E9E]/10 disabled:opacity-50"><Eye size={14} />{previewLoading === row.subject_key ? t('common.loading') : label('last_prescription')}</button>}<Link to={patientRecordsHref(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{label('record')}</Link></div></td>}
  </tr>)}</tbody></table>;

  return <>
    <div className="space-y-5 no-print">
      <div><h1 className="text-2xl font-black text-slate-900">{label('title')}</h1><p className="mt-1 text-sm font-medium text-slate-500">{label('subtitle')}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/80 px-4 py-3"><p className="text-xs font-bold text-slate-500">{label('as_of')}: {date(data?.as_of)}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} disabled={loading || !filtered.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"><Download size={14} />{label('export')}</button><button type="button" onClick={() => setPrinting(true)} disabled={loading || !filtered.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"><Printer size={14} />{t('reports_next.print')}</button><button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#549E9E]/10 px-3 py-2 text-xs font-bold text-[#2d8789] disabled:opacity-40"><RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />{t('reports_next.refresh')}</button></div></div>
      <p className="text-xs font-medium text-slate-500">{label('card_note')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{BUCKETS.map(key => <button key={key} type="button" aria-pressed={bucket === key} onClick={() => change({ bucket: bucket === key ? '' : key })} className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${bucket === key ? 'border-[#549E9E] bg-[#549E9E]/10' : 'border-gray-100 bg-white hover:border-[#549E9E]/40'}`}><div><p className="text-xs font-bold text-slate-500">{label(key)}</p><p className="mt-2 text-2xl font-black text-[#2d8789]">{loading ? '—' : rows.filter(row => row.bucket === key).length}</p></div><Users size={24} className="text-[#549E9E]/60" /></button>)}</div>
      <p className="text-xs font-medium leading-relaxed text-slate-500">{label('scope_note')}</p>
      {(error || previewError) && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{error || previewError}</div>}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="flex flex-wrap items-center gap-4"><button type="button" onClick={() => change({ bucket: '' })} className={`rounded-lg border px-3 py-2 text-xs font-bold ${bucket === 'all' ? 'border-[#549E9E] bg-[#549E9E]/10 text-[#2d8789]' : 'border-slate-200 text-slate-500'}`}>{label('all')} ({rows.length})</button><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={overdue} onChange={event => change({ overdue: event.target.checked ? '1' : '' })} className="accent-[#549E9E]" />{label('overdue_only')}</label><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={unbooked} onChange={event => change({ unbooked: event.target.checked ? '1' : '' })} className="accent-[#549E9E]" />{label('unbooked')}</label></div><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={label('search')} value={search} onChange={event => change({ search: event.target.value })} placeholder={label('search')} className="w-full rounded-xl border border-gray-100 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#549E9E]" /></label></div>
        <div className="border-b border-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">{label('showing', { count: filtered.length })} · {bucket === 'all' ? label('all') : label(bucket)}</div>
        {loading ? <div className="p-16 text-center text-sm font-bold text-slate-400">{t('common.loading')}</div> : filtered.length ? <div className="overflow-x-auto">{table(visibleRows)}</div> : <p className="p-16 text-center text-sm font-semibold text-slate-400">{label('empty')}</p>}
        <Pagination currentPage={safePage} totalPages={pages} onPageChange={value => change({ page: String(value) })} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
    {printing && createPortal(<div className="print-only not-returned-print"><h1>{label('title')}</h1><p>{label('as_of')}: {date(data?.as_of)} · {bucket === 'all' ? label('all') : label(bucket)} · {label('showing', { count: filtered.length })}{overdue ? ` · ${label('overdue_only')}` : ''}{unbooked ? ` · ${label('unbooked')}` : ''}{search ? ` · ${search}` : ''}</p><p>{label('scope_note')}</p>{table(filtered, true)}</div>, document.body)}
    {prescription && createPortal(<div className="no-print fixed inset-0 z-[10000] overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm"><div className="mx-auto max-w-5xl"><div className="mb-3 flex justify-end gap-2 no-print"><button type="button" onClick={() => setPrescriptionLanguage(value => value === 'en' ? 'hi' : 'en')} className="rounded-lg bg-white px-4 py-2 text-xs font-bold">{prescriptionLanguage === 'en' ? 'हिन्दी' : 'English'}</button><button type="button" onClick={() => window.print()} className="rounded-lg bg-[#549E9E] px-4 py-2 text-xs font-bold text-white">{t('reports_next.print')}</button><button type="button" aria-label={label('close')} onClick={() => setPrescription(null)} className="rounded-lg bg-white p-2"><X size={18} /></button></div><PrescriptionPrint consultation={prescription} appointment={prescription} lang={prescriptionLanguage} /></div></div>, document.body)}
    {prescription && createPortal(<div className="print-only"><PrescriptionPrint consultation={prescription} appointment={prescription} lang={prescriptionLanguage} /></div>, document.body)}
    <style>{`@media screen{.not-returned-print{display:none}}@media print{.no-print{display:none!important}.not-returned-print{font:11px Arial;color:#17202a}.not-returned-print h1{font-size:20px}.not-returned-print table{width:100%;border-collapse:collapse;margin-top:12px}.not-returned-print th,.not-returned-print td{border:1px solid #d4d9df;padding:8px;text-align:left;vertical-align:top}.not-returned-print thead{display:table-header-group}.not-returned-print tr{break-inside:avoid}}`}</style>
  </>;
}
