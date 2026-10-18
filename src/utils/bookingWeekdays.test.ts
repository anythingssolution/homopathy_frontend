import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingBranchStatus, type BookingDateAvailability } from './bookingWeekdays';
test('availability is date and branch specific; a stale response cannot enable a different date', () => {
  const data: BookingDateAvailability = { appointment_date: '2026-10-20', branches: [{branch_id:2,booking_enabled:false,reason:'Closed',slots:[]}] };
  assert.equal(bookingBranchStatus(data, '2026-10-20', '2')?.booking_enabled, false);
  assert.equal(bookingBranchStatus(data, '2026-10-21', 2), undefined);
  assert.equal(bookingBranchStatus(data, '2026-10-20', 1), undefined);
  assert.equal(bookingBranchStatus(null, '2026-10-20', 2), undefined);
});
