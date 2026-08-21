import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  RefreshCcw,
  IndianRupee,
  FileText,
  AlertCircle,
  X,
  Calendar,
  Receipt,
  Wallet,
  ClipboardList,
  ChevronDown,
  CheckCircle2,
  Tag,
  CreditCard,
  UserCheck,
  Pill,
  BarChart3
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import CustomDatePicker from '../CustomDatePicker';
import { useTranslation } from 'react-i18next';

type BillFilterType = 'ALL' | 'CONSULTATION' | 'MEDICATION';
type BillFilterStatus = 'ALL' | 'UNPAID' | 'PAID' | 'PARTIAL';
type BillFilterPaymentMode = 'ALL' | 'CASH' | 'ONLINE';
type ActiveBillingTab = 'BILLS' | 'CONSULTANT_REVENUE' | 'MEDICINE_REVENUE';

const PaymentModeBadge = ({ mode }: { mode?: string | null }) => {
  const normalized = String(mode || '').toUpperCase();
  if (!normalized || normalized === 'NULL' || normalized === 'UNPAID') {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border-gray-100">
        —
      </span>
    );
  }
  const isCash = normalized === 'CASH';
  const isMixed = normalized === 'MIXED';
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${isMixed ? 'bg-violet-50 text-violet-700 border-violet-200' : isCash ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
      {normalized}
    </span>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const normalized = String(status || '').toUpperCase();
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    UNPAID: 'bg-orange-50 text-orange-600 border-orange-100',
    PARTIAL: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <span className={`inline-flex px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[normalized] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
      {normalized || 'UNKNOWN'}
    </span>
  );
};

const BillItemTypeBadge = ({ type }: { type: string }) => {
  const normalized = String(type || 'MEDICATION').toUpperCase();
  const labelMap: Record<string, string> = {
    MEDICATION: 'Medicine',
    ADDITIONAL_MEDICATION: 'Additional Medicine',
    TEST: 'Test',
  };
  const styleMap: Record<string, string> = {
    MEDICATION: 'bg-[#549E9E]/10 text-[#549E9E] border-[#549E9E]/20',
    ADDITIONAL_MEDICATION: 'bg-violet-50 text-violet-600 border-violet-100',
    TEST: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${styleMap[normalized] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
      {labelMap[normalized] || normalized}
    </span>
  );
};

const deriveOverallPaymentStatus = (paid: number, pending: number, total: number) => {
  if (total > 0 && pending <= 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
};

const formatCurrency = (value: number | string | null | undefined) => `₹ ${Number(value || 0).toFixed(2)}`;

const getPaymentPlaceLabel = (payment: any) => {
  const paymentFor = String(payment?.payment_for || '').toUpperCase();
  const billType = String(payment?.bill_type || '').toUpperCase();

  if (paymentFor === 'CONSULTATION' || billType === 'CONSULTATION') return 'Consultation';
  if (paymentFor === 'MEDICATION' || billType === 'MEDICATION') return 'Medication';
  return paymentFor || billType || 'Other';
};

const getItemTypeLabel = (itemType: string) => {
  const normalized = String(itemType || '').toUpperCase();
  if (normalized === 'MEDICATION') return 'Medicine';
  if (normalized === 'ADDITIONAL_MEDICATION') return 'Additional Medicine';
  if (normalized === 'TEST') return 'Test';
  return normalized || 'Other';
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
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
      <div
        onClick={() => setOpen(!open)}
        className={`w-full bg-white border border-gray-200 py-3 px-4 text-xs font-bold text-gray-700 cursor-pointer flex items-center justify-between transition-all rounded-xl ${open ? 'border-[#549E9E] ring-2 ring-[#549E9E]/20' : 'hover:border-gray-300'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon size={16} className={open ? 'text-[#549E9E]' : 'text-gray-400'} />
          <span className="truncate">{selected?.label || label}</span>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-300 text-gray-400 ${open ? 'rotate-180 text-[#549E9E]' : ''}`} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto overflow-x-hidden"
          >
            {options.map(opt => (
              <div key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`px-4 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-0 ${value === opt.id ? 'bg-[#549E9E]/10 text-[#549E9E]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {opt.label}
                {value === opt.id && <CheckCircle2 size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Bills() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [patientSearch, setPatientSearch] = useState('');
  const [billType, setBillType] = useState<BillFilterType>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<BillFilterStatus>('ALL');
  const [paymentMode, setPaymentMode] = useState<BillFilterPaymentMode>('ALL');
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<ActiveBillingTab>('BILLS');
  const [bills, setBills] = useState<any[]>([]);
  const [consultantRevenue, setConsultantRevenue] = useState<any>({ data: { morning: [], evening: [] }, meta: { report_keys: [] } });
  const [medicineRevenue, setMedicineRevenue] = useState<any>({ data: { morning: [], evening: [] }, meta: { report_keys: [] } });
  const [isLoading, setIsLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [expandedChargeType, setExpandedChargeType] = useState<string | null>(null);

  const fetchBills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') {
        params.append('from_date', filterDate);
        params.append('to_date', filterDate);
      }
      if (patientSearch.trim()) params.append('patient_search', patientSearch.trim());
      if (billType !== 'ALL') params.append('type', billType);
      if (paymentStatus !== 'ALL') params.append('payment_status', paymentStatus);
      if (paymentMode !== 'ALL') params.append('payment_mode', paymentMode);
      params.append('limit', '1000');

      const response = await fetch(`/api/v1/bills?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (result.success) {
        setBills(result.data || []);
      } else {
        setError(result.message || 'Failed to fetch bills');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenueReports = async () => {
    setIsReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') {
        params.append('from', filterDate);
        params.append('to', filterDate);
        params.append('from_date', filterDate);
        params.append('to_date', filterDate);
      }
      const [resDoc, resMed] = await Promise.all([
        fetch(`/api/v1/reports/billing/revenue-by-consultant?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/reports/billing/revenue-by-medicine?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [jsonDoc, jsonMed] = await Promise.all([resDoc.json(), resMed.json()]);
      if (jsonDoc.success) setConsultantRevenue({ data: jsonDoc.data || { morning: [], evening: [] }, meta: jsonDoc.meta || { report_keys: [] } });
      if (jsonMed.success) setMedicineRevenue({ data: jsonMed.data || { morning: [], evening: [] }, meta: jsonMed.meta || { report_keys: [] } });
    } catch (err) {
      console.error('Error fetching revenue reports:', err);
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBills();
      fetchRevenueReports();
    }
  }, [token, filterDate, billType, paymentStatus, paymentMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchBills();
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const appointmentSummaries = useMemo(() => {
    const grouped = new Map<number, any>();

    bills.forEach((bill) => {
      const appointmentId = Number(bill.appointment_id);
      if (!appointmentId) return;

      if (!grouped.has(appointmentId)) {
        grouped.set(appointmentId, {
          appointment_id: appointmentId,
          auid: bill.auid,
          appointment_date: bill.appointment_date,
          token_number: bill.token_number,
          display_token_display: bill.display_token_display,
          patient_full_name: bill.patient_full_name,
          patient_mobile_no: bill.patient_mobile_no,
          treatment_name: bill.treatment_name,
          branch_name: bill.branch_name,
          booked_for_type: bill.booked_for_type,
          family_member_relationship: bill.family_member_relationship,
          primary_patient_full_name: bill.primary_patient_full_name,
          payment_mode: bill.payment_mode || null,
          consultation_completed_at: bill.consultation_completed_at || bill.created_at || null,
          bills: [],
          grand_total: 0,
          grand_paid: 0,
          grand_pending: 0,
        });
      }

      const entry = grouped.get(appointmentId);
      if (!entry.payment_mode && bill.payment_mode) {
        entry.payment_mode = bill.payment_mode;
      }
      if (!entry.consultation_completed_at && bill.consultation_completed_at) {
        entry.consultation_completed_at = bill.consultation_completed_at;
      }
      entry.bills.push(bill);
      entry.grand_total += Number(bill.total_amount || 0);
      entry.grand_paid += Number(bill.paid_amount || 0);
      entry.grand_pending += Number(bill.pending_amount || 0);
    });

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        grand_total: Number(entry.grand_total.toFixed(2)),
        grand_paid: Number(entry.grand_paid.toFixed(2)),
        grand_pending: Number(entry.grand_pending.toFixed(2)),
        overall_payment_status: deriveOverallPaymentStatus(entry.grand_paid, entry.grand_pending, entry.grand_total),
      }))
      .sort((a, b) => {
        const timeB = new Date(b.consultation_completed_at || b.appointment_date || 0).getTime();
        const timeA = new Date(a.consultation_completed_at || a.appointment_date || 0).getTime();
        return timeB - timeA;
      });
  }, [bills]);

  const billsTotals = useMemo(() => {
    let grandTotal = 0;
    let grandPaid = 0;
    let grandPending = 0;
    let cashTotal = 0;
    let onlineTotal = 0;
    let totalAppointments = appointmentSummaries.length;
    let totalBills = bills.length;

    appointmentSummaries.forEach((entry) => {
      grandTotal += Number(entry.grand_total || 0);
      grandPaid += Number(entry.grand_paid || 0);
      grandPending += Number(entry.grand_pending || 0);
    });

    bills.forEach((bill) => {
      const mode = String(bill.payment_mode || '').toUpperCase();
      const paid = Number(bill.paid_amount || 0);
      if (mode === 'CASH') {
        cashTotal += paid;
      } else if (mode === 'ONLINE') {
        onlineTotal += paid;
      }
    });

    return {
      grandTotal: Number(grandTotal.toFixed(2)),
      grandPaid: Number(grandPaid.toFixed(2)),
      grandPending: Number(grandPending.toFixed(2)),
      cashTotal: Number(cashTotal.toFixed(2)),
      onlineTotal: Number(onlineTotal.toFixed(2)),
      totalAppointments,
      totalBills,
    };
  }, [appointmentSummaries, bills]);

  const selectedSummaryBreakdown = useMemo(() => {
    if (!selectedSummary) return null;

    const billsList = Array.isArray(selectedSummary.bills) ? selectedSummary.bills : [];
    const paymentsList = Array.isArray(selectedSummary.payments) ? selectedSummary.payments : [];
    const allItems = billsList.flatMap((bill: any) => Array.isArray(bill.items) ? bill.items : []);

    const amountByItemType = allItems.reduce((acc: Record<string, number>, item: any) => {
      const key = String(item?.item_type || 'OTHER').toUpperCase();
      acc[key] = (acc[key] || 0) + (Number(item?.amount || 0));
      return acc;
    }, {} as Record<string, number>);

    const paymentByMode = paymentsList.reduce((acc: Record<string, number>, payment: any) => {
      const key = String(payment?.payment_mode || 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] || 0) + Number(payment?.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const paymentByPlace = paymentsList.reduce((acc: Record<string, number>, payment: any) => {
      const key = getPaymentPlaceLabel(payment);
      acc[key] = (acc[key] || 0) + Number(payment?.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const billTypeTotals = billsList.reduce((acc: Record<string, number>, bill: any) => {
      const key = String(bill?.bill_type || 'OTHER').toUpperCase();
      acc[key] = (acc[key] || 0) + Number(bill?.total_amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const itemsByType = allItems.reduce((acc: Record<string, any[]>, item: any) => {
      const key = String(item?.item_type || 'OTHER').toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      totalItems: allItems.length,
      amountByItemType: Object.entries(amountByItemType)
        .map(([type, total]) => ({
          type,
          label: getItemTypeLabel(type),
          total: Number(Number(total).toFixed(2)),
          items: (itemsByType[type] || []).map((item: any) => ({
            bill_item_id: item.bill_item_id,
            item_name: item.item_name,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            amount: Number(item.amount || 0),
          })),
        }))
        .sort((a, b) => b.total - a.total),
      paymentByMode: Object.entries(paymentByMode)
        .map(([mode, total]) => ({ mode, total: Number(Number(total).toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
      paymentByPlace: Object.entries(paymentByPlace)
        .map(([place, total]) => ({ place, total: Number(Number(total).toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
      billTypeTotals: Object.entries(billTypeTotals)
        .map(([type, total]) => ({ type, total: Number(Number(total).toFixed(2)) }))
        .sort((a, b) => b.total - a.total),
    };
  }, [selectedSummary]);

  const handleViewSummary = async (appointmentId: number) => {
    setIsDetailLoading(true);
    setExpandedChargeType(null);
    try {
      const response = await fetch(`/api/v1/bills/appointment/${appointmentId}/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setSelectedSummary(result.data);
      } else {
        addToast(result.message || 'Failed to fetch appointment billing summary', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while fetching appointment billing summary', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Module View Tabs */}
      <div className="bg-white p-2 border border-gray-200 rounded-2xl shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('BILLS')}
          className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'BILLS'
              ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Receipt size={16} /> Appointment Bills List
        </button>
        <button
          onClick={() => setActiveTab('CONSULTANT_REVENUE')}
          className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'CONSULTANT_REVENUE'
              ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <UserCheck size={16} /> Revenue by Consultant
        </button>
        <button
          onClick={() => setActiveTab('MEDICINE_REVENUE')}
          className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'MEDICINE_REVENUE'
              ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Pill size={16} /> Gross Revenue by Medicine
        </button>
      </div>
      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={22} />
            <input
              type="text"
              placeholder={t('bills.search_placeholder', 'Search patient, AUID, bill number...')}
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 py-4 pl-14 pr-6 text-sm font-bold text-gray-600 outline-none focus:border-[#549E9E]/20 transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            onClick={fetchBills}
            className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] py-4 px-6 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-[#549E9E]/5 rounded-xl"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('bills.refresh', 'Refresh')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 items-end">
          <CustomDatePicker label={t('bills.filters.appointment_date', 'Appointment Date')} value={filterDate} onChange={setFilterDate} />

          <FilterDropdown
            label={t('bills.filters.bill_type', 'Bill Type')}
            icon={Tag}
            value={billType}
            onChange={(v) => setBillType(v as BillFilterType)}
            options={[
              { id: 'ALL', label: t('bills.filters.all_types', 'All Types') },
              { id: 'CONSULTATION', label: t('bills.filters.consultation', 'Consultation') },
              { id: 'MEDICATION', label: t('bills.filters.medication', 'Medication') }
            ]}
          />

          <FilterDropdown
            label={t('bills.filters.payment_status', 'Payment Status')}
            icon={CreditCard}
            value={paymentStatus}
            onChange={(v) => setPaymentStatus(v as BillFilterStatus)}
            options={[
              { id: 'ALL', label: t('bills.filters.all_status', 'All Status') },
              { id: 'UNPAID', label: t('bills.filters.unpaid', 'Unpaid') },
              { id: 'PAID', label: t('bills.filters.paid', 'Paid') },
              { id: 'PARTIAL', label: t('bills.filters.partial', 'Partial') }
            ]}
          />

          <FilterDropdown
            label={t('bills.filters.payment_mode', 'Payment Mode')}
            icon={Wallet}
            value={paymentMode}
            onChange={(v) => setPaymentMode(v as BillFilterPaymentMode)}
            options={[
              { id: 'ALL', label: t('bills.filters.all_modes', 'All Modes') },
              { id: 'CASH', label: t('bills.filters.cash', 'Cash') },
              { id: 'ONLINE', label: t('bills.filters.online', 'Online') }
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
          <button onClick={fetchBills} className="text-xs font-black text-red-600 underline uppercase tracking-widest">Retry</button>
        </div>
      )}

      {activeTab === 'BILLS' ? (
        <>
          {appointmentSummaries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grand Total</p>
                <p className="text-xl sm:text-2xl font-black text-gray-800">₹ {billsTotals.grandTotal.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">{billsTotals.totalAppointments} Appointments</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600">₹ {billsTotals.grandPaid.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wider mt-1">{billsTotals.totalBills} Bills</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-orange-500/70 uppercase tracking-widest mb-1">Total Pending</p>
                <p className="text-xl sm:text-2xl font-black text-orange-500">₹ {billsTotals.grandPending.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-wider mt-1">Due Amount</p>
              </div>
              <div className="bg-white border border-emerald-100 bg-emerald-50/20 p-4 rounded-xl shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-emerald-700/80 uppercase tracking-widest mb-1">Cash Collection</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700">₹ {billsTotals.cashTotal.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Paid in Cash</p>
              </div>
              <div className="bg-white border border-blue-100 bg-blue-50/20 p-4 rounded-xl shadow-sm relative overflow-hidden">
                <p className="text-[10px] font-black text-blue-700/80 uppercase tracking-widest mb-1">Online Collection</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700">₹ {billsTotals.onlineTotal.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-1">UPI / Digital</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#549E9E]/20 border-t-[#549E9E] rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Fetching Bills...</p>
                </div>
              </div>
            )}

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.appointment', 'Appointment')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.patient', 'Patient')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.date', 'Date')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.payment_mode', 'Payment Mode')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.grand_total', 'Grand Total')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.grand_paid', 'Grand Paid')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.grand_pending', 'Grand Pending')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('bills.table.overall_status', 'Overall Status')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('bills.table.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointmentSummaries.length > 0 ? (
                appointmentSummaries.map((entry) => (
                  <motion.tr
                    key={entry.appointment_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-[#549E9E]/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[#549E9E]">{entry.auid || `Appointment #${entry.appointment_id}`}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Token #{entry.display_token_display || entry.token_number || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800 uppercase tracking-wide">
                          {entry.patient_full_name || 'N/A'}
                          {entry.booked_for_type === 'FAMILY_MEMBER' && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                              {entry.family_member_relationship}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {entry.patient_mobile_no || 'N/A'}
                          {entry.booked_for_type === 'FAMILY_MEMBER' && entry.primary_patient_full_name && (
                            <span className="text-gray-300"> (Account: {entry.primary_patient_full_name})</span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-300 font-bold mt-1">{entry.branch_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-800 font-black text-xs">
                          <Calendar size={13} className="text-[#549E9E]" />
                          {entry.appointment_date ? new Date(entry.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {entry.treatment_name || 'No Treatment'}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <PaymentModeBadge mode={entry.payment_mode} />
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-gray-800">₹ {Number(entry.grand_total || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm font-black text-emerald-600">₹ {Number(entry.grand_paid || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm font-black text-orange-500">₹ {Number(entry.grand_pending || 0).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={entry.overall_payment_status} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleViewSummary(entry.appointment_id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#549E9E] hover:bg-[#438787] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                      >
                        <FileText size={14} /> {t('bills.table.view_summary', 'View Summary')}
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : !isLoading && (
                <tr>
                  <td colSpan={9} className="px-5 py-20">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center">
                        <Receipt size={32} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('bills.no_records.title', 'No appointment billing summaries found')}</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{t('bills.no_records.desc', 'Try adjusting your search or filters')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {appointmentSummaries.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-[#549E9E]/[0.04]">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Receipt size={16} className="text-[#549E9E]" />
                      <span>{t('bills.table.grand_total_summary', 'Grand Total Summary')} ({billsTotals.totalAppointments} Appointments • {billsTotals.totalBills} Bills)</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-gray-900">
                    ₹ {billsTotals.grandTotal.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-emerald-600">
                    ₹ {billsTotals.grandPaid.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-orange-500">
                    ₹ {billsTotals.grandPending.toFixed(2)}
                  </td>
                  <td colSpan={2} className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">
                    <span className="text-emerald-700 font-extrabold mr-3">Cash: ₹ {billsTotals.cashTotal.toFixed(2)}</span>
                    <span className="text-blue-700 font-extrabold">Online: ₹ {billsTotals.onlineTotal.toFixed(2)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <AnimatePresence>
        {(selectedSummary || isDetailLoading) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDetailLoading && setSelectedSummary(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-white border-2 border-gray-100 shadow-2xl overflow-y-auto"
            >
              {isDetailLoading || !selectedSummary ? (
                <div className="p-12 flex items-center justify-center">
                  <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
                </div>
              ) : (
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Appointment Billing Summary</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {selectedSummary.appointment?.auid} • Token #{selectedSummary.appointment?.display_token_display || selectedSummary.appointment?.token_number || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSummary(null)}
                      className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50/60 border border-gray-100 p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Patient</p>
                      <p className="text-sm font-black text-gray-800">
                        {selectedSummary.appointment?.patient_full_name || 'N/A'}
                        {selectedSummary.appointment?.booked_for_type === 'FAMILY_MEMBER' && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                            {selectedSummary.appointment?.family_member_relationship} (Owner: {selectedSummary.appointment?.primary_patient_full_name})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-50/60 border border-gray-100 p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Branch</p>
                      <p className="text-sm font-black text-gray-800">{selectedSummary.appointment?.branch_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50/60 border border-gray-100 p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Treatment</p>
                      <p className="text-sm font-black text-gray-800">{selectedSummary.appointment?.treatment_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50/60 border border-gray-100 p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Overall Status</p>
                      <PaymentStatusBadge status={selectedSummary.summary?.overall_payment_status} />
                    </div>
                  </div>

                  <div className="bg-[#549E9E]/[0.03] border border-[#549E9E]/10 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-100 p-4">
                        <p className="text-[10px] font-black text-[#549E9E]/60 uppercase tracking-widest mb-1">Grand Total</p>
                        <p className="text-2xl font-black text-[#549E9E]">{formatCurrency(selectedSummary.summary?.grand_total)}</p>
                      </div>
                      <div className="bg-white border border-gray-100 p-4">
                        <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Grand Paid</p>
                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(selectedSummary.summary?.grand_paid)}</p>
                      </div>
                      <div className="bg-white border border-gray-100 p-4">
                        <p className="text-[10px] font-black text-orange-500/70 uppercase tracking-widest mb-1">Grand Pending</p>
                        <p className="text-2xl font-black text-orange-500">{formatCurrency(selectedSummary.summary?.grand_pending)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="border border-gray-100 bg-gray-50/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={15} className="text-[#549E9E]" />
                        <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Amount by Charge Type</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedSummaryBreakdown?.amountByItemType?.length ? selectedSummaryBreakdown.amountByItemType.map((entry: any) => (
                          <div key={entry.type} className="bg-white border border-gray-100">
                            <button
                              type="button"
                              onClick={() => setExpandedChargeType((prev) => prev === entry.type ? null : entry.type)}
                              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-all"
                            >
                              <div>
                                <div className="text-xs font-black text-gray-700">{entry.label}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                  {entry.items?.length || 0} item(s)
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-[#549E9E]">{formatCurrency(entry.total)}</span>
                                <ChevronDown
                                  size={14}
                                  className={`text-gray-400 transition-transform ${expandedChargeType === entry.type ? 'rotate-180 text-[#549E9E]' : ''}`}
                                />
                              </div>
                            </button>

                            {expandedChargeType === entry.type && (
                              <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-2">
                                {entry.items?.length ? entry.items.map((item: any) => (
                                  <div key={item.bill_item_id} className="bg-white border border-gray-100 px-3 py-2 grid grid-cols-[1fr_90px_100px] gap-3 items-center">
                                    <div>
                                      <p className="text-xs font-black text-gray-800">{item.item_name}</p>
                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        Qty {item.quantity || 1} • Rate {formatCurrency(item.unit_price)}
                                      </p>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 text-right">
                                      {formatCurrency(item.unit_price)}
                                    </div>
                                    <div className="text-sm font-black text-[#549E9E] text-right">
                                      {formatCurrency(item.amount)}
                                    </div>
                                  </div>
                                )) : (
                                  <div className="bg-white border border-gray-100 p-3 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    No items found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )) : (
                          <div className="bg-white border border-gray-100 p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            No item breakdown available
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-100 bg-gray-50/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <CreditCard size={15} className="text-[#549E9E]" />
                        <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Payment by Mode</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedSummaryBreakdown?.paymentByMode?.length ? selectedSummaryBreakdown.paymentByMode.map((entry: any) => (
                          <div key={entry.mode} className="bg-white border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-black text-gray-700">{entry.mode}</span>
                            <span className="text-sm font-black text-emerald-600">{formatCurrency(entry.total)}</span>
                          </div>
                        )) : (
                          <div className="bg-white border border-gray-100 p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            No payments recorded
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-100 bg-gray-50/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Receipt size={15} className="text-[#549E9E]" />
                        <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Payment by Place</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedSummaryBreakdown?.paymentByPlace?.length ? selectedSummaryBreakdown.paymentByPlace.map((entry: any) => (
                          <div key={entry.place} className="bg-white border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-black text-gray-700">{entry.place}</span>
                            <span className="text-sm font-black text-emerald-600">{formatCurrency(entry.total)}</span>
                          </div>
                        )) : (
                          <div className="bg-white border border-gray-100 p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                            No place-wise payments recorded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Receipt size={16} className="text-[#549E9E]" />
                      <h3 className="text-[11px] font-black text-[#549E9E] uppercase tracking-widest">Bills for this Appointment</h3>
                    </div>

                    {(selectedSummary.bills || []).map((bill: any) => (
                      <div key={bill.bill_id} className="border border-gray-100 bg-gray-50/40 p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-[#549E9E]">{bill.bill_number}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{bill.bill_type}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <PaymentStatusBadge status={bill.payment_status} />
                            <div className="text-sm font-black text-gray-800">{formatCurrency(bill.total_amount)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white border border-gray-100 p-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Paid</p>
                            <p className="text-lg font-black text-emerald-600">{formatCurrency(bill.paid_amount)}</p>
                          </div>
                          <div className="bg-white border border-gray-100 p-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending</p>
                            <p className="text-lg font-black text-orange-500">{formatCurrency(bill.pending_amount)}</p>
                          </div>
                          <div className="bg-white border border-gray-100 p-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Remark</p>
                            <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{bill.remark || 'No remarks added.'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-[#549E9E]" />
                              <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Payments</h4>
                            </div>
                            {(bill.payments || []).length > 0 ? (
                              <div className="space-y-3">
                                {bill.payments.map((payment: any) => (
                                  <div key={payment.payment_id} className="bg-white border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount / Mode</p>
                                      <p className="text-sm font-black text-gray-800">{formatCurrency(payment.amount)} • {payment.payment_mode || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Collected At</p>
                                      <p className="text-sm font-bold text-gray-700">{payment.collected_at ? new Date(payment.collected_at).toLocaleString() : '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reference / Place</p>
                                      <p className="text-sm font-bold text-gray-700">
                                        {payment.transaction_reference || '—'} • {getPaymentPlaceLabel(payment)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Remark / Collected By</p>
                                      <p className="text-sm font-bold text-gray-700">
                                        {payment.remark || '—'} • {payment.collected_by_role || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white border border-gray-100 p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                No payments recorded
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <ClipboardList size={14} className="text-[#549E9E]" />
                              <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">Bill Items</h4>
                            </div>
                            {(bill.items || []).length > 0 ? (
                              <div className="space-y-3">
                                {bill.items.map((item: any) => (
                                  <div key={item.bill_item_id} className="bg-white border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-[1.6fr_110px_80px_110px] gap-3 items-center">
                                    <div className="space-y-2">
                                      <div className="text-sm font-black text-gray-800">{item.item_name}</div>
                                      <BillItemTypeBadge type={item.item_type} />
                                    </div>
                                    <div className="text-sm font-bold text-gray-600">Qty {item.quantity || 1}</div>
                                    <div className="text-sm font-bold text-gray-500">{formatCurrency(item.unit_price)}</div>
                                    <div className="text-sm font-black text-[#549E9E] text-right">{formatCurrency(item.amount)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white border border-gray-100 p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                No bill items available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-[#549E9E]" />
                      <h3 className="text-[11px] font-black text-[#549E9E] uppercase tracking-widest">Merged Payment Timeline</h3>
                    </div>

                    {(selectedSummary.payments || []).length > 0 ? (
                      <div className="space-y-3">
                        {selectedSummary.payments.map((payment: any) => (
                          <div key={`${payment.bill_id}-${payment.payment_id}`} className="bg-gray-50/50 border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_1fr_1fr] gap-3 items-center">
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill</p>
                              <p className="text-sm font-black text-[#549E9E]">{payment.bill_number}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{payment.bill_type}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount</p>
                              <p className="text-sm font-black text-gray-800">{formatCurrency(payment.amount)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mode</p>
                              <p className="text-sm font-bold text-gray-700">{payment.payment_mode || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Place</p>
                              <p className="text-sm font-bold text-gray-700">{getPaymentPlaceLabel(payment)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reference / Note</p>
                              <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap">{payment.transaction_reference || payment.remark || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Collected At</p>
                              <p className="text-sm font-bold text-gray-700">{payment.collected_at ? new Date(payment.collected_at).toLocaleString() : '—'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                        No payments recorded for this appointment
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      ) : activeTab === 'CONSULTANT_REVENUE' ? (
        /* Revenue by Consultant Section */
        <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <UserCheck size={20} className="text-[#549E9E]" /> Doctor / Consultant Revenue Breakdown
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Consultation fees, medicine, test/lab and courier revenue per doctor
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CustomDatePicker label="Filter Date" value={filterDate} onChange={setFilterDate} />
              <button
                onClick={fetchRevenueReports}
                className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5 rounded-xl"
              >
                <RefreshCcw size={14} className={isReportLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {(consultantRevenue.meta?.report_keys || []).map((slotKey: string) => {
              const list = consultantRevenue.data?.[slotKey] || [];
              return (
                <div key={slotKey} className="space-y-4">
                  <div className="bg-[#549E9E]/10 border border-[#549E9E]/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#549E9E] rounded-lg">
                    {slotKey} Session
                  </div>
                  <div className="overflow-x-auto">
                    {list.length > 0 ? (
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Doctor / Consultant</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Payment Mode</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Consultations</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Consultation Revenue</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Counter / Hand Medicine</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Test / Lab Revenue</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Courier Medicine</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Courier Charge</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Courier Revenue</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Gross Revenue</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Paid Revenue</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Pending Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                          {list.map((doc: any, docIdx: number) => (
                            <tr key={`${doc.doctor_id}-${doc.payment_mode || docIdx}`} className="hover:bg-[#549E9E]/[0.02] transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-extrabold text-gray-800 text-sm">{doc.doctor_name}</div>
                                {doc.doctor_uuid && (
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{doc.doctor_uuid}</div>
                                )}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <PaymentModeBadge mode={doc.payment_mode} />
                              </td>
                              <td className="py-4 px-5 text-center font-black text-gray-800 text-sm">{doc.total_consultations}</td>
                              <td className="py-4 px-5 text-right font-bold text-gray-700">₹ {Number(doc.consultation_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-violet-600">₹ {Number(doc.medication_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-amber-600">₹ {Number(doc.test_lab_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-blue-600">₹ {Number(doc.courier_medicine_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-sky-600">₹ {Number(doc.courier_charge_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-black text-cyan-700">₹ {Number(doc.courier_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-black text-[#549E9E] text-base">₹ {Number(doc.total_gross_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-emerald-600">₹ {Number(doc.total_paid_revenue || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-bold text-amber-500">₹ {Number(doc.total_pending_revenue || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {list.length > 0 && (() => {
                          const totalConsults = list.reduce((sum: number, doc: any) => sum + Number(doc.total_consultations || 0), 0);
                          const totalConsultRev = list.reduce((sum: number, doc: any) => sum + Number(doc.consultation_revenue || 0), 0);
                          const totalMedRev = list.reduce((sum: number, doc: any) => sum + Number(doc.medication_revenue || 0), 0);
                          const totalTestLabRev = list.reduce((sum: number, doc: any) => sum + Number(doc.test_lab_revenue || 0), 0);
                          const totalCourierMedRev = list.reduce((sum: number, doc: any) => sum + Number(doc.courier_medicine_revenue || 0), 0);
                          const totalCourierChargeRev = list.reduce((sum: number, doc: any) => sum + Number(doc.courier_charge_revenue || 0), 0);
                          const totalCourierRev = list.reduce((sum: number, doc: any) => sum + Number(doc.courier_revenue || 0), 0);
                          const totalGross = list.reduce((sum: number, doc: any) => sum + Number(doc.total_gross_revenue || 0), 0);
                          const totalPaid = list.reduce((sum: number, doc: any) => sum + Number(doc.total_paid_revenue || 0), 0);
                          const totalPending = list.reduce((sum: number, doc: any) => sum + Number(doc.total_pending_revenue || 0), 0);
                          return (
                            <tfoot className="border-t-2 border-gray-200 bg-[#549E9E]/[0.04]">
                              <tr>
                                <td colSpan={2} className="py-4 px-5 text-xs font-black text-gray-800 uppercase tracking-widest">
                                  {slotKey} Total ({list.length} Records)
                                </td>
                                <td className="py-4 px-5 text-center font-black text-gray-800 text-sm">{totalConsults}</td>
                                <td className="py-4 px-5 text-right font-black text-gray-800">₹ {totalConsultRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-violet-700">₹ {totalMedRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-amber-700">₹ {totalTestLabRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-blue-700">₹ {totalCourierMedRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-sky-700">₹ {totalCourierChargeRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-cyan-700">₹ {totalCourierRev.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-[#549E9E] text-base">₹ {totalGross.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-emerald-600">₹ {totalPaid.toFixed(2)}</td>
                                <td className="py-4 px-5 text-right font-black text-amber-600">₹ {totalPending.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    ) : (
                      <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50/50 rounded-xl">
                        No consultant revenue records found for {slotKey} session
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!consultantRevenue.meta?.report_keys || consultantRevenue.meta.report_keys.length === 0) && (
              <div className="p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                {isReportLoading ? 'Loading consultant revenue data...' : 'No consultant revenue records found for this period'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Revenue by Medicine Section */
        <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <Pill size={20} className="text-emerald-500" /> Gross Revenue by Medicine
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Total medicine sales revenue without calculating actual cost price
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CustomDatePicker label="Filter Date" value={filterDate} onChange={setFilterDate} />
              <button
                onClick={fetchRevenueReports}
                className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5 rounded-xl"
              >
                <RefreshCcw size={14} className={isReportLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {(medicineRevenue.meta?.report_keys || []).map((slotKey: string) => {
              const list = medicineRevenue.data?.[slotKey] || [];
              return (
                <div key={slotKey} className="space-y-4">
                  <div className="bg-[#549E9E]/10 border border-[#549E9E]/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#549E9E] rounded-lg">
                    {slotKey} Session
                  </div>
                  <div className="overflow-x-auto">
                    {list.length > 0 ? (
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicine Name</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Payment Mode</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Bills Count</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total Quantity Sold</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Avg Unit Selling Price</th>
                            <th className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gross Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                          {list.map((med: any, idx: number) => (
                            <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="py-4 px-5 font-black text-gray-800 flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black border border-emerald-100">
                                  #{idx + 1}
                                </span>
                                <span className="text-sm font-black text-gray-800">{med.medicine_name}</span>
                              </td>
                              <td className="py-4 px-5 text-center">
                                <PaymentModeBadge mode={med.payment_mode} />
                              </td>
                              <td className="py-4 px-5 text-center font-bold text-gray-700 text-sm">{med.total_bills}</td>
                              <td className="py-4 px-5 text-center font-black text-[#549E9E] text-base">{med.total_quantity_sold}</td>
                              <td className="py-4 px-5 text-right font-bold text-gray-700">₹ {Number(med.average_unit_price || 0).toFixed(2)}</td>
                              <td className="py-4 px-5 text-right font-black text-emerald-600 text-base">₹ {Number(med.gross_revenue || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {list.length > 0 && (() => {
                          const totalBillsCount = list.reduce((sum: number, med: any) => sum + Number(med.total_bills || 0), 0);
                          const totalQuantity = list.reduce((sum: number, med: any) => sum + Number(med.total_quantity_sold || 0), 0);
                          const totalGross = list.reduce((sum: number, med: any) => sum + Number(med.gross_revenue || 0), 0);
                          return (
                            <tfoot className="border-t-2 border-gray-200 bg-[#549E9E]/[0.04]">
                              <tr>
                                <td colSpan={2} className="py-4 px-5 text-xs font-black text-gray-800 uppercase tracking-widest">
                                  {slotKey} Total ({list.length} Medicines)
                                </td>
                                <td className="py-4 px-5 text-center font-black text-gray-800 text-sm">{totalBillsCount}</td>
                                <td className="py-4 px-5 text-center font-black text-[#549E9E] text-base">{totalQuantity}</td>
                                <td className="py-4 px-5 text-right text-gray-400 font-bold text-xs">—</td>
                                <td className="py-4 px-5 text-right font-black text-emerald-600 text-base">₹ {totalGross.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    ) : (
                      <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50/50 rounded-xl">
                        No medicine revenue records found for {slotKey} session
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!medicineRevenue.meta?.report_keys || medicineRevenue.meta.report_keys.length === 0) && (
              <div className="p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                {isReportLoading ? 'Loading medicine revenue data...' : 'No medicine revenue records found for this period'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
