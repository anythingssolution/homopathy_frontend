import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canConsultFromSessionList } from './doctorListSession';

const appointment = { fk_slot_id: 1, fk_branch_id: 2, appointment_date: '2026-10-31' };
const active = { slotId: 1, branchId: 2, hasOpenSession: true, today: '2026-10-31' };
test('default current list retains existing consultation entry behaviour', () => {
  assert.equal(canConsultFromSessionList('current', appointment, { ...active, hasOpenSession: false }), true);
});
test('all and explicit session lists allow only the active branch, slot and date', () => {
  for (const scope of ['all', '1', '2']) {
    assert.equal(canConsultFromSessionList(scope, appointment, active), true);
    assert.equal(canConsultFromSessionList(scope, { ...appointment, fk_slot_id: 2 }, active), false);
    assert.equal(canConsultFromSessionList(scope, { ...appointment, fk_branch_id: 1 }, active), false);
    assert.equal(canConsultFromSessionList(scope, { ...appointment, appointment_date: '2026-10-30' }, active), false);
    assert.equal(canConsultFromSessionList(scope, appointment, { ...active, hasOpenSession: false }), false);
    assert.equal(canConsultFromSessionList(scope, appointment, { ...active, slotId: null }), false);
  }
});

test('serialized midnight date uses the local clinic day when checking session actions', () => {
  const serializedDate = new Date(2026, 9, 31).toISOString();
  assert.equal(canConsultFromSessionList('all', { ...appointment, appointment_date: serializedDate }, active), true);
  assert.equal(canConsultFromSessionList('all', { ...appointment, appointment_date: 'invalid' }, active), false);
});
