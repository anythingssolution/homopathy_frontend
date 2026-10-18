import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterAppointmentList, type AppointmentCardRow } from './appointmentList';

test('appointment list search finds registration, patient, original token and session without changing source rows', () => {
  const rows = [
    { appointment_id: 1, patient_full_name: 'Alpha', patient_uuid: 'REG100', patient_mobile_no: '9991234567', display_token_display: 'E-11', slot_name: 'Evening' },
    { appointment_id: 2, patient_full_name: 'Family Member', patient_uuid: 'REG100', display_token_display: 'M-5', slot_name: 'Morning' },
  ] as AppointmentCardRow[];
  assert.equal(filterAppointmentList(rows, '').length, 2);
  assert.equal(filterAppointmentList(rows, ' reg100 ').length, 2);
  assert.equal(filterAppointmentList(rows, 'e-11')[0].appointment_id, 1);
  assert.equal(filterAppointmentList(rows, 'morning')[0].appointment_id, 2);
  assert.equal(filterAppointmentList(rows, '999123')[0].appointment_id, 1);
  assert.equal(filterAppointmentList(rows, 'absent').length, 0);
  assert.equal(rows.length, 2);
});
