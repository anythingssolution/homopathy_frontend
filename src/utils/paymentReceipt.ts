export type PaymentReceiptLine = {
  bill_number?: string | null;
  kind: 'CURRENT' | 'PREVIOUS';
  amount: number;
  pending_after?: number | null;
  payment_mode?: string | null;
};

export type PaymentReceiptData = {
  patient_name: string;
  patient_mobile?: string | null;
  collected_at: string;
  total_received: number;
  payment_mode?: string | null;
  cash_amount?: number;
  online_amount?: number;
  transaction_reference?: string | null;
  remark?: string | null;
  lines: PaymentReceiptLine[];
  remaining_total?: number | null;
  no_new_bill: boolean;
  current_bill_number?: string | null;
};

const money = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const kindOf = (value: unknown): 'CURRENT' | 'PREVIOUS' => (
  String(value || 'CURRENT').toUpperCase() === 'PREVIOUS' ? 'PREVIOUS' : 'CURRENT'
);

export const formatReceiptDateTime = (value: unknown, locale = 'en-GB') => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isSameLocalDay = (value: unknown, compareTo = new Date()) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === compareTo.getFullYear()
    && date.getMonth() === compareTo.getMonth()
    && date.getDate() === compareTo.getDate()
  );
};

export const receiptFromAllocation = ({
  patientName,
  patientMobile,
  allocation,
  paymentMode,
  cashAmount,
  onlineAmount,
  splitPayment,
  remainingTotal,
  collectedAt,
  currentBillNumber,
  noNewBill,
  remark,
  transactionReference,
}: {
  patientName: string;
  patientMobile?: string | null;
  allocation?: any;
  paymentMode?: string | null;
  cashAmount?: string | number | null;
  onlineAmount?: string | number | null;
  splitPayment?: boolean;
  remainingTotal?: number | null;
  collectedAt?: string | Date | null;
  currentBillNumber?: string | null;
  noNewBill?: boolean;
  remark?: string | null;
  transactionReference?: string | null;
}): PaymentReceiptData | null => {
  const payments = Array.isArray(allocation?.payments) ? allocation.payments : [];
  const previous = Array.isArray(allocation?.previous_allocations) ? allocation.previous_allocations : [];
  const lines: PaymentReceiptLine[] = payments.length > 0
    ? payments.map((payment: any) => ({
      bill_number: payment.bill_number || currentBillNumber || null,
      kind: kindOf(payment.kind || payment.allocation_kind),
      amount: money(payment.amount),
      pending_after: payment.pending_after == null ? null : money(payment.pending_after),
      payment_mode: payment.payment_mode || paymentMode || null,
    }))
    : previous.map((item: any) => ({
      bill_number: item.bill_number || null,
      kind: 'PREVIOUS' as const,
      amount: money(item.amount),
      pending_after: item.pending_after == null ? null : money(item.pending_after),
      payment_mode: paymentMode || null,
    }));

  if (lines.length === 0 && money(allocation?.current_applied) > 0 && currentBillNumber) {
    lines.push({
      bill_number: currentBillNumber,
      kind: 'CURRENT',
      amount: money(allocation.current_applied),
      payment_mode: paymentMode || null,
    });
  }

  if (lines.length === 0) return null;

  return {
    patient_name: patientName,
    patient_mobile: patientMobile || null,
    collected_at: collectedAt
      ? String(collectedAt)
      : String(allocation?.collected_at || new Date().toISOString()),
    total_received: money(allocation?.received || lines.reduce((sum, line) => sum + line.amount, 0)),
    payment_mode: splitPayment ? 'MIXED' : (paymentMode || lines[0]?.payment_mode || null),
    cash_amount: splitPayment ? money(cashAmount) : undefined,
    online_amount: splitPayment ? money(onlineAmount) : undefined,
    transaction_reference: transactionReference || null,
    remark: remark || null,
    lines,
    remaining_total: remainingTotal == null ? money(allocation?.total_remaining) : remainingTotal,
    no_new_bill: Boolean(noNewBill),
    current_bill_number: currentBillNumber || allocation?.current_bill_number || null,
  };
};

export const receiptFromPayments = ({
  patientName,
  patientMobile,
  payments,
  remainingTotal,
}: {
  patientName: string;
  patientMobile?: string | null;
  payments: any[];
  remainingTotal?: number | null;
}): PaymentReceiptData | null => {
  const rows = (Array.isArray(payments) ? payments : [])
    .filter((payment) => Number(payment?.amount || 0) > 0)
    .sort((a, b) => new Date(b.collected_at || b.created_at || 0).getTime() - new Date(a.collected_at || a.created_at || 0).getTime());
  if (rows.length === 0) return null;

  const latest = rows[0];
  const latestTime = new Date(latest.collected_at || latest.created_at || 0).getTime();
  const eventRows = rows.filter((payment) => {
    const time = new Date(payment.collected_at || payment.created_at || 0).getTime();
    return time === latestTime && String(payment.payment_mode || '') === String(latest.payment_mode || '');
  });
  const lines = eventRows.map((payment) => ({
    bill_number: payment.bill_number || payment.settlement_source_bill_number || null,
    kind: kindOf(payment.allocation_kind || payment.kind),
    amount: money(payment.amount),
    pending_after: payment.pending_after == null ? null : money(payment.pending_after),
    payment_mode: payment.payment_mode || null,
  }));
  const hasCurrent = lines.some((line) => line.kind === 'CURRENT');

  return {
    patient_name: patientName,
    patient_mobile: patientMobile || null,
    collected_at: String(latest.collected_at || latest.created_at || new Date().toISOString()),
    total_received: money(eventRows.reduce((sum, payment) => sum + money(payment.amount), 0)),
    payment_mode: latest.payment_mode || null,
    transaction_reference: latest.transaction_reference || null,
    remark: latest.remark || null,
    lines,
    remaining_total: remainingTotal == null ? null : remainingTotal,
    no_new_bill: !hasCurrent,
    current_bill_number: hasCurrent ? (latest.bill_number || null) : null,
  };
};
