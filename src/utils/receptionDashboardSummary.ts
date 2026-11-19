export type ReceptionStage = 'APPROVAL_PENDING' | 'NOT_ARRIVED' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
export type ReceptionCardFilter = 'ALL' | ReceptionStage;
export type ReceptionAppointment = {
  appointment_id?: number | string;
  fk_branch_id?: number | string;
  notice_date?: string;
  appointment_date?: string;
  status?: string;
  is_active?: number | string;
  reception_status?: string;
  queue_status?: string;
  queue_bucket?: string;
  checked_in_at?: string | null;
  display_token_display?: string;
  slot_name?: string;
  treatment_name?: string;
};
const upper = (value: unknown) => String(value || '').trim().toUpperCase();

// Runtime buckets reflect session pause/resume and call state; raw queue status alone does not.
export function getReceptionStage(appointment: ReceptionAppointment): ReceptionStage | null {
  const status = upper(appointment.status);
  const queue = upper(appointment.queue_status);
  const reception = upper(appointment.reception_status);
  if (Number(appointment.is_active ?? 1) !== 1 || status === 'CANCELLED' || queue === 'CANCELLED' || reception === 'REJECTED_BY_RECEPTION') return null;
  if (status === 'COMPLETED' || queue === 'COMPLETED') return 'COMPLETED';
  const bucket = upper(appointment.queue_bucket);
  if (bucket === 'IN_PROGRESS' || (!bucket && queue === 'IN_PROGRESS')) return 'IN_CONSULTATION';
  if (reception !== 'APPROVED_BY_RECEPTION') return 'APPROVAL_PENDING';
  if (['NO_SHOW', 'SKIPPED'].includes(queue)) return 'NOT_ARRIVED';
  if (bucket === 'READY' || bucket === 'CALLED') return 'WAITING';
  if (bucket === 'NOT_ARRIVED') return 'NOT_ARRIVED';
  // Legacy responses without a runtime bucket still distinguish arrival from WAITING-after-left.
  return appointment.checked_in_at && ['BOOKED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'].includes(queue)
    ? 'WAITING' : 'NOT_ARRIVED';
}

export function getReceptionSlot(appointment: ReceptionAppointment): 'M' | 'E' | '' {
  const token = upper(appointment.display_token_display);
  const name = upper(appointment.slot_name);
  if (token.startsWith('M-')) return 'M';
  if (token.startsWith('E-')) return 'E';
  if (name.includes('MORNING')) return 'M';
  if (name.includes('EVENING')) return 'E';
  return '';
}

// Run before search, card selection and pagination so counts remain a stable daily overview.
export function scopeReceptionAppointments<T extends ReceptionAppointment>(rows: T[], scope: {
  branchId: number | null; date: string; slot: 'ALL' | 'M' | 'E'; treatment: string;
}): T[] {
  const seen = new Set<number>();
  return rows.filter(row => {
    const id = Number(row.appointment_id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id) || !getReceptionStage(row)) return false;
    if (scope.branchId && Number(row.fk_branch_id) !== scope.branchId) return false;
    if (scope.date && String(row.notice_date || row.appointment_date || '').slice(0, 10) !== scope.date) return false;
    if (scope.slot !== 'ALL' && getReceptionSlot(row) !== scope.slot) return false;
    if (scope.treatment !== 'ALL' && String(row.treatment_name || '') !== scope.treatment) return false;
    seen.add(id);
    return true;
  });
}

export function buildReceptionSummary(rows: ReceptionAppointment[]) {
  const counts: Record<ReceptionCardFilter, number> = {
    ALL: 0, APPROVAL_PENDING: 0, NOT_ARRIVED: 0, WAITING: 0, IN_CONSULTATION: 0, COMPLETED: 0,
  };
  const seen = new Set<number>();
  for (const row of rows) {
    const id = Number(row.appointment_id);
    const stage = getReceptionStage(row);
    if (!stage || !Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    counts.ALL += 1;
    counts[stage] += 1;
  }
  return { counts, completionPercent: counts.ALL ? Math.round(counts.COMPLETED / counts.ALL * 1000) / 10 : 0 };
}
