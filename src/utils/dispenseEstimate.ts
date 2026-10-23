import { formatNumericMedicineWithFormula, parseConsultationMedicineText } from './prescriptionFormat';

type ItemState = { dispense_status?: string };
export type DispenseEstimateDraft = {
  prescription: any;
  medAmounts: Record<number, string>;
  medItemStates: Record<number, ItemState>;
  testItemStates: Record<number, ItemState>;
  additionalMeds: { name?: string; medicine_value?: string; quantity?: number | string; amount: string; selectedVariant?: { label: string } | null }[];
  discounts: { category: string; amount: string }[];
  courier: boolean;
  courierCharge: string;
  gross: string;
};
type Line = { name: string; quantity: number | null; amount: number | null; type: 'MEDICINE' | 'TEST'; numeric?: boolean };
export type DispenseEstimate = {
  patientName: string; phone: string; regNo: string; familyContact: boolean;
  lines: Line[]; medicineGross: number; testGross: number; courierGross: number;
  discounts: { category: string; amount: number }[]; adjustment: number; gross: number; net: number;
  courier: boolean; duration: number;
};
const money = (value: unknown) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error('Please enter valid non-negative prices before preparing an estimate.');
  return Math.round(number * 100) / 100;
};
const price = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? null : money(value);
const active = (state?: ItemState) => String(state?.dispense_status || '').toUpperCase() !== 'VOID';

export function buildDispenseEstimate(draft: DispenseEstimateDraft): DispenseEstimate {
  const record = draft.prescription;
  const prescription = record?.prescription || {};
  const lines: Line[] = (prescription.medications || []).filter((med: any) => med.added_by_role !== 'MEDICAL')
    .flatMap((med: any, index: number) => {
      if (!active(draft.medItemStates[index])) return [];
      const text = String(med.medicine_value || '').trim();
      const numeric = String(med.medicine_type || '').toUpperCase() === 'NUMERIC';
      const parsed = parseConsultationMedicineText(text);
      return [{ name: numeric ? formatNumericMedicineWithFormula(text, prescription.quick_formula_input) : [parsed.name, parsed.variant].filter(Boolean).join(' - '),
        quantity: numeric ? null : parsed.quantity, amount: price(draft.medAmounts[index]), type: 'MEDICINE' as const, numeric }];
    });
  for (const item of draft.additionalMeds) {
    const name = String(item.name || item.medicine_value || '').trim();
    if (!name && !String(item.amount || '').trim()) continue;
    if (!name) throw new Error('Please enter the name of the additional medicine before sharing.');
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Additional medicine quantity must be a positive whole number.');
    const parsed = parseConsultationMedicineText(name);
    lines.push({ name: [parsed.name, item.selectedVariant?.label || parsed.variant].filter(Boolean).join(' - '), quantity, amount: price(item.amount), type: 'MEDICINE' });
  }
  (prescription.tests || []).forEach((test: any, index: number) => {
    if (active(draft.testItemStates[index] || test)) lines.push({ name: String(test.test_name || 'Test'), quantity: 1, amount: price(test.amount), type: 'TEST' });
  });
  if (!lines.length) throw new Error('Add an active medicine or test before preparing an estimate.');
  const medicineGross = money(lines.filter(line => line.type === 'MEDICINE').reduce((sum, line) => sum + (line.amount || 0), 0));
  const testGross = money(lines.filter(line => line.type === 'TEST').reduce((sum, line) => sum + (line.amount || 0), 0));
  const courierGross = draft.courier ? money(draft.courierCharge) : 0;
  const discounts = draft.discounts.map(item => ({ category: item.category, amount: money(item.amount) })).filter(item => item.amount > 0);
  const eligible: Record<string, number> = { MEDICINE: medicineGross, TEST: testGross, COURIER: courierGross };
  const categoryTotals: Record<string, number> = {};
  for (const item of discounts) {
    categoryTotals[item.category] = money((categoryTotals[item.category] || 0) + item.amount);
    if (categoryTotals[item.category] > (eligible[item.category] || 0)) throw new Error('Discount exceeds the eligible item amount. Please review it before sharing.');
  }
  const gross = money(draft.gross);
  const discount = money(discounts.reduce((sum, item) => sum + item.amount, 0));
  if (discount > gross) throw new Error('Discount exceeds the current total. Please review the estimate.');
  return { patientName: record?.patient?.full_name || 'Patient', phone: String(record?.patient?.mobile_no || ''),
    regNo: String(record?.patient?.patient_uuid || ''), familyContact: record?.patient?.booked_for_type === 'FAMILY_MEMBER',
    lines, medicineGross, testGross, courierGross, discounts, gross, adjustment: Math.round((gross - medicineGross - testGross - courierGross) * 100) / 100,
    net: money(gross - discount), courier: draft.courier, duration: Number(prescription.medication_duration_days) || 0 };
}

export function buildDispenseEstimateText(estimate: DispenseEstimate, language: 'en' | 'hi' = 'en') {
  const hi = language === 'hi';
  const currency = (value: number) => `₹${value.toFixed(2)}`;
  const category: Record<string, string> = hi ? { MEDICINE: 'दवा', TEST: 'जाँच', COURIER: 'कूरियर' } : { MEDICINE: 'Medicine', TEST: 'Test', COURIER: 'Courier' };
  const lines = ["*Dr. Trivedi's Homeopathy Clinic*", hi ? '*अनुमानित राशि — अंतिम बिल नहीं*' : '*ESTIMATE — Not a final bill*', '',
    `${hi ? 'नमस्ते' : 'Namaste'} ${estimate.patientName},`,
    ...(estimate.regNo ? [`Reg No.: ${estimate.regNo}`] : []),
    hi ? 'आपके वर्तमान दवा / जाँच ड्राफ्ट का विवरण:' : 'Your current medicine / test estimate:',
    ...(estimate.duration ? [`${hi ? 'दवा की अवधि' : 'Medicine duration'}: ${estimate.duration} ${hi ? 'दिन' : 'days'}`] : []), ''];
  // Group only the shared message; retain individual draft prices for billing calculations.
  const numeric = estimate.lines.filter(line => line.numeric);
  let numericShown = false;
  const sharedLines = estimate.lines.flatMap(line => {
    if (!line.numeric) return [{ ...line, partiallyPriced: false }];
    if (numericShown) return [];
    numericShown = true;
    return [{ ...line, name: numeric.map(item => item.name).join(', '),
      amount: numeric.some(item => item.amount !== null) ? money(numeric.reduce((sum, item) => sum + (item.amount || 0), 0)) : null,
      partiallyPriced: numeric.some(item => item.amount === null) }];
  });
  sharedLines.forEach((line, index) => lines.push(`${index + 1}. ${line.numeric ? (hi ? 'न्यूमेरिक दवाएँ: ' : 'Numeric medicines: ') : ''}${line.name}${line.type === 'TEST' ? ` (${category.TEST})` : ''}\n   ${hi ? 'मात्रा' : 'Qty'}: ${line.quantity ?? (hi ? 'डॉक्टर के निर्देश अनुसार' : 'As prescribed')} · ${hi ? 'राशि' : 'Amount'}: ${line.amount === null ? (hi ? 'मूल्य बाकी है' : 'Price pending') : currency(line.amount)}${line.partiallyPriced && line.amount !== null ? (hi ? ' + कुछ दवाओं का मूल्य बाकी है' : ' + Price pending for some medicines') : ''}`));
  lines.push('', `${category.MEDICINE}: ${currency(estimate.medicineGross)}`);
  if (estimate.lines.some(line => line.type === 'TEST')) lines.push(`${category.TEST}: ${currency(estimate.testGross)}`);
  lines.push(`${hi ? 'डिलीवरी' : 'Delivery'}: ${estimate.courier ? (hi ? 'कूरियर' : 'Courier') : (hi ? 'हैंड डिलीवरी' : 'Hand delivery')}`);
  if (estimate.courier) lines.push(`${category.COURIER}: ${currency(estimate.courierGross)}`);
  if (Math.abs(estimate.adjustment) >= 0.01) lines.push(`${hi ? 'राशि का समायोजन' : 'Amount adjustment'}: ${estimate.adjustment < 0 ? '-' : '+'}${currency(Math.abs(estimate.adjustment))}`);
  for (const item of estimate.discounts) lines.push(`${category[item.category] || item.category} ${hi ? 'छूट' : 'discount'}: -${currency(item.amount)}`);
  const pending = estimate.lines.some(line => line.amount === null);
  lines.push('', `*${hi ? 'अनुमानित कुल' : 'Approx. total'}${pending ? (hi ? ' (भरे हुए मूल्यों का)' : ' (priced items)') : ''}: ${currency(estimate.net)}*`);
  if (pending) lines.push(hi ? 'जिन दवाओं का मूल्य बाकी है, उनकी राशि इसमें शामिल नहीं है।' : 'Items marked Price pending are not included in this total.');
  lines.push('', hi ? 'यह केवल अनुमान है। डिस्पेंस पूरा होने पर अंतिम बिल की पुष्टि होगी।' : 'This is an estimate only. The final bill will be confirmed when dispensing is completed.');
  return lines.join('\n');
}
