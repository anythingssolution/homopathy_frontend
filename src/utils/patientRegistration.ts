/** Display registration consistently while a new patient awaits first check-in. */
export function formatPatientRegistration(value?: string | null, language = 'en'): string {
  return value?.trim() || (language.startsWith('hi') ? 'रजिस्ट्रेशन नंबर लंबित' : 'Reg No. pending');
}
