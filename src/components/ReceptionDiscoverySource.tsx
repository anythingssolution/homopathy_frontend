import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
const BookingSourcePrompt = React.lazy(() => import('./BookingSourcePrompt'));

export function ReceptionSourceAction({ appointmentId }: { appointmentId: number }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" title="View or change how this patient heard about the clinic" onClick={() => setOpen(true)} className="mb-1 inline-flex rounded-lg border border-[#549e9e]/20 bg-[#549e9e]/5 px-2 py-1 text-[10px] font-bold text-[#287777]">Patient source</button>
    {open && createPortal(<React.Suspense fallback={null}><BookingSourcePrompt appointmentId={appointmentId} token={token} reception editExisting apiUrl={`/api/v1/receptionist/appointments/${appointmentId}/discovery-source`} onDone={() => setOpen(false)} /></React.Suspense>, document.body)}
  </>;
}
export default function ReceptionDiscoveryRecovery() {
  const { token } = useAuth();
  const [pending, setPending] = useState<number | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/v1/receptionist/booking-discovery/pending', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result.success) setPending(Number(result.data?.appointment_id) || null);
    } catch { /* Retry when this dashboard regains focus. */ }
  }, [token]);
  useEffect(() => { void load(); const onFocus = () => { void load(); }; window.addEventListener('focus', onFocus); return () => window.removeEventListener('focus', onFocus); }, [load]);
  return pending ? createPortal(<React.Suspense fallback={null}><BookingSourcePrompt key={pending} appointmentId={pending} token={token} reception apiUrl={`/api/v1/receptionist/booking-discovery/${pending}`} onDone={() => { setPending(null); void load(); }} /></React.Suspense>, document.body) : null;
}
