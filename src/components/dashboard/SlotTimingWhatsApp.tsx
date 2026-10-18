import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, RefreshCcw } from 'lucide-react';

type Props = { appointment: any; token: string | null; branchId: number | null; onStale: () => void };
export default function SlotTimingWhatsApp({ appointment, token, branchId, onStale }: Props) {
  const [draft, setDraft] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const context = useRef({ branchId, appointmentId: appointment.appointment_id });
  context.current = { branchId, appointmentId: appointment.appointment_id };
  useEffect(() => { setDraft(null); setError(''); }, [branchId, appointment.appointment_id]);
  useEffect(() => {
    if (!draft) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setDraft(null);
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', keydown); opener.current?.focus(); };
  }, [Boolean(draft), busy]);

  const loadDraft = async () => {
    const branch = branchId;
    const id = appointment.appointment_id;
    const response = await fetch(`/api/v1/receptionist/appointments/${id}/timing-change?branch_id=${branch}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!mounted.current || context.current.branchId !== branch || context.current.appointmentId !== id) throw new Error('Selected branch or appointment changed. Open the update again.');
    if (!response.ok || !result.success) { onStale(); throw new Error(result.message || 'Timing update is no longer available. Refresh the list.'); }
    return result.data;
  };
  const preview = async () => {
    setBusy(true); setError('');
    try { setDraft(await loadDraft()); } catch (e: any) { setError(e.message || 'Unable to load message. Please try again.'); }
    finally { setBusy(false); }
  };
  const openWhatsApp = async () => {
    // Reserve the window during the click so browser popup protection does not lose the draft.
    const target = window.open('about:blank', '_blank');
    if (target) target.opener = null;
    setBusy(true); setError('');
    try {
      const latest = await loadDraft();
      if (latest.change_id !== draft.change_id || latest.message !== draft.message || latest.phone !== draft.phone) {
        target?.close(); setDraft(latest); setError('Timing or contact changed. Review the updated message before opening WhatsApp.'); return;
      }
      if (!latest.whatsapp_url) throw new Error('A valid contact number is required.');
      if (!target) throw new Error('Browser blocked the WhatsApp window. Allow popups for this clinic page and try again.');
      target.location.href = latest.whatsapp_url;
      setDraft(null);
    } catch (e: any) { target?.close(); setError(e.message || 'Unable to open WhatsApp. Please try again.'); }
    finally { setBusy(false); }
  };
  if (!appointment.timing_change) return null;
  return <>
    <button ref={opener} type="button" onClick={() => void preview()} disabled={busy || !branchId} title="Preview appointment timing update for WhatsApp" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
      {busy ? <RefreshCcw size={14} className="animate-spin" /> : <MessageCircle size={14} />} Timing update
    </button>
    {error && !draft && <span role="alert" className="text-xs text-red-600">{error}</span>}
    {draft && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-3 backdrop-blur-sm" onClick={() => { if (!busy) setDraft(null); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`timing-message-${appointment.appointment_id}`} tabIndex={-1} className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
          <h2 id={`timing-message-${appointment.appointment_id}`} className="text-lg font-bold text-gray-800">Appointment timing update</h2>
          <button type="button" aria-label="Close timing message" disabled={busy} onClick={() => setDraft(null)} className="rounded-full p-2 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="min-h-0 space-y-4 overflow-auto p-4 text-sm" data-lenis-prevent>
          <div className="rounded-xl bg-gray-50 p-3 text-gray-700">
            <p className="font-bold">{draft.patient_name} · Token {draft.token}</p>
            <p>{draft.date} · {draft.branch_name}</p>
            <p className="mt-1 font-bold text-[#246e70]">{draft.old_time ? `${draft.old_time} → ` : ''}{draft.new_time}</p>
            <p className="mt-2">WhatsApp: {draft.phone ? `+${draft.phone}` : 'No valid contact number'}</p>
            {draft.is_family_member_booking && <p className="text-xs text-gray-500">Family booking · Account contact: {draft.contact_name}</p>}
          </div>
          <p className="whitespace-pre-wrap rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 leading-relaxed text-gray-800">{draft.message}</p>
          <p className="text-xs leading-relaxed text-gray-500">WhatsApp will open with this draft. Review and tap Send in WhatsApp. Opening a draft does not confirm that the patient was informed.</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 p-4">
          <button type="button" disabled={busy} onClick={() => setDraft(null)} className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600">Cancel</button>
          <button type="button" disabled={busy || !draft.whatsapp_url} onClick={() => void openWhatsApp()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><MessageCircle size={16} />{busy ? 'Checking…' : 'Open WhatsApp'}</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
