import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Phone, Printer, RefreshCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppointmentTokenBadge from '../../AppointmentTokenBadge';
import PaymentSplitDisplay from '../../PaymentSplitDisplay';
import { useLenisNestedScroll } from '../../../hooks/useLenisNestedScroll';
import { billCategory, moneyExact, type VisitRow } from './lib';

type VisitDrawerProps = {
  visit: VisitRow | null;
  detail: any | null;
  loading: boolean;
  patientDues: any[];
  onClose: () => void;
  onPrintReceipt?: () => void;
};

const StatusBadge = ({ status }: { status?: string }) => {
  const { t } = useTranslation();
  const normalized = String(status || '').toUpperCase();
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    UNPAID: 'bg-amber-50 text-amber-700 border-amber-100',
    PARTIAL: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[normalized] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {normalized === 'PARTIAL' ? t('bills_next.pending', 'Pending') : normalized || '—'}
    </span>
  );
};

export default function VisitDrawer({ visit, detail, loading, patientDues, onClose, onPrintReceipt }: VisitDrawerProps) {
  const { t, i18n } = useTranslation();
  const bindScroll = useLenisNestedScroll();
  const open = Boolean(visit) || loading;

  useEffect(() => {
    if (!open) return;
    const previousBody = document.body.style.overflow;
    const previousHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new Event('lenis:stop'));
    return () => {
      document.body.style.overflow = previousBody;
      document.documentElement.style.overflow = previousHtml;
      window.dispatchEvent(new Event('lenis:start'));
    };
  }, [open]);

  const otherDues = useMemo(() => {
    const visitBillIds = new Set((visit?.bills || []).map((bill: any) => Number(bill.bill_id)));
    return patientDues.filter((row) => !visitBillIds.has(Number(row.bill_id)) && Number(row.pending_amount || 0) > 0);
  }, [patientDues, visit]);

  const otherDueTotal = otherDues.reduce((sum, row) => sum + Number(row.pending_amount || 0), 0);
  const thisPending = Number(detail?.summary?.grand_pending ?? visit?.grand_pending ?? 0);
  const thisPaid = Number(detail?.summary?.grand_paid ?? visit?.grand_paid ?? 0);
  const thisTotal = Number(detail?.summary?.grand_total ?? visit?.grand_total ?? 0);
  const recovered = Number(visit?.paid_towards_previous_pending || 0);
  const appointment = detail?.appointment || visit;
  const bills = detail?.bills || visit?.bills || [];
  const payments = Array.isArray(detail?.payments) ? detail.payments : [];
  const visitDate = appointment?.appointment_date || visit?.appointment_date;
  const displayDate = visitDate ? new Date(String(visitDate).includes('T') ? String(visitDate) : String(visitDate).slice(0, 10) + 'T00:00:00').toLocaleDateString(i18n.language.startsWith('hi') ? 'hi-IN' : 'en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && onClose()}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            role="dialog" aria-modal="true" aria-labelledby="visit-invoice-title"
            className="relative flex h-[min(94vh,960px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {loading || !visit ? (
              <div className="flex flex-1 items-center justify-center">
                <RefreshCcw className="animate-spin text-[#549E9E]" size={26} />
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <AppointmentTokenBadge
                      hideEmpty
                      tokenDisplay={appointment?.display_token_display}
                      tokenNumber={appointment?.token_number || visit.token_number}
                      position={appointment?.queue_position || visit.queue_position}
                      compact
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                        {t('bills_next.invoice.title', 'Bill details')}
                      </p>
                      <h2 id="visit-invoice-title" className="mt-0.5 text-lg font-black text-slate-900">
                        {appointment?.patient_full_name || visit.patient_full_name || '—'}
                      </h2>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {visit.auid || appointment?.auid || '—'}
                        {visit.treatment_name ? ` · ${visit.treatment_name}` : ''}
                        {` · ${displayDate}`}
                        {visit.branch_name ? ` · ${visit.branch_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end items-center gap-2">
                    {visit.patient_mobile_no && (
                      <a
                        href={`tel:${visit.patient_mobile_no}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#549E9E]/20 bg-[#549E9E]/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#2d8789]"
                      >
                        <Phone size={13} /> {visit.patient_mobile_no}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t('common.close', 'Close')}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div
                  ref={bindScroll}
                  className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6"
                  data-lenis-prevent
                >
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {bills.map((bill: any) => (
                      <section key={bill.bill_id} className="border-b border-slate-200 last:border-b-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{bill.bill_number || '—'}</p>
                            <p className="text-[11px] text-slate-500">{t(`bills_next.extra.${billCategory(bill)}`)}</p>
                          </div>
                          <StatusBadge status={bill.payment_status} />
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[420px] text-left text-xs">
                            <thead className="border-b border-slate-100 text-[10px] uppercase text-slate-500">
                              <tr>
                                <th className="px-4 py-2 font-semibold">{t('bills_next.invoice.description', 'Description')}</th>
                                <th className="px-3 py-2 text-right font-semibold">{t('bills_next.invoice.quantity', 'Qty')}</th>
                                <th className="px-3 py-2 text-right font-semibold">{t('bills_next.invoice.rate', 'Rate')}</th>
                                <th className="px-4 py-2 text-right font-semibold">{t('bills_next.invoice.amount', 'Amount')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {Array.isArray(bill.items) && bill.items.length > 0 ? bill.items.map((item: any, index: number) => (
                                <tr key={item.bill_item_id || index} className={item.item_type === 'TEST' ? 'bg-amber-50/60' : undefined}>
                                  <td className="px-4 py-3 font-medium text-slate-800 break-words">
                                    {item.item_type === 'TEST' && (
                                      <span className="mb-1 inline-block rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        {t('bills_next.invoice.test', 'Test / Investigation')}
                                      </span>
                                    )}
                                    <p className={item.item_type === 'TEST' ? 'font-bold text-amber-950' : undefined}>{item.item_name}</p>
                                  </td>
                                  <td className="px-3 py-3 text-right text-slate-600">{item.quantity ?? '—'}</td>
                                  <td className="px-3 py-3 text-right text-slate-600 whitespace-nowrap">{moneyExact(item.unit_price)}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{moneyExact(item.amount)}</td>
                                </tr>
                              )) : (
                                <tr>
                                  <td className="px-4 py-3 text-slate-600" colSpan={3}>{t(`bills_next.extra.${billCategory(bill)}`)}</td>
                                  <td className="px-4 py-3 text-right font-semibold">{moneyExact(bill.total_amount)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {bills.length > 1 && <div className="flex justify-end gap-6 border-t border-slate-100 px-4 py-2 text-xs"><span className="text-slate-500">{t('bills_next.invoice.subtotal', 'Bill subtotal')}</span><strong>{moneyExact(bill.total_amount)}</strong></div>}
                        {(bill.remark || (bill.delivery_mode && !bill.appointment_id)) && <div className="px-4 pb-3">
                          {bill.remark && <p className="mt-2 text-xs text-slate-500">{bill.remark}</p>}
                          {bill.delivery_mode && !bill.appointment_id && <DeliveryDetails bill={bill} />}
                        </div>}
                      </section>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 border-t-2 border-slate-800 pt-4">
                    <div className="flex-1 text-xs text-slate-500">
                      <PaymentSplitDisplay cashAmount={visit.cash_amount} onlineAmount={visit.online_amount} paymentMode={visit.payment_mode} />
                      {recovered > 0 && <p className="mt-3">{t('bills_next.old_dues')}: <strong className="text-slate-700">{moneyExact(recovered)}</strong></p>}
                      {otherDueTotal > 0 && <p className="mt-3 text-amber-700">{t('bills_next.drawer.also_older', { amount: moneyExact(otherDueTotal), count: otherDues.length })}</p>}
                    </div>
                    <dl className="w-full sm:w-64 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><dt className="font-semibold">{t('bills_next.invoice.total', 'Total billed')}</dt><dd className="font-bold">{moneyExact(thisTotal)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('bills_next.collected')}</dt><dd className="font-semibold text-emerald-700">{moneyExact(thisPaid)}</dd></div>
                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-3"><dt className="font-bold">{t('bills_next.pending')}</dt><dd className={`font-bold ${thisPending > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{moneyExact(thisPending)}</dd></div>
                    </dl>
                  </div>

                  {payments.length > 0 && (
                    <details className="rounded-lg border border-slate-200 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-600">{t('bills_next.invoice.payment_history', 'Payment history')} ({payments.length})</summary>
                      <div className="my-3 flex items-center justify-between gap-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {t('bills_next.drawer.payments')}
                        </h3>
                        {onPrintReceipt && (
                          <button
                            type="button"
                            onClick={onPrintReceipt}
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#2d8789]"
                          >
                            <Printer size={12} />
                            {t('payment_receipt.print', 'Print receipt')}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {payments.map((payment: any) => (
                          <div key={payment.payment_id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                            <div>
                              <p className="text-xs font-black text-slate-700">
                                {String(payment.payment_mode || '').toUpperCase()} · {String(payment.allocation_kind || 'CURRENT').toUpperCase() === 'PREVIOUS'
                                  ? t('bills_next.old_dues')
                                  : t('bills_next.drawer.this_bill')}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {payment.collected_at ? new Date(payment.collected_at).toLocaleString() : '—'}
                              </p>
                              {payment.transaction_reference && <p className="mt-1 text-xs text-slate-600 break-all">{t('bills_next.extra.reference')}: {payment.transaction_reference}</p>}
                              {payment.collected_by_user_id && <p className="text-[11px] text-slate-500">{t('bills_next.extra.collector')}: {payment.collected_by_name || `#${payment.collected_by_user_id}`} · {payment.collected_by_role}</p>}
                              {payment.remark && <p className="text-[11px] text-slate-500">{payment.remark}</p>}
                              <p className="text-[11px] text-slate-500">
                                {payment.bill_number || ''}{payment.pending_before != null && payment.pending_after != null ? ` · ${t('bills_next.pending')}: ${moneyExact(payment.pending_before)} → ${moneyExact(payment.pending_after)}` : ''}
                              </p>
                            </div>
                            <p className="text-sm font-black text-emerald-600">{moneyExact(payment.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function DeliveryDetails({ bill }: { bill: any }) {
  const { t } = useTranslation();
  let delivery: any = {};
  try { delivery = typeof bill.delivery_details_json === 'string' ? JSON.parse(bill.delivery_details_json) : bill.delivery_details_json || {}; } catch { /* Older bills may not have delivery metadata. */ }
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
      <p className="font-bold">{t(`bills_next.extra.${bill.delivery_mode === 'COURIER' ? 'courier' : 'hand_delivery'}`)}</p>
      {delivery.courier_address && <p>{delivery.courier_address}</p>}
      {delivery.tracking_no && <p>{t('bills_next.extra.tracking')}: {delivery.tracking_no}</p>}
      {delivery.received_by && <p>{t('bills_next.extra.received_by')}: {delivery.received_by}</p>}
      {delivery.delivery_remark && <p>{delivery.delivery_remark}</p>}
    </div>
  );
}
