import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Download
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { dedupedFetch } from '../../utils/dedupedFetch';
import CustomDatePicker from '../CustomDatePicker';
import Pagination from '../Pagination';
import { useTranslation } from 'react-i18next';
import { formatConsultationMedicineText, formatNumericMedicineWithFormula, getDosePreview } from '../../utils/prescriptionFormat';
import MedicationDuePaymentPanel from './MedicationDuePaymentPanel';
import { formatMoney } from '../../utils/medicationDues';
import type { AllocationOrder, DueBill } from '../../utils/medicationDues';
import PrescriptionPrint from '../PrescriptionPrint';

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    cancelled: 'bg-red-50 text-red-600 border-red-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
  };
  const icons: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle2 size={12} />,
    pending: <Clock size={12} />,
    cancelled: <XCircle size={12} />,
    completed: <CheckCircle2 size={12} />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[s] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
      {icons[s] || <AlertCircle size={12} />}
      {status}
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

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  id,
  allowCustom,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  id?: string;
  allowCustom?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const showCustomOption =
    allowCustom &&
    searchTerm.trim() &&
    !options.some(
      (opt) => opt.label.toLowerCase() === searchTerm.trim().toLowerCase(),
    );
  if (showCustomOption) {
    filteredOptions.push({
      label: `Use "${searchTerm.trim()}"`,
      value: searchTerm.trim(),
    });
  }

  const selectedOption =
    options.find((opt) => opt.value === value) ||
    options.find((opt) => opt.label === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-8.5 px-3 bg-white border rounded-lg flex items-center justify-between text-xs font-bold text-gray-800 transition-all outline-none ${
          disabled
            ? "bg-gray-100 opacity-80 cursor-not-allowed border-gray-200"
            : isOpen
            ? "border-[#549E9E] ring-2 ring-[#549E9E]/10 cursor-pointer"
            : "border-gray-200 hover:border-gray-300 cursor-pointer"
        }`}
      >
        <span className={`truncate ${!displayValue ? "text-gray-400 font-normal" : ""}`}>
          {displayValue || placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-[#549E9E]" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-[150] rounded-xl overflow-hidden max-h-56 flex flex-col"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 px-2.5 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-800 outline-none focus:border-[#549E9E]"
              />
            </div>

            <div className="overflow-y-auto max-h-44 p-1 space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => (
                  <div
                    key={`${opt.value}-${idx}`}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                      value === opt.value
                        ? "bg-[#549E9E] text-white"
                        : "text-gray-700 hover:bg-[#549E9E]/10 hover:text-[#549E9E]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && <Check size={12} />}
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-xs font-bold text-gray-400 text-center">
                  No matches found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MedicalDashboard() {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const [patientSearch, setPatientSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 8;
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textMedicines, setTextMedicines] = useState<any[]>([]);

  useEffect(() => {
    const fetchTextMedicines = async () => {
      try {
        const response = await dedupedFetch('/api/v1/medical/masters/text-medicines', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data.text_medicines)) {
          setTextMedicines(result.data.text_medicines);
        }
      } catch (err) {
        console.error('Failed to fetch text medicines in MedicalDashboard:', err);
      }
    };
    if (token) {
      fetchTextMedicines();
    }
  }, [token]);

  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [previewPrescription, setPreviewPrescription] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('');
  const [allocationOrder, setAllocationOrder] = useState<AllocationOrder>('CURRENT_ONLY');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });

  const isHi = i18n.language === 'hi';

  const prescriptionsRequestIdRef = useRef(0);
  const fetchPrescriptions = useCallback(async () => {
    const requestId = ++prescriptionsRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') params.append('appointment_date', filterDate);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (patientSearch.trim()) params.append('patient_search', patientSearch.trim());
      params.append('page', String(currentPage));
      params.append('page_size', String(pageSize));

      const url = `/api/v1/medical/prescriptions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await dedupedFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (requestId !== prescriptionsRequestIdRef.current) return;

      if (result.success) {
        setPrescriptions(result.data || []);
        setTotalPages(Number(result.meta?.total_pages || 1));
      } else {
        setError(result.message || 'Failed to fetch prescriptions');
      }
    } catch (err) {
      if (requestId !== prescriptionsRequestIdRef.current) return;
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      if (requestId === prescriptionsRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filterDate, filterStatus, patientSearch, token, currentPage, pageSize]);

  useEffect(() => {
    if (!token) return;
    const delay = patientSearch.trim() ? 500 : 0;
    const timer = window.setTimeout(() => { void fetchPrescriptions(); }, delay);
    return () => window.clearTimeout(timer);
  }, [token, fetchPrescriptions, patientSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterStatus, patientSearch]);

  // Lock background page scroll while dispense modal is open.
  useEffect(() => {
    if (!selectedPrescription) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedPrescription]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [medAmounts, setMedAmounts] = useState<Record<number, string>>({});
  const [medItemStates, setMedItemStates] = useState<Record<number, {
    dispense_status: 'ACTIVE' | 'VOID';
    void_reason: string;
    version: number;
    events: any[];
  }>>({});
  const [testItemStates, setTestItemStates] = useState<Record<number, {
    dispense_status: 'ACTIVE' | 'VOID';
    void_reason: string;
    version: number;
  }>>({});
  const [voidDialog, setVoidDialog] = useState<{ type: 'medicine' | 'test'; idx: number; name: string } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  type AdditionalMed = {
    name: string;
    medicine_value: string;
    selectedVariant?: { label: string; price: string | number } | null;
    quantity?: number | string;
    amount: string;
    consultation_medication_id?: number | null;
  };

  const [additionalMeds, setAdditionalMeds] = useState<AdditionalMed[]>([]);
  const getBaseMedicationTotal = (
    amounts: Record<number, string> = medAmounts,
    states: typeof medItemStates = medItemStates
  ) =>
    Object.entries(amounts).reduce(
      (sum, [idx, value]) => states[Number(idx)]?.dispense_status === 'VOID'
        ? sum
        : sum + (parseFloat(value) || 0),
      0
    );
  const getSelectedTestsTotal = (states: typeof testItemStates = testItemStates) =>
    (selectedPrescription?.prescription?.tests || []).reduce(
      (sum: number, test: any, idx: number) => states[idx]?.dispense_status === 'VOID'
        ? sum
        : sum + (parseFloat(String(test?.amount ?? 0)) || 0),
      0
    );

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

  const handleDispense = (p: any) => {
    setSelectedPrescription(p);
    const pricing = p.prescription?.pricing || null;
    const baseMedications = (p.prescription?.medications || []).filter((m: any) => m.added_by_role !== 'MEDICAL');
    const medicalAddedMedications = (p.prescription?.medications || []).filter((m: any) => m.added_by_role === 'MEDICAL');
    if (pricing) {
      const initialAmounts: Record<number, string> = {};
      const initialStates: typeof medItemStates = {};
      const pricingItemsByMedicationId = new Map<number, any>(
        (pricing.medications || []).map((item: any) => [Number(item.consultation_medication_id), item])
      );
      baseMedications.forEach((m: any, i: number) => {
        const pricingItem = pricingItemsByMedicationId.get(Number(m.consultation_medication_id));
        initialAmounts[i] = pricingItem?.amount && Number(pricingItem.amount) !== 0 ? pricingItem.amount.toString() : '';
        initialStates[i] = {
          dispense_status: pricingItem?.dispense_status === 'VOID' ? 'VOID' : 'ACTIVE',
          void_reason: pricingItem?.void_reason || '',
          version: Number(pricingItem?.version || 0),
          events: pricingItem?.events || [],
        };
      });
      setMedAmounts(initialAmounts);
      setMedItemStates(initialStates);
      setTestItemStates(
        Object.fromEntries((p.prescription?.tests || []).map((test: any, i: number) => [
          i,
          {
            dispense_status: test?.dispense_status === 'VOID' ? 'VOID' : 'ACTIVE',
            void_reason: test?.void_reason || '',
            version: Number(test?.version || 1),
          },
        ]))
      );
      setAdditionalMeds(
        medicalAddedMedications.map((m: any) => {
          const pricingItem = pricingItemsByMedicationId.get(Number(m.consultation_medication_id));
          let medVal = String(m.medicine_value || '').trim();
          let parsedQty = 1;
          const matchSuffix = medVal.match(/^(.*?)\s*[*xX]\s*(\d+)$/);
          const matchPrefix = medVal.match(/^(\d+)\s*[*xX]\s*(.*)$/);
          if (matchSuffix) {
            medVal = matchSuffix[1].trim();
            parsedQty = parseInt(matchSuffix[2]) || 1;
          } else if (matchPrefix) {
            parsedQty = parseInt(matchPrefix[1]) || 1;
            medVal = matchPrefix[2].trim();
          }

          return {
            name: medVal,
            medicine_value: m.medicine_value || '',
            selectedVariant: null,
            quantity: parsedQty,
            amount: pricingItem?.amount && Number(pricingItem.amount) !== 0 ? pricingItem.amount.toString() : '',
            consultation_medication_id: m.consultation_medication_id || null,
          };
        })
      );
      const testsTotal = (p.prescription?.tests || []).reduce(
        (sum: number, test: any) => String(test?.dispense_status || 'ACTIVE').toUpperCase() === 'VOID'
          ? sum
          : sum + (parseFloat(String(test?.amount ?? 0)) || 0),
        0
      );
      const computedBaseTotal =
        getBaseMedicationTotal(initialAmounts, initialStates)
        + medicalAddedMedications.reduce((sum: number, med: any) => {
          const pricingItem = pricingItemsByMedicationId.get(Number(med.consultation_medication_id));
          return sum + (parseFloat(String(pricingItem?.amount ?? 0)) || 0);
        }, 0)
        + testsTotal;
      setAmount(
        pricing.total_amount && Number(pricing.total_amount) !== 0
          ? pricing.total_amount.toString()
          : computedBaseTotal.toString()
      );
      setCollectedAmount(
        pricing.total_amount && Number(pricing.total_amount) !== 0
          ? Number(pricing.total_amount).toFixed(2)
          : Number(computedBaseTotal || 0).toFixed(2)
      );
      setRemark(pricing.remark || '');
    } else {
      setMedAmounts({});
      setMedItemStates(
        Object.fromEntries(baseMedications.map((_: any, i: number) => [
          i,
          { dispense_status: 'ACTIVE', void_reason: '', version: 0, events: [] }
        ]))
      );
      setTestItemStates(
        Object.fromEntries((p.prescription?.tests || []).map((test: any, i: number) => [
          i,
          {
            dispense_status: test?.dispense_status === 'VOID' ? 'VOID' : 'ACTIVE',
            void_reason: test?.void_reason || '',
            version: Number(test?.version || 1),
          },
        ]))
      );
      setAdditionalMeds([]);
      const unpricedTestsTotal = (p.prescription?.tests || []).reduce(
        (sum: number, test: any) => String(test?.dispense_status || 'ACTIVE').toUpperCase() === 'VOID'
          ? sum
          : sum + (parseFloat(String(test?.amount ?? 0)) || 0),
        0
      );
      setAmount((unpricedTestsTotal || 0).toString());
      setCollectedAmount((unpricedTestsTotal || 0).toFixed(2));
      setRemark('');
    }
    setPaymentMode('CASH');
    setTransactionReference('');
    setPaymentRemark('');
    setAllocationOrder('CURRENT_ONLY');
    setVoidDialog(null);
    setVoidReason('');
  };

  const handleMedAmountChange = (idx: number, val: string) => {
    const newAmounts = { ...medAmounts, [idx]: val };
    setMedAmounts(newAmounts);

    const additionalTotal = additionalMeds.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    const total = getBaseMedicationTotal(newAmounts, medItemStates) + additionalTotal + testsTotal;
    setAmount(total.toString());
  };

  const updateAdditionalMedField = (
    idx: number,
    field: 'name' | 'selectedVariant' | 'quantity' | 'amount' | 'medicine_value',
    val: any
  ) => {
    const updated = [...additionalMeds];
    const current = { ...updated[idx] };

    if (field === 'name') {
      current.name = val;
      const medicine = textMedicines.find((m) => m.medicine_value === val);
      const computedVariants =
        medicine && medicine.medical_products?.length
          ? medicine.medical_products
              .map((p: any) => ({
                label: p.packing || p.size_or_weight || p.net_weight_or_size || p.product_name || 'N/A',
                price: p.mrp_rate || p.price_max || p.price_min || '0',
              }))
              .filter((v: any) => v.label !== 'N/A')
          : medicine
          ? [
              ...(medicine.products || []).map((p: any) => ({ label: p.packing || 'N/A', price: p.mrp_rate || '0' })),
              ...(medicine.radient_pharma_products || []).map((p: any) => ({ label: p.net_weight_or_size || 'N/A', price: p.mrp_rate || '0' })),
              ...(medicine.handwritten_product_prices || []).map((p: any) => ({ label: p.product_name || p.category || 'N/A', price: p.price_max || '0' })),
            ].filter((v: any) => v.label !== 'N/A')
          : [];

      const defaultVariant = computedVariants.length === 1 ? computedVariants[0] : null;
      current.selectedVariant = defaultVariant;
      const qtyNum = Math.max(1, parseInt(String(current.quantity || 1)) || 1);
      const unitPrice = defaultVariant && defaultVariant.price ? Number(defaultVariant.price) : 0;
      if (unitPrice) {
        current.amount = (unitPrice * qtyNum).toFixed(2);
      }
    } else if (field === 'selectedVariant') {
      current.selectedVariant = val;
      const qtyNum = Math.max(1, parseInt(String(current.quantity || 1)) || 1);
      const unitPrice = val && val.price ? Number(val.price) : 0;
      if (unitPrice) {
        current.amount = (unitPrice * qtyNum).toFixed(2);
      }
    } else if (field === 'quantity') {
      current.quantity = val;
      const qtyNum = Math.max(1, parseInt(String(val)) || 1);
      const unitPrice = current.selectedVariant?.price ? Number(current.selectedVariant.price) : 0;
      if (unitPrice) {
        current.amount = (unitPrice * qtyNum).toFixed(2);
      }
    } else if (field === 'amount') {
      current.amount = val;
    } else if (field === 'medicine_value') {
      current.medicine_value = val;
    }

    current.medicine_value = formatConsultationMedicineText(
      current.name || current.medicine_value,
      current.selectedVariant?.label,
      current.quantity
    );

    updated[idx] = current;
    setAdditionalMeds(updated);

    const baseTotal = getBaseMedicationTotal();
    const additionalTotal = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    setAmount((baseTotal + additionalTotal + testsTotal).toString());
  };

  const addAdditionalMed = () => {
    setAdditionalMeds([
      ...additionalMeds,
      { name: '', medicine_value: '', selectedVariant: null, quantity: 1, amount: '', consultation_medication_id: null },
    ]);
  };

  const removeAdditionalMed = (idx: number) => {
    const updated = additionalMeds.filter((_, i) => i !== idx);
    setAdditionalMeds(updated);
    const baseTotal = getBaseMedicationTotal();
    const additionalTotal = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    setAmount((baseTotal + additionalTotal + testsTotal).toString());
  };

  const recalculateTotalForStates = (
    medStates: typeof medItemStates = medItemStates,
    testStates: typeof testItemStates = testItemStates
  ) => {
    const additionalTotal = additionalMeds.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    setAmount((getBaseMedicationTotal(medAmounts, medStates) + additionalTotal + getSelectedTestsTotal(testStates)).toString());
  };

  const confirmVoidItem = () => {
    if (!voidDialog || !voidReason.trim()) {
      addToast('Removal reason is required', 'error');
      return;
    }

    if (voidDialog.type === 'test') {
      const updatedTestStates = {
        ...testItemStates,
        [voidDialog.idx]: {
          ...(testItemStates[voidDialog.idx] || { version: 1 }),
          dispense_status: 'VOID' as const,
          void_reason: voidReason.trim(),
        },
      };
      setTestItemStates(updatedTestStates);
      recalculateTotalForStates(medItemStates, updatedTestStates);
    } else {
      const updatedStates = {
        ...medItemStates,
        [voidDialog.idx]: {
          ...(medItemStates[voidDialog.idx] || { version: 0, events: [] }),
          dispense_status: 'VOID' as const,
          void_reason: voidReason.trim(),
        },
      };
      setMedItemStates(updatedStates);
      recalculateTotalForStates(updatedStates, testItemStates);
    }
    setVoidDialog(null);
    setVoidReason('');
  };

  const restoreMedication = (idx: number) => {
    const updatedStates = {
      ...medItemStates,
      [idx]: {
        ...(medItemStates[idx] || { version: 0, events: [] }),
        dispense_status: 'ACTIVE' as const,
        void_reason: '',
      },
    };
    setMedItemStates(updatedStates);
    recalculateTotalForStates(updatedStates, testItemStates);
  };

  const restoreTest = (idx: number) => {
    const updatedTestStates = {
      ...testItemStates,
      [idx]: {
        ...(testItemStates[idx] || { version: 1 }),
        dispense_status: 'ACTIVE' as const,
        void_reason: '',
      },
    };
    setTestItemStates(updatedTestStates);
    recalculateTotalForStates(medItemStates, updatedTestStates);
  };

  const handleSubmitDispensing = async (processAfterSave = true) => {
    const meds = (selectedPrescription.prescription?.medications || []).filter((m: any) => m.added_by_role !== 'MEDICAL');
    const hasEmptyAmount = meds.some(
      (_: any, i: number) =>
        medItemStates[i]?.dispense_status !== 'VOID'
        && (!medAmounts[i] || parseFloat(medAmounts[i]) === 0)
    );
    const normalizedAdditionalMeds = additionalMeds
      .filter((item) => item.medicine_value.trim())
      .map((item) => ({
        consultation_medication_id: item.consultation_medication_id || null,
        medicine_value: item.medicine_value.trim(),
        amount: parseFloat(item.amount) || 0,
      }));

    if (hasEmptyAmount && !remark.trim()) {
      addToast('Please provide a remark since some medications have no amount', 'error');
      return;
    }

    if (processAfterSave && (Number.isNaN(parseFloat(collectedAmount)) || parseFloat(collectedAmount) < 0)) {
      addToast('Please enter a valid amount received. Use 0 if the patient is borrowing the full bill.', 'error');
      return;
    }

    const todayTotal = parseFloat(amount) || 0;
    const previousPending = Number(selectedPrescription?.account_dues?.total_pending || 0);
    const received = parseFloat(collectedAmount) || 0;
    if (processAfterSave && allocationOrder !== 'CURRENT_FIRST' && received > todayTotal + 0.001) {
      addToast('Tick previous pending to collect more than today\'s medicine bill', 'error');
      return;
    }
    if (processAfterSave && received > todayTotal + previousPending + 0.001) {
      addToast('Amount received cannot be greater than total due including previous pending', 'error');
      return;
    }

    if (processAfterSave && paymentMode === 'ONLINE' && received > 0 && !transactionReference.trim()) {
      addToast('Please enter transaction reference for online payment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        consultation_id: selectedPrescription.consultation_id,
        remark: remark,
        process_after_save: processAfterSave,
        medications: meds.map((m: any, i: number) => ({
          consultation_medication_id: m.consultation_medication_id,
          medicine_value: m.medicine_value,
          amount: parseFloat(medAmounts[i]) || 0,
          dispense_status: medItemStates[i]?.dispense_status || 'ACTIVE',
          void_reason: medItemStates[i]?.void_reason || null,
          version: medItemStates[i]?.version || 0,
        })),
        tests: (selectedPrescription.prescription?.tests || []).map((test: any, i: number) => ({
          consultation_test_id: test.consultation_test_id,
          dispense_status: testItemStates[i]?.dispense_status || 'ACTIVE',
          void_reason: testItemStates[i]?.void_reason || null,
          version: testItemStates[i]?.version || Number(test.version || 1),
        })),
        additional_medications: normalizedAdditionalMeds,
        payment: processAfterSave ? {
          payment_mode: paymentMode,
          amount: received,
          transaction_reference: paymentMode === 'ONLINE' ? transactionReference.trim() : null,
          remark: paymentRemark.trim() || null,
          allocation_order: allocationOrder,
        } : null
      };
      const requestKey = crypto.randomUUID();

      const response = await fetch(`/api/v1/medical/prescriptions/${selectedPrescription.consultation_id}/pricing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey,
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        addToast(result.message || (processAfterSave ? 'Medication priced, paid and processed successfully' : 'Dispensing changes saved'), 'success');
        setSelectedPrescription(null);
        fetchPrescriptions();
      } else {
        addToast(result.message || 'Failed to save pricing and payment', 'error');
      }
    } catch (err) {
      addToast('Network error. Please try again.', 'error');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Clock + Filters Card (Uniform Style) */}
      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t('medical_dashboard.search_label', 'Search Patient')}
            </label>
            <div className="relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={16} />
              <input
                type="text"
                placeholder={t('medical_dashboard.search_placeholder', 'Search patient name, mobile, UUID...')}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 py-2.5 pl-11 pr-4 text-xs font-bold text-gray-600 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all placeholder:text-gray-300 rounded-xl"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <CustomDatePicker label={t('medical_dashboard.filters.today_date', 'Today Appointment Date')} value={filterDate} onChange={setFilterDate} />
          </div>
          <div className="md:col-span-3">
            <FilterDropdown
              label={t('medical_dashboard.filters.status', 'Status')}
              icon={AlertCircle}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { id: 'all', label: t('medical_dashboard.filters.all_statuses', 'All Statuses') },
                { id: 'pending', label: t('medical_dashboard.filters.pending', 'Pending') },
                { id: 'completed', label: t('medical_dashboard.filters.completed', 'Completed') }
              ]}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={fetchPrescriptions}
              className="w-full h-[42px] cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-4 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-[#549E9E]/5 rounded-xl"
            >
              <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              {t('medical_dashboard.refresh', 'Refresh')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
          <button onClick={fetchPrescriptions} className="text-xs font-black text-red-600 underline uppercase tracking-widest">Retry</button>
        </div>
      )}

      {/* Patient List (Uniform Table Style) */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden relative rounded-xl sm:rounded-none">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#549E9E]/20 border-t-[#549E9E] rounded-full animate-spin" />
              <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest">{t('medical_dashboard.loading', 'Fetching Prescriptions...')}</p>
            </div>
          </div>
        )}

        {/* === MOBILE CARD VIEW === */}
        <div className="sm:hidden divide-y divide-gray-100">
          {prescriptions.length > 0 ? (
            prescriptions.map((p, idx) => (
              <div key={p.consultation_id || idx} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-gray-50 rounded-lg">
                      <span className="text-lg font-black text-[#549E9E]">
                        #{p.appointment?.display_token_display || p.appointment?.token_number || '-'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">
                        {p.patient?.full_name}
                      </p>
                      {Number(p.account_dues?.total_pending || 0) > 0 && (
                        <span className="mt-1 inline-flex px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black uppercase tracking-widest">
                          Pending {formatMoney(p.account_dues.total_pending)}
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
                  <span className="text-xs font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
                </div>
                
                <div className="flex flex-col gap-1 mb-3 mt-2">
                  <p className="text-[10px] text-gray-500 font-bold">{p.patient?.mobile_no}</p>
                  {p.patient?.booked_for_type === 'FAMILY_MEMBER' && (
                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest w-max">
                      {p.patient?.family_member_relationship} (Owner: {p.patient?.primary_patient_full_name})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 mt-2 pt-2 border-t border-gray-50 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#549E9E]" />
                    {p.appointment?.appointment_date ? new Date(p.appointment.appointment_date).toLocaleDateString('en-GB') : 'N/A'} • {p.appointment?.slot_name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#E6C682]" />
                    {p.appointment?.branch_name}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-2">
                  <button
                    onClick={() => openPrescriptionPreview(p.consultation_id)}
                    disabled={isPreviewLoading || !p.consultation_id}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <FileText size={16} /> {t('medical_dashboard.table.view_prescription', 'View Prescription')}
                  </button>
                  <button
                    onClick={() => handleDispense(p)}
                    className={`w-full inline-flex justify-center items-center gap-2 px-4 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer ${p.appointment?.status === 'Completed'
                        ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                        : 'bg-[#549E9E] hover:bg-[#438787] shadow-[#549E9E]/20'
                      }`}
                  >
                    <Stethoscope size={16} /> {t('medical_dashboard.table.dispense', 'Dispense')}
                  </button>
                </div>
              </div>
            ))
          ) : !isLoading && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope size={32} />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.no_records.title', 'No prescriptions found')}</p>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{t('medical_dashboard.no_records.desc', 'Try adjusting your search or filters')}</p>
            </div>
          )}
        </div>

        {/* === DESKTOP TABLE VIEW === */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.hash', '#')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.token', 'Token')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.auid', 'AUID')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.patient', 'Patient')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.date_slot', 'Date & Slot')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.table.branch', 'Branch')}</th>
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('medical_dashboard.table.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prescriptions.length > 0 ? (
                prescriptions.map((p, idx) => (
                  <motion.tr
                    key={p.consultation_id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-[#549E9E]/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-12 h-12 flex items-center justify-center text-gray-800 relative group/token">
                        <Ticket size={40} className="absolute text-red-500/20 -rotate-12 transition-transform group-hover/token:rotate-0" fill="currentColor" />
                        <span className="relative z-10 text-base font-black tracking-tight">{p.appointment?.display_token_display || p.appointment?.token_number}</span>
                      </div>
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
                        <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">
                          {p.patient?.full_name}
                          {p.patient?.booked_for_type === 'FAMILY_MEMBER' && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                              {p.patient?.family_member_relationship}
                            </span>
                          )}
                        </p>
                        {Number(p.account_dues?.total_pending || 0) > 0 && (
                          <span className="mt-1 inline-flex px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black uppercase tracking-widest">
                            Pending {formatMoney(p.account_dues.total_pending)}
                          </span>
                        )}
                        <p className="text-[10px] text-gray-400 font-bold">
                          {p.patient?.mobile_no}
                          {p.patient?.booked_for_type === 'FAMILY_MEMBER' && p.patient?.primary_patient_full_name && (
                            <span className="text-gray-400"> (Account: {p.patient?.primary_patient_full_name})</span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-800 font-black text-xs">
                          <Calendar size={13} className="text-[#549E9E]" />
                          {p.appointment?.appointment_date ? new Date(p.appointment.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                          <Clock size={13} />
                          {p.appointment?.slot_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-gray-600 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
                        <MapPin size={13} className="text-[#E6C682]" />
                        {p.appointment?.branch_name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openPrescriptionPreview(p.consultation_id)}
                          disabled={isPreviewLoading || !p.consultation_id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                        >
                          <FileText size={14} /> {t('medical_dashboard.table.view_prescription', 'View Prescription')}
                        </button>
                        <button
                          onClick={() => handleDispense(p)}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer ${p.appointment?.status === 'Completed'
                              ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                              : 'bg-[#549E9E] hover:bg-[#438787] shadow-[#549E9E]/20'
                            }`}
                        >
                          <Stethoscope size={14} /> {t('medical_dashboard.table.dispense', 'Dispense')}
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
                        <Stethoscope size={32} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('medical_dashboard.no_records.title', 'No prescriptions found')}</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">{t('medical_dashboard.no_records.desc', 'Try adjusting your search or filters')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Dispensing Modal (Matches Portal Aesthetics) */}
      {createPortal(
      <AnimatePresence>
        {selectedPrescription && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 overscroll-none"
            onWheel={(e) => e.stopPropagation()}
          >
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
              className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-none border-2 border-gray-100 bg-white shadow-2xl lg:h-[min(90vh,820px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-black uppercase tracking-tight text-gray-800">{t('dispense.title', 'Dispense Medicines')}</h2>
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {t('dispense.patient', 'Patient')}: {selectedPrescription.patient?.full_name}
                    {selectedPrescription.patient?.booked_for_type === 'FAMILY_MEMBER' && (
                      <span className="ml-2 inline-block rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-purple-600">
                        {selectedPrescription.patient?.family_member_relationship} (Owner: {selectedPrescription.patient?.primary_patient_full_name})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPrescriptionPreview(selectedPrescription.consultation_id)}
                    disabled={isPreviewLoading || !selectedPrescription.consultation_id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    <FileText size={14} /> {t('medical_dashboard.table.view_prescription', 'View Prescription')}
                  </button>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[1.15fr_0.85fr] lg:overflow-hidden">
                {/* Left Side: Medication List with individual amounts */}
                <div className="flex min-h-0 flex-col overflow-hidden border border-gray-100 bg-gray-50 lg:h-full">
                  <h3 className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                    <Pill size={14} />
                    {t('dispense.medication_list', 'Medication List')}
                  </h3>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
                    {(selectedPrescription.prescription?.medications || []).length > 0 ? (
                      <div className="space-y-2">
                        {selectedPrescription.prescription.medications.filter((med: any) => med.added_by_role !== 'MEDICAL').map((med: any, idx: number) => {
                          const dosePreview = getDosePreview(
                            med,
                            selectedPrescription.prescription?.medication_duration_days,
                            {
                              isHi,
                              quickFormulaInput: selectedPrescription.prescription?.quick_formula_input,
                              style: 'full',
                            },
                          );
                          const itemState = medItemStates[idx] || {
                            dispense_status: 'ACTIVE',
                            void_reason: '',
                            version: 0,
                            events: [],
                          };
                          const lastEvent = itemState.events[itemState.events.length - 1];
                          return (
                            <div
                              key={med.consultation_medication_id || idx}
                              className={`group/med flex items-start justify-between gap-3 border bg-white p-3 shadow-sm transition-all ${
                                itemState.dispense_status === 'VOID'
                                  ? 'border-red-200 bg-red-50/40'
                                  : 'border-gray-100 hover:border-[#549E9E]/30'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-gray-800 transition-colors group-hover/med:text-[#549E9E]">{formatNumericMedicineWithFormula(med.medicine_value, selectedPrescription.prescription?.quick_formula_input)}</p>
                                <p className="mt-1 text-[11px] font-bold leading-snug text-[#2f6f6f]">
                                  {dosePreview || t('dispense.no_dose_details', 'No dose details')}
                                </p>
                                {itemState.dispense_status === 'VOID' && (
                                  <div className="mt-2 rounded-lg border border-red-100 bg-white px-2.5 py-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Not dispensed</p>
                                    <p className="mt-0.5 text-xs font-bold text-red-700">{itemState.void_reason}</p>
                                    {lastEvent && (
                                      <p className="mt-0.5 text-[9px] font-bold text-gray-400">
                                        {lastEvent.actor_name || lastEvent.actor_role || 'Medical'} • {new Date(lastEvent.created_at).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {voidDialog?.type === 'medicine' && voidDialog?.idx === idx && (
                                  <div className="mt-2 space-y-2 rounded-xl border border-red-100 bg-red-50 p-2.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-red-600">Removal reason *</label>
                                    <textarea
                                      value={voidReason}
                                      onChange={(e) => setVoidReason(e.target.value)}
                                      placeholder="Why is this prescribed medicine not being dispensed?"
                                      className="min-h-16 w-full resize-none rounded-lg border border-red-100 bg-white p-2.5 text-xs font-bold text-gray-700 outline-none focus:border-red-300"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => { setVoidDialog(null); setVoidReason(''); }}
                                        className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={confirmVoidItem}
                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                                      >
                                        Confirm removal
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex w-auto shrink-0 items-center gap-1.5">
                                <div className="relative w-24">
                                  <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={medAmounts[idx] || ''}
                                    onChange={(e) => handleMedAmountChange(idx, e.target.value)}
                                    disabled={itemState.dispense_status === 'VOID'}
                                    className="w-full border-2 border-gray-50 bg-gray-50 py-2 pl-7 pr-2 text-right text-xs font-black text-gray-800 outline-none transition-all focus:border-[#549E9E]/20"
                                  />
                                </div>
                                {itemState.dispense_status === 'VOID' ? (
                                  <button
                                    type="button"
                                    onClick={() => restoreMedication(idx)}
                                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                                  >
                                    <RefreshCcw size={11} /> Restore
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setVoidDialog({ type: 'medicine', idx, name: med.medicine_value }); setVoidReason(''); }}
                                    className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
                                  >
                                    <XCircle size={11} /> Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 border border-amber-100 bg-amber-50 p-4 text-center text-amber-600">
                        <AlertCircle size={24} strokeWidth={1.5} />
                        <p className="text-xs font-black uppercase tracking-widest leading-relaxed">No medications prescribed<br />for this visit.</p>
                      </div>
                    )}

                    <div className="space-y-2.5 border-t border-gray-200 pt-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                            <FileText size={12} />
                            {t('dispense.tests', 'Tests')}
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            {(selectedPrescription.prescription?.tests || []).filter((_: any, idx: number) => testItemStates[idx]?.dispense_status !== 'VOID').length} item(s)
                          </span>
                        </div>

                        {(selectedPrescription.prescription?.tests || []).length > 0 ? (
                          <div className="space-y-2">
                            {(selectedPrescription.prescription?.tests || []).map((test: any, idx: number) => {
                              const testState = testItemStates[idx] || {
                                dispense_status: test.dispense_status === 'VOID' ? 'VOID' : 'ACTIVE',
                                void_reason: test.void_reason || '',
                                version: Number(test.version || 1),
                              };
                              return (
                              <div
                                key={test.consultation_test_id || `test-${idx}`}
                                className={`border bg-white p-2.5 ${
                                  testState.dispense_status === 'VOID'
                                    ? 'border-red-200 bg-red-50/40'
                                    : 'border-gray-100'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-black text-gray-800 ${testState.dispense_status === 'VOID' ? 'line-through opacity-70' : ''}`}>{test.test_name}</p>
                                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">Doctor Recommended Test</p>
                                    {testState.dispense_status === 'VOID' && (
                                      <div className="mt-2 rounded-lg border border-red-100 bg-white px-2.5 py-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Test not billed</p>
                                        <p className="mt-0.5 text-xs font-bold text-red-700">{testState.void_reason}</p>
                                      </div>
                                    )}
                                    {voidDialog?.type === 'test' && voidDialog?.idx === idx && (
                                      <div className="mt-2 space-y-2 rounded-xl border border-red-100 bg-red-50 p-2.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-red-600">Removal reason *</label>
                                        <textarea
                                          value={voidReason}
                                          onChange={(e) => setVoidReason(e.target.value)}
                                          placeholder="Why is this test not being billed/dispensed?"
                                          maxLength={255}
                                          className="min-h-16 w-full resize-none rounded-lg border border-red-100 bg-white p-2.5 text-xs font-bold text-gray-700 outline-none focus:border-red-300"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => { setVoidDialog(null); setVoidReason(''); }}
                                            className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={confirmVoidItem}
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                                          >
                                            Confirm removal
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <div className={`border px-2.5 py-2 text-right text-xs font-black ${
                                      testState.dispense_status === 'VOID'
                                        ? 'border-red-100 bg-white text-red-400 line-through'
                                        : 'border-gray-100 bg-gray-50 text-gray-800'
                                    }`}>
                                      ₹ {Number(test.amount || 0).toFixed(2)}
                                    </div>
                                    {testState.dispense_status === 'VOID' ? (
                                      <button
                                        type="button"
                                        onClick={() => restoreTest(idx)}
                                        className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                                      >
                                        <RefreshCcw size={11} /> Restore
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => { setVoidDialog({ type: 'test', idx, name: test.test_name }); setVoidReason(''); }}
                                        className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
                                      >
                                        <XCircle size={11} /> Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('dispense.no_tests', 'No tests added')}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                          <FileText size={12} />
                          {t('dispense.medical_additional_medicines', 'Medical Additional Medicines')}
                        </h4>
                        <button
                          onClick={addAdditionalMed}
                          className="cursor-pointer rounded-lg bg-[#549E9E]/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#549E9E] transition-all hover:bg-[#549E9E] hover:text-white"
                        >
                          + {t('common.add', 'Add')}
                        </button>
                      </div>

                          {additionalMeds.map((med, idx) => {
                            const selectedMedicine = textMedicines.find((m) => m.medicine_value === med.name);
                            const variantOptions =
                              selectedMedicine && selectedMedicine.medical_products?.length
                                ? selectedMedicine.medical_products
                                    .map((p: any) => ({
                                      label: p.packing || p.size_or_weight || p.net_weight_or_size || p.product_name || 'N/A',
                                      price: p.mrp_rate || p.price_max || p.price_min || '0',
                                    }))
                                    .filter((v: any) => v.label !== 'N/A')
                                : selectedMedicine
                                ? [
                                    ...(selectedMedicine.products || []).map((p: any) => ({ label: p.packing || 'N/A', price: p.mrp_rate || '0' })),
                                    ...(selectedMedicine.radient_pharma_products || []).map((p: any) => ({ label: p.net_weight_or_size || 'N/A', price: p.mrp_rate || '0' })),
                                    ...(selectedMedicine.handwritten_product_prices || []).map((p: any) => ({ label: p.product_name || p.category || 'N/A', price: p.price_max || '0' })),
                                  ].filter((v: any) => v.label !== 'N/A')
                                : [];

                            const medicineOptions = textMedicines.map((m) => ({ label: m.medicine_value, value: m.medicine_value }));

                            return (
                              <div
                                key={`additional-${idx}`}
                                className="grid grid-cols-1 sm:grid-cols-[minmax(180px,1.2fr)_minmax(120px,0.8fr)_70px_100px_40px] gap-2.5 items-center bg-white border border-gray-100 p-3 rounded-xl shadow-2xs"
                              >
                                <div>
                                  <label className="sm:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                                    Medicine / Syrup Name
                                  </label>
                                  <SearchableDropdown
                                    disabled={false}
                                    allowCustom={true}
                                    options={medicineOptions}
                                    value={med.name || med.medicine_value}
                                    onChange={(val) => updateAdditionalMedField(idx, 'name', val)}
                                    placeholder="Search / Enter medicine..."
                                  />
                                </div>
                                <div>
                                  <label className="sm:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                                    Variant
                                  </label>
                                  <SearchableDropdown
                                    disabled={variantOptions.length === 0}
                                    options={variantOptions.map((v) => ({ label: v.label, value: v.label }))}
                                    value={med.selectedVariant?.label || ''}
                                    onChange={(val) => {
                                      const variant = variantOptions.find((v) => v.label === val);
                                      updateAdditionalMedField(idx, 'selectedVariant', variant || null);
                                    }}
                                    placeholder={variantOptions.length > 0 ? 'Variant...' : 'No Variants'}
                                  />
                                </div>
                                <div>
                                  <label className="sm:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                                    Qty
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="1"
                                    value={med.quantity ?? 1}
                                    onChange={(e) => updateAdditionalMedField(idx, 'quantity', e.target.value)}
                                    className="w-full h-8.5 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none text-center focus:border-[#549E9E]"
                                  />
                                </div>
                                <div className="relative">
                                  <label className="sm:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                                    Amount
                                  </label>
                                  <div className="relative">
                                    <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={med.amount}
                                      onChange={(e) => updateAdditionalMedField(idx, 'amount', e.target.value)}
                                      className="w-full h-8.5 bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2 text-xs font-black text-gray-800 outline-none text-right focus:border-[#549E9E]"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => removeAdditionalMed(idx)}
                                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                                    title="Remove Row"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                    {additionalMeds.length === 0 && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('dispense.no_additional_medicines', 'No additional medicines added')}</p>
                    )}
                  </div>
                  </div>
                </div>

                {/* Right Side: Billing Summary & Remarks */}
                <div className="flex min-h-0 flex-col gap-2 lg:h-full">
                  <div className="min-h-0 flex-1 space-y-3 border-2 border-[#549E9E]/10 bg-[#549E9E]/[0.03] p-3 lg:overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-[#549E9E]/10 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#549E9E] text-white">
                          <IndianRupee size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]/70">{t('dispense.total_bill_amount', 'Total Bill Amount')}</p>
                          <p className="text-xl font-black text-[#549E9E]">₹ {amount}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="mb-0.5 block text-[9px] font-black uppercase tracking-widest text-gray-400">{t('dispense.items', 'Items')}</span>
                        <span className="rounded-md bg-[#549E9E]/10 px-2 py-1 text-[10px] font-black text-[#549E9E]">
                          {(selectedPrescription.prescription?.medications || []).filter((med: any) => med.added_by_role !== 'MEDICAL').length
                            + additionalMeds.filter((med) => med.medicine_value.trim()).length
                            + (selectedPrescription.prescription?.tests || []).filter((_: any, idx: number) => testItemStates[idx]?.dispense_status !== 'VOID').length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-gray-500">{t('dispense.dispensing_remark', 'Dispensing Remark / Notes')}</label>
                      <textarea
                        placeholder="Please provide a remark (Mandatory if any amount is zero)..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        disabled={/* selectedPrescription.appointment?.status === 'Completed' */ false}
                        className="min-h-[72px] w-full resize-none border-2 border-gray-100 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none transition-all focus:border-[#549E9E]/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <MedicationDuePaymentPanel
                        todayAmount={parseFloat(amount) || 0}
                        previousBills={(selectedPrescription.account_dues?.bills || []) as DueBill[]}
                        collectedAmount={collectedAmount}
                        onCollectedAmountChange={setCollectedAmount}
                        paymentMode={paymentMode}
                        onPaymentModeChange={setPaymentMode}
                        transactionReference={transactionReference}
                        onTransactionReferenceChange={setTransactionReference}
                        paymentRemark={paymentRemark}
                        onPaymentRemarkChange={setPaymentRemark}
                        allocationOrder={allocationOrder}
                        onAllocationOrderChange={setAllocationOrder}
                      />
                    </div>
                  </div>

                  <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitDispensing(false)}
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 border-2 border-[#549E9E]/20 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-[#549E9E] transition-all hover:bg-[#549E9E]/5 disabled:opacity-50"
                    >
                      <FileText size={15} />
                      {t('dispense.save_changes', 'Save Changes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitDispensing(true)}
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 bg-[#549E9E] py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#549E9E]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale"
                    >
                      {isSubmitting ? (
                        <RefreshCcw size={15} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          {t('dispense.confirm_dispensed', 'Confirm & Mark as Dispensed')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
      )}

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
