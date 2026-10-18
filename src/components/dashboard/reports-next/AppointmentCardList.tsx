import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, Eye, Printer, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '../../Pagination';
import PrescriptionPrint from '../../PrescriptionPrint';
import { parseIsoDate, patientRecordsHref } from './lib';
import { filterAppointmentList, type AppointmentCardRow, type AppointmentCardStatus } from './appointmentList';

const PAGE_SIZE = 25;

export default function AppointmentCardList({ token, branchId, branchName, from, to, status, expectedCount, onClose }: {
  token: string; branchId?: number; branchName?: string; from: string; to: string;
  status: AppointmentCardStatus; expectedCount: number; onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const label = (key: string, values?: Record<string, any>): string => String(t(`reports_next.appointment_list.${key}`, values));
  const statusLabel = (value: string) => value === 'all' ? t('reports_next.total') : value === 'confirmed' ? label('confirmed') : t(`reports_next.${value}`);
  const [rows, setRows] = useState<AppointmentCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setRows([]); setError(''); setLoading(true); setSearch(''); setPage(1); setPrescription(null);
    const params = new URLSearchParams({ from, to, status });
    if (branchId) params.set('branch_id', String(branchId));
    fetch(`/api/v1/reports/appointments/list?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || t('reports_next.fetch_failed'));
        if (!controller.signal.aborted) setRows(result.data?.rows || []);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || t('reports_next.fetch_failed')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, branchId, from, to, status, t]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    if (!printing) return;
    const close = () => setPrinting(false);
    window.addEventListener('afterprint', close);
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => window.print()); });
    return () => { window.removeEventListener('afterprint', close); cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [printing]);

  const filtered = useMemo(() => filterAppointmentList(rows, search), [rows, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const date = (value: string) => parseIsoDate(value)?.toLocaleDateString(i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || value;
  const openPrescription = async (row: AppointmentCardRow) => {
    if (previewLoading) return;
    setPreviewLoading(row.appointment_id); setPreviewError('');
    try {
      const response = await fetch(`/api/v1/doctors/consultations/${row.appointment_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.consultation) throw new Error(result.message || t('reports_next.fetch_failed'));
      setPrescription(result.data);
    } catch (err) { setPreviewError(err instanceof Error ? err.message : t('reports_next.fetch_failed')); }
    finally { setPreviewLoading(null); }
  };

  const table = (items: AppointmentCardRow[], print = false) => <table className="w-full text-left">
    <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {['date','token','patient','mobile','treatment','slot','status', ...(print ? [] : ['actions'])].map(key => <th key={key} className="px-3 py-3">{label(key)}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{items.map(row => <tr key={row.appointment_id} className="align-top hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-slate-600">{date(row.appointment_date)}</td>
      <td className="px-3 py-3"><div className="flex flex-col items-start gap-1">{row.queue_position != null && <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs font-black text-yellow-900">Pos #{row.queue_position}</span>}<span className="text-sm font-black text-[#2d8789]">{row.display_token_display || '—'}</span></div></td>
      <td className="min-w-[150px] px-3 py-3"><p className="text-sm font-black text-slate-800">{row.patient_full_name || '—'}</p><p className="mt-1 text-xs font-bold text-[#2d8789]">{label('reg_no')}: {row.patient_uuid || '—'}</p>{row.family_member_id && <p className="mt-1 text-[10px] font-bold text-violet-600">{label('family_member')}</p>}</td>
      <td className="px-3 py-3 text-xs font-semibold text-slate-600">{row.patient_mobile_no || '—'}</td>
      <td className="px-3 py-3 text-xs font-bold text-slate-600">{row.treatment_name || '—'}</td>
      <td className="px-3 py-3 text-xs font-bold text-slate-500">{row.slot_name || '—'}</td>
      <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${row.status.toLowerCase() === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status.toLowerCase() === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{statusLabel(row.status.toLowerCase())}</span>{row.reception_status === 'REJECTED_BY_RECEPTION' && <p className="mt-1 text-[10px] text-violet-700">{label('reception_rejected')}{row.reception_rejection_reason ? `: ${row.reception_rejection_reason}` : ''}</p>}</td>
      {!print && <td className="px-3 py-3"><div className="flex flex-col items-start gap-2">{row.status.toLowerCase() === 'completed' && row.consultation_id && row.workflow_status !== 'COMPLETED_NO_PRESCRIPTION' ? <button type="button" onClick={() => void openPrescription(row)} disabled={Boolean(previewLoading)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#549E9E]/30 bg-[#549E9E]/5 px-3 py-2 text-xs font-bold text-[#2d8789] disabled:opacity-50"><Eye size={14} />{previewLoading === row.appointment_id ? t('common.loading') : label('prescription')}</button> : null}{Boolean(row.has_history) && <Link to={patientRecordsHref(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{label('record')}</Link>}{!row.has_history && <span className="text-xs text-slate-400">{label('no_record')}</span>}</div></td>}
    </tr>)}</tbody>
  </table>;

  return <>
    <section className="overflow-hidden rounded-2xl border border-[#549E9E]/20 bg-white no-print" aria-label={label('title')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div><h2 className="text-sm font-black text-slate-800">{statusLabel(status)} · {label('title')}</h2><p className="mt-1 text-xs text-slate-500">{date(from)} – {date(to)} · {label('count', { count: loading ? expectedCount : filtered.length })}</p></div>
        <div className="flex flex-wrap items-center gap-2"><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={label('search')} placeholder={label('search')} value={search} onChange={event => setSearch(event.target.value)} className="rounded-xl border border-gray-100 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#549E9E]" /></label><button type="button" onClick={() => setPrinting(true)} disabled={loading || Boolean(error) || !filtered.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"><Printer size={14} />{t('reports_next.print')}</button><button type="button" aria-label={label('close')} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={16} /></button></div>
      </div>
      <p className="border-b border-slate-50 px-4 py-2 text-xs text-slate-500">{label('note')}{status === 'pending' ? ` ${label('pending_note')}` : ''}</p>
      {!loading && !error && rows.length !== expectedCount && <p role="status" className="bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">{label('refresh_note')}</p>}
      {(error || previewError) && <p role="alert" className="flex items-center gap-2 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{error || previewError}</p>}
      {loading ? <p className="p-12 text-center text-sm text-slate-400">{t('common.loading')}</p> : error ? null : filtered.length ? <div className="overflow-x-auto">{table(filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE))}</div> : <p className="p-12 text-center text-sm text-slate-400">{label('empty')}</p>}
      {!error && !loading && <Pagination currentPage={safePage} totalPages={pages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />}
    </section>
    {printing && createPortal(<div className="print-only appointment-card-print"><style>{'@media print{@page{size:A4 landscape;margin:12mm}}'}</style><h1>{statusLabel(status)} · {label('title')}</h1><p>{branchName}</p><p>{date(from)} – {date(to)} · {label('count', { count: filtered.length })}{search ? ` · ${search}` : ''}</p>{table(filtered, true)}</div>, document.body)}
    {prescription && createPortal(<div className="no-print fixed inset-0 z-[10000] overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm"><div className="mx-auto max-w-5xl"><div className="mb-3 flex justify-end gap-2"><button type="button" onClick={() => setPrescriptionLang(value => value === 'en' ? 'hi' : 'en')} className="rounded-lg bg-white px-4 py-2 text-xs font-bold">{prescriptionLang === 'en' ? 'हिन्दी' : 'English'}</button><button type="button" onClick={() => window.print()} className="rounded-lg bg-[#549E9E] px-4 py-2 text-xs font-bold text-white">{t('reports_next.print')}</button><button type="button" aria-label={label('close')} onClick={() => setPrescription(null)} className="rounded-lg bg-white p-2"><X size={18} /></button></div><PrescriptionPrint consultation={prescription.consultation} appointment={prescription.appointment} lang={prescriptionLang} /></div></div>, document.body)}
    {prescription && createPortal(<div className="print-only"><PrescriptionPrint consultation={prescription.consultation} appointment={prescription.appointment} lang={prescriptionLang} /></div>, document.body)}
    <style>{`@media print{.appointment-card-print{font:10px Arial;color:#17202a}.appointment-card-print h1{font-size:20px}.appointment-card-print table{width:100%;border-collapse:collapse;margin-top:12px}.appointment-card-print th,.appointment-card-print td{border:1px solid #d4d9df;padding:6px;text-align:left;vertical-align:top}.appointment-card-print thead{display:table-header-group}.appointment-card-print tr{break-inside:avoid}}`}</style>
  </>;
}
