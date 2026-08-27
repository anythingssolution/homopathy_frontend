import React from 'react';

const money = (value: number | string | null | undefined) => `₹ ${Number(value || 0).toFixed(2)}`;

export type PaymentSplitSource = {
  cash_amount?: number | string | null;
  online_amount?: number | string | null;
  payment_mode?: string | null;
} | null | undefined;

export function getPaymentSplit(source?: PaymentSplitSource) {
  return {
    cashAmount: Number(source?.cash_amount || 0),
    onlineAmount: Number(source?.online_amount || 0),
    paymentMode: source?.payment_mode || null,
  };
}

type Props = {
  cashAmount?: number | string | null;
  onlineAmount?: number | string | null;
  paymentMode?: string | null;
  compact?: boolean;
  chips?: boolean;
};

export default function PaymentSplitDisplay({
  cashAmount = 0,
  onlineAmount = 0,
  paymentMode = null,
  compact = false,
  chips = false,
}: Props) {
  const cash = Number(cashAmount || 0);
  const online = Number(onlineAmount || 0);
  const mode = String(paymentMode || '').toUpperCase();

  if (cash <= 0 && online <= 0) {
    if (chips) return null;
    if (mode === 'CASH' || mode === 'ONLINE' || mode === 'MIXED') {
      return (
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          mode === 'CASH'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : mode === 'ONLINE'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-violet-200 bg-violet-50 text-violet-700'
        }`}>
          {mode}
        </span>
      );
    }
    return <span className="text-xs font-bold text-gray-300">—</span>;
  }

  if (chips) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {cash > 0 && (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-lg">
            Cash {money(cash)}
          </span>
        )}
        {online > 0 && (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-lg">
            Online {money(online)}
          </span>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        {cash > 0 && (
          <span className="text-[11px] font-black text-gray-800">Cash {money(cash)}</span>
        )}
        {online > 0 && (
          <span className="text-[11px] font-black text-blue-600">Online {money(online)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Cash</p>
        <p className="mt-0.5 text-sm font-black text-gray-800">{money(cash)}</p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Online</p>
        <p className="mt-0.5 text-sm font-black text-blue-700">{money(online)}</p>
      </div>
    </div>
  );
}
