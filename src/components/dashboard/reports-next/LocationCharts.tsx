import React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { groupLocationPatients } from './locationPatients';

type Group = ReturnType<typeof groupLocationPatients>[number];
export default function LocationCharts({groups,total,fieldLabel,onSelect}:{groups:Group[];total:number;fieldLabel:string;onSelect:(key:string)=>void}) {
  const {t}=useTranslation();
  const label=(key:string)=>t(`reports_next.location.${key}`);
  const known=groups.filter(group=>group.name);
  const missing=groups.find(group=>!group.name);
  const top=known.slice(0,8).map(group=>({key:group.key,name:`${group.name}${group.city?` · ${group.city}`:''}`,patients:group.patients.length}));
  return <div className="min-w-0">
    <section className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-slate-800">{label('top_locations')}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{fieldLabel} · {total} {label('unique')}</p></div><span className="rounded-lg bg-teal-50 p-2 text-[#549E9E]"><MapPin size={18}/></span></div>
      {top.length ? <>
        <div className="mt-5" style={{height:Math.max(190,top.length*44)}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{top:0,right:35,left:0,bottom:0}} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf2f2"/>
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}}/>
              <YAxis type="category" dataKey="name" width={130} axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#475569'}} tickFormatter={value=>String(value).length>19?`${String(value).slice(0,18)}…`:String(value)}/>
              <Tooltip cursor={{fill:'#f0fdfa'}} formatter={value=>[value,label('unique')]} contentStyle={{border:'1px solid #e2e8f0',borderRadius:12,fontSize:12}}/>
              <Bar dataKey="patients" fill="#549E9E" radius={[0,6,6,0]} maxBarSize={24} onClick={data=>{const key=data.payload?.key ?? data.key;if(typeof key==='string')onSelect(key);}} style={{cursor:'pointer'}}>
                <LabelList dataKey="patients" position="right" style={{fontSize:12,fontWeight:700,fill:'#334155'}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {known.length>8&&<p className="mt-3 text-xs text-slate-400">{label('top_eight_note')}</p>}
      </>:<div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center"><MapPin size={24} className="mb-3 text-slate-300"/><p className="text-sm font-bold text-slate-600">{label('no_address')}</p></div>}
    </section>
    {missing && <button type="button" onClick={()=>onSelect(missing.key)} className="mt-2 flex items-center gap-2 px-1 text-xs font-semibold text-amber-700 hover:underline">{label('missing')}: {missing.patients.length} · {label('view')}</button>}
  </div>;
}
