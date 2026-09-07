export type DateFilterId =
  | 'today'
  | '1_week'
  | '1_month'
  | '2_months'
  | '3_months'
  | '6_months'
  | '1_year'
  | '2_years'
  | '3_years'
  | 'custom';

export type CustomRange = { from: string; to: string };

export const isoDate = (value: Date) => value.toISOString().slice(0, 10);

/** Calendar date in the viewer's timezone (avoids UTC off-by-one). */
export const localIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseIsoDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value || '').trim();
  if (!raw) return null;

  const dayPart = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dayPart) return null;

  // Datetimes must use the local calendar day. UTC "2026-09-06T18:30:00Z" is
  // 7 Sept midnight in India — slicing YYYY-MM-DD would wrongly show yesterday.
  if (/T|\s|Z/i.test(raw.slice(10))) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  return new Date(Number(dayPart[1]), Number(dayPart[2]) - 1, Number(dayPart[3]));
};

const startOfLocalDay = (value = new Date()) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

/** Follow-up due dates look forward from today. Overdue is yesterday and earlier. */
export const rangeForFollowUpFilter = (dateFilter: string, custom: CustomRange): CustomRange => {
  const today = startOfLocalDay();
  const from = new Date(today);
  const to = new Date(today);

  if (dateFilter === 'custom') {
    return {
      from: custom.from || localIsoDate(today),
      to: custom.to || localIsoDate(today),
    };
  }
  if (dateFilter === 'overdue') {
    from.setFullYear(from.getFullYear() - 1);
    to.setDate(to.getDate() - 1);
    return { from: localIsoDate(from), to: localIsoDate(to) };
  }
  if (dateFilter === 'today') {
    return { from: localIsoDate(today), to: localIsoDate(today) };
  }
  if (dateFilter === '1_week') {
    to.setDate(to.getDate() + 6);
  } else if (dateFilter === '1_month') {
    to.setMonth(to.getMonth() + 1);
  } else if (dateFilter.endsWith('_months') || dateFilter.endsWith('_month')) {
    const months = parseInt(dateFilter.split('_')[0], 10);
    if (!Number.isNaN(months)) to.setMonth(to.getMonth() + months);
  } else if (dateFilter.endsWith('_years') || dateFilter.endsWith('_year')) {
    const years = parseInt(dateFilter.split('_')[0], 10);
    if (!Number.isNaN(years)) to.setFullYear(to.getFullYear() + years);
  }

  return { from: localIsoDate(from), to: localIsoDate(to) };
};

export const rangeForFilter = (dateFilter: string, custom: CustomRange): CustomRange => {
  const toDateObj = new Date();
  const fromDateObj = new Date();

  if (dateFilter === 'custom') {
    return {
      from: custom.from || isoDate(fromDateObj),
      to: custom.to || isoDate(toDateObj),
    };
  }
  if (dateFilter === 'today') {
    return { from: isoDate(fromDateObj), to: isoDate(toDateObj) };
  }
  if (dateFilter === '1_week') {
    fromDateObj.setDate(toDateObj.getDate() - 7);
  } else if (dateFilter === '1_month') {
    fromDateObj.setMonth(toDateObj.getMonth() - 1);
  } else if (dateFilter.endsWith('_months') || dateFilter.endsWith('_month')) {
    const num = parseInt(dateFilter.split('_')[0], 10);
    if (!Number.isNaN(num)) fromDateObj.setMonth(toDateObj.getMonth() - num);
  } else if (dateFilter.endsWith('_years') || dateFilter.endsWith('_year')) {
    const num = parseInt(dateFilter.split('_')[0], 10);
    if (!Number.isNaN(num)) fromDateObj.setFullYear(toDateObj.getFullYear() - num);
  }

  return { from: isoDate(fromDateObj), to: isoDate(toDateObj) };
};

export const weekRanges = () => {
  const today = new Date();
  const thisWeekFrom = new Date(today);
  thisWeekFrom.setDate(today.getDate() - 7);
  const prevWeekTo = new Date(thisWeekFrom);
  prevWeekTo.setDate(prevWeekTo.getDate() - 1);
  const prevWeekFrom = new Date(prevWeekTo);
  prevWeekFrom.setDate(prevWeekTo.getDate() - 6);
  return {
    thisWeek: { from: isoDate(thisWeekFrom), to: isoDate(today) },
    lastWeek: { from: isoDate(prevWeekFrom), to: isoDate(prevWeekTo) },
  };
};

const CACHE_TTL_MS = 60_000;
const reportCache = new Map<string, { at: number; data: any }>();
const reportInflight = new Map<string, Promise<any>>();

const selectedBranchKey = () => {
  try {
    const scope = JSON.parse(localStorage.getItem('branchScope') || 'null');
    return String(scope?.selected_branch_id || 'all');
  } catch {
    return 'all';
  }
};

const reportCacheKey = (token: string, module: string, from: string, to: string) =>
  `${module}:${from}:${to}:${selectedBranchKey()}:${token.slice(-12)}`;

export function invalidateReportCache() {
  reportCache.clear();
}

export async function fetchReportModule(
  token: string,
  module: string,
  from: string,
  to: string,
  options?: { force?: boolean },
) {
  const key = reportCacheKey(token, module, from, to);
  if (!options?.force) {
    const cached = reportCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
    const pending = reportInflight.get(key);
    if (pending) return pending;
  }

  const request = (async () => {
    const params = new URLSearchParams({ from, to });
    const res = await fetch(`/api/v1/reports/${module}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.message || 'Failed to fetch report');
    }
    reportCache.set(key, { at: Date.now(), data: payload.data });
    return payload.data;
  })().finally(() => {
    reportInflight.delete(key);
  });

  reportInflight.set(key, request);
  return request;
}

export const num = (value: unknown) => Number(value || 0);

export const statusCount = (rows: any[] | undefined, name: string) =>
  num(
    (rows || []).find((row: any) => String(row.status || '').toLowerCase() === name)?.total_appointments,
  );

export const consultRateFromDaily = (rows: any[] | undefined) => {
  const list = rows || [];
  const total = list.reduce((sum, row) => sum + num(row.total_appointments), 0);
  const completed = list.reduce((sum, row) => sum + num(row.completed_appointments), 0);
  return {
    total,
    completed,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const REPORT_WINDOWS = [
  'overdue',
  'today',
  '1_week',
  '1_month',
  '2_months',
  '3_months',
  '6_months',
  '1_year',
  '2_years',
  '3_years',
  'custom',
] as const;

export const parseReportWindow = (value: string | null | undefined, fallback: string) => {
  const raw = String(value || '').trim();
  return REPORT_WINDOWS.includes(raw as (typeof REPORT_WINDOWS)[number]) ? raw : fallback;
};

export const nowCardHref = (path: string, window: string) =>
  `${path}?window=${encodeURIComponent(window)}&from=now`;

const DUE_WINDOW_KEYS: Record<string, string> = {
  overdue: 'reports_next.follow_ups.filter_overdue',
  today: 'reports_next.follow_ups.filter_today',
  '1_week': 'reports_next.follow_ups.filter_week',
  '1_month': 'reports_next.follow_ups.filter_month',
  '2_months': 'reports_next.follow_ups.filter_2_months',
  '3_months': 'reports_next.follow_ups.filter_3_months',
  '6_months': 'reports_next.follow_ups.filter_6_months',
  '1_year': 'reports_next.follow_ups.filter_1_year',
  '2_years': 'reports_next.follow_ups.filter_2_years',
  '3_years': 'reports_next.follow_ups.filter_3_years',
  custom: 'reports_next.custom',
};

const HISTORY_WINDOW_KEYS: Record<string, string> = {
  today: 'reports_next.today',
  '1_week': 'reports_next.one_week',
  '1_month': 'reports_next.one_month',
  '2_months': 'reports_next.two_months',
  '3_months': 'reports_next.last_three_months',
  '6_months': 'reports_next.six_months',
  '1_year': 'reports_next.one_year',
  '2_years': 'reports_next.two_years',
  '3_years': 'reports_next.three_years',
  custom: 'reports_next.custom',
};

export const reportWindowLabelKey = (id: string, mode: 'due' | 'history' = 'history') => {
  const map = mode === 'due' ? DUE_WINDOW_KEYS : HISTORY_WINDOW_KEYS;
  return map[id] || 'reports_next.selected_period';
};

export const formatReportWindowLabel = (
  translate: (key: string) => string,
  dateFilter: string,
  custom: CustomRange,
  dateLocale: string,
  mode: 'due' | 'history' = 'history',
) => {
  if (dateFilter === 'custom' && custom.from && custom.to) {
    const fmt = (iso: string) => {
      const date = parseIsoDate(iso);
      return date ? date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' }) : iso;
    };
    return `${fmt(custom.from)} – ${fmt(custom.to)}`;
  }
  return translate(reportWindowLabelKey(dateFilter, mode));
};

export const patientRecordsHref = (item: {
  patient_mobile_no?: unknown;
  patient_full_name?: unknown;
  fk_patient_id?: unknown;
}) => {
  const search = String(item.patient_mobile_no || item.patient_full_name || '').trim();
  if (!search) return '';
  const params = new URLSearchParams({ search });
  if (item.fk_patient_id) params.set('patient_id', String(item.fk_patient_id));
  return `/patient-records?${params.toString()}`;
};

export const rupee = (value: unknown) =>
  `₹${num(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
