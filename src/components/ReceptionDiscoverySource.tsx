import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
const BookingSourcePrompt = React.lazy(() => import('./BookingSourcePrompt'));
export const RECEPTION_CHECK_IN_SOURCE_EVENT = 'reception:check-in-source';

export function ReceptionSourceAction({ appointmentId }: { appointmentId: number }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" title="View or change how this patient heard about the clinic" onClick={() => setOpen(true)} className="mb-1 inline-flex rounded-lg border border-[#549e9e]/20 bg-[#549e9e]/5 px-2 py-1 text-[10px] font-bold text-[#287777]">Patient source</button>
    {open && createPortal(<React.Suspense fallback={null}><BookingSourcePrompt appointmentId={appointmentId} token={token} reception editExisting apiUrl={`/api/v1/receptionist/appointments/${appointmentId}/discovery-source`} onDone={() => setOpen(false)} /></React.Suspense>, document.body)}
  </>;
}
export default function ReceptionDiscoveryRecovery() {
  const { token, user, branchScope } = useAuth();
  return <CheckInSourceRecovery key={`${user?.id}:${branchScope?.selected_branch_id}`} token={token} branchId={branchScope?.selected_branch_id} />;
}

function CheckInSourceRecovery({ token, branchId }: { token: string | null; branchId: number | null | undefined }) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  const [pending, setPending] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!token || !branchId) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/v1/receptionist/check-in-discovery/pending', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Unable to check patient source');
      if (!controller.signal.aborted) { setPending(Number(result.data?.appointment_id) || null); setFailed(false); }
    } catch { if (request.current === controller) setFailed(true); }
    finally { clearTimeout(timeout); }
  }, [token, branchId]);
  useEffect(() => {
    setPending(null); setFailed(false);
    void load();
    const reload = () => { void load(); };
    window.addEventListener('focus', reload);
    window.addEventListener(RECEPTION_CHECK_IN_SOURCE_EVENT, reload);
    return () => { request.current?.abort(); request.current = null; window.removeEventListener('focus', reload); window.removeEventListener(RECEPTION_CHECK_IN_SOURCE_EVENT, reload); };
  }, [load]);
  return <>
    {failed && !pending && <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800"><span>{hi ? 'मरीज का स्रोत जाँच नहीं पाए। चेक-इन की स्थिति नहीं बदली है।' : 'Unable to check patient source. Check-in status is unchanged.'}</span><button type="button" onClick={() => void load()} className="shrink-0 font-bold underline">{hi ? 'फिर कोशिश करें' : 'Retry'}</button></div>}
    {pending && createPortal(<React.Suspense fallback={null}><BookingSourcePrompt key={`${branchId}:${pending}`} appointmentId={pending} token={token} reception context="check-in" apiUrl={`/api/v1/receptionist/appointments/${pending}/discovery-source`} onDone={() => { setPending(null); void load(); }} /></React.Suspense>, document.body)}
  </>;
}
