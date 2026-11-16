import type { ConsultDraftPayload } from './consultDraftStorage';
import { parseConsultationMedicineText } from './prescriptionFormat';
import { getDurationKeyFromDays } from './medicationDuration';
import { deriveManualUnitPrice } from './otherMedicinePricing';
import { parseLifestyleHistory, hasLifestyleHistory } from '../components/dashboard/history/LifestyleHistoryFields';

const text = (value: unknown) => value == null ? '' : String(value);
const historyFields = {
  occupation: 'occupation', historyPresentIllness: 'history_present_illness',
  historyPastIllness: 'history_past_illness', familyHistory: 'family_history',
  allergiesHistory: 'allergies_history', gynecologicalHistory: 'gynecological_history',
  personalSocialHistory: 'personal_social_history', generalExamination: 'general_examination',
  systematicExamination: 'systematic_examination', differentialDiagnosis: 'differential_diagnosis',
  followUp: 'follow_up', mentalMindStatus: 'mental_mind_status', disease: 'disease',
} as const;

// Blank drafts are also stored when a form is only opened. They must not prevent auto-fill.
export function hasMeaningfulConsultDraft(draft: ConsultDraftPayload | null, booking: Record<string, any> = {}): boolean {
  if (!draft) return false;
  if (draft.lastVisitAutofill || draft.medications.some(row => row.name.trim()) ||
      draft.otherMedications.some(row => row.name.trim()) || draft.tests.some(row => row.test_name.trim()) ||
      draft.diagnosis.trim() || draft.treatmentNotes.trim() || draft.universalRemark.trim() || draft.quickNumericInput.trim() ||
      draft.hasNoAdvice || draft.isRepeat || draft.isSame || draft.followUpChainClosed || draft.repeatedFromConsultationId ||
      draft.repeatMonths || draft.sameMonths || draft.globalDuration !== '15' || draft.thirtyDaysDoseFrequency !== '3' ||
      draft.followUpPreset !== '15' || draft.customFollowUpDays || draft.consultationMode === 'ON_CALL') return true;
  if (draft.chiefComplaints.trim() !== text(booking.symptoms).trim()) return true;
  if (Object.entries(historyFields).some(([field, column]) => text(draft[field as keyof ConsultDraftPayload]).trim() !== text(booking[column]).trim())) return true;
  const vitals = [
    [draft.o2Value, text(booking.oxygen_saturation).replace('%', '').trim()],
    [draft.bpValue, text(booking.blood_pressure).trim()],
    [draft.heightValue, text(booking.patient_height).replace('cm', '').trim()],
    [draft.weightValue, text(booking.patient_weight).replace('kg', '').trim()],
  ];
  if (vitals.some(([value, initial]) => value.trim() !== initial)) return true;
  if (hasLifestyleHistory(parseLifestyleHistory(draft.lifestyleHistory))) return true;
  return Boolean(draft.investigations?.some(row => row.test_name.trim() || row.findings.trim() || row.report_reference.trim() || row.investigation_date));
}

export function buildLastVisitConsultDraft(data: { consultation: any; source: any; pricing?: any }, booking: Record<string, any> = {}): ConsultDraftPayload {
  const c = data.consultation;
  const prices = new Map((data.pricing?.medications || []).map((row: any) => [Number(row.consultation_medication_id), row.amount]));
  // Dispensary additions and voided rows are not the doctor's prescribed treatment.
  const medicines = (c.medications || []).filter((row: any) => row.added_by_role !== 'MEDICAL' && row.dispense_status !== 'VOID');
  const numeric = medicines.filter((row: any) => row.medicine_type === 'NUMERIC').map((row: any) => {
    const doses = { morning: 0, afternoon: 0, night: 0 };
    for (const dose of row.doses || []) {
      const key = text(dose.dose_label).toLowerCase();
      if (key === 'morning' || key === 'afternoon' || key === 'night') doses[key] = Number(dose.balls_per_dose) || 0;
    }
    return { name: text(row.medicine_value), doses, amount: text(prices.get(Number(row.consultation_medication_id)) ?? row.amount) };
  });
  const others = medicines.filter((row: any) => row.medicine_type === 'TEXT').map((row: any) => {
    const parsed = parseConsultationMedicineText(row.medicine_value);
    const amount = text(prices.get(Number(row.consultation_medication_id)) ?? row.amount);
    const manualUnitPrice = deriveManualUnitPrice(amount, parsed.quantity);
    return { name: parsed.name, quantity: parsed.quantity, remark: text(row.remark), amount,
      isManualEntry: Boolean(row.is_manual_entry), manualUnitPrice, shouldPersistManualMaster: false,
      selectedVariant: parsed.variant ? { label: parsed.variant, price: manualUnitPrice ?? 0, type: 'manual' } : null };
  });
  let advice = text(c.treatment_advice);
  let diagnosis = text(c.diagnosis);
  if (advice.startsWith('Diagnosis: ')) {
    const [legacyDiagnosis, ...findings] = advice.split('\n\n');
    diagnosis ||= legacyDiagnosis.replace('Diagnosis: ', '');
    advice = findings.join('\n\n');
  }
  const followUp = text(c.follow_up_after_days || c.medication_duration_days || 15);
  const height = text(booking.patient_height || c.patient_height);
  const draft: ConsultDraftPayload = {
    chiefComplaints: text(c.symptoms), diagnosis, treatmentNotes: advice,
    hasNoAdvice: c.workflow_status === 'COMPLETED_NO_PRESCRIPTION',
    isRepeat: Boolean(Number(c.is_repeat)), isSame: Boolean(Number(c.is_same)),
    repeatMonths: Number(c.repeat_months) || 0, sameMonths: Number(c.same_months) || 0,
    consultationMode: c.consultation_mode === 'ON_CALL' ? 'ON_CALL' : 'PHYSICAL_PRESENT',
    o2Value: text(booking.oxygen_saturation || c.oxygen_saturation).replace('%', '').trim(),
    bpValue: text(booking.blood_pressure || c.blood_pressure),
    heightValue: height.replace('cm', '').trim(), heightUnit: height && !height.includes('cm') ? 'ft' : 'cm',
    weightValue: text(booking.patient_weight || c.patient_weight).replace('kg', '').trim(),
    globalDuration: getDurationKeyFromDays(Number(c.medication_duration_days || 15)),
    thirtyDaysDoseFrequency: numeric.length && numeric.every((row: any) => !row.doses.afternoon && row.doses.morning && row.doses.night) ? '2' : '3',
    followUpPreset: ['7', '15', '30', '45', '60', '90', '180'].includes(followUp) ? followUp as ConsultDraftPayload['followUpPreset'] : 'custom',
    customFollowUpDays: ['7', '15', '30', '45', '60', '90', '180'].includes(followUp) ? '' : followUp,
    // Auto-fill is not the follow-up-only Repeat action, and never closes the new visit's chain.
    repeatedFromConsultationId: null, followUpChainClosed: false,
    quickNumericInput: text(c.quick_formula_input), lastAppliedQuickFormulaVersion: Number(c.formula_version_used) || null,
    lastAppliedQuickFormulaSetId: Number(c.formula_set_id) || null,
    medications: numeric, otherMedications: others,
    tests: (c.tests || []).filter((row: any) => row.dispense_status !== 'VOID').map((row: any) => ({ test_name: text(row.test_name), amount: text(row.amount) })),
    universalRemark: text(c.universal_remark),
    occupation: '', historyPresentIllness: '', historyPastIllness: '', familyHistory: '', allergiesHistory: '',
    gynecologicalHistory: '', personalSocialHistory: '', generalExamination: '', systematicExamination: '',
    differentialDiagnosis: '', followUp: '', mentalMindStatus: '', disease: '',
    lifestyleHistory: parseLifestyleHistory(c.lifestyle_history),
    investigations: (c.investigations || []).map((row: any) => ({
      investigation_type: text(row.investigation_type), test_name: text(row.test_name),
      investigation_date: text(row.investigation_date).slice(0, 10), status: text(row.status || 'DONE'),
      findings: text(row.findings), report_reference: text(row.report_reference),
    })),
    lastVisitAutofill: { consultation_id: Number(data.source.consultation_id), appointment_date: text(data.source.appointment_date), branch_name: text(data.source.branch_name) },
  };
  for (const [field, column] of Object.entries(historyFields)) draft[field as keyof typeof historyFields] = text(c[column]);
  // Investigations recorded for today's booking take priority over historical entries.
  if (booking.investigations?.length) draft.investigations = booking.investigations;
  return draft;
}
