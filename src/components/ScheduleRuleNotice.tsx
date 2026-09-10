import React from 'react';
import { useScheduleRuleNotes } from '../hooks/useScheduleRuleNotes';
import { formatTimeTo12Hour } from '../utils/dateUtils';

type Props = {
  branchId: number | string | null | undefined;
  appointmentDate: string | null | undefined;
  /** Wrapper classes — each screen keeps its own banner styling. */
  className: string;
  /** Extra sentence appended after the rule line(s). */
  suffix?: React.ReactNode;
};

/**
 * Shows "Friday Schedule: Morning Session opens at 03:00 PM." for any weekly rule that applies
 * to the branch on the given date. Renders nothing when no rule applies.
 */
const ScheduleRuleNotice: React.FC<Props> = ({ branchId, appointmentDate, className, suffix }) => {
  const rules = useScheduleRuleNotes(branchId, appointmentDate);
  if (rules.length === 0) return null;

  return (
    <div className={className}>
      {rules.map((rule) => (
        <div key={rule.id}>
          <span className="font-semibold">{rule.day_label || 'Weekly'} Schedule:</span>{' '}
          {rule.slot_name ? `${rule.slot_name} ` : ''}opens at{' '}
          <strong>{formatTimeTo12Hour(rule.start_time)}</strong>
          {rule.end_time ? <> (till {formatTimeTo12Hour(rule.end_time)})</> : null}.
          {rule.description ? <span className="opacity-80"> {rule.description}</span> : null}
        </div>
      ))}
      {suffix ? <div>{suffix}</div> : null}
    </div>
  );
};

export default ScheduleRuleNotice;
