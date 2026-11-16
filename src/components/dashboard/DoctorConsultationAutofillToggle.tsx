import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function DoctorConsultationAutofillToggle() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setAvailable(false);
    setError('');
    fetch('/api/v1/doctors/consultation-preferences', {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Unable to load auto-fill setting');
      if (controller.signal.aborted) return;
      setEnabled(result.data.autofill_last_visit === true);
      setAvailable(result.data.available === true);
      if (!result.data.available) setError('Auto-fill setup pending');
    }).catch(() => {
      if (!controller.signal.aborted) setError('Unable to load setting');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [token, reload]);
  const toggle = async () => {
    if (busy || !available) return;
    setBusy(true);
    try {
      const response = await fetch('/api/v1/doctors/consultation-preferences', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ autofill_last_visit: !enabled }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save auto-fill setting');
      setEnabled(result.data.autofill_last_visit === true);
      addToast(result.data.autofill_last_visit ? 'Last visit auto-fill is ON' : 'Last visit auto-fill is OFF', 'success');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Unable to save setting', 'error'); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#549E9E]/20 bg-[#549E9E]/5 px-4 py-3">
    <div><p id="consult-autofill-label" className="text-sm font-bold text-gray-800">Auto-fill last visit</p>
      <p id="consult-autofill-help" className="text-xs text-gray-500">Same patient / family member · All branches · Existing drafts stay safe</p>
      {error && <p role="status" className="text-xs text-amber-700 mt-1">{error} <button type="button" onClick={() => setReload(value => value + 1)} className="underline font-bold">Retry</button></p>}
    </div>
    <button type="button" role="switch" aria-checked={enabled} aria-labelledby="consult-autofill-label" aria-describedby="consult-autofill-help" aria-busy={busy}
      disabled={busy || !available} onClick={toggle}
      className="flex min-h-11 items-center gap-3 rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-[#549E9E] disabled:opacity-50 disabled:cursor-wait">
      <span className="text-xs font-bold text-gray-600">{busy ? 'Saving / loading…' : enabled ? 'ON' : 'OFF'}</span>
      <span aria-hidden="true" className={`flex w-11 h-6 items-center rounded-full p-1 transition-colors ${enabled ? 'bg-[#549E9E]' : 'bg-gray-300'}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  </div>;
}
