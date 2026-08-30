import { getLocalDateString } from '../../../utils/date';
import { parseIsoDate, type CustomRange } from '../reports-next/lib';

export type WorkTab = 'attention' | 'visits' | 'practice';
export type AgeingFilter = 'all' | 'week' | 'month' | 'older';

export type VisitRow = {
  group_key: string;
  appointment_id: number | null;
  is_repeat_medicine: boolean;
  auid?: string;
  appointment_date?: string;
  token_number?: number | string | null;
  display_token_display?: string | null;
  queue_position?: number | string | null;
  start_time?: string | null;
  patient_id?: number;
  patient_full_name?: string;
  patient_mobile_no?: string;
  treatment_name?: string | null;
  branch_name?: string;
  booked_for_type?: string;
  family_member_relationship?: string;
  primary_patient_full_name?: string;
  payment_mode?: string | null;
  cash_amount: number;
  online_amount: number;
  consultation_completed_at?: string | null;
  bills: any[];
  grand_total: number;
  grand_paid: number;
  grand_pending: number;
  paid_towards_this_bill: number;
  paid_towards_previous_pending: number;
  consult_total: number;
  medicine_total: number;
  overall_payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
};

export const money = (value: unknown, digits = 0) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;

export const moneyExact = (value: unknown) => money(value, 2);

export const rangeForLocalFilter = (dateFilter: string, custom: CustomRange): CustomRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = getLocalDateString(today);
  const fromDate = new Date(today);

  if (dateFilter === 'custom') {
    return {
      from: custom.from || to,
      to: custom.to || to,
    };
  }
  if (dateFilter === 'today') return { from: to, to };
  if (dateFilter === '1_week') fromDate.setDate(fromDate.getDate() - 7);
  else if (dateFilter === '1_month') fromDate.setMonth(fromDate.getMonth() - 1);
  else if (dateFilter.endsWith('_months')) {
    const months = parseInt(dateFilter, 10);
    if (!Number.isNaN(months)) fromDate.setMonth(fromDate.getMonth() - months);
  } else if (dateFilter === '1_year' || dateFilter.endsWith('_years')) {
    const years = parseInt(dateFilter, 10);
    if (!Number.isNaN(years)) fromDate.setFullYear(fromDate.getFullYear() - years);
  }

  return { from: getLocalDateString(fromDate), to };
};

export const daysBetween = (value: unknown) => {
  const date = parseIsoDate(value);
  if (!date) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - date.getTime()) / 86_400_000));
};

export const deriveStatus = (paid: number, pending: number, total: number) => {
  if (total > 0 && pending <= 0) return 'PAID' as const;
  if (paid > 0) return 'PARTIAL' as const;
  return 'UNPAID' as const;
};

const dateOrder = (value?: string | null) => {
  if (!value) return 0;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const timeOrder = (value?: string | null) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const groupVisits = (bills: any[]): VisitRow[] => {
  const grouped = new Map<string, VisitRow>();

  bills.forEach((bill) => {
    const appointmentId = Number(bill.appointment_id);
    const groupKey = appointmentId ? `apt-${appointmentId}` : `bill-${bill.bill_id}`;
    const billType = String(bill.bill_type || '').toUpperCase();
    const amount = Number(bill.total_amount || 0);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        group_key: groupKey,
        appointment_id: appointmentId || null,
        is_repeat_medicine: !appointmentId,
        auid: bill.auid || bill.bill_number,
        appointment_date: bill.appointment_date,
        token_number: bill.token_number,
        display_token_display: bill.display_token_display,
        queue_position: bill.queue_position,
        start_time: bill.start_time,
        patient_id: bill.patient_id,
        patient_full_name: bill.patient_full_name,
        patient_mobile_no: bill.patient_mobile_no,
        treatment_name: bill.treatment_name || (!appointmentId ? 'Repeat Medicine' : null),
        branch_name: bill.branch_name,
        booked_for_type: bill.booked_for_type,
        family_member_relationship: bill.family_member_relationship,
        primary_patient_full_name: bill.primary_patient_full_name,
        payment_mode: bill.payment_mode || null,
        cash_amount: 0,
        online_amount: 0,
        consultation_completed_at: bill.consultation_completed_at || null,
        bills: [],
        grand_total: 0,
        grand_paid: 0,
        grand_pending: 0,
        paid_towards_this_bill: 0,
        paid_towards_previous_pending: 0,
        consult_total: 0,
        medicine_total: 0,
        overall_payment_status: 'UNPAID',
      });
    }

    const entry = grouped.get(groupKey)!;
    if (!entry.payment_mode && bill.payment_mode) entry.payment_mode = bill.payment_mode;
    if (!entry.consultation_completed_at && bill.consultation_completed_at) {
      entry.consultation_completed_at = bill.consultation_completed_at;
    }
    entry.bills.push(bill);
    entry.cash_amount += Number(bill.cash_amount || 0);
    entry.online_amount += Number(bill.online_amount || 0);
    entry.grand_total += amount;
    entry.grand_paid += Number(bill.paid_amount || 0);
    entry.grand_pending += Number(bill.pending_amount || 0);
    entry.paid_towards_this_bill += Number(bill.paid_towards_this_bill || 0);
    entry.paid_towards_previous_pending += Number(bill.paid_towards_previous_pending || 0);
    if (billType === 'CONSULTATION') entry.consult_total += amount;
    else entry.medicine_total += amount;
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const cash = Number(entry.cash_amount.toFixed(2));
      const online = Number(entry.online_amount.toFixed(2));
      return {
        ...entry,
        grand_total: Number(entry.grand_total.toFixed(2)),
        grand_paid: Number(entry.grand_paid.toFixed(2)),
        grand_pending: Number(entry.grand_pending.toFixed(2)),
        paid_towards_this_bill: Number(entry.paid_towards_this_bill.toFixed(2)),
        paid_towards_previous_pending: Number(entry.paid_towards_previous_pending.toFixed(2)),
        consult_total: Number(entry.consult_total.toFixed(2)),
        medicine_total: Number(entry.medicine_total.toFixed(2)),
        cash_amount: cash,
        online_amount: online,
        payment_mode: cash > 0 && online > 0 ? 'MIXED' : online > 0 ? 'ONLINE' : cash > 0 ? 'CASH' : entry.payment_mode,
        overall_payment_status: deriveStatus(entry.grand_paid, entry.grand_pending, entry.grand_total),
      };
    })
    .sort((a, b) => {
      const completion = dateOrder(b.consultation_completed_at) - dateOrder(a.consultation_completed_at);
      if (completion !== 0) return completion;
      const dateDiff = dateOrder(b.appointment_date) - dateOrder(a.appointment_date);
      if (dateDiff !== 0) return dateDiff;
      const slotDiff = timeOrder(a.start_time) - timeOrder(b.start_time);
      if (slotDiff !== 0) return slotDiff;
      return Number(a.appointment_id || 0) - Number(b.appointment_id || 0);
    });
};

export const sessionRows = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return [...(value.morning || []), ...(value.evening || [])];
};

export const topMedicines = (value: any, limit = 8) => {
  const merged = new Map<string, { name: string; qty: number; gross: number; bills: number }>();
  sessionRows(value).forEach((row) => {
    const name = String(row.medicine_name || '').trim() || '—';
    const current = merged.get(name) || { name, qty: 0, gross: 0, bills: 0 };
    current.qty += Number(row.total_quantity_sold || 0);
    current.gross += Number(row.gross_revenue || 0);
    current.bills += Number(row.total_bills || 0);
    merged.set(name, current);
  });
  return Array.from(merged.values())
    .sort((a, b) => b.gross - a.gross)
    .slice(0, limit);
};

export const consultantTotals = (value: any) => {
  const rows = sessionRows(value);
  const sum = (key: string) => rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
  return {
    consults: sum('total_consultations'),
    consultation: sum('consultation_revenue'),
    medicine: sum('medication_revenue'),
    tests: sum('test_lab_revenue'),
    courier: sum('courier_revenue'),
    gross: sum('total_gross_revenue'),
    paid: sum('total_paid_revenue'),
    pending: sum('total_pending_revenue'),
    morningGross: (value?.morning || []).reduce((total: number, row: any) => total + Number(row.total_gross_revenue || 0), 0),
    eveningGross: (value?.evening || []).reduce((total: number, row: any) => total + Number(row.total_gross_revenue || 0), 0),
  };
};

export async function fetchBillRows(token: string, query: Record<string, string>) {
  const params = new URLSearchParams({ limit: '1000', ...query });
  const response = await fetch(`/api/v1/bills?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to fetch bills');
  return Array.isArray(result.data) ? result.data : [];
}
