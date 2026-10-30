import { getDurationDaysFromKey } from './medicationDuration';

type NumericDoses = { morning: number; afternoon: number; night: number };

// Q uses the twice-daily override; other alpha-code schedules retain master doses.
export const resolveQuickNumericDoses = (
  masterDoses: NumericDoses,
  duration: string,
  frequency: '2' | '3',
  formulaToken: string,
): NumericDoses => {
  const alphaCodes: string[] = formulaToken.match(/[a-z]+/gi) || [];
  const hasQCode = alphaCodes.some(code => code.toUpperCase() === 'Q');
  if (frequency === '2' && hasQCode) return { morning: 8, afternoon: 0, night: 8 };
  if (/[a-z]/i.test(formulaToken)) return { ...masterDoses };
  const days = getDurationDaysFromKey(duration);
  const shortDuration = days === 7 || days === 15;
  return frequency === '2'
    ? { morning: days === 7 ? 8 : 6, afternoon: 0, night: days === 7 ? 8 : 6 }
    : { morning: shortDuration ? 4 : 3, afternoon: shortDuration ? 4 : 3, night: shortDuration ? 4 : 3 };
};
