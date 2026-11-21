import { Calendar, Clock, UserCheck, UserX, Stethoscope, CheckCircle2, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReceptionCardFilter, buildReceptionSummary } from '../../utils/receptionDashboardSummary';

const cards = [
  { key: 'ALL', label: 'total', fallback: 'Total Appointments', help: 'Active bookings', icon: Calendar, color: 'text-[#287777]', background: 'bg-[#549E9E]/10' },
  { key: 'APPROVAL_PENDING', label: 'approval_pending', fallback: 'Approval Pending', help: 'Reception approval needed', icon: UserCheck, color: 'text-amber-700', background: 'bg-amber-50' },
  { key: 'NOT_ARRIVED', label: 'not_arrived', fallback: 'Not Arrived', help: 'Approved · Not checked in', icon: UserX, color: 'text-slate-600', background: 'bg-slate-100' },
  { key: 'WAITING', label: 'waiting', fallback: 'Waiting', help: 'Ready / Called', icon: Clock, color: 'text-blue-700', background: 'bg-blue-50' },
  { key: 'IN_CONSULTATION', label: 'in_consultation', fallback: 'In Consultation', help: 'With the doctor', icon: Stethoscope, color: 'text-violet-700', background: 'bg-violet-50' },
  { key: 'COMPLETED', label: 'completed', fallback: 'Completed', help: 'Consultation finished', icon: CheckCircle2, color: 'text-emerald-700', background: 'bg-emerald-50' },
] as const;

export default function ReceptionDashboardCards({ summary, active, onSelect, date, branch, slot, treatment, ready, refreshing, error, onRetry }: {
  summary: ReturnType<typeof buildReceptionSummary>;
  active: ReceptionCardFilter;
  onSelect: (filter: ReceptionCardFilter) => void;
  date: string;
  branch: string | null;
  slot: 'ALL' | 'M' | 'E';
  treatment: string;
  ready: boolean;
  refreshing: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t, i18n } = useTranslation();
  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : t('receptionist.summary.all_dates', 'All dates');
  const selected = cards.find(card => card.key === active)!;
  return <section aria-label={t('receptionist.summary.title', 'Appointment overview')} aria-busy={refreshing} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="text-sm font-bold text-gray-800">{t('receptionist.summary.title', 'Appointment overview')}</h4>
        <p className="text-xs text-gray-500 mt-1">{[formattedDate, branch || t('receptionist.summary.all_branches', 'All branches'),
          t(`receptionist.summary.slot_${slot.toLowerCase()}`, slot === 'M' ? 'Morning' : slot === 'E' ? 'Evening' : 'All slots'),
          treatment === 'ALL' ? null : treatment].filter(Boolean).join(' · ')}</p>
      </div>
      {refreshing && <span role="status" className="inline-flex items-center gap-1.5 text-xs text-[#287777]"><RefreshCcw size={12} className="animate-spin" />{t('receptionist.summary.updating', 'Updating…')}</span>}
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map(card => {
        const Icon = card.icon;
        const label = t(`receptionist.summary.${card.label}`, card.fallback);
        return <button key={card.key} type="button" disabled={!ready} aria-pressed={active === card.key}
          aria-controls="reception-appointment-list" aria-label={`${label}: ${ready ? summary.counts[card.key] : '—'}`}
          onClick={() => onSelect(card.key === active ? 'ALL' : card.key)}
          className={`min-w-0 min-h-32 text-left rounded-xl border p-3 sm:p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#549E9E] disabled:cursor-wait ${active === card.key ? 'border-[#549E9E] bg-[#549E9E]/5' : 'border-gray-200 bg-white hover:border-[#549E9E]/50'}`}>
          <div className="flex items-center justify-between gap-2"><span className={`inline-flex p-2 rounded-lg ${card.background} ${card.color}`}><Icon size={17} aria-hidden="true" /></span>
            <span className={`text-2xl sm:text-3xl font-black tabular-nums ${card.color}`}>{ready ? summary.counts[card.key] : '—'}</span>
          </div>
          <p className="mt-3 text-xs font-bold text-gray-800 leading-snug">{label}</p>
          <p className="mt-1 text-[10px] text-gray-500 leading-snug">{t(`receptionist.summary.help_${card.label}`, card.help)}</p>
        </button>;
      })}
    </div>
    <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3">
      <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Treatment-wise bookings</span>
      {ready && summary.treatmentCounts.length > 0 ? summary.treatmentCounts.map(({ treatment_name, booking_count }) => (
        <span key={treatment_name} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
          {treatment_name}
          <b className="rounded bg-amber-200/70 px-1 text-[9px]">{booking_count}</b>
        </span>
      )) : <span className="text-[10px] font-medium text-gray-400">{ready ? 'No booking found' : 'Loading…'}</span>}
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-[#549E9E]/5 px-3 py-2">
      <span className="text-xs font-semibold text-gray-700">{t('receptionist.summary.completion', 'Completion')}: {ready ? `${summary.completionPercent}%` : '—'}</span>
      <div className="h-1.5 min-w-20 max-w-52 flex-1 rounded-full bg-[#549E9E]/15 overflow-hidden" role="progressbar" aria-label={t('receptionist.summary.completion', 'Completion')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready ? summary.completionPercent : undefined}>
        <div className="h-full rounded-full bg-[#549E9E] transition-[width]" style={{ width: `${ready ? summary.completionPercent : 0}%` }} />
      </div>
      <span className="text-xs text-gray-500">{t('receptionist.summary.search_note', 'Patient / token search filters the list only.')}</span>
      {active !== 'ALL' && <button type="button" onClick={() => onSelect('ALL')} className="text-xs font-bold text-[#287777] underline underline-offset-2">
        {t('receptionist.summary.clear_filter', { defaultValue: 'Clear filter: {{label}}', label: t(`receptionist.summary.${selected.label}`, selected.fallback) })}
      </button>}
    </div>
    {error && <p role="alert" className="text-xs text-amber-800">{ready ? t('receptionist.summary.refresh_failed', 'Could not refresh. Showing last loaded data.') : t('receptionist.summary.load_failed', 'Appointments could not be loaded.')}{' '}
      <button type="button" onClick={onRetry} className="font-bold underline">{t('receptionist.summary.retry', 'Retry')}</button>
    </p>}
  </section>;
}
