import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Clock } from 'lucide-react';
import { formatTimeTo12Hour } from '../utils/dateUtils';

type Slot = { slot_id: number; slot_name: string; effective_start_time: string; effective_end_time: string };
type CalledPatient = { appointment_id: number; patient_name: string; current_token_number: number; called_at: string };
type Props = {
  token: string | null;
  branchId: number;
  slots: Slot[];
  activeSlotId: number | null;
  hasOpenSession: boolean;
  blocked?: boolean;
  onApplied: (payload: any) => void;
};

export default function DoctorSessionSlotControl({ token, branchId, slots, activeSlotId, hasOpenSession, blocked, onApplied }: Props) {
  const [selected, setSelected] = useState(activeSlotId || slots[0]?.slot_id || 0);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [calledPatients, setCalledPatients] = useState<CalledPatient[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setSelected(activeSlotId || slots[0]?.slot_id || 0);
    setConfirming(false);
    setMessage('');
    setCalledPatients([]);
    setSaving(false);
    return () => { request.current?.abort(); request.current = null; };
  }, [branchId, activeSlotId, hasOpenSession]);
  useEffect(() => {
    if (!slots.some(slot => slot.slot_id === selected)) {
      setSelected(slots[0]?.slot_id || 0);
      setConfirming(false);
    }
  }, [slots, selected]);
  const active = slots.find(slot => slot.slot_id === activeSlotId);
  const target = slots.find(slot => slot.slot_id === selected);
  const unchanged = hasOpenSession && selected === activeSlotId;
  const apply = async (previewOnly = false) => {
    if (saving || blocked || !target || unchanged) return;
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/doctors/session/select-slot', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId, slot_id: selected, preview_only: previewOnly,
          confirmed_called_patients: previewOnly ? [] : calledPatients.map(({ appointment_id, called_at }) => ({ appointment_id, called_at })) }),
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (result.details?.code === 'CONFIRM_CALLED_SESSION_SWITCH') {
        setCalledPatients(result.details.called_patients || []);
        setConfirming(true);
        setMessage(result.message);
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to change session. Please try again.');
      if (previewOnly) {
        setCalledPatients(result.data?.called_patients || []);
        setConfirming(true);
        return;
      }
      setConfirming(false);
      onApplied(result.data);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Unable to change session.');
    } finally {
      if (request.current === controller) { request.current = null; setSaving(false); }
    }
  };
  return <section className="rounded-xl border border-[#549E9E]/25 bg-white p-4 sm:p-5" aria-label="Consultation session">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-gray-700"><Clock size={17} className="text-[#549E9E]"/>Consultation session</h3>
        <p className="mt-1 text-xs font-bold text-gray-500">{hasOpenSession ? `Current session: ${active?.slot_name || 'Active session'}` : 'No session running'} · Today</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="consultation-session-slot">Choose session</label>
        <select id="consultation-session-slot" value={selected} disabled={saving || blocked} onChange={event => { setSelected(Number(event.target.value)); setConfirming(false); setMessage(''); }} className="max-w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 focus:border-[#549E9E]">
          {slots.map(slot => <option key={slot.slot_id} value={slot.slot_id}>{slot.slot_name} · {formatTimeTo12Hour(slot.effective_start_time)} – {formatTimeTo12Hour(slot.effective_end_time)}</option>)}
        </select>
        <button type="button" disabled={saving || blocked || !target || unchanged} onClick={() => apply(true)} className="flex items-center gap-2 rounded-xl bg-[#549E9E] px-4 py-2.5 text-xs font-black text-white disabled:cursor-default disabled:opacity-50"><ArrowRightLeft size={15}/>{saving ? 'Please wait…' : unchanged ? 'Current session' : hasOpenSession ? 'Switch session' : 'Start selected session'}</button>
      </div>
    </div>
    {confirming && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-gray-700">{hasOpenSession ? `Pause ${active?.slot_name || 'current session'} and start ${target?.slot_name}?` : `Start ${target?.slot_name}?`}</p>
      {calledPatients.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3">
        <p className="text-xs font-black text-amber-800">Called · Consultation not started</p>
        <ul className="mt-1 space-y-1 text-sm font-bold text-gray-700">{calledPatients.map(patient => <li key={patient.appointment_id}>Token {patient.current_token_number} · {patient.patient_name}</li>)}</ul>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">Their call will be cleared. They remain checked in and waiting in their original session. They are not marked Patient left.</p>
      </div>}
      <p className="mt-1 text-xs leading-relaxed text-gray-600">The selected session’s patients will appear. Existing calling rules apply. Bookings, payments and token numbers stay unchanged.</p>
      <div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => apply()} className="rounded-lg bg-[#549E9E] px-4 py-2 text-xs font-black text-white disabled:opacity-50">{saving ? 'Please wait…' : 'Confirm session'}</button><button type="button" disabled={saving} onClick={() => setConfirming(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600">Cancel</button></div>
    </div>}
    {message && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{message}</p>}
  </section>;
}
