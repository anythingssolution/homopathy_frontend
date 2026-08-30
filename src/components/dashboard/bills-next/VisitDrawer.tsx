import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Phone, RefreshCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppointmentTokenBadge from '../../AppointmentTokenBadge';
import PaymentSplitDisplay from '../../PaymentSplitDisplay';
import { useLenisNestedScroll } from '../../../hooks/useLenisNestedScroll';
import { moneyExact, type VisitRow } from './lib';

type VisitDrawerProps = {
  visit: VisitRow | null;
  detail: any | null;
  loading: boolean;
  patientDues: any[];
  onClose: () => void;
};

const StatusBadge = ({ status }: { status?: string }) => {
  const normalized = String(status || '').toUpperCase();
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    UNPAID: 'bg-amber-50 text-amber-700 border-amber-100',
    PARTIAL: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[normalized] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {normalized || '—'}
    </span>
  );
};

export default function VisitDrawer({ visit, detail, loading, patientDues, onClose }: VisitDrawerProps) {
  const { t } = useTranslation();
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
            className="relative flex h-[min(90vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
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
                      tokenDisplay={appointment?.display_token_display}
                      tokenNumber={appointment?.token_number || visit.token_number}
                      position={appointment?.queue_position || visit.queue_position}
                      compact
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                        {t('bills_next.drawer.this_visit')}
                      </p>
                      <h2 className="mt-0.5 truncate text-lg font-black text-slate-900">
                        {appointment?.patient_full_name || visit.patient_full_name || '—'}
                      </h2>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {visit.auid || appointment?.auid || '—'}
                        {visit.treatment_name ? ` · ${visit.treatment_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                  {(thisPending > 0 || otherDueTotal > 0) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                      <p className="text-sm font-black text-amber-800">
                        {thisPending > 0
                          ? t('bills_next.drawer.owes_this', { amount: moneyExact(thisPending) })
                          : t('bills_next.drawer.owes_other', { amount: moneyExact(otherDueTotal) })}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-amber-700">
                        {t('bills_next.drawer.ask_desk')}
                      </p>
                      {otherDueTotal > 0 && thisPending > 0 && (
                        <p className="mt-1 text-[11px] font-bold text-amber-600">
                          {t('bills_next.drawer.also_older', { amount: moneyExact(otherDueTotal), count: otherDues.length })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Mini label={t('bills_next.drawer.billed')} value={moneyExact(thisTotal)} />
                    <Mini label={t('bills_next.collected')} value={moneyExact(thisPaid)} tone="green" />
                    <Mini label={t('bills_next.pending')} value={moneyExact(thisPending)} tone="amber" />
                    <Mini label={t('bills_next.old_dues')} value={moneyExact(recovered)} tone="teal" />
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-slate-50/60 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t('bills_next.drawer.this_visit_mix')}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <Chip label={t('bills_next.consult')} value={moneyExact(visit.consult_total)} />
                      <Chip label={t('bills_next.medicine')} value={moneyExact(visit.medicine_total)} />
                    </div>
                    <div className="mt-3">
                      <PaymentSplitDisplay
                        cashAmount={visit.cash_amount}
                        onlineAmount={visit.online_amount}
                        paymentMode={visit.payment_mode}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      {t('bills_next.drawer.bills')}
                    </h3>
                    <div className="space-y-3">
                      {bills.map((bill: any) => (
                        <div key={bill.bill_id} className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-800">{bill.bill_number}</p>
                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {bill.bill_type}
                              </p>
                            </div>
                            <StatusBadge status={bill.payment_status} />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">{t('bills_next.drawer.billed')}</p>
                              <p className="text-sm font-black text-slate-800">{moneyExact(bill.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">{t('bills_next.collected')}</p>
                              <p className="text-sm font-black text-emerald-600">{moneyExact(bill.paid_amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">{t('bills_next.pending')}</p>
                              <p className="text-sm font-black text-amber-600">{moneyExact(bill.pending_amount)}</p>
                            </div>
                          </div>
                          {Array.isArray(bill.items) && bill.items.length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                              {bill.items.map((item: any) => (
                                <div key={item.bill_item_id} className="flex items-center justify-between gap-3 text-[12px]">
                                  <span className="font-semibold text-slate-600 truncate">{item.item_name}</span>
                                  <span className="font-black text-slate-800 shrink-0">{moneyExact(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {payments.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        {t('bills_next.drawer.payments')}
                      </h3>
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
                            </div>
                            <p className="text-sm font-black text-emerald-600">{moneyExact(payment.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
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

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' | 'teal' }) => {
  const valueClass =
    tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'teal' ? 'text-[#2d8789]' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-base font-black ${valueClass}`}>{value}</p>
    </div>
  );
};

const Chip = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-lg border border-gray-100 bg-white px-2.5 py-1 text-slate-600">
    {label} <span className="font-black text-slate-800">{value}</span>
  </span>
);
