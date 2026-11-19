import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceptionSummary, getReceptionStage, scopeReceptionAppointments, type ReceptionAppointment } from './receptionDashboardSummary.ts';

const row = (id: number, overrides: Partial<ReceptionAppointment> = {}): ReceptionAppointment => ({
  appointment_id: id, fk_branch_id: 1, notice_date: '2026-11-17', appointment_date: '2026-11-17',
  status: 'Pending', is_active: 1, reception_status: 'APPROVED_BY_RECEPTION', queue_status: 'BOOKED',
  queue_bucket: 'NOT_ARRIVED', checked_in_at: null, display_token_display: `M-${id}`, slot_name: 'Morning Session', treatment_name: 'Follow-up Visit', ...overrides,
});
const scope = { branchId: 1, date: '2026-11-17', slot: 'ALL' as const, treatment: 'ALL' };

test('workflow stages are exclusive, and completion wins over stale reception/check-in state', () => {
  const rows = [
    row(1, { reception_status: 'PENDING_AT_RECEPTION' }), row(2),
    row(3, { queue_status: 'CHECKED_IN', queue_bucket: 'READY', checked_in_at: '2026-11-17 10:00:00' }),
    row(4, { queue_status: 'WAITING', queue_bucket: 'CALLED', checked_in_at: '2026-11-17 10:00:00' }),
    row(5, { queue_status: 'IN_PROGRESS', queue_bucket: 'IN_PROGRESS' }),
    row(6, { status: 'Completed', reception_status: 'PENDING_AT_RECEPTION', queue_status: 'COMPLETED', checked_in_at: '2026-11-17 09:00:00' }),
  ];
  const summary = buildReceptionSummary(rows);
  assert.deepEqual(summary.counts, { ALL: 6, APPROVAL_PENDING: 1, NOT_ARRIVED: 1, WAITING: 2, IN_CONSULTATION: 1, COMPLETED: 1 });
  assert.equal(summary.completionPercent, 16.7);
  assert.equal(Object.entries(summary.counts).filter(([key]) => key !== 'ALL').reduce((sum, [, value]) => sum + value, 0), summary.counts.ALL);
});
test('cancelled, rejected and inactive records never inflate total or completion percentage', () => {
  const summary = buildReceptionSummary([
    row(1, { status: 'Cancelled' }), row(2, { reception_status: 'REJECTED_BY_RECEPTION' }),
    row(3, { is_active: '0', status: 'Completed' }), row(4, { queue_status: 'CANCELLED' }), row(5, { status: 'Completed' }),
  ]);
  assert.equal(summary.counts.ALL, 1); assert.equal(summary.completionPercent, 100);
});
test('paused consultations follow backend READY bucket and patients who left are not waiting', () => {
  assert.equal(getReceptionStage(row(1, { queue_status: 'IN_PROGRESS', queue_bucket: 'READY', checked_in_at: '2026-11-17 10:00:00' })), 'WAITING');
  assert.equal(getReceptionStage(row(2, { queue_status: 'WAITING', queue_bucket: 'NOT_ARRIVED', checked_in_at: null })), 'NOT_ARRIVED');
  assert.equal(getReceptionStage(row(3, { queue_status: 'WAITING', queue_bucket: undefined, checked_in_at: null })), 'NOT_ARRIVED');
  assert.equal(getReceptionStage(row(4, { queue_status: 'IN_PROGRESS', queue_bucket: undefined })), 'IN_CONSULTATION');
  assert.equal(getReceptionStage(row(5, { queue_status: 'SKIPPED', checked_in_at: 'old value' })), 'NOT_ARRIVED');
});
test('branch/date/slot/treatment filters apply before cards, including canonical notice date', () => {
  const rows = [row(1), row(2, { fk_branch_id: 2 }), row(3, { notice_date: '2026-11-18' }),
    row(4, { display_token_display: 'E-1', slot_name: 'Evening Session' }), row(5, { treatment_name: 'Acute Treatment' }),
    row(6, { appointment_date: '2026-11-16T18:30:00.000Z' }),
  ];
  assert.deepEqual(scopeReceptionAppointments(rows, scope).map(row => row.appointment_id), [1, 4, 5, 6]);
  const filtered = scopeReceptionAppointments(rows, { ...scope, slot: 'M', treatment: 'Follow-up Visit' });
  assert.deepEqual(filtered.map(row => row.appointment_id), [1, 6]);
  assert.equal(buildReceptionSummary(filtered).counts.ALL, 2);
});
test('counts span all pages and deduplicate appointment IDs without combining family-member visits', () => {
  const rows = Array.from({ length: 21 }, (_, index) => row(index + 1));
  assert.equal(buildReceptionSummary(rows).counts.ALL, 21);
  assert.equal(buildReceptionSummary([...rows, row(1), row(2)]).counts.ALL, 21);
  assert.equal(scopeReceptionAppointments([...rows, row(1)], scope).length, 21);
  assert.equal(buildReceptionSummary([row(1), row(2)]).counts.ALL, 2);
  assert.equal(buildReceptionSummary([row(0), row(1, { appointment_id: 'invalid' })]).counts.ALL, 0);
});
test('approval, check-in, consultation, completion and rejection refresh the same appointment counts', () => {
  let booking = row(1, { reception_status: 'PENDING_AT_RECEPTION' });
  assert.equal(buildReceptionSummary([booking]).counts.APPROVAL_PENDING, 1);
  booking = { ...booking, reception_status: 'APPROVED_BY_RECEPTION' };
  assert.equal(buildReceptionSummary([booking]).counts.NOT_ARRIVED, 1);
  booking = { ...booking, queue_bucket: 'READY', queue_status: 'CHECKED_IN', checked_in_at: '2026-11-17 10:00:00' };
  assert.equal(buildReceptionSummary([booking]).counts.WAITING, 1);
  booking = { ...booking, queue_bucket: 'IN_PROGRESS', queue_status: 'IN_PROGRESS' };
  assert.equal(buildReceptionSummary([booking]).counts.IN_CONSULTATION, 1);
  booking = { ...booking, status: 'Completed', queue_status: 'COMPLETED' };
  assert.equal(buildReceptionSummary([booking]).counts.COMPLETED, 1);
  assert.equal(buildReceptionSummary([{ ...booking, status: 'Cancelled', is_active: 0 }]).counts.ALL, 0);
});
test('empty scopes produce zero counts and a finite completion percentage', () => {
  const empty = buildReceptionSummary([]);
  assert.equal(empty.counts.ALL, 0); assert.equal(empty.completionPercent, 0); assert.ok(Number.isFinite(empty.completionPercent));
});
test('clearing the existing date filter preserves its all-dates behavior', () => {
  const rows = [row(1), row(2, { notice_date: '2026-11-18' }), row(3, { fk_branch_id: 2 })];
  assert.deepEqual(scopeReceptionAppointments(rows, { ...scope, date: '' }).map(row => row.appointment_id), [1, 2]);
});
