import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterNotReturned, type NotReturnedPatient } from './notReturned';

test('not-returned filters combine bucket, overdue, next booking and search without changing card rows', () => {
  const rows = [
    { subject_key: 'PAT:1', patient_uuid: 'REG123', patient_full_name: 'Alpha', bucket: '1_2', overdue_days: 10, next_appointment: null },
    { subject_key: 'FM:2', patient_uuid: 'REG123', patient_full_name: 'Family', bucket: '3_plus', overdue_days: 20, next_appointment: '2026-10-20' },
    { subject_key: 'PAT:3', patient_uuid: 'REG456', patient_full_name: 'Beta', bucket: '2_3', overdue_days: 0 },
  ] as NotReturnedPatient[];
  assert.equal(filterNotReturned(rows, 'all', '', false, false).length, 3);
  assert.equal(filterNotReturned(rows, '1_2', ' reg123 ', true, true)[0].subject_key, 'PAT:1');
  assert.equal(filterNotReturned(rows, 'all', '', true, true).length, 1);
  assert.equal(filterNotReturned(rows, '3_plus', '', true, true).length, 0);
  assert.equal(filterNotReturned(rows, '2_3', '', true, false).length, 0);
  assert.equal(filterNotReturned(rows, 'all', 'family', false, false)[0].subject_key, 'FM:2');
  assert.equal(rows.length, 3);
});
