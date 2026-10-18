import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download, Eye, MapPin, Printer, RefreshCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import Pagination from '../../../Pagination';
import { DateBar } from '../DateBar';
import { useReportWindow } from '../useReportWindow';
import LocationCharts from '../LocationCharts';
import { fetchReportModule, patientRecordsHref, rangeForFilter } from '../lib';
import { cleanLocation, csvCell, groupLocationPatients, LOCATION_FIELDS, type LocationField, type LocationPatient } from '../locationPatients';

const PAGE_SIZE=40;
export default function LocationPatients() {
  const { t }=useTranslation();
  const label=(key:string)=>t(`reports_next.location.${key}`);
  const { token,branchScope }=useAuth();
  const [params,setParams]=useSearchParams();
  const {dateFilter,setDateFilter}=useReportWindow('1_month');
  const customRange={from:params.get('start')||'',to:params.get('end')||''};
  const mode=params.get('mode')==='registered'?'registered':params.get('mode')==='consulted'?'consulted':'all';
  const range=mode==='all'?rangeForFilter('1_month',{from:'',to:''}):rangeForFilter(dateFilter,customRange);
  const field=(LOCATION_FIELDS.includes(params.get('group') as LocationField) ? params.get('group') : 'city') as LocationField;
  const selected=params.get('location') || '';
  const search=params.get('search') || '';
  const branchId=Number(branchScope?.selected_branch_id)||undefined;
  const [data,setData]=useState<{all:LocationPatient[];consulted:LocationPatient[];registered:LocationPatient[]}|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [printing,setPrinting]=useState(false);
  const change=(values:Record<string,string>)=>setParams(prev=>{
    const next=new URLSearchParams(prev); next.delete('page');
    for(const [key,value] of Object.entries(values)) value?next.set(key,value):next.delete(key);
    return next;
  },{replace:true});
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true); setData(null); setError('');
    if(!token || !branchId){setLoading(false);return()=>controller.abort();}
    fetchReportModule(token,'location-patients',range.from,range.to,{branchId,force:true,signal:controller.signal})
      .then(setData).catch(err=>{if(!controller.signal.aborted)setError(err.message || t('reports_next.fetch_failed'));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[token,branchId,range.from,range.to,refresh,t]);
  const patients=data?.[mode] || [];
  const groups=useMemo(()=>groupLocationPatients(patients,field),[patients,field]);
  const group=groups.find(item=>item.key===selected);
  const q=search.trim().toLocaleLowerCase();
  const list=group ? group.patients.filter(row=>[row.patient_full_name,row.patient_uuid,row.patient_mobile_no,row.city,row.area_name].join(' ').toLocaleLowerCase().includes(q)) : [];
  const shownGroups=groups.filter(row=>`${row.name || label('missing')} ${row.city}`.toLocaleLowerCase().includes(q));
  const total=group?list.length:shownGroups.length;
  const page=Math.min(Math.max(1,Number(params.get('page'))||1),Math.max(1,Math.ceil(total/PAGE_SIZE)));
  const groupName=(row:typeof groups[number])=>`${row.name || label('missing')}${row.city ? ` · ${row.city}` : ''}`;
  const headers=group ? [label('reg_no'),label('patient'),label('contact'),...LOCATION_FIELDS.map(label),...(mode==='all'?[]:[label('consultations'),label('last')]),label('inherited')] : [label(field),label('unique')];
  const exportRows=group ? list.map(row=>[row.patient_uuid,row.patient_full_name,row.patient_mobile_no,...LOCATION_FIELDS.map(key=>cleanLocation(row[key])||label('missing')),...(mode==='all'?[]:[row.consultations,row.last_consultation||'—']),row.address_inherited?label('yes'):label('no')]) : shownGroups.map(row=>[groupName(row),row.patients.length]);
  const exportCsv=()=>{
    const csv='\uFEFF'+[headers,...exportRows].map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=mode==='all'?`location-patients-${field}-all.csv`:`location-patients-${field}-${range.from}-${range.to}.csv`;anchor.click();URL.revokeObjectURL(url);
  };
  useEffect(()=>{if(!printing)return;const close=()=>setPrinting(false);window.addEventListener('afterprint',close);let next=0;const frame=requestAnimationFrame(()=>{next=requestAnimationFrame(()=>window.print());});return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(next);window.removeEventListener('afterprint',close);};},[printing]);
  const th='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400';
  const td='px-4 py-3 text-sm font-medium text-slate-600';
  return <div className="space-y-5 no-print">
    <div><h1 className="text-2xl font-black text-slate-900">{label('title')}</h1><p className="mt-1 text-sm font-semibold text-[#549E9E]">{patients.length} {label('unique')} · {label(mode)}</p></div>
    {mode!=='all' && <DateBar dateFilter={dateFilter} onDateFilter={value=>{change({location:'',search:''});setDateFilter(value);}} customDateRange={customRange} onCustomDateRange={value=>{const next=typeof value==='function'?value(customRange):value;change({start:next.from,end:next.to,location:''});}} onRefresh={()=>setRefresh(v=>v+1)} loading={loading}/>} 
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <label className="space-y-1 text-xs font-bold text-slate-500">{label('group_by')}<select value={field} onChange={e=>change({group:e.target.value,location:'',search:''})} className="mt-2 block min-w-48 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#549E9E]">{LOCATION_FIELDS.map(key=><option key={key} value={key}>{label(key)}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-slate-500">{label('count_mode')}<select value={mode} onChange={e=>change({mode:e.target.value,location:'',search:''})} className="mt-2 block min-w-48 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#549E9E]"><option value="all">{label('all')}</option><option value="consulted">{label('consulted')}</option><option value="registered">{label('registered')}</option></select></label>
    </div>
    {mode==='all' && <p className="text-xs font-medium text-slate-500">{label('all_note')}</p>}
    {error&&<p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={16}/>{error}</p>}
    {!selected && !loading && !error && <LocationCharts groups={groups} total={patients.length} fieldLabel={label(field)} onSelect={key=>change({location:key,search:''})}/> }
    <div className="flex flex-wrap items-center gap-3">
      {selected&&<button type="button" onClick={()=>change({location:'',search:''})} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-teal-700"><ArrowLeft size={15}/>{label('back')}</button>}
      <div className="relative flex-1 min-w-48 max-w-md"><Search size={15} className="absolute left-3 top-3 text-gray-400"/><input aria-label={label('search')} placeholder={label(group?'patient_search':'search')} value={search} onChange={e=>change({search:e.target.value})} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#549E9E]"/></div>
      <button type="button" disabled={loading||!total} onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 disabled:opacity-40"><Download size={15}/>{label('export')}</button>
      <button type="button" disabled={loading||!total} onClick={()=>setPrinting(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"><Printer size={15}/>{label('print')}</button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      {group&&<div className="border-b border-teal-100 bg-teal-50 px-4 py-3 text-sm font-black text-teal-800"><MapPin size={15} className="mr-2 inline"/>{groupName(group)} · {list.length} {label('unique')}</div>}
      {loading?<div className="flex justify-center py-16"><RefreshCcw className="animate-spin text-[#549E9E]"/></div>:!total?<p className="py-16 text-center text-sm text-slate-400">{label('empty')}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="bg-slate-50"><tr>{(group?[label('reg_no'),label('patient'),label('address')]:headers).map(name=><th key={name} className={th}>{name}</th>)}<th className={th}>{label('action')}</th></tr></thead><tbody className="divide-y divide-slate-50">
        {group?list.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(row=><tr key={row.subject_key} className="hover:bg-teal-50/40"><td className={td}><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{row.patient_uuid}</span></td><td className={td}><p className="font-black text-slate-800">{row.patient_full_name}</p><p className="mt-1 text-slate-400">{row.patient_mobile_no}</p>{row.family_member_id&&<p className="mt-1 text-[10px] text-violet-600">{label('family')}</p>}</td><td className={td}>{LOCATION_FIELDS.filter(key=>cleanLocation(row[key])).map(key=><p key={key}>{label(key)}: {cleanLocation(row[key])}</p>)}{!LOCATION_FIELDS.some(key=>cleanLocation(row[key])) && <span className="text-slate-400">{label('missing')}</span>}{row.address_inherited&&<p className="mt-1 text-[10px] text-amber-600">{label('inherited_address')}</p>}</td><td className={td}>{mode==='all' && !Number(row.can_open_record) ? <span className="text-xs text-slate-400">{label('no_branch_history')}</span> : <Link to={patientRecordsHref({...row,fk_patient_id:row.patient_id})} className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 font-bold text-teal-700"><Eye size={14}/>{label('open')}</Link>}</td></tr>):shownGroups.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(row=><tr key={row.key} className="hover:bg-teal-50/40"><td className={td}>{groupName(row)}</td><td className={td}>{row.patients.length}</td><td className={td}><button type="button" onClick={()=>change({location:row.key,search:''})} className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 font-bold text-teal-700"><Eye size={14}/>{label('view')}</button></td></tr>)}
      </tbody></table></div>}
      <Pagination currentPage={page} totalPages={Math.max(1,Math.ceil(total/PAGE_SIZE))} onPageChange={value=>setParams(prev=>{const next=new URLSearchParams(prev);next.set('page',String(value));return next;},{replace:true})} totalItems={total} pageSize={PAGE_SIZE} alwaysShow/>
    </div>
    {printing&&createPortal(<div className="print-only"><style>{`@media print{@page{size:A4 landscape;margin:12mm}.location-print{font:11px Arial;color:#17202a}.location-print table{width:100%;border-collapse:collapse}.location-print th,.location-print td{border:1px solid #ddd;padding:6px;text-align:left;overflow-wrap:anywhere}.location-print thead{display:table-header-group}.location-print tr{break-inside:avoid}}`}</style><div className="location-print"><h1>{label('title')}{group?` · ${groupName(group)}`:''}</h1><p>{mode==='all'?label('all'):branchScope?.selected_branch?.branch_name||''} · {mode==='all'?label('all_time'):`${range.from} – ${range.to}`} · {label(mode)} · {total} {label(group?'unique':'locations')}</p><p>{label('address_note')}</p><table><thead><tr>{headers.map(name=><th key={name}>{name}</th>)}</tr></thead><tbody>{exportRows.map((row,index)=><tr key={index}>{row.map((cell,idx)=><td key={idx}>{cell}</td>)}</tr>)}</tbody></table></div></div>,document.body)}
  </div>;
}
