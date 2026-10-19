import React from 'react';
import { useTranslation } from 'react-i18next';

// SQL timestamps without an offset are clinic-local; API ISO timestamps keep their offset.
const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00+05:30`
    : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)
      ? `${raw.replace(' ', 'T')}+05:30` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function ClinicHistoryTiming({ appointment, consultation, bill }: {
  appointment?: any; consultation?: any; bill?: any;
}) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  const base = asDate(bill?.created_at || appointment?.appointment_date);
  const consulted = asDate(appointment?.actual_completed_at || consultation?.doctor_finalized_at);
  // This timestamp belongs to the consultation's medical processing, unlike a later repeat bill.
  const dispensed = asDate(bill?.created_at || consultation?.medical_processed_at);
  const day = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const dateLabel = (date: Date) => date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const timeLabel = (date: Date) => [
    !base || day(date) !== day(base) ? dateLabel(date) : '',
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase(),
  ].filter(Boolean).join(', ');
  const hasConsultation = Boolean(consultation || consulted);
  return <div className="flex max-w-[180px] flex-col gap-1 text-left leading-snug">
    <span className="text-sm font-bold text-gray-800">{base ? dateLabel(base) : '—'}</span>
    {!bill && hasConsultation && <span className="text-[11px] text-gray-600">
      {hi ? 'परामर्श' : 'Consulted'}: <strong className="font-semibold text-gray-800">{consulted ? timeLabel(consulted) : (hi ? 'समय उपलब्ध नहीं' : 'Time unavailable')}</strong>
    </span>}
    {(bill || hasConsultation) && <span className="text-[11px] text-gray-600">
      {dispensed ? <>{hi ? 'दवा दी गई' : 'Dispensed'}: <strong className="font-semibold text-[#246e70]">{timeLabel(dispensed)}</strong></>
        : consultation?.dispensing ? (hi ? 'दवा का समय उपलब्ध नहीं' : 'Dispense time unavailable')
          : (hi ? 'दवा अभी नहीं दी गई' : 'Not dispensed yet')}
    </span>}
  </div>;
}
