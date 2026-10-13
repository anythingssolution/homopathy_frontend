export type AgeLike = {
  age?: number | string | null;
  age_display?: string | null;
  date_of_birth?: string | null;
  patient_age?: number | string | null;
  patient_age_display?: string | null;
  patient_date_of_birth?: string | null;
  family_member_age?: number | string | null;
  family_member_age_display?: string | null;
  family_member_date_of_birth?: string | null;
};

const dateOnly = (value?: string | null) => {
  if (!value) return null;
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

export const calculateAgeYearsFromDob = (dob?: string | null) => {
  const normalized = dateOnly(dob);
  if (!normalized) return null;
  const birth = new Date(`${normalized}T00:00:00`);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) years -= 1;
  return Math.max(0, years);
};

export const formatAgeFromDob = (dob?: string | null, language = 'en') => {
  const normalized = dateOnly(dob);
  if (!normalized) return null;
  const birth = new Date(`${normalized}T00:00:00`);
  const today = new Date();
  const hi = language.startsWith('hi');

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += previousMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  if (years >= 1) {
    return months > 0
      ? `${years}${hi ? ' वर्ष' : 'Y'} ${months}${hi ? ' माह' : 'M'}`
      : `${years}${hi ? ' वर्ष' : 'Y'}`;
  }

  if (months >= 1) return `${months} ${hi ? 'माह' : months === 1 ? 'Month' : 'Months'}`;
  return `${Math.max(0, days)} ${hi ? 'दिन' : days === 1 ? 'Day' : 'Days'}`;
};

export const formatAgeValue = (
  value?: number | string | null,
  display?: string | null,
  dob?: string | null,
  language = 'en',
) => {
  const calculated = formatAgeFromDob(dob, language);
  if (calculated) return calculated;
  if (display) return display;
  if (value === undefined || value === null || value === '') return '—';
  const hi = language.startsWith('hi');
  return `${value}${hi ? ' वर्ष' : ' Y'}`;
};

export const formatPatientAge = (row: AgeLike, language = 'en') =>
  formatAgeValue(row.patient_age ?? row.age, row.patient_age_display ?? row.age_display, row.patient_date_of_birth ?? row.date_of_birth, language);

export const formatFamilyMemberAge = (row: AgeLike, language = 'en') =>
  formatAgeValue(row.family_member_age ?? row.age, row.family_member_age_display ?? row.age_display, row.family_member_date_of_birth ?? row.date_of_birth, language);
