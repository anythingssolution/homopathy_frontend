import { useEffect, useState } from 'react';
import { dedupedFetch } from '../utils/dedupedFetch';

export type ScheduleRuleNote = {
  id: number;
  slot_id: number | null;
  slot_name: string | null;
  applies_to_first_slot: boolean;
  day_of_week: number;
  day_label: string | null;
  start_time: string;
  end_time: string | null;
  description: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; rules: ScheduleRuleNote[] }>();

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Weekly schedule rules (e.g. "Friday: first slot opens at 3:00 PM") that apply to a branch on a date.
 * Backed by the public endpoint so booking and live-queue screens can show the same note without
 * hardcoding any branch or day.
 */
export const useScheduleRuleNotes = (
  branchId: number | string | null | undefined,
  appointmentDate: string | null | undefined,
): ScheduleRuleNote[] => {
  const normalizedBranchId = Number(branchId) || 0;
  const normalizedDate = String(appointmentDate || '').trim();
  const key = `${normalizedBranchId}::${normalizedDate}`;
  const [rules, setRules] = useState<ScheduleRuleNote[]>(() => cache.get(key)?.rules || []);

  useEffect(() => {
    if (!normalizedBranchId || !isValidDate(normalizedDate)) {
      setRules([]);
      return;
    }

    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setRules(cached.rules);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      branch_id: String(normalizedBranchId),
      appointment_date: normalizedDate,
    });

    dedupedFetch(`/api/v1/public/schedule-rules?${params}`)
      .then((response) => response.json())
      .then((result) => {
        const next = (result?.success && Array.isArray(result.data) ? result.data : []) as ScheduleRuleNote[];
        cache.set(key, { at: Date.now(), rules: next });
        if (!cancelled) setRules(next);
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      });

    return () => {
      cancelled = true;
    };
  }, [key, normalizedBranchId, normalizedDate]);

  return rules;
};
