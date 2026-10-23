import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDispenseEstimate, buildDispenseEstimateText, type DispenseEstimateDraft } from './dispenseEstimate';
import { buildManualWhatsAppLink } from './whatsappManualShare';

const draft = (): DispenseEstimateDraft => ({
  prescription: { patient: { full_name: 'Sample Patient', patient_uuid: 'DTH-SAMPLE', mobile_no: '9999900000' }, prescription: {
    medication_duration_days: 15, medications: [
      { medicine_type: 'NUMERIC', medicine_value: '36q' },
      { medicine_type: 'TEXT', medicine_value: 'Tablet A - 30 tabs * 2' },
      { medicine_type: 'TEXT', medicine_value: 'Removed medicine' },
      { medicine_type: 'TEXT', medicine_value: 'Saved medical medicine', added_by_role: 'MEDICAL' },
    ], tests: [{ test_name: 'CBC', amount: 300 }, { test_name: 'Removed test', amount: 500 }],
  } }, medAmounts: { 0: '100', 1: '200', 2: '999' }, medItemStates: { 2: { dispense_status: 'VOID' } }, testItemStates: { 1: { dispense_status: 'VOID' } },
  additionalMeds: [{ name: 'Medical syrup', selectedVariant: { label: '100 ml' }, quantity: 2, amount: '120' }],
  discounts: [{ category: 'MEDICINE', amount: '20' }, { category: 'TEST', amount: '10' }, { category: 'COURIER', amount: '5' }], courier: true, courierCharge: '50', gross: '770',
});
test('current unsaved prices, quantities, tests, courier and discounts match the draft total without mutating it', () => {
  const input = draft(); const original = JSON.stringify(input);
  const result = buildDispenseEstimate(input);
  assert.equal(result.lines.length, 4);
  assert.equal(result.lines[1].quantity, 2);
  assert.equal(result.lines[2].name, 'Medical syrup - 100 ml');
  assert.equal(result.lines[2].quantity, 2);
  assert.equal(result.medicineGross, 420); assert.equal(result.testGross, 300); assert.equal(result.net, 735);
  assert.equal(result.adjustment, 0);
  assert.equal(JSON.stringify(input), original);
  const text = buildDispenseEstimateText(result);
  assert.match(text, /ESTIMATE — Not a final bill/); assert.match(text, /Approx\. total: ₹735\.00/);
  assert.doesNotMatch(text, /Removed|Saved medical medicine|receipt|paid|pending dues|PDF:/);
  assert.match(text, /Qty: As prescribed/); assert.match(text, /Qty: 2 · Amount: ₹200\.00/);
  const link = new URL(buildManualWhatsAppLink(result.phone, text));
  assert.equal(link.pathname, '/919999900000'); assert.equal(link.searchParams.get('text'), text);
});
test('reopening after draft edits regenerates the estimate instead of reusing saved amounts', () => {
  const input = draft();
  const first = buildDispenseEstimate(input);
  input.additionalMeds[0].quantity = 3; input.additionalMeds[0].amount = '180'; input.gross = '830';
  const next = buildDispenseEstimate(input);
  assert.equal(first.net, 735); assert.equal(next.net, 795); assert.equal(next.lines[2].quantity, 3);
});
test('blank prices are marked pending; explicit zero is not mistaken for an unpriced item', () => {
  const input = draft(); input.medAmounts[0] = ''; input.medAmounts[1] = '0'; input.discounts = []; input.gross = '470';
  const result = buildDispenseEstimate(input); const text = buildDispenseEstimateText(result);
  assert.equal(result.lines[0].amount, null); assert.equal(result.lines[1].amount, 0);
  assert.match(text, /Price pending/); assert.match(text, /Approx\. total \(priced items\): ₹470\.00/);
});
test('hand delivery ignores a stale courier charge; explicit gross adjustment remains visible', () => {
  const input = draft(); input.courier = false; input.discounts = []; input.gross = '725';
  const result = buildDispenseEstimate(input); const text = buildDispenseEstimateText(result);
  assert.equal(result.courierGross, 0); assert.equal(result.adjustment, 5);
  assert.match(text, /Hand delivery/); assert.match(text, /Amount adjustment: \+₹5\.00/);
  assert.doesNotMatch(text, /Courier: ₹50/);
});
test('invalid money, discounts, blank named rows and quantities cannot create a misleading estimate', () => {
  for (const modify of [
    (d: DispenseEstimateDraft) => { d.medAmounts[0] = '-1'; },
    (d: DispenseEstimateDraft) => { d.medAmounts[0] = 'oops'; },
    (d: DispenseEstimateDraft) => { d.additionalMeds[0].quantity = 0; },
    (d: DispenseEstimateDraft) => { d.additionalMeds[0].name = ''; },
    (d: DispenseEstimateDraft) => { d.discounts[0].amount = '999'; },
  ]) { const input = draft(); modify(input); assert.throws(() => buildDispenseEstimate(input)); }
});
test('Hindi estimate and family contact stay attached to the selected patient', () => {
  const input = draft(); input.prescription.patient.booked_for_type = 'FAMILY_MEMBER';
  const result = buildDispenseEstimate(input); const text = buildDispenseEstimateText(result, 'hi');
  assert.equal(result.familyContact, true); assert.match(text, /नमस्ते Sample Patient/);
  assert.match(text, /अनुमानित कुल: ₹735\.00/); assert.match(text, /अंतिम बिल नहीं/);
});
test('all numeric medicines share one message entry with their combined amount; other medicines remain separate', () => {
  const input = draft();
  input.prescription.prescription.medications.push({ medicine_type: 'NUMERIC', medicine_value: '12' });
  input.medAmounts[3] = '75'; input.gross = '845';
  const estimate = buildDispenseEstimate(input);
  const text = buildDispenseEstimateText(estimate);
  assert.match(text, /1\. Numeric medicines: 36q, 12\n   Qty: As prescribed · Amount: ₹175\.00/);
  assert.match(text, /2\. Tablet A - 30 tabs/);
  assert.match(text, /3\. Medical syrup - 100 ml/);
  assert.equal((text.match(/Numeric medicines:/g) || []).length, 1);
  assert.match(text, /Approx\. total: ₹810\.00/);
  assert.equal(estimate.lines.length, 5);
  assert.match(buildDispenseEstimateText(estimate, 'hi'), /न्यूमेरिक दवाएँ: 36q, 12/);
});
test('a partially priced numeric group keeps its known amount and flags missing prices', () => {
  const input = draft();
  input.prescription.prescription.medications.push({ medicine_type: 'NUMERIC', medicine_value: '12' });
  input.medAmounts[3] = '';
  const text = buildDispenseEstimateText(buildDispenseEstimate(input));
  assert.match(text, /Numeric medicines: 36q, 12\n   Qty: As prescribed · Amount: ₹100\.00 \+ Price pending/);
  assert.match(text, /Approx\. total \(priced items\): ₹735\.00/);
});
