import React from 'react';
import { BadgePercent } from 'lucide-react';

export type DiscountCategory = 'CONSULTATION' | 'MEDICINE' | 'TEST' | 'COURIER';
export type DiscountDraft = {
  category: DiscountCategory;
  amount: string;
  reason_code: string;
  reason_note: string;
};

export const DISCOUNT_REASONS = [
  ['DOCTOR_APPROVED', 'Doctor approved'],
  ['OTHER', 'Other'],
] as const;

export const makeDiscountDrafts = (
  categories: DiscountCategory[],
  existing: any[] = [],
): DiscountDraft[] => categories.map((category) => {
  const saved = existing.find((row) => String(row.category || row.discount_category).toUpperCase() === category);
  return {
    category,
    amount: saved ? String(saved.amount ?? saved.discount_amount ?? '') : '',
    reason_code: saved?.reason_code || '',
    reason_note: saved?.reason_note || '',
  };
});

export const discountTotal = (discounts: DiscountDraft[]) => Number(discounts
  .reduce((sum, row) => sum + (Number(row.amount || 0) || 0), 0).toFixed(2));

export const toDiscountPayload = (discounts: DiscountDraft[]) => discounts
  .filter((row) => Number(row.amount || 0) > 0)
  .map((row) => ({
    category: row.category,
    amount: Number(Number(row.amount).toFixed(2)),
    reason_code: row.reason_code,
    reason_note: row.reason_note.trim() || null,
  }));

export const validateDiscountDrafts = (
  discounts: DiscountDraft[],
  grossByCategory: Partial<Record<DiscountCategory, number>>,
) => {
  for (const row of discounts) {
    const amount = Number(row.amount || 0);
    if (!Number.isFinite(amount) || amount < 0) return 'Discount amount valid hona chahiye.';
    if (amount > Number(grossByCategory[row.category] || 0)) return `${LABELS[row.category]} discount eligible amount se zyada hai.`;
    if (amount > 0 && !row.reason_code) return `${LABELS[row.category]} discount reason select karein.`;
    if (amount > 0 && row.reason_code === 'OTHER' && !row.reason_note.trim()) return `${LABELS[row.category]} discount ka reason note likhein.`;
  }
  return null;
};

const LABELS: Record<DiscountCategory, string> = {
  CONSULTATION: 'Consultation',
  MEDICINE: 'Medicine',
  TEST: 'Test / Lab',
  COURIER: 'Courier',
};

export default function BillingDiscountEditor({
  discounts,
  grossByCategory,
  onChange,
  compact = false,
}: {
  discounts: DiscountDraft[];
  grossByCategory: Partial<Record<DiscountCategory, number>>;
  onChange: (value: DiscountDraft[]) => void;
  compact?: boolean;
}) {
  const update = (index: number, patch: Partial<DiscountDraft>) => {
    const next = discounts.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row);
    onChange(next);
  };

  const visible = discounts.filter((row) => Number(grossByCategory[row.category] || 0) > 0 || Number(row.amount || 0) > 0);
  if (visible.length === 0) return null;

  return (
    <div className={`border border-amber-200 bg-amber-50/50 ${compact ? 'p-2.5' : 'p-3'} space-y-2.5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800">
          <BadgePercent size={16} />
          <p className="text-[10px] font-black uppercase tracking-widest">Billing Discount</p>
        </div>
        <p className="text-[10px] font-bold text-amber-700">Reason is required</p>
      </div>

      {visible.map((row) => {
        const index = discounts.findIndex((item) => item.category === row.category);
        const gross = Number(grossByCategory[row.category] || 0);
        const amount = Number(row.amount || 0);
        return (
          <div key={row.category} className="border border-amber-100 bg-white p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-black text-gray-700">{LABELS[row.category]}</label>
              <span className="text-[10px] font-bold text-gray-400">Eligible ₹ {gross.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                max={gross}
                step="0.01"
                value={row.amount}
                onChange={(event) => update(index, { amount: event.target.value })}
                placeholder="Discount amount"
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-amber-400"
              />
              <select
                value={row.reason_code}
                onChange={(event) => update(index, { reason_code: event.target.value })}
                disabled={amount <= 0}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none disabled:opacity-50 focus:border-amber-400"
              >
                <option value="">Select discount reason</option>
                {DISCOUNT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {amount > 0 && (row.reason_code === 'OTHER' || row.reason_note) && (
              <input
                value={row.reason_note}
                onChange={(event) => update(index, { reason_note: event.target.value })}
                placeholder={row.reason_code === 'OTHER' ? 'Reason note (required)' : 'Additional note'}
                maxLength={255}
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-amber-400"
              />
            )}
            {amount > gross && <p className="text-[10px] font-bold text-red-600">Discount eligible amount se zyada nahi ho sakta.</p>}
          </div>
        );
      })}
    </div>
  );
}
