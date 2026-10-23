import React, { useEffect, useState } from 'react';
import { ChevronRight, Download, Search, Users, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import Pagination from '../../../Pagination';
import { DateBar } from '../DateBar';
import { useReportWindow } from '../useReportWindow';
import { fetchReportModule, rangeForFilter } from '../lib';
import { csvCell } from '../locationPatients';
import DiscoverySourceIcon from '../../../DiscoverySourceIcon';

type Patient = { subject_key: string; source_code: string; other_detail: string | null; patient_uuid: string; patient_full_name: string; patient_mobile_no: string; family_member_id: number | null; answered_on: string; booking_date: string };
type Source = { code: string; label: string; count: number };
const PAGE_SIZE = 30;
const displayDate = (value: string) => value ? value.split('-').reverse().join('/') : '—';

export default function PatientSources() {
  const { token, branchScope } = useAuth();
  const { i18n } = useTranslation(); const hi = i18n.language.startsWith('hi');
  const [params, setParams] = useSearchParams();
  const { dateFilter, setDateFilter } = useReportWindow('1_month');
  const customRange = { from: params.get('start') || '', to: params.get('end') || '' };
  const range = rangeForFilter(dateFilter, customRange);
  const branchId = Number(branchScope?.selected_branch_id) || undefined;
  const source = params.get('source') || '';
  const search = params.get('search') || '';
  const [data, setData] = useState<{ patients: Patient[]; sources: Source[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const change = (values: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page');
    for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
    return next;
  }, { replace: true });
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null); setError('');
    if (!token || !branchId) { setLoading(false); return () => controller.abort(); }
    fetchReportModule(token, 'patient-sources', range.from, range.to, { branchId, force: true, signal: controller.signal })
      .then(setData).catch(err => { if (!controller.signal.aborted) setError(err.message || 'Unable to load patient sources.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, branchId, range.from, range.to, refresh]);
  const sources = data?.sources || [];
  const patients = data?.patients || [];
  const q = search.trim().toLowerCase();
  const filtered = patients.filter(patient => (!source || patient.source_code === source) && [patient.patient_uuid, patient.patient_full_name, patient.patient_mobile_no, patient.other_detail].join(' ').toLowerCase().includes(q));
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const sourceLabel = (code: string) => sources.find(item => item.code === code)?.label || code;
  const exportCsv = () => {
    const rows = [['Reg No.', 'Patient', 'Contact', 'Source', 'Other detail', 'Booking date', 'Answered on'], ...filtered.map(patient => [patient.patient_uuid, patient.patient_full_name, patient.patient_mobile_no, sourceLabel(patient.source_code), patient.other_detail, patient.booking_date, patient.answered_on])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `patient-sources-${range.from}-${range.to}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const th = 'px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400';
  const td = 'px-4 py-3 text-sm font-medium text-slate-600';
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-black text-slate-900">{hi ? 'मरीजों को क्लिनिक की जानकारी कहाँ से मिली?' : 'Patient Sources'}</h1><p className="mt-1 text-sm font-semibold text-[#549e9e]">{hi ? 'कौन-से माध्यम से मरीज हमारे पास आए?' : 'How patients heard about our clinic'}</p></div>
    <DateBar dateFilter={dateFilter} onDateFilter={setDateFilter} customDateRange={customRange} onCustomDateRange={value => { const next = typeof value === 'function' ? value(customRange) : value; change({ start: next.from, end: next.to }); }} onRefresh={() => setRefresh(value => value + 1)} loading={loading}/>
    <p className="text-xs leading-relaxed text-slate-500">{hi ? 'चुनी हुई ब्रांच की बुकिंग के बाद इस अवधि में मिले जवाब। हर मरीज एक बार गिना जाता है। Skip करने वाले या पुराने बिना जवाब वाले मरीज इसमें शामिल नहीं हैं।' : 'Answers received in this period after bookings at the selected branch. Each patient is counted once. Skipped questions and older patients without an answer are not included.'}</p>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!error && <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div><h2 className="text-sm font-bold text-slate-800">{hi ? 'मरीज कहाँ से आए?' : 'Where patients heard about us'}</h2><p className="mt-1 text-xs text-slate-500">{hi ? 'माध्यम चुनकर नीचे मरीजों की सूची देखें।' : 'Choose a source to see its patients below.'}</p></div>
        <button type="button" aria-pressed={!source} onClick={() => change({ source: '', search: '' })} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#549e9e] ${!source ? 'border-[#549e9e]/40 bg-[#549e9e]/[0.07]' : 'border-slate-200 hover:bg-slate-50'}`}><Users size={19} className="shrink-0 text-[#549e9e]"/><span><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{hi ? 'सभी मरीज' : 'All patients'}</span><span className="text-xl font-black leading-tight text-slate-800">{loading ? '…' : patients.length}</span></span><ChevronRight size={15} className="ml-2 text-[#549e9e]"/></button>
      </div>
      <div className="p-4 sm:p-5">{loading ? <p role="status" className="py-8 text-sm text-slate-400">Loading sources…</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sources.map(item => <button type="button" key={item.code} aria-pressed={source === item.code} onClick={() => change({ source: source === item.code ? '' : item.code, search: '' })} className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#549e9e] ${source === item.code ? 'border-[#549e9e] bg-[#549e9e]/[0.07]' : 'border-slate-100 hover:border-[#549e9e]/40 hover:bg-slate-50'}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${source === item.code ? 'bg-[#549e9e] text-white' : 'bg-[#549e9e]/[0.08] text-[#468686]'}`}><DiscoverySourceIcon code={item.code} size={21}/></span>
        <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-xs font-bold leading-snug text-slate-700">{item.label}</span><span className="text-sm font-black leading-none text-slate-800">{item.count}</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#549e9e]" style={{ width: `${patients.length ? item.count / patients.length * 100 : 0}%` }}/></span><span className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-500"><span>{patients.length ? Math.round(item.count / patients.length * 100) : 0}%</span><ChevronRight size={12} className={source === item.code ? 'text-[#246e70]' : 'text-slate-300 group-hover:text-[#549e9e]'}/></span></span>
      </button>)}</div>}</div>
    </div>}
    {source && <button type="button" onClick={() => change({ source: '', search: '' })} className="inline-flex items-center gap-2 rounded-full border border-[#549e9e]/30 bg-[#549e9e]/[0.07] px-3 py-1.5 text-xs font-bold text-[#246e70] hover:bg-[#549e9e]/15"><DiscoverySourceIcon code={source} size={14}/>{sourceLabel(source)}<X size={13}/><span className="sr-only">Clear source filter</span></button>}
    <div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-base font-bold text-slate-800">{source ? sourceLabel(source) : (hi ? 'सभी जवाब' : 'All answers')} <span className="text-sm font-medium text-slate-400">({filtered.length})</span></h2><div className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input aria-label="Search patients" value={search} placeholder={hi ? 'नाम, Reg No., मोबाइल…' : 'Name, Reg No., mobile…'} onChange={e => change({ search: e.target.value })} className="rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#549e9e]"/></div><button type="button" disabled={loading || !filtered.length} onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-bold text-teal-700 disabled:opacity-40"><Download size={15}/>Export CSV</button></div>
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white"><table className="w-full"><thead className="bg-slate-50"><tr>{['Reg No. / Patient', 'Contact', 'Source', 'Booking / Answer date'].map(label => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(patient => <tr key={patient.subject_key}><td className={td}><p className="text-xs font-bold text-[#246e70]">{patient.patient_uuid || '—'}</p><p className="mt-1 font-bold text-slate-800">{patient.patient_full_name}</p>{patient.family_member_id && <p className="text-xs text-slate-400">Family member</p>}</td><td className={`${td} whitespace-nowrap`}>{patient.patient_mobile_no || '—'}</td><td className={td}><span className="inline-flex items-center gap-1.5 rounded-lg bg-[#549e9e]/[0.07] px-2 py-1 text-xs font-bold text-[#246e70]"><DiscoverySourceIcon code={patient.source_code} size={14}/>{sourceLabel(patient.source_code)}</span>{patient.other_detail && <p className="mt-1 max-w-xs break-words text-xs text-slate-500">{patient.other_detail}</p>}</td><td className={`${td} whitespace-nowrap`}><p>{displayDate(patient.booking_date)}</p><p className="mt-1 text-xs text-slate-400">Answered: {displayDate(patient.answered_on)}</p></td></tr>)}{!filtered.length && <tr><td colSpan={4} className="p-10 text-center text-sm text-slate-400">{loading ? 'Loading patients…' : error ? 'Report could not be loaded.' : 'No answers found for this selection.'}</td></tr>}</tbody></table></div>
    <Pagination currentPage={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={value => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(value)); return next; }, { replace: true })}/>
  </div>;
}
