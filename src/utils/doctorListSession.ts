import { getLocalDateString } from './date';

// List selection never grants permission to consult in another session.
export function canConsultFromSessionList(
  listScope: string,
  appointment: { fk_slot_id: number; fk_branch_id: number; appointment_date: string },
  active: { slotId: number | null; branchId: number | null; hasOpenSession: boolean; today: string },
): boolean {
  if (listScope === 'current') return true;
  const rawDate = String(appointment.appointment_date);
  const parsedDate = new Date(rawDate);
  const appointmentDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : Number.isNaN(parsedDate.getTime()) ? '' : getLocalDateString(parsedDate);
  return active.hasOpenSession
    && Boolean(active.slotId && active.branchId)
    && Number(appointment.fk_slot_id) === active.slotId
    && Number(appointment.fk_branch_id) === active.branchId
    && appointmentDate === active.today;
}
