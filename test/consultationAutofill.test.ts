import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLastVisitConsultDraft, hasMeaningfulConsultDraft } from '../src/utils/consultationAutofill.ts';
const source = { consultation_id: 8, appointment_date: '2026-11-03', branch_name: 'Devendra Nagar' };
const consultation = {
  symptoms: 'Headache', diagnosis: 'Migraine', treatment_advice: 'Findings', medication_duration_days: 7,
  follow_up_after_days: 21, quick_formula_input: '54', formula_version_used: 2, formula_set_id: 1,
  oxygen_saturation: '98%', blood_pressure: '120/80', patient_height: '158 cm', patient_weight: '54kg',
  occupation: 'Teacher', history_present_illness: 'Since Monday', history_past_illness: 'Old history',
  family_history: 'Family note', allergies_history: 'Peanuts', gynecological_history: 'History',
  personal_social_history: 'Personal history', lifestyle_history: { sleep_disturbed: 'YES', family_history: 'YES', father_details: 'Diabetes' },
  general_examination: 'General', systematic_examination: 'Systemic', differential_diagnosis: 'Differential',
  follow_up: 'Review', mental_mind_status: 'Anxious', disease: 'Pain', universal_remark: 'After food',
  is_repeat: true, repeat_months: 1, is_same: false, follow_up_chain_closed: true, repeated_from_consultation_id: 4,
  medications: [
    { consultation_medication_id: 51, medicine_type: 'NUMERIC', medicine_value: '54', doses: [
      { dose_label: 'MORNING', balls_per_dose: 8 }, { dose_label: 'NIGHT', balls_per_dose: 8 } ] },
    { consultation_medication_id: 52, medicine_type: 'TEXT', medicine_value: 'Oil - 30ml x 2', remark: 'Apply', is_manual_entry: 1 },
    { medicine_type: 'TEXT', medicine_value: 'Void', dispense_status: 'VOID' },
    { medicine_type: 'TEXT', medicine_value: 'Dispensary-only', added_by_role: 'MEDICAL' },
  ],
  tests: [{ consultation_test_id: 7, test_name: 'CBC', amount: 0, finding_text: 'Old lab result' }, { test_name: 'Cancelled', dispense_status: 'VOID' }],
  investigations: [{ id: 9, investigation_type: 'X_RAY', test_name: 'Chest', investigation_date: '2026-11-01', status: 'REPORT_SEEN', findings: 'Normal', report_reference: 'Ref', document_id: 17 }],
  dispensing: { medication_bill_id: 71 },
};
const pricing = { medications: [{ consultation_medication_id: 51, amount: '75.00' }, { consultation_medication_id: 52, amount: '120.00' }] };
test('maps every clinical section, dosage and custom follow-up without changing the source', () => {
  const original = JSON.stringify(consultation);
  const draft = buildLastVisitConsultDraft({ source, consultation, pricing });
  assert.equal(draft.chiefComplaints, 'Headache'); assert.equal(draft.treatmentNotes, 'Findings'); assert.equal(draft.diagnosis, 'Migraine');
  assert.equal(draft.globalDuration, '7'); assert.equal(draft.followUpPreset, 'custom'); assert.equal(draft.customFollowUpDays, '21');
  assert.equal(draft.thirtyDaysDoseFrequency, '2'); assert.deepEqual(draft.medications[0].doses, { morning: 8, afternoon: 0, night: 8 });
  assert.equal(draft.medications[0].amount, '75.00'); assert.equal(draft.otherMedications[0].quantity, 2);
  assert.equal(draft.otherMedications[0].manualUnitPrice, 60); assert.equal(draft.otherMedications[0].selectedVariant?.label, '30ml');
  for (const field of ['occupation','historyPresentIllness','historyPastIllness','familyHistory','allergiesHistory','gynecologicalHistory','personalSocialHistory','generalExamination','systematicExamination','differentialDiagnosis','followUp','mentalMindStatus','disease']) assert.ok(draft[field as keyof typeof draft]);
  assert.equal(draft.lifestyleHistory?.father_details, 'Diabetes'); assert.equal(draft.lifestyleHistory?.sleep_disturbed, 'YES');
  assert.equal(draft.heightUnit, 'cm'); assert.equal(draft.heightValue, '158'); assert.equal(draft.o2Value, '98'); assert.equal(draft.weightValue, '54');
  assert.equal(draft.lastVisitAutofill?.branch_name, 'Devendra Nagar'); assert.equal(JSON.stringify(consultation), original);
});
test('copies fresh rows without source ownership, payment, old results or follow-up-only links', () => {
  const draft = buildLastVisitConsultDraft({ source, consultation, pricing });
  assert.equal(draft.repeatedFromConsultationId, null); assert.equal(draft.followUpChainClosed, false);
  assert.equal(draft.medications.length, 1); assert.equal(draft.otherMedications.length, 1); assert.equal(draft.tests.length, 1);
  assert.deepEqual(draft.tests[0], { test_name: 'CBC', amount: '0' });
  assert.equal(draft.investigations?.[0].id, undefined); assert.equal(draft.investigations?.[0].document_id, undefined);
  assert.equal(draft.otherMedications[0].shouldPersistManualMaster, false);
  for (const key of ['dispensing', 'payment_summary', 'appointment_id', 'reception_status']) assert.equal(key in draft, false);
});
test('today vitals/investigations win over historical values; no-prescription visits also map', () => {
  const investigations = [{ investigation_type: 'MRI', test_name: 'Today', investigation_date: '', status: 'ADVISED', findings: '', report_reference: '' }];
  const draft = buildLastVisitConsultDraft({ source, consultation: { ...consultation, workflow_status: 'COMPLETED_NO_PRESCRIPTION' } }, { oxygen_saturation: '99%', patient_height: '5ft', investigations });
  assert.equal(draft.o2Value, '99'); assert.equal(draft.heightValue, '5ft'); assert.equal(draft.heightUnit, 'ft');
  assert.equal(draft.investigations?.[0].test_name, 'Today'); assert.equal(draft.hasNoAdvice, true);
});
test('blank opening drafts allow prefill; existing clinical work and intentionally cleared prefilled drafts win', () => {
  const empty = buildLastVisitConsultDraft({ source, consultation: {} });
  delete empty.lastVisitAutofill;
  assert.equal(hasMeaningfulConsultDraft(null), false);
  assert.equal(hasMeaningfulConsultDraft(empty), false);
  assert.equal(hasMeaningfulConsultDraft({ ...empty, chiefComplaints: 'na' }, { symptoms: 'na' }), false);
  for (const change of [{ chiefComplaints: 'New symptom' }, { diagnosis: 'Diagnosis' }, { globalDuration: '7' }, { followUpPreset: 'custom' as const, customFollowUpDays: '21' }, { lastVisitAutofill: source }, { hasNoAdvice: true }, { medications: [{ name: '74', doses: { morning: 4, afternoon: 4, night: 4 }, amount: '' }] }]) assert.equal(hasMeaningfulConsultDraft({ ...empty, ...change }), true);
});
test('legacy embedded diagnosis is restored once without including it in findings', () => {
  const draft = buildLastVisitConsultDraft({ source, consultation: { treatment_advice: 'Diagnosis: Old diagnosis\n\nClinical findings', medication_duration_days: 15, follow_up_after_days: 30 } });
  assert.equal(draft.diagnosis, 'Old diagnosis'); assert.equal(draft.treatmentNotes, 'Clinical findings'); assert.equal(draft.followUpPreset, '30'); assert.equal(draft.customFollowUpDays, '');
});
