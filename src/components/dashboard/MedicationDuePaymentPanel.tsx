import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Calendar, ChevronDown, IndianRupee } from 'lucide-react';
import {
  AllocationOrder,
  DueBill,
  balanceSplitAmounts,
  formatDueDate,
  formatMoney,
  previewMedicationReceipt,
  rebalanceSplitOnTotalChange,
} from '../../utils/medicationDues';

type Props = {
  todayAmount: number;
  previousBills?: DueBill[];
  collectedAmount: string;
  onCollectedAmountChange: (value: string) => void;
  paymentMode: 'CASH' | 'ONLINE';
  onPaymentModeChange: (value: 'CASH' | 'ONLINE') => void;
  transactionReference: string;
  onTransactionReferenceChange: (value: string) => void;
  paymentRemark?: string;
  onPaymentRemarkChange?: (value: string) => void;
  allocationOrder: AllocationOrder;
  onAllocationOrderChange: (value: AllocationOrder) => void;
  splitPayment: boolean;
  onSplitPaymentChange: (value: boolean) => void;
  cashAmount: string;
  onCashAmountChange: (value: string) => void;
  onlineAmount: string;
  onOnlineAmountChange: (value: string) => void;
  showRemark?: boolean;
};

const AmountNumberInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return undefined;
    const ignoreWheel = (event: WheelEvent) => event.preventDefault();
    input.addEventListener('wheel', ignoreWheel, { passive: false });
    return () => input.removeEventListener('wheel', ignoreWheel);
  }, []);

  return <input {...props} ref={inputRef} type="number" className={className} />;
};

export default function MedicationDuePaymentPanel({
  todayAmount,
  previousBills = [],
  collectedAmount,
  onCollectedAmountChange,
  paymentMode,
  onPaymentModeChange,
  transactionReference,
  onTransactionReferenceChange,
  paymentRemark = '',
  onPaymentRemarkChange,
  allocationOrder,
  onAllocationOrderChange,
  splitPayment,
  onSplitPaymentChange,
  cashAmount,
  onCashAmountChange,
  onlineAmount,
  onOnlineAmountChange,
  showRemark = true,
}: Props) {
  const [duesOpen, setDuesOpen] = useState(true);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const previousPending = previousBills.reduce((sum, bill) => sum + Number(bill.pending_amount || 0), 0);
  const includePrevious = allocationOrder !== 'CURRENT_ONLY' && previousPending > 0;
  const collectTarget = Number((includePrevious ? todayAmount + previousPending : todayAmount).toFixed(2));
  const received = splitPayment ? collectTarget : (Number(collectedAmount || 0) || 0);
  const preview = useMemo(
    () => previewMedicationReceipt({
      receivedAmount: received,
      currentPending: todayAmount,
      previousBills: includePrevious ? previousBills : [],
      allocationOrder: includePrevious ? 'CURRENT_FIRST' : 'CURRENT_ONLY',
    }),
    [received, todayAmount, previousBills, includePrevious]
  );

  const moneyValue = (value: number) => Number(Math.max(0, value).toFixed(2)).toFixed(2);
  const cashReceived = Number(cashAmount || 0) || 0;
  const onlineReceived = Number(onlineAmount || 0) || 0;
  const lastSplitField = useRef<'cash' | 'online'>('cash');
  const lastCollectTarget = useRef(collectTarget);

  const applySplitAmounts = (nextCash: string, nextOnline: string) => {
    onCashAmountChange(nextCash);
    onOnlineAmountChange(nextOnline);
    onCollectedAmountChange(moneyValue(collectTarget));
  };

  useEffect(() => {
    if (!splitPayment) {
      lastCollectTarget.current = collectTarget;
      return;
    }
    const targetChanged = lastCollectTarget.current !== collectTarget;
    lastCollectTarget.current = collectTarget;
    if (!targetChanged) {
      return;
    }
    const next = rebalanceSplitOnTotalChange({
      collectTarget,
      cashAmount: cashReceived,
      onlineAmount: onlineReceived,
      prefer: lastSplitField.current,
    });
    applySplitAmounts(moneyValue(next.cash), moneyValue(next.online));
  }, [splitPayment, collectTarget]);

  const setSplitEdited = (edited: 'cash' | 'online', raw: string) => {
    lastSplitField.current = edited;
    if (raw !== '' && raw !== '.' && !Number.isFinite(Number(raw))) {
      return;
    }
    const typed = raw === '' || raw === '.' ? 0 : Number(raw);
    const next = balanceSplitAmounts({
      collectTarget,
      edited,
      typedAmount: typed,
    });
    if (edited === 'online') {
      onOnlineAmountChange(typed > collectTarget ? moneyValue(collectTarget) : raw);
      onCashAmountChange(moneyValue(next.cash));
    } else {
      onCashAmountChange(typed > collectTarget ? moneyValue(collectTarget) : raw);
      onOnlineAmountChange(moneyValue(next.online));
    }
    onCollectedAmountChange(moneyValue(collectTarget));
  };

  const toggleIncludePrevious = (checked: boolean) => {
    onAllocationOrderChange(checked ? 'CURRENT_FIRST' : 'CURRENT_ONLY');
    if (!splitPayment) {
      onCollectedAmountChange(moneyValue(checked ? todayAmount + previousPending : todayAmount));
    }
  };
  const toggleSplitPayment = (checked: boolean) => {
    onSplitPaymentChange(checked);
    setPaymentDropdownOpen(false);
    if (checked) {
      lastSplitField.current = 'cash';
      lastCollectTarget.current = collectTarget;
      applySplitAmounts(moneyValue(collectTarget), '0');
    } else {
      onCollectedAmountChange(moneyValue(collectTarget));
      onPaymentModeChange(onlineReceived > 0 && cashReceived <= 0 ? 'ONLINE' : 'CASH');
    }
  };

  return (
    <div className="space-y-3">
      {previousPending > 0 && (
        <div className="overflow-hidden rounded-xl border-2 border-orange-200 bg-orange-50/70">
          <button
            type="button"
            onClick={() => setDuesOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Previous pending</p>
              <p className="text-lg font-black text-orange-600">{formatMoney(previousPending)}</p>
              <p className="mt-0.5 text-[10px] font-bold text-orange-500/80">
                Old unpaid medicine bill{previousBills.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500">
              {previousBills.length} visit{previousBills.length === 1 ? '' : 's'}
              <ChevronDown size={14} className={duesOpen ? 'rotate-180' : ''} />
            </div>
          </button>
          {duesOpen && (
            <div className="space-y-2 border-t border-orange-100 bg-white/80 p-3">
              {previousBills.map((bill) => (
                <div key={bill.bill_id} className="rounded-lg border border-orange-100 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-gray-800">
                        {bill.is_repeat_medicine ? 'Repeat Medicine' : (bill.treatment_name || 'Consultation')}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <Calendar size={11} />
                        {formatDueDate(bill.due_date || bill.created_at)}
                        {bill.auid ? ` • ${bill.auid}` : ''}
                        {bill.consultation_id ? ` • Consult #${bill.consultation_id}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-black text-orange-600">{formatMoney(bill.pending_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-gray-100 bg-white px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-gray-500">Today's medicines</span>
          <span className="text-sm font-black text-[#549E9E]">{formatMoney(todayAmount)}</span>
        </div>
        {previousPending > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-gray-500">Previous pending</span>
            <span className="text-sm font-black text-orange-500">{formatMoney(previousPending)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-gray-50 pt-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            {includePrevious ? 'Total to collect' : 'Collect today'}
          </span>
          <span className="text-base font-black text-gray-800">
            {formatMoney(includePrevious ? todayAmount + previousPending : todayAmount)}
          </span>
        </div>
      </div>

      {previousPending > 0 && (
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
          <input
            type="checkbox"
            checked={includePrevious}
            onChange={(event) => toggleIncludePrevious(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#549E9E]"
          />
          <span>
            <span className="block text-[11px] font-black text-gray-700">
              Also collect previous pending {formatMoney(previousPending)}
            </span>
            <span className="mt-0.5 block text-[10px] font-bold leading-snug text-gray-400">
              Tick this to add old dues in this payment. You can still type a smaller extra amount if they cannot pay all of it.
            </span>
          </span>
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={splitPayment}
          onChange={(event) => toggleSplitPayment(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#549E9E]"
        />
        <span>
          <span className="block text-[11px] font-black text-gray-700">Pay cash and online</span>
          <span className="mt-0.5 block text-[10px] font-bold leading-snug text-gray-400">
            Tick this if they pay some cash and some UPI / card now.
          </span>
        </span>
      </label>

      {splitPayment ? (
        <div className="space-y-3 rounded-xl border border-gray-100 bg-white px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">Cash</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <AmountNumberInput
                  min="0"
                  step="0.01"
                  value={cashAmount}
                  onChange={(event) => setSplitEdited('cash', event.target.value)}
                  max={collectTarget}
                  placeholder="0"
                  className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-8 pr-3 text-xs font-black text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">Online</label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <AmountNumberInput
                  min="0"
                  step="0.01"
                  value={onlineAmount}
                  onChange={(event) => setSplitEdited('online', event.target.value)}
                  max={collectTarget}
                  placeholder="0"
                  className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-8 pr-3 text-xs font-black text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total received</span>
            <span className="text-sm font-black text-gray-800">{formatMoney(collectTarget)}</span>
          </div>
          <p className="text-[10px] font-bold leading-snug text-gray-400">
            Type cash or online — the other amount fills in so both add up to {formatMoney(collectTarget)}.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              Amount received
            </label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <AmountNumberInput
                min="0"
                step="0.01"
                value={collectedAmount}
                onChange={(event) => onCollectedAmountChange(event.target.value)}
                placeholder="0"
                className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-8 pr-4 text-xs font-black text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
              />
            </div>
            <p className="pl-1 text-[10px] font-bold text-gray-400">
              {includePrevious
                ? 'Pay today first. Extra money goes to previous pending. Type less if they can pay only part of the old bill.'
                : 'This amount is for today\'s medicines. Type less if they will pay the rest later.'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">Payment Mode</label>
            <div className="relative" ref={paymentDropdownRef}>
              <button
                type="button"
                onClick={() => setPaymentDropdownOpen((open) => !open)}
                className="flex w-full cursor-pointer items-center justify-between rounded-full bg-gray-50 py-2.5 pl-4 pr-3 text-xs font-black text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
              >
                <span>{paymentMode === 'CASH' ? '💵 Cash' : '📱 Online (UPI / Paytm / Card)'}</span>
                <ChevronDown size={12} className={`text-[#549E9E] ${paymentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {paymentDropdownOpen && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-[16px] border border-gray-100 bg-white py-1 shadow-xl">
                  {([
                    { value: 'CASH', label: '💵 Cash' },
                    { value: 'ONLINE', label: '📱 Online (UPI / Paytm / Card)' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onPaymentModeChange(option.value);
                        setPaymentDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-black transition-all ${
                        paymentMode === option.value ? 'bg-[#549E9E]/10 text-[#549E9E]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {(!splitPayment || onlineReceived > 0) && (
        <div className="space-y-1">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
            Transaction Reference
            {(splitPayment ? onlineReceived > 0 : paymentMode === 'ONLINE' && received > 0)
              ? <span className="ml-1 text-red-400">*</span>
              : <span className="ml-1 font-bold normal-case tracking-normal text-gray-400">(Optional)</span>}
          </label>
          <input
            type="text"
            value={transactionReference}
            onChange={(event) => onTransactionReferenceChange(event.target.value)}
            placeholder={(splitPayment ? onlineReceived > 0 : paymentMode === 'ONLINE')
              ? 'Enter UPI / Paytm / Card txn ID'
              : 'e.g. UPI ref, cheque no...'}
            className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-4 pr-4 text-xs font-bold text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
          />
        </div>
      )}

      {showRemark && onPaymentRemarkChange && (
        <div className="space-y-1">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
            Payment Note
            <span className="ml-1 font-bold normal-case tracking-normal text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            value={paymentRemark}
            onChange={(event) => onPaymentRemarkChange(event.target.value)}
            placeholder="e.g. Collected at counter / borrowed remaining"
            className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-4 pr-4 text-xs font-bold text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
          />
        </div>
      )}

      <div className="space-y-1.5 rounded-xl border border-gray-100 bg-white px-3 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">This payment</p>
        {splitPayment && (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-gray-500">Cash</span>
              <span className="font-black text-gray-800">{formatMoney(cashReceived)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-gray-500">Online</span>
              <span className="font-black text-blue-600">{formatMoney(onlineReceived)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-gray-500">Paying for today</span>
          <span className="font-black text-[#549E9E]">{formatMoney(preview.currentApplied)}</span>
        </div>
        {previousPending > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-500">Paying for previous</span>
            <span className="font-black text-emerald-600">{formatMoney(preview.previousApplied)}</span>
          </div>
        )}
        {preview.currentRemaining > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-500">Still pending today</span>
            <span className="font-black text-orange-500">{formatMoney(preview.currentRemaining)}</span>
          </div>
        )}
        {previousPending > 0 && preview.previousRemaining > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-500">Still pending previous</span>
            <span className="font-black text-orange-500">{formatMoney(preview.previousRemaining)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-50 pt-1.5 text-[11px] font-black">
          <span className="text-gray-500">Still pending after this</span>
          <span className={
            (includePrevious ? preview.totalRemaining : preview.currentRemaining + previousPending) > 0
              ? 'text-orange-600'
              : 'text-emerald-600'
          }>
            {formatMoney(includePrevious ? preview.totalRemaining : preview.currentRemaining + previousPending)}
          </span>
        </div>
        {preview.overpay > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-2 py-2 text-[10px] font-bold text-red-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {includePrevious
              ? `Amount received is ${formatMoney(preview.overpay)} more than total due.`
              : `Amount is more than today's bill. Tick previous pending to use the extra ${formatMoney(preview.overpay)}.`}
          </div>
        )}
      </div>
    </div>
  );
}
