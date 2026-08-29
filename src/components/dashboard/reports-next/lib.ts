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
  const raw = String(value || '').slice(0, 10);
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
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
    to.setDate(to.getDate() + 7);
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

export const rupee = (value: unknown) =>
  `₹${num(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
