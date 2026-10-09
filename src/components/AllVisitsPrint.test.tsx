import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import AllVisitsPrint from './AllVisitsPrint';

const patient = { patient_uuid: 'TEST', full_name: 'Test Patient' };
const visit = {
  record_type: 'REPEAT_MEDICINE', source_id: 1, event_at: '2026-10-09T10:00:00Z',
  consultation: { medications: [{ medicine_value: 'Medicine A', quantity: 1 }], tests: [{ consultation_test_id: 'bill-test-1', test_name: 'CBC', amount: 300 }] },
};

test('repeat pickup print includes newly selected tests with their billed price', () => {
  const html = renderToStaticMarkup(<AllVisitsPrint patient={patient} visits={[visit]} />);
  assert.match(html, /MEDICINE A/);
  assert.match(html, />Tests</);
  assert.match(html, /CBC/);
  assert.match(html, /300\.00/);
});

test('medicine-only pickup print does not add an empty Tests section', () => {
  const html = renderToStaticMarkup(<AllVisitsPrint patient={patient} visits={[{ ...visit, consultation: { medications: visit.consultation.medications } }]} />);
  assert.match(html, /MEDICINE A/);
  assert.doesNotMatch(html, />Tests</);
});
