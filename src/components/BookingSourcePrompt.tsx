import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DiscoverySourceIcon from './DiscoverySourceIcon';

const SOURCES = [
  ['FACEBOOK', 'Facebook'], ['INSTAGRAM', 'Instagram'], ['GOOGLE', 'Google / Google Maps'],
  ['YOUTUBE', 'YouTube'], ['FAMILY_FRIEND', 'Family / Friend'], ['DOCTOR', 'Kisi aur doctor se'], ['OTHER', 'Other'],
] as const;

export default function BookingSourcePrompt({ appointmentId, token, onDone, reception = false, editExisting = false, apiUrl }: {
  appointmentId: number; token: string | null; onDone: () => void;
  reception?: boolean; editExisting?: boolean; apiUrl?: string;
}) {
  const { i18n } = useTranslation();
  const mandatory = reception && !editExisting;
  const endpoint = apiUrl || `/api/v1/appointments/${appointmentId}/discovery-source`;
  const [retry, setRetry] = useState(0);
  const sourceOptions: ReadonlyArray<readonly [string, string]> = reception ? [...SOURCES, ['NOT_KNOWN', 'Patient does not know']] : SOURCES;
  const hi = i18n.language.startsWith('hi');
  const [source, setSource] = useState('');
  const [other, setOther] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const done = useRef(onDone); done.current = onDone;
  const dialog = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 10000);
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(); if (active && result.data) { if (editExisting) { setSource(result.data.source_code); setOther(result.data.other_detail || ''); } else done.current(); } })
      .catch(() => { if (active && reception) setError(hi ? 'जवाब जाँच नहीं पाया। फिर कोशिश करें।' : 'Unable to check the saved answer. Please retry.'); })
      .finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); request.current?.abort(); request.current = null; };
  }, [appointmentId, token, endpoint, editExisting, retry]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!mandatory) done.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)') || []);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [mandatory]);
  const save = async () => {
    if (!source || saving) return;
    const controller = new AbortController(); request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    setSaving(true); setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: source, other_detail: source === 'OTHER' ? other.trim() : null, ...(reception && editExisting ? { replace_existing: true } : {}) }), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save answer.');
      if (!controller.signal.aborted) done.current();
    } catch (err) { if (request.current === controller) setError(controller.signal.aborted ? 'Unable to save answer. You can retry or skip.' : err instanceof Error ? err.message : 'Unable to save answer.'); }
    finally { clearTimeout(timer); if (request.current === controller) { request.current = null; setSaving(false); } }
  };
  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="booking-source-title" tabIndex={-1} data-lenis-prevent
      className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[32px] border border-white/80 bg-white shadow-2xl outline-none">
      {!mandatory && <button type="button" aria-label="Skip and view appointments" onClick={onDone} className="absolute right-3 top-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-[#549e9e]"><X size={18}/></button>}
      <div className="flex items-center gap-3 border-b border-[#549e9e]/10 bg-[#549e9e]/[0.07] px-5 py-5 pr-12 sm:px-7 sm:pr-12">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#468686] shadow-sm"><CheckCircle2 size={25}/></span>
        <div><h2 id="booking-source-title" className="text-lg font-black text-[#246e70]">{editExisting ? (hi ? 'मरीज को क्लिनिक की जानकारी कहाँ से मिली?' : 'Patient source') : (hi ? 'आपकी बुकिंग हो गई है!' : 'Appointment confirmed!')}</h2><p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{editExisting ? (hi ? 'पहले से दर्ज जवाब देखें या बदलें।' : 'Review the saved answer or update it if needed.') : (hi ? 'आपकी अपॉइंटमेंट सफलतापूर्वक बुक हो गई है।' : 'Your appointment has been booked successfully.')}</p></div>
      </div>
      <div className="px-5 py-5 sm:px-7">
      <span className="mb-2 inline-block rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{mandatory ? (hi ? 'आवश्यक' : 'Required') : (hi ? 'वैकल्पिक' : 'Optional')}</span>
      <h3 className="text-base font-bold leading-relaxed text-slate-800">{hi ? 'आपको हमारे क्लिनिक के बारे में कहाँ से पता चला?' : 'How did you hear about our clinic?'}</h3>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-slate-500">{mandatory ? (hi ? 'एक विकल्प चुनें। मरीज को जानकारी न हो तो वह विकल्प चुन सकते हैं।' : 'Choose one option. Select “Patient does not know” if needed.') : (hi ? 'एक विकल्प चुनें। जवाब नहीं देना चाहें तो Skip करें।' : 'Choose one option. You can also skip this question.')}</p>
      {loading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/>{hi ? 'एक क्षण…' : 'Just a moment…'}</p> : <div role="radiogroup" aria-label="How did you hear about our clinic?" className="grid grid-cols-2 gap-2.5">
        {sourceOptions.map(([code, label]) => <label key={code} className={`relative flex min-h-[60px] cursor-pointer items-center gap-2 rounded-2xl border p-2.5 transition-colors sm:gap-2.5 sm:p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#549e9e] ${code === 'OTHER' ? 'col-span-2' : ''} ${source === code ? 'border-[#549e9e] bg-[#549e9e]/[0.08] text-[#246e70] shadow-sm' : 'border-slate-200/80 bg-white text-slate-600 hover:border-[#549e9e]/60 hover:bg-slate-50/70'} ${saving ? 'cursor-wait opacity-70' : ''}`}>
          <input type="radio" name="discovery-source" value={code} checked={source === code} disabled={saving} onChange={() => { setSource(code); setError(''); }} className="sr-only peer"/>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl sm:h-8 sm:w-8 ${source === code ? 'bg-[#549e9e] text-white' : 'bg-[#549e9e]/[0.08] text-[#468686]'}`}><DiscoverySourceIcon code={code}/></span>
          <span className="min-w-0 flex-1 text-[13px] font-bold leading-snug">{code === 'NOT_KNOWN' ? (hi ? 'मरीज को पता नहीं' : label) : code === 'DOCTOR' ? (hi ? 'किसी और डॉक्टर से' : 'Another Doctor') : label}</span>
          <span aria-hidden="true" className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border sm:h-4 sm:w-4 ${source === code ? 'border-[#549e9e] bg-[#549e9e] text-white' : 'border-slate-300 bg-white'}`}>{source === code && <Check size={11} strokeWidth={3}/>}</span>
        </label>)}
      </div>}
      {source === 'OTHER' && <label className="mt-4 block text-xs font-semibold text-slate-500">{hi ? 'कहाँ से पता चला?' : 'Please tell us where'}<textarea aria-label="Other source" maxLength={255} rows={2} value={other} disabled={saving} onChange={e => setOther(e.target.value)} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-[#549e9e]"/></label>}
      {error && <div className="mt-3 text-sm text-red-600"><p role="alert">{error}</p>{reception && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-1 font-bold underline">{hi ? 'फिर कोशिश करें' : 'Retry'}</button>}</div>}
      </div>
      {mandatory && <p className="px-5 pb-3 text-xs font-semibold text-[#246e70]">{hi ? 'रिसेप्शन बुकिंग के लिए जवाब आवश्यक है।' : 'An answer is required for this reception booking.'}</p>}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">{!mandatory && <button type="button" onClick={onDone} className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#549e9e]">{editExisting ? (hi ? 'बंद करें' : 'Close') : (hi ? 'अभी छोड़ें' : 'Skip for now')}</button>}<button type="button" disabled={loading || saving || (mandatory && Boolean(error)) || !source || (source === 'OTHER' && !other.trim())} onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#549e9e] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#468686] focus-visible:ring-2 focus-visible:ring-[#246e70] disabled:cursor-not-allowed disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin"/> : null}{saving ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'जवाब सेव करें' : 'Save Answer')}{!saving && <ChevronRight size={16} className="shrink-0"/>}</button></div>
    </div>
  </div>;
}
