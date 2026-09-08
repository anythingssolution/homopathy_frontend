import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatReceiptDateTime, type PaymentReceiptData } from '../utils/paymentReceipt';

const money = (value: number | null | undefined) => `₹ ${Number(value || 0).toFixed(2)}`;

type Props = {
  data: PaymentReceiptData;
  onClose: () => void;
};

export default function PaymentReceipt({ data, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-md no-print">
        <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                {t('payment_receipt.title', 'Payment Receipt')}
              </p>
              <h3 className="mt-1 text-lg font-black text-gray-800">{data.patient_name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#549E9E] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#438787]"
              >
                <Printer size={14} />
                {t('payment_receipt.print', 'Print')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-xs font-bold text-gray-500">
              {t('payment_receipt.paid_at', 'Paid at')} {formatReceiptDateTime(data.collected_at, locale)}
            </p>
            <p className="text-[11px] font-bold leading-relaxed text-gray-400">
              {data.no_new_bill
                ? t('payment_receipt.no_new_bill', 'This is a collection against the original bill. No new medicine bill was created.')
                : t('payment_receipt.against_bills', 'This receipt records money received. Original bill numbers stay the same.')}
            </p>
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
              {data.lines.map((line, index) => (
                <div key={`${line.bill_number}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-black text-gray-800">
                      {line.kind === 'PREVIOUS'
                        ? t('payment_receipt.previous_dues', 'Previous pending')
                        : t('payment_receipt.this_bill', 'This bill')}
                      {line.bill_number ? ` · ${line.bill_number}` : ''}
                    </p>
                    {line.pending_after != null && (
                      <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                        {t('payment_receipt.balance_after', 'Balance after this')}: {money(line.pending_after)}
                      </p>
                    )}
                  </div>
                  <span className="font-black text-emerald-600">{money(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-black">
              <span className="text-gray-500">{t('payment_receipt.total_received', 'Total received')}</span>
              <span className="text-gray-900">{money(data.total_received)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="print-only hidden bg-white p-8 font-sans text-gray-900">
        <div className="border border-gray-300">
          <div className="flex items-start justify-between bg-[#f6fbfb] p-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide">Dr. Trivedi's Homeopathy</h1>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                {t('payment_receipt.title', 'Payment Receipt')}
              </p>
            </div>
            <div className="text-right text-xs font-bold">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{t('payment_receipt.paid_at', 'Paid at')}</p>
              <p className="mt-1 font-black">{formatReceiptDateTime(data.collected_at, locale)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 border-y border-gray-300 text-xs">
            <div className="border-r border-gray-300 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{t('payment_receipt.received_from', 'Received from')}</p>
              <p className="mt-2 text-base font-black uppercase">{data.patient_name}</p>
              {data.patient_mobile && <p className="mt-1 font-bold text-gray-600">{data.patient_mobile}</p>}
            </div>
            <div className="p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{t('payment_receipt.mode', 'Payment mode')}</p>
              <p className="mt-2 font-black">{data.payment_mode || '—'}</p>
              {data.transaction_reference && (
                <p className="mt-1 font-bold text-gray-600">{data.transaction_reference}</p>
              )}
            </div>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-black uppercase tracking-widest">{t('payment_receipt.applied_to', 'Applied to')}</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-black uppercase tracking-widest">{t('payment_receipt.bill_no', 'Bill no')}</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-black uppercase tracking-widest">{t('payment_receipt.amount', 'Amount')}</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, index) => (
                <tr key={`${line.bill_number}-${index}`}>
                  <td className="border border-gray-300 px-3 py-2 font-bold">
                    {line.kind === 'PREVIOUS'
                      ? t('payment_receipt.previous_dues', 'Previous pending')
                      : t('payment_receipt.this_bill', 'This bill')}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-bold">{line.bill_number || '—'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-black">{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-5 text-sm font-black">
            <span>{t('payment_receipt.total_received', 'Total received')}</span>
            <span>{money(data.total_received)}</span>
          </div>
          {data.remaining_total != null && data.remaining_total > 0 && (
            <p className="px-5 pb-3 text-xs font-bold text-orange-700">
              {t('payment_receipt.still_pending', 'Still pending after this')}: {money(data.remaining_total)}
            </p>
          )}
          <p className="border-t border-gray-300 px-5 py-4 text-[11px] font-bold leading-relaxed text-gray-500">
            {data.no_new_bill
              ? t('payment_receipt.no_new_bill', 'This is a collection against the original bill. No new medicine bill was created.')
              : t('payment_receipt.against_bills', 'This receipt records money received. Original bill numbers stay the same.')}
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
