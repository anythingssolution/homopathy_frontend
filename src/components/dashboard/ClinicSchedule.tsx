import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Loader2, RefreshCw, Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import DoctorLeaveCalendar from './DoctorLeaveCalendar';

type Slot = { slot_id: number; branch_id: number; branch_name: string; slot_name: string; start_time: string; end_time: string; weekly_timings?: { day_of_week: number; start_time: string; end_time: string; has_weekly_override: boolean }[]; weekdays: { day_of_week: number; booking_enabled: boolean }[] };
type Schedule = { slots: Slot[]; revision: string };
const formatSlotTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const days = [
  [2, 'Monday', 'सोमवार'], [3, 'Tuesday', 'मंगलवार'], [4, 'Wednesday', 'बुधवार'],
  [5, 'Thursday', 'गुरुवार'], [6, 'Friday', 'शुक्रवार'], [7, 'Saturday', 'शनिवार'], [1, 'Sunday', 'रविवार'],
] as const;
export default function ClinicSchedule() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const text = (en: string, hi: string) => i18n.language.startsWith('hi') ? hi : en;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'leave' ? 'leave' : 'weekly';
  const [saved, setSaved] = useState<Schedule | null>(null);
  const [draft, setDraft] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const dirty = Boolean(saved && JSON.stringify(saved.slots) !== JSON.stringify(draft));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setSaved(null); setDraft([]); setError(''); setMessage('');
    if (!token) { setLoading(false); return; }
    fetch('/api/v1/doctors/booking-weekdays', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load schedule.'); return result.data as Schedule; })
      .then(data => { if (!controller.signal.aborted) { setSaved(data); setDraft(data.slots); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const branches = useMemo(() => {
    const groups = new Map<number, { name: string; slots: Slot[] }>();
    draft.forEach(slot => { if (!groups.has(Number(slot.branch_id))) groups.set(Number(slot.branch_id), { name: slot.branch_name, slots: [] }); groups.get(Number(slot.branch_id))!.slots.push(slot); });
    return [...groups.values()];
  }, [draft]);
  const toggle = (slotId: number, day: number, enabled: boolean) => {
    setMessage('');
    setDraft(current => current.map(slot => slot.slot_id !== slotId ? slot : { ...slot,
      weekdays: slot.weekdays.map(item => item.day_of_week === day ? { ...item, booking_enabled: enabled } : item) }));
  };
  const save = async () => {
    if (!saved || !token || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/v1/doctors/booking-weekdays', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: saved.revision, changes: draft.flatMap(slot => slot.weekdays.map(day => ({ slot_id: Number(slot.slot_id), ...day }))) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save schedule.');
      setSaved(result.data); setDraft(result.data.slots);
      setMessage(text('Booking schedule saved. Existing appointments remain unchanged.', 'बुकिंग शेड्यूल सेव हो गया। पहले से बुक अपॉइंटमेंट नहीं बदले हैं।'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save schedule.'); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-5">
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-[#549E9E]/10 p-3 text-[#549E9E]"><CalendarDays size={22} /></div><div>
        <h1 className="text-xl font-bold text-slate-800">{text('Clinic Schedule', 'क्लिनिक शेड्यूल')}</h1>
        <p className="mt-1 text-sm text-slate-500">{text('Manage weekly bookings and date-wise leave.', 'साप्ताहिक बुकिंग और तारीख के अनुसार छुट्टी तय करें।')}</p>
      </div></div>
      <div role="tablist" aria-label={text('Clinic Schedule', 'क्लिनिक शेड्यूल')} className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
        {(['weekly', 'leave'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} disabled={saving} onClick={() => { setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', value); return next; }, { replace: true }); }}
          className={`rounded-xl px-5 py-3 text-sm font-bold ${tab === value ? 'bg-[#549E9E] text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{value === 'weekly' ? text('Weekly Booking', 'साप्ताहिक बुकिंग') : text('Leave Calendar', 'छुट्टी कैलेंडर')}</button>)}
      </div>
    </div>
    {tab === 'leave' ? <DoctorLeaveCalendar /> : <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div><h2 className="font-bold text-slate-800">{text('Choose booking days for each session', 'हर सेशन के लिए बुकिंग के दिन चुनें')}</h2>
          <p className="mt-1 text-sm text-slate-500">{text('Checked = bookings allowed. Unchecked = no new bookings. Changes apply after saving.', 'टिक = बुकिंग चालू। बिना टिक = नई बुकिंग बंद। सेव करने के बाद बदलाव लागू होंगे।')}</p></div>
        <button type="button" disabled={loading || saving} onClick={() => { if (!dirty || window.confirm(text('Discard unsaved changes and reload?', 'बिना सेव किए बदलाव हटाकर दोबारा लोड करें?'))) setReload(value => value + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-50"><RefreshCw size={15} />{text('Reload', 'दोबारा लोड')}</button>
      </div>
      {error && <p role="alert" className="m-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="m-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700"><Check size={18} />{message}</p>}
      {loading ? <p className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />{text('Loading schedule…', 'शेड्यूल लोड हो रहा है…')}</p> : saved && draft.length ? <>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead><tr className="bg-slate-50"><th rowSpan={2} scope="col" className="sticky left-0 z-10 min-w-[125px] border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-700">{text('Day', 'दिन')}</th>
              {branches.map(branch => <th key={branch.name} scope="colgroup" colSpan={branch.slots.length} className="border-b border-r border-slate-200 px-4 py-4 text-center font-bold text-[#337d7f]">{branch.name}</th>)}</tr>
              <tr className="bg-slate-50">{branches.flatMap(branch => branch.slots).map(slot => <th key={slot.slot_id} scope="col" className="min-w-[155px] border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-600">{slot.slot_name}<span className="mt-1 block whitespace-nowrap text-xs font-semibold text-[#337d7f]">{formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)}</span></th>)}</tr>
            </thead>
            <tbody>{days.map(([day, en, hi]) => <tr key={day} className="group border-b border-slate-100 last:border-0 hover:bg-[#549E9E]/5">
              <th scope="row" className="sticky left-0 border-r border-slate-100 bg-white px-5 py-3 text-left font-semibold text-slate-700">{text(en, hi)}</th>
              {branches.flatMap(branch => branch.slots).map(slot => {
                const timing = slot.weekly_timings?.find(item => item.day_of_week === day && item.has_weekly_override);
                return <td key={slot.slot_id} className="border-r border-slate-100 text-center last:border-r-0">
                <label className="flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-3"><input type="checkbox" disabled={saving} checked={slot.weekdays.find(item => item.day_of_week === day)?.booking_enabled ?? true}
                  onChange={event => toggle(slot.slot_id, day, event.target.checked)} aria-label={`${text(en, hi)} · ${slot.branch_name} · ${slot.slot_name}`}
                  className="h-6 w-6 cursor-pointer rounded accent-[#549E9E] disabled:opacity-50" />{timing && <span className="whitespace-nowrap text-xs font-semibold text-[#337d7f]">{formatSlotTime(timing.start_time)} – {formatSlotTime(timing.end_time)}</span>}</label>
              </td>; })}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 p-5">
          <div className="max-w-xl text-sm leading-relaxed text-slate-500"><p className="mb-1">{text('Times show the default / weekly schedule. Date-specific timing changes and leave still apply.', 'समय सामान्य / साप्ताहिक शेड्यूल का है। तारीख के अनुसार समय बदलाव और छुट्टी लागू रहेंगे।')}</p><p>{text('Existing appointments, session timings, leave and token rules remain unchanged.', 'पहले से बुक अपॉइंटमेंट, सेशन का समय, छुट्टी और टोकन के नियम नहीं बदलेंगे।')}</p>{dirty && <p className="mt-1 font-semibold text-amber-700">{text('You have unsaved changes.', 'बदलाव अभी सेव नहीं हुए हैं।')}</p>}</div>
          <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="inline-flex items-center gap-2 rounded-xl bg-[#549E9E] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#458b8b] disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{saving ? text('Saving…', 'सेव हो रहा है…') : text('Save Changes', 'बदलाव सेव करें')}</button>
        </div>
      </> : saved && <p className="p-10 text-center text-sm text-slate-500">{text('No active sessions are available for your assigned branches.', 'आपकी शाखाओं के लिए कोई सक्रिय सेशन उपलब्ध नहीं है।')}</p>}
    </section>}
  </div>;
}
