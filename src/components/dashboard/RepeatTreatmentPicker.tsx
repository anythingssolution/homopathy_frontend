import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, FileText, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPrintedNumericFormulaDisplay } from '../../utils/prescriptionFormat';

export type RepeatTreatmentOption = {
  consultation_id: number; source_consultation_id: number; source_appointment_id: number;
  appointment_date: string; consulted_at?: string; branch_name: string; treatment_name: string;
  is_linked_parent?: number; medication_duration_days?: number; symptoms?: string; diagnosis?: string;
  treatment_advice?: string; universal_remark?: string;
  quick_formula_input?: string;
  medications: { medicine_type?: string; medicine_value: string; remark?: string; doses?: { dose_label: string; balls_per_dose: number }[] }[];
};

export default function RepeatTreatmentPicker({ appointmentId, token, onClose, onSelect }: {
  appointmentId: number; token: string | null; onClose: () => void; onSelect: (sourceId: number) => void;
}) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  const [options, setOptions] = useState<RepeatTreatmentOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLoading(true); setError(''); setOptions([]); setSelectedId(null);
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetch(`/api/v1/doctors/consultations/${appointmentId}/repeat-options`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load previous prescriptions.');
      if (controller.signal.aborted) return;
      const items = Array.isArray(result.data) ? result.data : [];
      setOptions(items); setSelectedId(items[0]?.source_consultation_id || null);
    }).catch(err => {
      if (!disposed) setError(err.name === 'AbortError' ? 'Request timed out. Please retry.' : err.message);
    }).finally(() => { clearTimeout(timeout); if (!disposed) setLoading(false); });
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [appointmentId, token, retry]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]') || []);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  const selected = options.find(option => Number(option.source_consultation_id) === Number(selectedId));
  const numericMedicines = selected?.medications.filter(medicine => medicine.medicine_type?.toUpperCase() === 'NUMERIC') || [];
  const otherMedicines = selected?.medications.filter(medicine => medicine.medicine_type?.toUpperCase() !== 'NUMERIC') || [];
  const numericPreview = getPrintedNumericFormulaDisplay({ numericMeds: numericMedicines,
    quickFormulaText: selected?.quick_formula_input, durationDays: selected?.medication_duration_days, isHi: hi });
  const parseDate = (value: string) => {
    const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30`
      : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}+05:30` : value;
    return new Date(raw);
  };
  const formatDate = (value: string) => {
    const date = parseDate(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  };
  const formatTime = (value: string) => {
    const date = parseDate(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  };
  return createPortal(<div className="fixed inset-0 z-[10040] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="repeat-picker-title" tabIndex={-1}
      className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#549e9e]/20 bg-white shadow-2xl outline-none">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-[#549e9e]/5 px-5 py-4">
        <div><h2 id="repeat-picker-title" className="flex items-center gap-2 text-lg font-black text-[#246e70]"><RotateCcw size={19} />{hi ? 'पिछला उपचार चुनें' : 'Repeat Previous Treatment'}</h2>
          <p className="mt-1 text-sm text-slate-500">{hi ? 'आखिरी 3 प्रिस्क्रिप्शन में से एक चुनें। पहले देखकर फिर फॉर्म में भरें।' : 'Choose one of the last 3 prescriptions. Preview it before filling the form.'}</p></div>
        <button type="button" onClick={onClose} aria-label="Close previous prescriptions" className="rounded-xl p-2 text-slate-500 hover:bg-white focus:ring-2 focus:ring-[#549e9e]"><X size={20} /></button>
      </header>
      <div className="min-h-0 overflow-y-auto p-5" data-lenis-prevent>
        {loading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-[#246e70]"><LoaderCircle size={20} className="animate-spin" />Loading previous prescriptions…</div>
          : error ? <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 font-bold underline">Retry</button></div>
          : !options.length ? <div className="py-10 text-center text-slate-500"><FileText size={32} className="mx-auto mb-3 text-slate-300" />{hi ? 'इस मरीज का पिछला प्रिस्क्रिप्शन उपलब्ध नहीं है।' : 'No previous consultation prescription is available for this patient.'}</div>
          : <>
            <div role="radiogroup" aria-label="Previous prescriptions" className="grid gap-3 md:grid-cols-3">
              {options.map((option, index) => <label key={option.source_consultation_id} className={`cursor-pointer rounded-2xl border-2 p-4 transition-colors ${Number(selectedId) === Number(option.source_consultation_id) ? 'border-[#549e9e] bg-[#549e9e]/5' : 'border-slate-100 hover:border-[#549e9e]/40'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wide text-[#246e70]">{index === 0 ? 'Latest prescription' : `Previous ${index}`}</span><input type="radio" name="repeat-prescription" checked={Number(selectedId) === Number(option.source_consultation_id)} onChange={() => setSelectedId(Number(option.source_consultation_id))} aria-label={`Select prescription ${formatDate(option.appointment_date)}`} className="accent-[#549e9e]" /></div>
                <p className="mt-2 text-base font-bold text-slate-800">{formatDate(option.appointment_date)}</p>
                {option.consulted_at && <p className="mt-1 text-xs text-slate-500">{formatTime(option.consulted_at)}</p>}
                <p className="mt-1 text-xs text-slate-500">{option.branch_name}</p><p className="mt-1 text-xs text-slate-600">{option.treatment_name}</p>
                <p className="mt-2 text-xs font-semibold text-[#246e70]">{option.medications.length} medicines{option.medication_duration_days ? ` · ${option.medication_duration_days} days` : ''}</p>
                {Boolean(option.is_linked_parent) && <span className="mt-2 inline-block rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Linked Previous Visit</span>}
              </label>)}
            </div>
            {selected && <section className="mt-4 rounded-2xl border border-slate-100 p-4" aria-label="Selected prescription preview">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700"><FileText size={16} />Selected treatment preview</h3>
              {selected.consulted_at && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock size={12} />{formatDate(selected.consulted_at)}</p>}
              {numericMedicines.length > 0 && <div className="mt-3 rounded-xl border border-[#549e9e]/15 bg-[#549e9e]/5 px-3 py-3 text-sm">
                <p className="text-xs font-bold text-[#246e70]">{hi ? 'न्यूमेरिक दवाइयाँ' : 'Numeric medicines'}</p>
                <p className="mt-1 break-words font-bold text-slate-800">{numericPreview.formulaLabel}</p>
                {numericPreview.doseLines.map(line => <p key={line} className="mt-1 text-xs text-slate-600">{line}</p>)}
                {numericMedicines.map((medicine, index) => medicine.remark && <p key={index} className="mt-1 whitespace-pre-wrap text-xs text-slate-600"><strong>{medicine.medicine_value}: </strong>{medicine.remark}</p>)}
              </div>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{otherMedicines.map((medicine, index) => <div key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <p className="font-bold text-slate-800">{medicine.medicine_value}</p>
                {!!medicine.doses?.length && <p className="mt-1 text-xs text-slate-600">{medicine.doses.map(dose => `${dose.dose_label}: ${dose.balls_per_dose}`).join(' · ')}</p>}
                {medicine.remark && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{medicine.remark}</p>}
              </div>)}</div>
              {selected.symptoms && <p className="mt-3 text-sm text-slate-600"><strong>Complaint: </strong>{selected.symptoms}</p>}
              {selected.diagnosis && <p className="mt-2 text-sm text-slate-600"><strong>Diagnosis: </strong>{selected.diagnosis}</p>}
              {selected.treatment_advice && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600"><strong>Clinical findings: </strong>{selected.treatment_advice}</p>}
              {selected.universal_remark && <p className="mt-2 text-sm text-slate-600"><strong>Remark: </strong>{selected.universal_remark}</p>}
            </section>}
          </>}
      </div>
      <footer className="shrink-0 border-t border-slate-100 px-5 py-4">
        <p className="mb-3 text-xs text-slate-500">{hi ? 'टेस्ट, वाइटल्स और हिस्ट्री नहीं बदलेंगे। कॉपी करने के बाद जाँच कर सेव करें।' : 'Tests, vitals and history stay unchanged. Review the copied treatment before saving.'}</p>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
          <button type="button" disabled={loading || !selected || Boolean(error)} onClick={() => selected && onSelect(Number(selected.source_consultation_id))} className="rounded-xl bg-[#549e9e] px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{hi ? 'यह उपचार फॉर्म में भरें' : 'Use This Treatment'}</button></div>
      </footer>
    </div>
  </div>, document.body);
}
