import { getDurationDaysFromKey } from './medicationDuration';

type NumericDoses = { morning: number; afternoon: number; night: number };

// Alpha-code schedules take precedence; plain numeric medicines use frequency rules.
export const resolveQuickNumericDoses = (
  masterDoses: NumericDoses,
  duration: string,
  frequency: '2' | '3',
  formulaToken: string,
): NumericDoses => {
  if (/[a-z]/i.test(formulaToken)) return { ...masterDoses };
  const days = getDurationDaysFromKey(duration);
  const shortDuration = days === 7 || days === 15;
  return frequency === '2'
    ? { morning: shortDuration ? 8 : 6, afternoon: 0, night: shortDuration ? 8 : 6 }
    : { morning: shortDuration ? 4 : 3, afternoon: shortDuration ? 4 : 3, night: shortDuration ? 4 : 3 };
};
