import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Calendar, ChevronDown, IndianRupee } from 'lucide-react';
import {
  AllocationOrder,
  DueBill,
  formatDueDate,
  formatMoney,
  previewMedicationReceipt,
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
  showRemark?: boolean;
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
  showRemark = true,
}: Props) {
  const [duesOpen, setDuesOpen] = useState(true);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const previousPending = previousBills.reduce((sum, bill) => sum + Number(bill.pending_amount || 0), 0);
  const received = Number(collectedAmount || 0) || 0;
  const preview = useMemo(
    () => previewMedicationReceipt({
      receivedAmount: received,
      currentPending: todayAmount,
      previousBills,
      allocationOrder,
    }),
    [received, todayAmount, previousBills, allocationOrder]
  );

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

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#549E9E]/15 bg-white px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Today's bill</p>
          <p className="text-base font-black text-[#549E9E]">{formatMoney(todayAmount)}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-white px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total due</p>
          <p className="text-base font-black text-orange-500">{formatMoney(preview.totalDue)}</p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2">
        <input
          type="checkbox"
          checked={allocationOrder === 'PREVIOUS_FIRST'}
          onChange={(event) => onAllocationOrderChange(event.target.checked ? 'PREVIOUS_FIRST' : 'CURRENT_FIRST')}
          className="h-4 w-4 accent-[#549E9E]"
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
          Pay previous dues first
        </span>
      </label>

      <div className="space-y-1">
        <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
          Amount received
        </label>
        <div className="relative">
          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="number"
            min="0"
            step="0.01"
            value={collectedAmount}
            onChange={(event) => onCollectedAmountChange(event.target.value)}
            placeholder="0"
            className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-8 pr-4 text-xs font-black text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
          />
        </div>
        <p className="pl-1 text-[10px] font-bold text-gray-400">
          Enter less than today's bill to borrow the remaining amount. Enter 0 to borrow the full bill.
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

      <div className="space-y-1">
        <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
          Transaction Reference
          {paymentMode === 'ONLINE' && received > 0
            ? <span className="ml-1 text-red-400">*</span>
            : <span className="ml-1 font-bold normal-case tracking-normal text-gray-400">(Optional)</span>}
        </label>
        <input
          type="text"
          value={transactionReference}
          onChange={(event) => onTransactionReferenceChange(event.target.value)}
          placeholder={paymentMode === 'ONLINE' ? 'Enter UPI / Paytm / Card txn ID' : 'e.g. UPI ref, cheque no...'}
          className="w-full rounded-full border-none bg-gray-50 py-2.5 pl-4 pr-4 text-xs font-bold text-gray-700 outline-none transition-all focus:ring-2 focus:ring-[#549E9E]/20"
        />
      </div>

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
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-gray-500">Applied to today</span>
          <span className="font-black text-[#549E9E]">{formatMoney(preview.currentApplied)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-gray-500">Applied to previous</span>
          <span className="font-black text-emerald-600">{formatMoney(preview.previousApplied)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-gray-500">Borrowed / remaining today</span>
          <span className="font-black text-orange-500">{formatMoney(preview.currentRemaining)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 pt-1.5 text-[11px] font-black">
          <span className="uppercase tracking-widest text-gray-500">Total remaining after this</span>
          <span className="text-orange-600">{formatMoney(preview.totalRemaining)}</span>
        </div>
        {preview.overpay > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-2 py-2 text-[10px] font-bold text-red-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            Amount received is {formatMoney(preview.overpay)} more than total due.
          </div>
        )}
      </div>
    </div>
  );
}
