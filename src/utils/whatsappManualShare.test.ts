import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManualWhatsAppLink, buildManualWhatsAppText, normalizeManualWhatsAppPhone } from './whatsappManualShare';
const document = { kind: 'BILL', language: 'en', filename: 'Bill-MED-TEST.pdf', bill_number: 'MED-TEST', date: '10 Oct 2026', patient_name: 'Test Patient', patient_uuid: 'DTH-TEST', lines: [{ name: 'Medicine A', quantity: 2, amount: 100 }, { name: 'CBC', quantity: 1, amount: 300 }], totals: [['Net bill', 380], ['Discount', 20]] as [string, number][] };
test('manual chat targets the patient number and carries saved bill text without a fixed sender', () => {
  const text = buildManualWhatsAppText(document);
  assert.match(text, /Medicine A \(2\): ₹ 100\.00/);
  assert.match(text, /CBC \(1\): ₹ 300\.00/);
  assert.match(text, /Net bill: ₹ 380\.00/);
  assert.doesNotMatch(text, /8462030001|blob:|localhost/);
  const url = new URL(buildManualWhatsAppLink('9827159733', text));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/919827159733');
  assert.equal(url.searchParams.get('text'), text);
  assert.equal(url.searchParams.has('sender'), false);
});
test('receipt and Hindi text use the selected document rather than assuming medicine billing', () => {
  const text = buildManualWhatsAppText({ ...document, kind: 'RECEIPT', language: 'hi', lines: [{ name: 'MED-TEST', mode: 'CASH', amount: 50 }], totals: [['कुल प्राप्त राशि', 50]] });
  assert.match(text, /भुगतान रसीद/);
  assert.match(text, /CASH/);
  assert.match(text, /₹ 50\.00/);
  assert.doesNotMatch(text, /Medicine A/);
});
test('large bills keep chat text bounded while the full document remains in the PDF', () => {
  const text = buildManualWhatsAppText({ ...document, lines: Array.from({ length: 200 }, () => ({ name: 'Long medicine name '.repeat(8), quantity: 1, amount: 10 })) });
  assert.ok(text.length < 3000);
  assert.match(text, /Remaining items/);
  assert.match(text, /Net bill: ₹ 380\.00/);
});
test('invalid recipient or blank message never creates a chat URL', () => {
  assert.equal(normalizeManualWhatsAppPhone('+91 98271 59733'), '919827159733');
  assert.throws(() => buildManualWhatsAppLink('abc123', 'Test'), /Valid/);
  assert.throws(() => buildManualWhatsAppLink('9827159733', '  '), /khali/);
});
