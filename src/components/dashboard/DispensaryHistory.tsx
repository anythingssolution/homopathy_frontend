import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  RefreshCcw,
  User,
  Pill,
  IndianRupee,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Ticket,
  Copy,
  Check,
  Calendar,
  ChevronDown,
  Stethoscope,
  MapPin,
  XCircle,
  Hash,
  FlaskConical,
  Printer,
  Download
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import CustomDatePicker from '../CustomDatePicker';
import Pagination from '../Pagination';
import { getDosePreview, getMedicationPricingAmount, getMedicationRoleLabel, formatNumericMedicineWithFormula } from '../../utils/prescriptionFormat';
import { getLocalDateString } from '../../utils/date';
import { useLenisNestedScroll } from '../../hooks/useLenisNestedScroll';
import { useTranslation } from 'react-i18next';
import MedicationDispensingStatus from '../MedicationDispensingStatus';
import PrescriptionPrint from '../PrescriptionPrint';
import PaymentSplitDisplay from '../PaymentSplitDisplay';
import PaymentReceipt from '../PaymentReceipt';
import { receiptFromPayments, isSameLocalDay, formatReceiptDateTime, type PaymentReceiptData } from '../../utils/paymentReceipt';

const getValidPrescriptionConsultationId = (record: any) => {
  const id = Number(record?.consultation_id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getBillAmountValue = (record: any, key: 'total_amount' | 'paid_amount' | 'pending_amount') => {
  const billValue = record?.medication_bill?.[key];
  if (billValue !== undefined && billValue !== null && billValue !== '') {
    return Number(billValue) || 0;
  }

  const prescriptionValue = record?.prescription?.[key];
  if (prescriptionValue !== undefined && prescriptionValue !== null && prescriptionValue !== '') {
    return Number(prescriptionValue) || 0;
  }

  return 0;
};

const getTotalReceivedValue = (record: any) => {
  const cash = Number(record?.medication_bill?.cash_amount || 0) || 0;
  const online = Number(record?.medication_bill?.online_amount || 0) || 0;
  const splitTotal = Number((cash + online).toFixed(2));
  if (splitTotal > 0) return splitTotal;

  return getBillAmountValue(record, 'paid_amount');
};

const getBillPaymentBreakdown = (record: any) => record?.medication_bill?.payment_breakdown || {};

const getBreakdownAmount = (record: any, key: string, fallback = 0) => {
  const value = getBillPaymentBreakdown(record)?.[key];
  if (value !== undefined && value !== null && value !== '') {
    return Number(value) || 0;
  }

  return fallback;
};

const getOtherPendingAmount = (record: any) => {
  const breakdownValue = getBillPaymentBreakdown(record)?.other_pending_amount;
  if (breakdownValue !== undefined && breakdownValue !== null && breakdownValue !== '') {
    return Number(breakdownValue) || 0;
  }

  return Number(record?.account_dues?.total_pending || 0) || 0;
};

const getAccountPendingAfterThisBill = (record: any) => {
  const currentPending = getBreakdownAmount(record, 'pending_amount', getBillAmountValue(record, 'pending_amount'));
  const breakdownValue = getBillPaymentBreakdown(record)?.account_pending_after_this_bill;
  if (breakdownValue !== undefined && breakdownValue !== null && breakdownValue !== '') {
    return Number(breakdownValue) || 0;
  }

  return Number((currentPending + getOtherPendingAmount(record)).toFixed(2));
};

const getPreviousPendingRemainingAmount = (record: any) => {
  const settlementRemaining = getBreakdownAmount(record, 'previous_pending_remaining', 0);
  if (settlementRemaining > 0) return settlementRemaining;

  return getOtherPendingAmount(record);
};

const formatHistoryDateTime = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toLocalDateKey = (value: any) => {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw.includes('T') || raw.includes(' ') ? raw.replace(' ', 'T') : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return getLocalDateString(date);
};

const getIncomingPreviousPayments = (record: any) => (
  Array.isArray(record?.medication_bill?.payments) ? record.medication_bill.payments : []
).filter((payment: any) => String(payment?.allocation_kind || '').toUpperCase() === 'PREVIOUS');

const getLaterPendingReceivedAmount = (record: any) => {
  const fromBreakdown = getBreakdownAmount(record, 'later_pending_received', 0);
  if (fromBreakdown > 0) return fromBreakdown;
  return getIncomingPreviousPayments(record).reduce((sum: number, payment: any) => (
    sum + Number(payment.amount || 0)
  ), 0);
};

const isPreviousAmountReceivedRow = (record: any, filterDate?: string) => {
  const laterReceived = getLaterPendingReceivedAmount(record);
  const previousPayments = getIncomingPreviousPayments(record);
  if (laterReceived <= 0 && previousPayments.length === 0) return false;

  const visitDate = toLocalDateKey(record?.appointment?.appointment_date || record?.created_at);
  const filterKey = filterDate && filterDate !== 'all' ? filterDate : getLocalDateString();
  if (!visitDate || visitDate === filterKey) return false;

  return previousPayments.some((payment: any) => toLocalDateKey(payment.collected_at || payment.created_at) === filterKey)
    || (laterReceived > 0 && isSameLocalDay(getBillPaymentBreakdown(record)?.last_received_at));
};

const isPrintableRemark = (value: any) => {
  const text = String(value || '').trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized === 'no dispensing notes provided.') return false;
  if (/^repeat medicine/i.test(text) && /delivery/i.test(text)) return false;
  return true;
};

const formatInvoiceMoney = (value: number) => `₹ ${Number(value || 0).toFixed(2)}`;

const RepeatMedicineInvoice = ({ record }: { record: any }) => {
  const medicines = (record?.prescription?.medications || []).filter((medicine: any) => (
    String(medicine?.dispense_status || '').toUpperCase() !== 'VOID'
  ));
  const tests = (record?.prescription?.tests || []).filter((test: any) => (
    String(test?.dispense_status || '').toUpperCase() !== 'VOID'
  ));
  const pricing = record?.prescription?.pricing || {};
  const quickFormulaInput = record?.prescription?.quick_formula_input;
  const durationDays = record?.prescription?.medication_duration_days;
  const isCourier = record?.prescription?.delivery_mode === 'COURIER';
  const deliveryDetails = record?.prescription?.delivery_details || {};
  const courierCharge = Number(record?.prescription?.courier_charge || 0);
  const billNumber = record?.medication_bill?.bill_number || record?.appointment?.auid || record?.bill_number || '-';
  const billDate = record?.appointment?.appointment_date || record?.created_at;
  const isRepeat = Boolean(record?.is_repeat_medicine);
  const showDelivery = isRepeat || isCourier;
  const totalAmount = Number(pricing.total_amount || record?.medication_bill?.total_amount || 0);
  const paidAmount = getBreakdownAmount(record, 'total_paid', getBillAmountValue(record, 'paid_amount'));
  const pendingAmount = getBreakdownAmount(record, 'pending_amount', getBillAmountValue(record, 'pending_amount'));
  const previousPendingRemaining = getPreviousPendingRemainingAmount(record);
  const otherPendingAmount = getOtherPendingAmount(record);
  const cashAmount = Number(record?.medication_bill?.cash_amount || 0);
  const onlineAmount = Number(record?.medication_bill?.online_amount || 0);
  const payments = Array.isArray(record?.medication_bill?.payments) ? record.medication_bill.payments : [];
  const thisBillPayments = payments.filter((payment: any) => (
    String(payment?.allocation_kind || 'CURRENT').toUpperCase() !== 'PREVIOUS'
  ));
  const laterPayments = payments.filter((payment: any) => (
    String(payment?.allocation_kind || '').toUpperCase() === 'PREVIOUS'
  ));
  const previousPendingPaidWithThisBill = Array.isArray(record?.medication_bill?.previous_pending_settlements)
    ? record.medication_bill.previous_pending_settlements
    : [];
  const previousPendingPaidTotal = getBreakdownAmount(record, 'previous_pending_paid', previousPendingPaidWithThisBill.reduce((sum: number, payment: any) => (
    sum + Number(payment.amount || 0)
  ), 0));
  const paymentLines = [...thisBillPayments, ...laterPayments];
  const showPaymentLines = paymentLines.length > 1 || laterPayments.length > 0;
  const paidModeLabel = [
    cashAmount > 0 ? `Cash ${formatInvoiceMoney(cashAmount)}` : null,
    onlineAmount > 0 ? `Online ${formatInvoiceMoney(onlineAmount)}` : null,
  ].filter(Boolean).join(' + ')
    || String(record?.medication_bill?.payment_mode || '').trim()
    || (paidAmount > 0 ? 'Paid' : 'Unpaid');
  const invoiceRemarks = [
    isCourier ? deliveryDetails.delivery_remark : null,
    pricing.remark,
  ].filter(isPrintableRemark);
  const paymentStatus = String(record?.medication_bill?.payment_status || record?.prescription?.payment_status || (
    pendingAmount > 0 ? 'PENDING' : 'PAID'
  )).toUpperCase();

  return (
    <div className="repeat-invoice-print-only hidden bg-white text-gray-900 font-sans p-8">
      <div className="border border-gray-300 shadow-sm">
        <div className="flex items-stretch justify-between bg-[#f6fbfb]">
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-black uppercase tracking-wide text-gray-950">Dr. Trivedi's Homeopathy</h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {record?.appointment?.branch_name || 'Homeopathy Clinic'}
            </p>
            <p className="mt-4 inline-block border border-[#549E9E] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              {isRepeat ? 'Repeat Medicine' : 'Dispensary'}
            </p>
          </div>
          <div className="w-72 border-l border-gray-300 bg-white p-6 text-xs font-bold">
            <p className="mb-4 text-right text-3xl font-black uppercase tracking-widest text-gray-950">Invoice</p>
            <div className="grid grid-cols-[90px_1fr] gap-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Bill No</span>
              <span className="text-right font-black">{billNumber}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Date</span>
              <span className="text-right font-black">{billDate ? new Date(billDate).toLocaleDateString('en-GB') : '-'}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Status</span>
              <span className="text-right font-black">{paymentStatus}</span>
            </div>
          </div>
        </div>

        <div className={`grid border-y border-gray-300 text-xs ${showDelivery ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className={showDelivery ? 'border-r border-gray-300 p-5' : 'p-5'}>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Bill To</p>
            <p className="mt-2 text-base font-black uppercase">{record?.patient?.full_name || '-'}</p>
            <p className="mt-1 font-bold text-gray-600">{record?.patient?.mobile_no || '-'}</p>
          </div>
          {showDelivery && (
            <div className="p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Delivery</p>
              <p className="mt-2 text-base font-black">{isCourier ? 'Courier' : 'Hand Delivery'}</p>
              {isCourier && (
                <div className="mt-1 font-bold text-gray-600 leading-relaxed">
                  <p>{deliveryDetails.courier_address || '-'}</p>
                  {deliveryDetails.tracking_no && <p>Tracking: {deliveryDetails.tracking_no}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#eaf5f5] text-gray-900">
                <th className="border border-gray-300 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest">#</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest">Medicine / Item</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine: any, index: number) => {
                const dosePreview = getDosePreview(medicine, durationDays, {
                  quickFormulaInput,
                  style: 'full',
                });
                const addedAtDispensary = String(medicine.added_by_role || '').toUpperCase() === 'MEDICAL';
                return (
                  <tr key={medicine.consultation_medication_id || index}>
                    <td className="w-12 border border-gray-300 px-3 py-2 font-bold text-gray-500">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2">
                      <p className="font-black">
                        {formatNumericMedicineWithFormula(medicine.medicine_value, quickFormulaInput)}
                      </p>
                      {dosePreview && (
                        <p className="mt-0.5 font-bold text-gray-600">{dosePreview}</p>
                      )}
                      {medicine.remark && (
                        <p className="mt-0.5 font-bold text-gray-500">{medicine.remark}</p>
                      )}
                      {addedAtDispensary && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Added at dispensary</p>
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-black align-top">
                      {formatInvoiceMoney(Number(getMedicationPricingAmount(pricing, medicine) || 0))}
                    </td>
                  </tr>
                );
              })}
              {tests.map((test: any, index: number) => (
                <tr key={test.consultation_test_id || index}>
                  <td className="w-12 border border-gray-300 px-3 py-2 font-bold text-gray-500">{medicines.length + index + 1}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <p className="font-black">{test.test_name}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Test / Lab</p>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-black align-top">
                    {formatInvoiceMoney(Number(test.amount || 0))}
                  </td>
                </tr>
              ))}
              {courierCharge > 0 && (
                <tr>
                  <td className="w-12 border border-gray-300 px-3 py-2 font-bold text-gray-500">{medicines.length + tests.length + 1}</td>
                  <td className="border border-gray-300 px-3 py-2 font-black">Courier Charge</td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-black">{formatInvoiceMoney(courierCharge)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="border border-gray-300 bg-gray-100 px-3 py-3 text-right font-black uppercase tracking-widest">Total</td>
                <td className="border border-gray-300 bg-gray-100 px-3 py-3 text-right text-lg font-black">
                  {formatInvoiceMoney(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 ml-auto w-[320px] text-xs">
            <div className="flex items-start justify-between gap-4 py-1">
              <span className="font-bold text-gray-600">Paid</span>
              <span className="text-right font-black">
                {formatInvoiceMoney(paidAmount)}
                {paidAmount > 0 && (
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {paidModeLabel}
                  </span>
                )}
              </span>
            </div>
            {showPaymentLines && (
              <div className="mt-1 border-t border-gray-200 pt-1">
                {paymentLines.map((payment: any, index: number) => {
                  const isLater = String(payment?.allocation_kind || '').toUpperCase() === 'PREVIOUS';
                  return (
                    <div key={payment.payment_id || index} className="flex items-start justify-between gap-4 py-0.5 text-gray-600">
                      <span className="min-w-0 font-bold">
                        {isLater ? 'Paid later' : 'Paid at billing'}
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {formatHistoryDateTime(payment.collected_at || payment.created_at)}
                          {payment.payment_mode ? ` · ${payment.payment_mode}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 font-black text-gray-800">
                        {formatInvoiceMoney(Number(payment.amount || 0))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {previousPendingPaidTotal > 0 && (
              <div className="mt-1 border-t border-gray-200 pt-1">
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-bold text-gray-600">Old dues paid with this bill</span>
                  <span className="font-black">{formatInvoiceMoney(previousPendingPaidTotal)}</span>
                </div>
                {previousPendingPaidWithThisBill.map((payment: any, index: number) => (
                  <div key={payment.payment_id || index} className="flex items-center justify-between py-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>{payment.bill_number ? `Bill ${payment.bill_number}` : 'Previous bill'}</span>
                    <span>{formatInvoiceMoney(Number(payment.amount || 0))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-bold text-gray-600">Old dues remaining</span>
                  <span className={`font-black ${previousPendingRemaining > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                    {formatInvoiceMoney(previousPendingRemaining)}
                  </span>
                </div>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-[#0b946f] pt-2">
              <span className="font-black">Balance due</span>
              <span className={`font-black ${pendingAmount > 0 ? 'text-orange-700' : 'text-gray-900'}`}>
                {formatInvoiceMoney(pendingAmount)}
              </span>
            </div>
            {otherPendingAmount > 0 && previousPendingPaidTotal <= 0 && (
              <div className="flex items-center justify-between py-1">
                <span className="font-bold text-gray-600">Other bills pending</span>
                <span className="font-black text-orange-700">{formatInvoiceMoney(otherPendingAmount)}</span>
              </div>
            )}
          </div>

          {invoiceRemarks.length > 0 && (
            <div className="mt-5 text-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notes</p>
              {invoiceRemarks.map((remark: string, index: number) => (
                <p key={index} className="mt-1 font-bold text-gray-700">{remark}</p>
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-between border-t border-gray-300 pt-5 text-xs font-bold">
            <span>Dispensary copy</span>
            <span className="text-center">
              <span className="block h-8"></span>
              Authorized Signatory
            </span>
          </div>
        </div>

      </div>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .repeat-invoice-print-only,
          .repeat-invoice-print-only * {
            visibility: visible !important;
          }
          .repeat-invoice-print-only {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
};

export default function DispensaryHistory() {
  const { t, i18n } = useTranslation();
  const { token, user, branchScope } = useAuth();
  const { addToast } = useNotifications();
  const [patientSearch, setPatientSearch] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [collectionReceipt, setCollectionReceipt] = useState<PaymentReceiptData | null>(null);
  const [previewPrescription, setPreviewPrescription] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const bindModalScroll = useLenisNestedScroll();
  const bindLeftScroll = useLenisNestedScroll();
  const bindRightScroll = useLenisNestedScroll();

  const fetchPrescriptions = useCallback(async (pageNum = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') params.append('appointment_date', filterDate);
      if (patientSearch.trim()) params.append('patient_search', patientSearch.trim());

      const selectedBranchId = branchScope?.selected_branch_id;
      if (selectedBranchId) params.append('branch_id', String(selectedBranchId));

      params.append('page', String(pageNum));
      params.append('page_size', '20');

      const url = `/api/v1/medical/prescriptions/priced${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        setPrescriptions(result.data || []);
        setTotalPages(result.meta?.total_pages || 1);
        setTotalRecords(result.meta?.total || 0);
      } else {
        setError(result.message || 'Failed to fetch prescriptions');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, filterDate, patientSearch, branchScope?.selected_branch_id, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) {
        fetchPrescriptions(page);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPrescriptions, token]);

  useEffect(() => {
    setPage(1);
  }, [filterDate, patientSearch, branchScope?.selected_branch_id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewDetails = (p: any) => {
    setSelectedPrescription(p);
    const pricingAmount = p.prescription?.pricing?.total_amount;
    setAmount(pricingAmount ? pricingAmount.toString() : '0');
    setRemark(p.prescription?.pricing?.remark || 'No dispensing notes provided.');
  };

  useEffect(() => {
    if (!selectedPrescription) return undefined;
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
  }, [selectedPrescription]);

  const openPaymentReceipt = (record: any) => {
    const payments = [
      ...(Array.isArray(record?.medication_bill?.payments) ? record.medication_bill.payments : []),
      ...(Array.isArray(record?.medication_bill?.previous_pending_settlements)
        ? record.medication_bill.previous_pending_settlements
        : []),
    ];
    const data = receiptFromPayments({
      patientName: record?.patient?.full_name || '',
      patientMobile: record?.patient?.mobile_no,
      payments,
      remainingTotal: getAccountPendingAfterThisBill(record),
    });
    if (!data) {
      addToast(t('payment_receipt.none', 'No payment found to print'), 'warning');
      return;
    }
    setCollectionReceipt(data);
  };

  const openPrescriptionPreview = async (consultationId?: number | string | null) => {
    if (!token || !consultationId) return;
    setIsPreviewLoading(true);
    try {
      const roleCode = String(user?.role_code || '').toUpperCase();
      const role = String(user?.role || '').toLowerCase();
      const isReceptionist = roleCode === 'REC' || role === 'rec' || role === 'receptionist';
      const endpoint = isReceptionist
        ? `/api/v1/receptionist/prescriptions/${consultationId}`
        : `/api/v1/medical/prescriptions/${consultationId}`;
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load prescription');
      }
      setPreviewPrescription({ consultation: result.data, appointment: result.data });
    } catch (previewError: any) {
      addToast(previewError.message || 'Unable to load prescription', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const getDispensaryStatus = (record: any) => {
    if (isPreviousAmountReceivedRow(record, filterDate)) {
      return {
        label: t('dispensary_history.previous_amount_received', 'Previous amount received'),
        icon: IndianRupee,
        className: 'bg-blue-50 text-blue-700 border-blue-100',
      };
    }
    if (getBillAmountValue(record, 'pending_amount') > 0) {
      return {
        label: 'Partial Payment',
        icon: AlertCircle,
        className: 'bg-orange-50 text-orange-700 border-orange-100',
      };
    }

    if (record?.is_repeat_medicine) {
      return {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      };
    }

    if (String(record?.workflow_status || '').toUpperCase() === 'PROCESSED_BY_MEDICAL') {
      return {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      };
    }

    return {
      label: 'Pending Dispensary',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-100',
    };
  };

  const DispensaryStatusBadge = ({ record }: { record: any }) => {
    const status = getDispensaryStatus(record);
    const Icon = status.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${status.className}`}>
        <Icon size={11} />
        {status.label}
      </span>
    );
  };

  const PaymentColumnSummary = ({ record }: { record: any }) => {
    const paid = getBreakdownAmount(record, 'total_paid', getBillAmountValue(record, 'paid_amount'));
    const pending = getBreakdownAmount(record, 'pending_amount', getBillAmountValue(record, 'pending_amount'));
    const laterPendingReceived = getLaterPendingReceivedAmount(record);
    const lastReceivedAt = getBillPaymentBreakdown(record)?.last_received_at
      || getIncomingPreviousPayments(record)[0]?.collected_at;
    const previousReceived = isPreviousAmountReceivedRow(record, filterDate);

    return (
      <div className="flex flex-col gap-1.5">
        {previousReceived && (
          <span className="inline-flex w-fit px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black uppercase tracking-widest">
            {t('dispensary_history.previous_amount_received', 'Previous amount received')}
          </span>
        )}
        <PaymentSplitDisplay
          cashAmount={record.medication_bill?.cash_amount}
          onlineAmount={record.medication_bill?.online_amount}
          paymentMode={record.medication_bill?.payment_mode}
          compact
        />
        <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest">
          <span className="text-emerald-600">Paid ₹ {paid.toFixed(2)}</span>
          {pending > 0 ? (
            <span className="text-orange-600">Pending ₹ {pending.toFixed(2)}</span>
          ) : (
            <span className="text-gray-300">No Pending</span>
          )}
          {laterPendingReceived > 0 && (
            <span className="text-blue-600">
              {t('dispensary_history.later_received', 'Later Received')} ₹ {laterPendingReceived.toFixed(2)}
            </span>
          )}
          {!previousReceived && getBreakdownAmount(record, 'previous_pending_paid', 0) > 0 && (
            <span className="text-blue-600">Prev Paid ₹ {getBreakdownAmount(record, 'previous_pending_paid', 0).toFixed(2)}</span>
          )}
          {lastReceivedAt && (
            <span className={`normal-case tracking-normal ${isSameLocalDay(lastReceivedAt) ? 'text-blue-700' : 'text-gray-400'}`}>
              {isSameLocalDay(lastReceivedAt)
                ? t('dispensary_history.paid_today', 'Paid today')
                : t('dispensary_history.last_paid', 'Last paid')}
              {' '}
              {formatReceiptDateTime(lastReceivedAt)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const FilterDropdown = ({
    label, options, value, onChange, icon: Icon
  }: {
    label: string;
    options: { id: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    icon: any;
  }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.id === value);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
      <div className="space-y-1.5 relative" ref={ref}>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        <div
          onClick={() => setOpen(!open)}
          className={`w-full bg-gray-50 border border-gray-100 py-2.5 px-4 text-xs font-bold text-gray-600 cursor-pointer flex items-center justify-between transition-all ${open ? 'border-[#549E9E] bg-white ring-2 ring-[#549E9E]/5' : 'hover:border-gray-200'}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Icon size={14} className={open ? 'text-[#549E9E]' : 'text-gray-400'} />
            <span className="truncate">{selected?.label || label}</span>
          </div>
          <ChevronDown size={14} className={`transition-transform duration-300 text-gray-400 ${open ? 'rotate-180 text-[#549E9E]' : ''}`} />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-[100] max-h-60 overflow-y-auto"
            >
              {options.map(opt => (
                <div key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`px-4 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${value === opt.id ? 'bg-[#549E9E] text-white' : 'text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'}`}
                >
                  {opt.label}
                  {value === opt.id && <CheckCircle2 size={12} />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const selectedPaidAmount = selectedPrescription ? getBreakdownAmount(selectedPrescription, 'total_paid', getBillAmountValue(selectedPrescription, 'paid_amount')) : 0;
  const selectedPendingAmount = selectedPrescription ? getBreakdownAmount(selectedPrescription, 'pending_amount', getBillAmountValue(selectedPrescription, 'pending_amount')) : 0;
  const selectedOtherPendingAmount = selectedPrescription ? getOtherPendingAmount(selectedPrescription) : 0;
  const selectedAccountPendingAfterThisBill = selectedPrescription ? getAccountPendingAfterThisBill(selectedPrescription) : 0;
  const selectedPreviousPendingRemaining = selectedPrescription ? getPreviousPendingRemainingAmount(selectedPrescription) : 0;
  const selectedReceivedAtBilling = selectedPrescription ? getBreakdownAmount(selectedPrescription, 'received_at_billing', getTotalReceivedValue(selectedPrescription)) : 0;
  const selectedPayments = Array.isArray(selectedPrescription?.medication_bill?.payments)
    ? selectedPrescription.medication_bill.payments
    : [];
  const selectedDirectBillPayments = selectedPayments.filter((payment: any) => (
    String(payment?.allocation_kind || 'CURRENT').toUpperCase() !== 'PREVIOUS'
  ));
  const selectedIncomingLaterPendingReceipts = selectedPayments.filter((payment: any) => (
    String(payment?.allocation_kind || '').toUpperCase() === 'PREVIOUS'
  ));
  const selectedLaterPendingReceipts = Array.isArray(selectedPrescription?.medication_bill?.previous_pending_settlements)
    ? selectedPrescription.medication_bill.previous_pending_settlements
    : [];
  const selectedIncomingLaterPendingTotal = selectedPrescription ? getBreakdownAmount(selectedPrescription, 'later_pending_received', selectedIncomingLaterPendingReceipts.reduce((sum: number, payment: any) => (
    sum + Number(payment.amount || 0)
  ), 0)) : 0;
  const selectedPreviousPendingPaidTotal = selectedPrescription ? getBreakdownAmount(selectedPrescription, 'previous_pending_paid', selectedLaterPendingReceipts.reduce((sum: number, payment: any) => (
    sum + Number(payment.amount || 0)
  ), 0)) : 0;

  return (
    <div className="space-y-8 pb-12">
      {collectionReceipt && (
        <PaymentReceipt data={collectionReceipt} onClose={() => setCollectionReceipt(null)} />
      )}
      {/* Filters Card */}
      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={22} />
            <input
              type="text"
              placeholder={t('dispensary_history.search_placeholder', 'Search patient name, AUID...')}
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 py-4 pl-14 pr-6 text-sm font-bold text-gray-600 outline-none focus:border-[#549E9E]/20 transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            onClick={() => fetchPrescriptions(page)}
            className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] py-4 px-6 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-[#549E9E]/5 rounded-xl"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('dispensary_history.refresh', 'Refresh')}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <CustomDatePicker label={t('dispensary_history.filters.appointment_date', 'Visit / payment date')} value={filterDate} onChange={setFilterDate} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
          <button onClick={() => fetchPrescriptions(page)} className="text-xs font-black text-red-600 underline uppercase tracking-widest">Retry</button>
        </div>
      )}

      {/* Patient List */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden relative rounded-xl sm:rounded-none">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#549E9E]/20 border-t-[#549E9E] rounded-full animate-spin" />
              <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">{t('dispensary_history.loading', 'Fetching History...')}</p>
            </div>
          </div>
        )}

        {/* === MOBILE CARD VIEW === */}
        <div className="sm:hidden divide-y divide-gray-100">
          {prescriptions.length > 0 ? (
            prescriptions.map((p, idx) => (
              <div key={p.consultation_id || p.bill_id || idx} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {p.is_repeat_medicine ? (
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg">
                        <RefreshCcw size={16} />
                        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Repeat</span>
                      </div>
                    ) : isPreviousAmountReceivedRow(p, filterDate) ? (
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                        <IndianRupee size={16} />
                        <span className="text-[8px] font-black uppercase tracking-widest mt-1">Prev</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-gray-50 rounded-lg">
                        <span className="text-lg font-black text-[#549E9E]">
                          #{p.appointment?.display_token_display || p.appointment?.token_number || '-'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">
                        {p.patient?.full_name}
                      </p>
                      {Number(p.medication_bill?.pending_amount || p.prescription?.pending_amount || 0) > 0 && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                          Pending ₹ {Number(p.medication_bill?.pending_amount || p.prescription?.pending_amount || 0).toFixed(2)}
                        </span>
                      )}
                      {p.is_repeat_medicine && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                          Repeat Medicine
                        </span>
                      )}
                      {isPreviousAmountReceivedRow(p, filterDate) && (
                        <span className="inline-flex mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                          {t('dispensary_history.previous_amount_received', 'Previous amount received')}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-500 tracking-wider bg-gray-100 px-2 py-1 rounded-md">{p.appointment?.auid}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(p.appointment?.auid); }} className="text-gray-400 p-1">
                          {copiedId === p.appointment?.auid ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-black text-gray-300">{((page - 1) * 20 + idx + 1).toString().padStart(2, '0')}</span>
                    <DispensaryStatusBadge record={p} />
                    <PaymentColumnSummary record={p} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mb-3 mt-2">
                  <p className="text-[10px] text-gray-500 font-bold">{p.patient?.mobile_no}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 mt-2 pt-2 border-t border-gray-50 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#549E9E]" />
                    {p.appointment?.appointment_date ? new Date(p.appointment.appointment_date).toLocaleDateString('en-GB') : 'N/A'}
                    {isPreviousAmountReceivedRow(p, filterDate)
                      ? ` • ${t('dispensary_history.original_visit', 'Original visit')}`
                      : ` • ${p.appointment?.slot_name}`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#E6C682]" />
                    {p.appointment?.branch_name}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-2">
                  {getValidPrescriptionConsultationId(p) && (
                    <button
                      onClick={() => openPrescriptionPreview(getValidPrescriptionConsultationId(p))}
                      disabled={isPreviewLoading}
                      className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <FileText size={16} /> {t('dispensary_history.table.view_prescription', 'View Prescription')}
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetails(p)}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-[#549E9E] hover:bg-[#438787] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <FileText size={16} /> {t('dispensary_history.table.view', 'View')}
                  </button>
                </div>
              </div>
            ))
          ) : !isLoading && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.no_records.title', 'No history found')}</p>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{t('dispensary_history.no_records.desc', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>

        {/* === DESKTOP TABLE VIEW === */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.hash', '#')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.token', 'Token')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.auid', 'AUID')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.patient', 'Patient')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.date_slot', 'Date & Slot')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.branch', 'Branch')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.status', 'Status')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.table.payment', 'Payment')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('dispensary_history.table.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prescriptions.length > 0 ? (
                prescriptions.map((p, idx) => (
                  <motion.tr
                    key={p.consultation_id || p.bill_id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-[#549E9E]/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-black text-gray-300">{((page - 1) * 20 + idx + 1).toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-5 py-4">
                      {isPreviousAmountReceivedRow(p, filterDate) ? (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                          <IndianRupee size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {t('dispensary_history.prev_short', 'Prev')}
                          </span>
                        </div>
                      ) : p.is_repeat_medicine ? (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg">
                          <RefreshCcw size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Repeat</span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center text-gray-800 relative group/token">
                          <Ticket size={40} className="absolute text-red-500/20 -rotate-12 transition-transform group-hover/token:rotate-0" fill="currentColor" />
                          <span className="relative z-10 text-base font-black tracking-tight">{p.appointment?.display_token_display || p.appointment?.token_number}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 tracking-wider bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">{p.appointment?.auid}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(p.appointment?.auid); }}
                          className={`p-1.5 rounded-md transition-all cursor-pointer ${copiedId === p.appointment?.auid ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}>
                          {copiedId === p.appointment?.auid ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">{p.patient?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{p.patient?.mobile_no}</p>
                        {Number(p.medication_bill?.pending_amount || p.prescription?.pending_amount || 0) > 0 && (
                          <span className="inline-flex mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                            Pending ₹ {Number(p.medication_bill?.pending_amount || p.prescription?.pending_amount || 0).toFixed(2)}
                          </span>
                        )}
                        {p.is_repeat_medicine && (
                          <span className="inline-flex mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                            Repeat Medicine
                          </span>
                        )}
                        {isPreviousAmountReceivedRow(p, filterDate) && (
                          <span className="inline-flex mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[9px] font-black uppercase tracking-widest">
                            {t('dispensary_history.previous_amount_received', 'Previous amount received')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-800 font-black text-xs">
                          <Calendar size={13} className="text-[#549E9E]" />
                          {p.appointment?.appointment_date ? new Date(p.appointment.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                        {isPreviousAmountReceivedRow(p, filterDate) ? (
                          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                            {t('dispensary_history.original_visit', 'Original visit')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={13} />
                            {p.appointment?.slot_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-gray-600 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
                        <MapPin size={13} className="text-[#E6C682]" />
                        {p.appointment?.branch_name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <DispensaryStatusBadge record={p} />
                    </td>
                    <td className="px-5 py-4">
                      <PaymentColumnSummary record={p} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getValidPrescriptionConsultationId(p) && (
                          <button
                            onClick={() => openPrescriptionPreview(getValidPrescriptionConsultationId(p))}
                            disabled={isPreviewLoading}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                          >
                            <FileText size={14} /> {t('dispensary_history.table.view_prescription', 'View Prescription')}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(p)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#549E9E] hover:bg-[#438787] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                        >
                          <FileText size={14} /> {t('dispensary_history.table.view', 'View')}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : !isLoading && (
                <tr>
                  <td colSpan={9} className="px-5 py-20">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center">
                        <FileText size={32} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('dispensary_history.no_records.title', 'No history found')}</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{t('dispensary_history.no_records.desc', 'Try adjusting your search or filters')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPrescription(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white rounded-none border-2 border-gray-100 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Prescription Details</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Patient: {selectedPrescription.patient?.full_name}</p>
                    {selectedPrescription.is_repeat_medicine && (
                      <span className="inline-flex mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase tracking-widest">
                        Repeat Medicine
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {getValidPrescriptionConsultationId(selectedPrescription) && (
                      <button
                        onClick={() => openPrescriptionPreview(getValidPrescriptionConsultationId(selectedPrescription))}
                        disabled={isPreviewLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:bg-gray-200"
                      >
                        <FileText size={14} />
                        {t('dispensary_history.table.view_prescription', 'View Prescription')}
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#438787] transition-colors"
                    >
                      <Printer size={14} />
                      Print Invoice
                    </button>
                    <button
                      onClick={() => openPaymentReceipt(selectedPrescription)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#549E9E] border border-[#549E9E]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#549E9E]/10 transition-colors"
                    >
                      <Printer size={14} />
                      {t('payment_receipt.print_slip', 'Print payment receipt')}
                    </button>
                    <button
                      onClick={() => setSelectedPrescription(null)}
                      className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

              <div
                ref={bindModalScroll}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:overflow-hidden"
                data-lenis-prevent
              >
              <div className="grid grid-cols-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-2">
                  {/* Left Side: Medication List */}
                  <div ref={bindLeftScroll} className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1" data-lenis-prevent>
                    <div className="bg-gray-50 border border-gray-100 p-3 space-y-2">
                      <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                        <Pill size={14} />
                        Medication List
                      </h3>

                      {(selectedPrescription.prescription?.medications || []).length > 0 ? (
                        <div className="space-y-2">
                          {selectedPrescription.prescription.medications.map((med: any, idx: number) => {
                            const medAmount = getMedicationPricingAmount(selectedPrescription.prescription?.pricing, med);
                            const dosePreview = getDosePreview(
                              med,
                              selectedPrescription.prescription?.medication_duration_days,
                              {
                                isHi: i18n.language === 'hi',
                                quickFormulaInput: selectedPrescription.prescription?.quick_formula_input,
                                style: 'full',
                              },
                            );
                            const roleLabel = getMedicationRoleLabel(med);

                            return (
                              <div key={idx} className="bg-white p-3 border border-gray-100 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-black text-gray-800">{formatNumericMedicineWithFormula(med.medicine_value, selectedPrescription.prescription?.quick_formula_input)}</p>
                                    {roleLabel && (
                                      <span className="px-2 py-0.5 rounded-md bg-[#549E9E]/10 text-[#549E9E] text-[9px] font-black uppercase tracking-widest">
                                        {roleLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    <span className="text-[9px] font-black text-[#549E9E]/70 tracking-wide">
                                      {dosePreview || t('dispense.no_dose_details', 'No dose details')}
                                    </span>
                                    {med.remark && (
                                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                        {med.remark}
                                      </span>
                                    )}
                                  </div>
                                  <MedicationDispensingStatus
                                    medication={med}
                                    pricing={selectedPrescription.prescription?.pricing}
                                  />
                                </div>
                                <div className="text-xs font-black text-gray-600 shrink-0">
                                  ₹ {medAmount}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-amber-50 p-4 border border-amber-100 flex flex-col items-center justify-center gap-2 text-amber-600 text-center">
                          <AlertCircle size={24} strokeWidth={1.5} />
                          <p className="text-xs font-black uppercase tracking-widest leading-relaxed">No medications prescribed<br />for this visit.</p>
                        </div>
                      )}
                    </div>

                    {(selectedPrescription.prescription?.tests || []).length > 0 && (
                      <div className="bg-amber-50/60 border border-amber-100 p-3 space-y-2">
                        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          <FlaskConical size={14} />
                          Tests / Lab
                          {(selectedPrescription.prescription?.tests || []).some((test: any) => String(test.dispense_status || '').toUpperCase() === 'VOID') && (
                            <span className="rounded-md bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-600">
                              {(selectedPrescription.prescription?.tests || []).filter((test: any) => String(test.dispense_status || '').toUpperCase() === 'VOID').length} removed
                            </span>
                          )}
                        </h3>

                        <div className="space-y-2">
                          {selectedPrescription.prescription.tests.map((test: any, idx: number) => {
                            const isVoided = String(test.dispense_status || '').toUpperCase() === 'VOID';
                            return (
                            <div
                              key={test.consultation_test_id || idx}
                              className={`bg-white p-3 border flex items-start justify-between gap-3 ${
                                isVoided ? 'border-red-200' : 'border-amber-100'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  isVoided ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className={`text-sm font-black text-gray-800 ${isVoided ? 'line-through opacity-70' : ''}`}>{test.test_name}</p>
                                  {isVoided ? (
                                    <MedicationDispensingStatus
                                      medication={test}
                                      label="Test not billed"
                                      reasonLabel="Reason"
                                    />
                                  ) : (
                                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-amber-600">Doctor recommended test</p>
                                  )}
                                </div>
                              </div>
                              <div className={`text-xs font-black whitespace-nowrap ${isVoided ? 'text-red-500 line-through' : 'text-amber-700'}`}>
                                ₹ {Number(isVoided ? 0 : test.amount || 0).toFixed(2)}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Billing Summary & Remarks */}
                  <div ref={bindRightScroll} className="lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1" data-lenis-prevent>
                    <div className="bg-[#549E9E]/[0.03] border border-[#549E9E]/10 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 border-b border-[#549E9E]/10 pb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-[#549E9E] text-white rounded-lg flex items-center justify-center shrink-0">
                            <IndianRupee size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-[#549E9E]/60 uppercase tracking-widest">Total Bill Amount</p>
                            <p className="text-xl font-black text-[#549E9E]">₹ {amount}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <span className="bg-[#549E9E]/10 text-[#549E9E] px-2 py-0.5 rounded-md text-[10px] font-black">
                            Items {(selectedPrescription.prescription?.medications || []).filter((med: any) => String(med.dispense_status || '').toUpperCase() !== 'VOID').length
                              + (selectedPrescription.prescription?.tests || []).filter((test: any) => String(test.dispense_status || '').toUpperCase() !== 'VOID').length}
                          </span>
                          <div className="flex justify-end">
                            <PaymentSplitDisplay
                              cashAmount={selectedPrescription.medication_bill?.cash_amount}
                              onlineAmount={selectedPrescription.medication_bill?.online_amount}
                              paymentMode={selectedPrescription.medication_bill?.payment_mode}
                              chips
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        {selectedPendingAmount > 0 && (
                          <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Still Pending For This Bill</p>
                              <span className="shrink-0 text-sm font-black text-orange-700">
                                ₹ {selectedPendingAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 grid grid-cols-1 gap-1 rounded-lg border border-gray-100 bg-white px-3 py-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-500">Paid Amount</span>
                            <span className="font-black text-emerald-600">
                              ₹ {selectedPaidAmount.toFixed(2)}
                            </span>
                          </div>
                          {selectedReceivedAtBilling > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-500">Received At Billing</span>
                              <span className="font-black text-emerald-600">
                                ₹ {selectedReceivedAtBilling.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {selectedIncomingLaterPendingTotal > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-500">Later Pending Received</span>
                              <span className="font-black text-blue-600">
                                ₹ {selectedIncomingLaterPendingTotal.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {selectedPreviousPendingPaidTotal > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-500">Previous Pending Paid With This Bill</span>
                              <span className="font-black text-blue-600">
                                ₹ {selectedPreviousPendingPaidTotal.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {selectedPreviousPendingPaidTotal > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-500">Previous Pending Remaining</span>
                              <span className={`font-black ${selectedPreviousPendingRemaining > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                ₹ {selectedPreviousPendingRemaining.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {selectedOtherPendingAmount > 0 && selectedPreviousPendingPaidTotal <= 0 && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-500">Other Pending Bills</span>
                              <span className="font-black text-orange-600">
                                ₹ {selectedOtherPendingAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                            <span className="text-gray-500">Current Bill Pending</span>
                            <span className={`font-black ${selectedPendingAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                              ₹ {selectedPendingAmount.toFixed(2)}
                            </span>
                          </div>
                          {selectedAccountPendingAfterThisBill > selectedPendingAmount && (
                            <div className="flex items-center justify-between border-t border-gray-50 pt-1 text-[11px] font-bold">
                              <span className="text-gray-700">Patient Total Pending</span>
                              <span className={`font-black ${selectedAccountPendingAfterThisBill > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                ₹ {selectedAccountPendingAfterThisBill.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        {(selectedDirectBillPayments.length > 0 || selectedIncomingLaterPendingReceipts.length > 0 || selectedLaterPendingReceipts.length > 0) && (
                          <div className="mt-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
                            <p className="mb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Timeline</p>
                            <div className="space-y-1.5">
                              {selectedDirectBillPayments.map((payment: any, index: number) => (
                                <div key={`payment-${payment.payment_id || index}`} className="flex items-start justify-between gap-3 border-t border-gray-50 pt-1.5 first:border-t-0 first:pt-0">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-gray-700">This Bill Received</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                      {formatHistoryDateTime(payment.collected_at || payment.created_at)} • {payment.payment_mode || '-'}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[11px] font-black text-emerald-600">
                                    ₹ {Number(payment.amount || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {selectedIncomingLaterPendingReceipts.map((payment: any, index: number) => (
                                <div key={`incoming-later-pending-${payment.payment_id || index}`} className="flex items-start justify-between gap-3 border-t border-gray-50 pt-1.5 first:border-t-0 first:pt-0">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-gray-700">Later Pending Received</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                      {formatHistoryDateTime(payment.collected_at || payment.created_at)} • {payment.payment_mode || '-'}
                                      {payment.settlement_source_bill_number ? ` • Via ${payment.settlement_source_bill_number}` : ''}
                                      {payment.pending_after !== null && payment.pending_after !== undefined
                                        ? ` • Balance ₹ ${Number(payment.pending_after || 0).toFixed(2)}`
                                        : ''}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[11px] font-black text-blue-600">
                                    ₹ {Number(payment.amount || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {selectedLaterPendingReceipts.map((payment: any, index: number) => (
                                <div key={`later-pending-${payment.payment_id || index}`} className="flex items-start justify-between gap-3 border-t border-gray-50 pt-1.5 first:border-t-0 first:pt-0">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-gray-700">Previous Pending Paid</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                      {formatHistoryDateTime(payment.collected_at || payment.created_at)} • {payment.payment_mode || '-'}
                                      {payment.bill_number ? ` • Bill ${payment.bill_number}` : ''}
                                      {payment.pending_after !== null && payment.pending_after !== undefined
                                        ? ` • Balance ₹ ${Number(payment.pending_after || 0).toFixed(2)}`
                                        : ''}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[11px] font-black text-blue-600">
                                    ₹ {Number(payment.amount || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {remark && remark !== 'No dispensing notes provided.' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Dispensing Remark / Notes</label>
                          <div className="w-full bg-white border border-gray-100 py-2 px-3 text-xs font-bold text-gray-700">
                            {remark}
                          </div>
                        </div>
                      )}

                      {selectedPrescription.is_repeat_medicine && (
                        <div className="bg-white border border-gray-100 p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery</span>
                            <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">
                              {selectedPrescription.prescription?.delivery_mode === 'COURIER' ? 'Courier' : 'Hand Delivery'}
                            </span>
                          </div>
                          {selectedPrescription.prescription?.delivery_mode === 'COURIER' && (
                            <div className="text-xs font-bold text-gray-600 leading-relaxed space-y-1">
                              <p>{selectedPrescription.prescription?.delivery_details?.courier_address || 'No address'}</p>
                              {Number(selectedPrescription.prescription?.courier_charge || 0) > 0 && (
                                <p>Courier Charge: ₹ {Number(selectedPrescription.prescription.courier_charge || 0).toFixed(2)}</p>
                              )}
                              {selectedPrescription.prescription?.delivery_details?.tracking_no && (
                                <p>Tracking: {selectedPrescription.prescription.delivery_details.tracking_no}</p>
                              )}
                              {selectedPrescription.prescription?.delivery_details?.delivery_remark && (
                                <p>{selectedPrescription.prescription.delivery_details.delivery_remark}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            {selectedPrescription && !previewPrescription && !collectionReceipt && (
              <RepeatMedicineInvoice record={selectedPrescription} />
            )}
          </div>
        )}
      </AnimatePresence>

      {previewPrescription && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-md no-print">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-gray-100 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{t('patient_records.modal.prescription_preview', 'Prescription Preview')}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('patient_records.modal.saved_prescription_sub', 'Saved doctor consultation prescription')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setPrescriptionLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                      prescriptionLang === 'en'
                        ? 'bg-[#549E9E] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrescriptionLang('hi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                      prescriptionLang === 'hi'
                        ? 'bg-[#549E9E] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[#549E9E] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-[#458b8b]">
                  <Download size={16} /> {t('patient_records.modal.action.print', 'Print')}
                </button>
                <button onClick={() => setPreviewPrescription(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-200/50 p-4 md:p-12" data-lenis-prevent>
              <div className="mx-auto flex min-h-[297mm] w-[210mm] shrink-0 flex-col rounded-sm border border-gray-100 bg-white p-0 shadow-xl md:p-8">
                <PrescriptionPrint consultation={previewPrescription.consultation} appointment={previewPrescription.appointment} lang={prescriptionLang} />
              </div>
            </div>
          </div>
        </div>, document.body)}

      <div className="print-only">
        {previewPrescription && <PrescriptionPrint consultation={previewPrescription.consultation} appointment={previewPrescription.appointment} lang={prescriptionLang} />}
      </div>
      <style>{`
        @media screen {
          .print-only { display: none; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </div>
  );
}
