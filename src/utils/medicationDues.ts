export type DueBill = {
  bill_id: number;
  bill_number?: string;
  consultation_id?: number | null;
  appointment_id?: number | null;
  pending_amount: number | string;
  total_amount?: number | string;
  paid_amount?: number | string;
  due_date?: string | null;
  created_at?: string | null;
  auid?: string | null;
  treatment_name?: string | null;
  doctor_name?: string | null;
  branch_name?: string | null;
  is_repeat_medicine?: boolean;
  payment_status?: string;
};

export type AccountDues = {
  total_pending?: number | string;
  bills_count?: number;
  bills?: DueBill[];
};

export type AllocationOrder = 'CURRENT_FIRST' | 'CURRENT_ONLY' | 'PREVIOUS_FIRST';

const moneyNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

export const formatMoney = (value: number | string | null | undefined) => `₹ ${moneyNumber(value).toFixed(2)}`;

export const formatDueDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function previewMedicationReceipt({
  receivedAmount,
  currentPending,
  previousBills = [],
  allocationOrder = 'CURRENT_FIRST',
}: {
  receivedAmount: number;
  currentPending: number;
  previousBills?: DueBill[];
  allocationOrder?: AllocationOrder;
}) {
  const received = moneyNumber(receivedAmount);
  const currentDue = moneyNumber(currentPending);
  const previous = previousBills
    .map((bill) => ({
      ...bill,
      pending_amount: moneyNumber(bill.pending_amount),
    }))
    .filter((bill) => bill.pending_amount > 0);

  const previousTotal = moneyNumber(previous.reduce((sum, bill) => sum + bill.pending_amount, 0));
  const totalDue = moneyNumber(currentDue + previousTotal);
  let remaining = received;
  let currentApplied = 0;

  const applyCurrent = () => {
    currentApplied = Math.min(currentDue, remaining);
    remaining = moneyNumber(remaining - currentApplied);
  };

  const previousAllocations = previous.map((bill) => ({
    ...bill,
    applied: 0,
    remaining: bill.pending_amount,
  }));

  const applyPrevious = () => {
    previousAllocations.forEach((bill) => {
      if (remaining <= 0) return;
      const applied = Math.min(bill.remaining, remaining);
      bill.applied = moneyNumber(bill.applied + applied);
      bill.remaining = moneyNumber(bill.remaining - applied);
      remaining = moneyNumber(remaining - applied);
    });
  };

  if (allocationOrder === 'PREVIOUS_FIRST') {
    applyPrevious();
    applyCurrent();
  } else if (allocationOrder === 'CURRENT_ONLY') {
    applyCurrent();
  } else {
    applyCurrent();
    applyPrevious();
  }

  const previousApplied = moneyNumber(previousAllocations.reduce((sum, bill) => sum + bill.applied, 0));

  return {
    received,
    currentApplied,
    currentRemaining: moneyNumber(currentDue - currentApplied),
    previousApplied,
    previousRemaining: moneyNumber(previousTotal - previousApplied),
    previousAllocations,
    totalDue,
    totalRemaining: moneyNumber(totalDue - Math.min(received, totalDue)),
    overpay: moneyNumber(Math.max(0, received - totalDue)),
  };
}

export function moneyValue(value: number | string | null | undefined) {
  return moneyNumber(value).toFixed(2);
}

export function balanceSplitAmounts({
  collectTarget,
  edited,
  typedAmount,
}: {
  collectTarget: number;
  edited: 'cash' | 'online';
  typedAmount: number;
}) {
  const target = moneyNumber(Math.max(0, collectTarget));
  const typed = Math.min(target, Math.max(0, moneyNumber(typedAmount)));
  if (edited === 'online') {
    return { cash: moneyNumber(target - typed), online: typed };
  }
  return { cash: typed, online: moneyNumber(target - typed) };
}

export function rebalanceSplitOnTotalChange({
  collectTarget,
  cashAmount,
  onlineAmount,
  prefer = 'cash',
}: {
  collectTarget: number;
  cashAmount: number;
  onlineAmount: number;
  prefer?: 'cash' | 'online';
}) {
  const target = moneyNumber(Math.max(0, collectTarget));
  if (prefer === 'online') {
    const online = Math.min(moneyNumber(onlineAmount), target);
    return { cash: moneyNumber(target - online), online };
  }
  const cash = Math.min(moneyNumber(cashAmount), target);
  return { cash, online: moneyNumber(target - cash) };
}

export function buildMedicationPaymentPayload({
  splitPayment,
  cashAmount,
  onlineAmount,
  paymentMode,
  collectedAmount,
  transactionReference,
  paymentRemark,
  allocationOrder,
}: {
  splitPayment: boolean;
  cashAmount: string;
  onlineAmount: string;
  paymentMode: 'CASH' | 'ONLINE';
  collectedAmount: string;
  transactionReference: string;
  paymentRemark?: string | null;
  allocationOrder: AllocationOrder;
}) {
  const remark = String(paymentRemark || '').trim() || null;
  const reference = String(transactionReference || '').trim() || null;

  if (splitPayment) {
    return {
      split: true,
      cash_amount: moneyNumber(cashAmount),
      online_amount: moneyNumber(onlineAmount),
      amount: moneyNumber(Number(cashAmount || 0) + Number(onlineAmount || 0)),
      transaction_reference: reference,
      remark,
      allocation_order: allocationOrder,
    };
  }

  return {
    payment_mode: paymentMode,
    amount: moneyNumber(collectedAmount),
    transaction_reference: paymentMode === 'ONLINE' ? reference : null,
    remark,
    allocation_order: allocationOrder,
  };
}
