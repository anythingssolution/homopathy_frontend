import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPatientRegistration } from './patientRegistration';

test('assigned DTH is preserved; pending IDs are readable in both languages', () => {
  assert.equal(formatPatientRegistration('DTH2021'), 'DTH2021');
  assert.equal(formatPatientRegistration('DTH_2022'), 'DTH_2022');
  for (const value of [null, undefined, '']) {
    assert.equal(formatPatientRegistration(value), 'Reg No. pending');
    assert.equal(formatPatientRegistration(value, 'hi'), 'रजिस्ट्रेशन नंबर लंबित');
  }
});
