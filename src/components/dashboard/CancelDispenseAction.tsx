import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, X, Truck, PackageCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
export default function CancelDispenseAction({ prescription, token, onCancelled }: { prescription: any; token: string | null; onCancelled: () => unknown }) {
  const { addToast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  if (prescription.workflow_status !== 'READY_FOR_MEDICAL') return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode || !reason.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/medical/prescriptions/${prescription.consultation_id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ delivery_mode: mode, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to cancel dispensing');
      setOpen(false); addToast('Dispensing cancelled', 'success'); await onCancelled();
    } catch (error: any) { addToast(error.message || 'Unable to cancel dispensing', 'error'); }
    finally { setSaving(false); }
  };
  return <>
    <button type="button" onClick={() => { setReason(''); setMode(prescription.pricing?.delivery_mode || prescription.medication_bill?.delivery_mode || ''); setOpen(true); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100"><XCircle size={14} />Cancel Dispense</button>
    {open && createPortal(<dialog ref={dialog} onCancel={event => { if (saving) event.preventDefault(); else setOpen(false); }} aria-labelledby={`cancel-dispense-${prescription.consultation_id}`} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-0 text-gray-800 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm">
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="-mx-5 -mt-5 flex items-start justify-between gap-3 border-b border-[#549E9E]/15 bg-[#549E9E]/[0.08] p-5"><div><h3 id={`cancel-dispense-${prescription.consultation_id}`} className="text-base font-black text-[#287777]">Cancel Dispense</h3><p className="mt-1 text-sm text-gray-600">{prescription.patient?.full_name}</p><p className="mt-1 text-xs text-gray-500">The original prescription will remain in the patient’s history.</p></div><button type="button" disabled={saving} aria-label="Close cancellation" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-700"><X size={18} /></button></div>
        <fieldset disabled={saving}><legend className="mb-2 text-sm font-bold">Delivery mode <span className="text-red-500">*</span></legend><div className="grid grid-cols-2 gap-2">{[['HAND_DELIVERY','Hand Delivery'],['COURIER','Courier']].map(([value,label]) => <label key={value} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${mode === value ? 'border-[#549E9E] bg-[#549E9E]/10' : 'border-gray-200'}`}>{value === 'COURIER' ? <Truck size={16} className="shrink-0 text-[#549E9E]" /> : <PackageCheck size={16} className="shrink-0 text-[#549E9E]" />}<input required type="radio" name="cancel-delivery-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />{label}</label>)}</div></fieldset>
        <label className="block text-sm font-bold">Cancellation reason <span className="text-red-500">*</span><textarea autoFocus required maxLength={1000} disabled={saving} rows={2} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#549E9E]" placeholder="Why is this medicine not being dispensed?" /></label>
        <div className="-mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold">Keep Pending</button><button type="submit" disabled={saving || !mode || !reason.trim()} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Cancelling…' : 'Confirm Cancellation'}</button></div>
      </form>
    </dialog>, document.body)}
  </>;
}
