import React, { useState, useEffect, useRef } from 'react';
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
  Hash
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import CustomDatePicker from '../CustomDatePicker';
import Pagination from '../Pagination';
import { useTranslation } from 'react-i18next';

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

export default function MedicalDashboard() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const [patientSearch, setPatientSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('CASH');
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });

  const formatDosePreview = (medication: any, durationDays: number | string) => {
    const doseLabelMap: Record<string, string> = {
      MORNING: 'M',
      AFTERNOON: 'A',
      NIGHT: 'E',
    };

    const normalizedDuration = Number(durationDays) || 0;
    const doses = Array.isArray(medication?.doses) ? medication.doses : [];

    if (doses.length === 0) {
      return normalizedDuration > 0 ? `${normalizedDuration} days` : '';
    }

    return doses
      .map((dose: any) => {
        const shortLabel = doseLabelMap[String(dose?.dose_label || '').toUpperCase()] || String(dose?.dose_label || '').charAt(0).toUpperCase();
        const balls = Number(dose?.balls_per_dose) || 0;
        if (!shortLabel || !balls) return null;
        return `${shortLabel} ${balls} balls ${normalizedDuration} days`;
      })
      .filter(Boolean)
      .join(' • ');
  };

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') params.append('appointment_date', filterDate);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (patientSearch.trim()) params.append('patient_search', patientSearch.trim());

      const url = `/api/v1/medical/prescriptions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        setPrescriptions(result.data || []);
      } else {
        setError(result.message || 'Failed to fetch prescriptions');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPrescriptions();
    }
  }, [token, filterDate, filterStatus]);

  // Close payment dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(e.target as Node)) {
        setPaymentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) fetchPrescriptions();
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterStatus, patientSearch]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [medAmounts, setMedAmounts] = useState<Record<number, string>>({});
  const [additionalMeds, setAdditionalMeds] = useState<Array<{ medicine_value: string; amount: string; consultation_medication_id?: number | null }>>([]);
  const getSelectedTestsTotal = () =>
    (selectedPrescription?.prescription?.tests || []).reduce(
      (sum: number, test: any) => sum + (parseFloat(String(test?.amount ?? 0)) || 0),
      0
    );

  const handleDispense = (p: any) => {
    setSelectedPrescription(p);
    const pricing = p.prescription?.pricing || null;
    const baseMedications = (p.prescription?.medications || []).filter((m: any) => m.added_by_role !== 'MEDICAL');
    const medicalAddedMedications = (p.prescription?.medications || []).filter((m: any) => m.added_by_role === 'MEDICAL');
    if (pricing) {
      const initialAmounts: Record<number, string> = {};
      const pricingItemsByMedicationId = new Map<number, any>(
        (pricing.medications || []).map((item: any) => [Number(item.consultation_medication_id), item])
      );
      baseMedications.forEach((m: any, i: number) => {
        const pricingItem = pricingItemsByMedicationId.get(Number(m.consultation_medication_id));
        initialAmounts[i] = pricingItem?.amount && Number(pricingItem.amount) !== 0 ? pricingItem.amount.toString() : '';
      });
      setMedAmounts(initialAmounts);
      setAdditionalMeds(
        medicalAddedMedications.map((m: any) => {
          const pricingItem = pricingItemsByMedicationId.get(Number(m.consultation_medication_id));
          return {
            medicine_value: m.medicine_value || '',
            amount: pricingItem?.amount && Number(pricingItem.amount) !== 0 ? pricingItem.amount.toString() : '',
            consultation_medication_id: m.consultation_medication_id || null,
          };
        })
      );
      const testsTotal = (p.prescription?.tests || []).reduce(
        (sum: number, test: any) => sum + (parseFloat(String(test?.amount ?? 0)) || 0),
        0
      );
      const computedBaseTotal =
        Object.values(initialAmounts).reduce((sum, curr) => sum + (parseFloat(curr) || 0), 0)
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
      setRemark(pricing.remark || '');
    } else {
      setMedAmounts({});
      setAdditionalMeds([]);
      setAmount(((p.prescription?.tests || []).reduce(
        (sum: number, test: any) => sum + (parseFloat(String(test?.amount ?? 0)) || 0),
        0
      ) || 0).toString());
      setRemark('');
    }
    setPaymentMode('CASH');
    setTransactionReference('');
    setPaymentRemark('');
  };

  const handleMedAmountChange = (idx: number, val: string) => {
    const newAmounts = { ...medAmounts, [idx]: val };
    setMedAmounts(newAmounts);

    const additionalTotal = additionalMeds.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    const total = Object.values(newAmounts).reduce((sum, curr) => sum + (parseFloat(curr) || 0), 0) + additionalTotal + testsTotal;
    setAmount(total.toString());
  };

  const handleAdditionalMedChange = (idx: number, field: 'medicine_value' | 'amount', val: string) => {
    const updated = [...additionalMeds];
    updated[idx] = { ...updated[idx], [field]: val };
    setAdditionalMeds(updated);

    const baseTotal = Object.values(medAmounts).reduce((sum, curr) => sum + (parseFloat(curr) || 0), 0);
    const additionalTotal = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    setAmount((baseTotal + additionalTotal + testsTotal).toString());
  };

  const addAdditionalMed = () => {
    setAdditionalMeds([...additionalMeds, { medicine_value: '', amount: '', consultation_medication_id: null }]);
  };

  const removeAdditionalMed = (idx: number) => {
    const updated = additionalMeds.filter((_, i) => i !== idx);
    setAdditionalMeds(updated);
    const baseTotal = Object.values(medAmounts).reduce((sum, curr) => sum + (parseFloat(curr) || 0), 0);
    const additionalTotal = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const testsTotal = getSelectedTestsTotal();
    setAmount((baseTotal + additionalTotal + testsTotal).toString());
  };

  const handleSubmitDispensing = async () => {
    const meds = (selectedPrescription.prescription?.medications || []).filter((m: any) => m.added_by_role !== 'MEDICAL');
    const hasEmptyAmount = meds.some((_: any, i: number) => !medAmounts[i] || parseFloat(medAmounts[i]) === 0);
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

    if (parseFloat(amount) <= 0) {
      addToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (paymentMode === 'ONLINE' && !transactionReference.trim()) {
      addToast('Please enter transaction reference for online payment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        consultation_id: selectedPrescription.consultation_id,
        amount: parseFloat(amount),
        remark: remark,
        process_after_save: true,
        medications: meds.map((m: any, i: number) => ({
          consultation_medication_id: m.consultation_medication_id,
          medicine_value: m.medicine_value,
          amount: parseFloat(medAmounts[i]) || 0
        })),
        additional_medications: normalizedAdditionalMeds,
        payment: {
          payment_mode: paymentMode,
          amount: parseFloat(amount),
          transaction_reference: paymentMode === 'ONLINE' ? transactionReference.trim() : null,
          remark: paymentRemark.trim() || null
        }
      };

      const response = await fetch(`/api/v1/medical/prescriptions/${selectedPrescription.consultation_id}/pricing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        addToast(result.message || 'Medication priced, paid and processed successfully', 'success');
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
      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={22} />
            <input
              type="text"
              placeholder={t('medical_dashboard.search_placeholder', 'Search patient name, AUID...')}
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 py-4 pl-14 pr-6 text-sm font-bold text-gray-600 outline-none focus:border-[#549E9E]/20 transition-all placeholder:text-gray-300"
            />
          </div>

          <button
            onClick={fetchPrescriptions}
            className="bg-[#549E9E]/10 text-[#549E9E] py-4 px-6 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-[#549E9E]/5"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('medical_dashboard.refresh', 'Refresh')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 items-end">
          <CustomDatePicker label={t('medical_dashboard.filters.today_date', 'Today Appointment Date')} value={filterDate} onChange={setFilterDate} />
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
            prescriptions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p, idx) => (
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

                <div className="mt-4 pt-3 border-t border-gray-50">
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
                prescriptions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((p, idx) => (
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
                      <button
                        onClick={() => handleDispense(p)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer ${p.appointment?.status === 'Completed'
                            ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                            : 'bg-[#549E9E] hover:bg-[#438787] shadow-[#549E9E]/20'
                          }`}
                      >
                        <Stethoscope size={14} /> {/* p.appointment?.status === 'Completed' ? 'View' : */ t('medical_dashboard.table.dispense', 'Dispense')}
                      </button>
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
        <Pagination currentPage={currentPage} totalPages={Math.ceil(prescriptions.length / pageSize)} onPageChange={setCurrentPage} />
      </div>

      {/* Dispensing Modal (Matches Portal Aesthetics) */}
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
              className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-none border-2 border-gray-100 shadow-2xl overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{t('dispense.title', 'Dispense Medicines')}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {t('dispense.patient', 'Patient')}: {selectedPrescription.patient?.full_name}
                      {selectedPrescription.patient?.booked_for_type === 'FAMILY_MEMBER' && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                          {selectedPrescription.patient?.family_member_relationship} (Owner: {selectedPrescription.patient?.primary_patient_full_name})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Side: Medication List with individual amounts */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-100 p-6 space-y-4 min-h-[400px]">
                      <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                        <Pill size={14} />
                        {t('dispense.medication_list', 'Medication List')}
                      </h3>

                      <div className="space-y-4">
                        {(selectedPrescription.prescription?.medications || []).length > 0 ? (
                          <div className="space-y-4">
                            {selectedPrescription.prescription.medications.filter((med: any) => med.added_by_role !== 'MEDICAL').map((med: any, idx: number) => {
                              const dosePreview = formatDosePreview(
                                med,
                                selectedPrescription.prescription?.medication_duration_days
                              );
                              return (
                                <div key={idx} className="bg-white p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-4 group/med transition-all hover:border-[#549E9E]/30">
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-gray-800 group-hover/med:text-[#549E9E] transition-colors">{med.medicine_value}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                        {dosePreview || 'No dose details'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-28 shrink-0">
                                    <div className="relative">
                                      <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={medAmounts[idx] || ''}
                                        onChange={(e) => handleMedAmountChange(idx, e.target.value)}
                                        disabled={/* selectedPrescription.appointment?.status === 'Completed' */ false}
                                        className="w-full bg-gray-50 border-2 border-gray-50 py-2.5 pl-8 pr-3 text-xs font-black text-gray-800 focus:border-[#549E9E]/20 transition-all outline-none text-right"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-amber-50 p-6 border border-amber-100 flex flex-col items-center justify-center gap-3 text-amber-600 text-center rounded-3xl">
                            <AlertCircle size={32} strokeWidth={1.5} />
                            <p className="text-xs font-black uppercase tracking-widest leading-loose">No medications prescribed<br />for this visit.</p>
                          </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 space-y-3">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                                <FileText size={12} />
                                {t('dispense.tests', 'Tests')}
                              </h4>
                              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                {(selectedPrescription.prescription?.tests || []).length} item(s)
                              </span>
                            </div>

                            {(selectedPrescription.prescription?.tests || []).length > 0 ? (
                              <div className="space-y-3">
                                {(selectedPrescription.prescription?.tests || []).map((test: any, idx: number) => (
                                  <div key={`test-${idx}`} className="grid grid-cols-[1fr_110px] gap-3 items-center bg-white border border-gray-100 p-3">
                                    <div>
                                      <p className="text-xs font-black text-gray-800">{test.test_name}</p>
                                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Doctor Recommended Test</p>
                                    </div>
                                    <div className="bg-gray-50 border-2 border-gray-50 py-2.5 px-3 text-xs font-black text-gray-800 text-right">
                                      ₹ {Number(test.amount || 0).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dispense.no_tests', 'No tests added')}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                              <FileText size={12} />
                              {t('dispense.medical_additional_medicines', 'Medical Additional Medicines')}
                            </h4>
                            <button
                              onClick={addAdditionalMed}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all rounded-lg cursor-pointer"
                            >
                              + {t('common.add', 'Add')}
                            </button>
                          </div>

                          {additionalMeds.map((med, idx) => (
                            <div key={`additional-${idx}`} className="grid grid-cols-[1fr_110px_40px] gap-3 items-center bg-white border border-gray-100 p-3">
                              <input
                                type="text"
                                placeholder={t('dispense.enter_additional_medicine', 'Enter additional medicine')}
                                value={med.medicine_value}
                                onChange={(e) => handleAdditionalMedChange(idx, 'medicine_value', e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-50 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#549E9E]/20 transition-all outline-none"
                              />
                              <div className="relative">
                                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={med.amount}
                                  onChange={(e) => handleAdditionalMedChange(idx, 'amount', e.target.value)}
                                  className="w-full bg-gray-50 border-2 border-gray-50 py-2.5 pl-8 pr-3 text-xs font-black text-gray-800 focus:border-[#549E9E]/20 transition-all outline-none text-right"
                                />
                              </div>
                              <button
                                onClick={() => removeAdditionalMed(idx)}
                                className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          {additionalMeds.length === 0 && (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dispense.no_additional_medicines', 'No additional medicines added')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Billing Summary & Remarks */}
                  <div className="space-y-8 flex flex-col">
                    <div className="bg-[#549E9E]/[0.03] border-2 border-[#549E9E]/10 p-8 space-y-6">
                      <div className="flex items-center justify-between border-b border-[#549E9E]/10 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#549E9E] text-white rounded-xl flex items-center justify-center">
                            <IndianRupee size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#549E9E]/60 uppercase tracking-widest">{t('dispense.total_bill_amount', 'Total Bill Amount')}</p>
                            <p className="text-2xl font-black text-[#549E9E]">₹ {amount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1">{t('dispense.items', 'Items')}</span>
                          <span className="bg-[#549E9E]/10 text-[#549E9E] px-2 py-1 rounded-md text-[10px] font-black">
                            {(selectedPrescription.prescription?.medications || []).filter((med: any) => med.added_by_role !== 'MEDICAL').length
                              + additionalMeds.filter((med) => med.medicine_value.trim()).length
                              + (selectedPrescription.prescription?.tests || []).length}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t('dispense.dispensing_remark', 'Dispensing Remark / Notes')}</label>
                        <textarea
                          placeholder="Please provide a remark (Mandatory if any amount is zero)..."
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          disabled={/* selectedPrescription.appointment?.status === 'Completed' */ false}
                          className="w-full bg-white border-2 border-gray-100 py-4 px-6 text-sm font-bold text-gray-700 focus:border-[#549E9E]/20 transition-all outline-none min-h-[180px] resize-none shadow-inner"
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* Payment Mode */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-1">{t('dispense.payment_mode', 'Payment Mode')}</label>
                          <div className="relative" ref={paymentDropdownRef}>
                            <button
                              type="button"
                              onClick={() => setPaymentDropdownOpen((o) => !o)}
                              className="w-full flex items-center justify-between bg-gray-50 rounded-full py-3 pl-5 pr-4 text-xs font-black text-gray-700 focus:ring-2 focus:ring-[#549E9E]/20 transition-all outline-none cursor-pointer"
                            >
                              <span>{paymentMode === 'CASH' ? '💵 Cash' : '📱 Online (UPI / Paytm / Card)'}</span>
                              <svg
                                width="12" height="12" viewBox="0 0 12 12" fill="none"
                                className={`text-[#549E9E] transition-transform duration-200 ${paymentDropdownOpen ? 'rotate-180' : ''}`}
                              >
                                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            {paymentDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[20px] shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                                {[
                                  { value: 'CASH', label: '💵 Cash' },
                                  { value: 'ONLINE', label: '📱 Online (UPI / Paytm / Card)' },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setPaymentMode(opt.value as 'CASH' | 'ONLINE'); setPaymentDropdownOpen(false); }}
                                    className={`w-full text-left px-5 py-3 text-xs font-black transition-all ${paymentMode === opt.value
                                        ? 'bg-[#549E9E]/10 text-[#549E9E]'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#549E9E]'
                                      }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transaction Reference */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-1">
                            {t('dispense.transaction_ref', 'Transaction Reference')}
                            {paymentMode === 'ONLINE'
                              ? <span className="text-red-400 ml-1">*</span>
                              : <span className="text-gray-400 font-bold normal-case tracking-normal ml-1">({t('common.optional', 'Optional')})</span>
                            }
                          </label>
                          <input
                            type="text"
                            value={transactionReference}
                            onChange={(e) => setTransactionReference(e.target.value)}
                            placeholder={paymentMode === 'ONLINE' ? 'Enter UPI / Paytm / Card txn ID' : 'e.g. UPI ref, cheque no...'}
                            className="w-full bg-gray-50 border-none rounded-full py-3 pl-5 pr-5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#549E9E]/20 transition-all outline-none"
                          />
                        </div>

                        {/* Payment Note */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-1">
                            {t('dispense.payment_note', 'Payment Note')}
                            <span className="text-gray-400 font-bold normal-case tracking-normal ml-1">({t('common.optional', 'Optional')})</span>
                          </label>
                          <input
                            type="text"
                            value={paymentRemark}
                            onChange={(e) => setPaymentRemark(e.target.value)}
                            placeholder="e.g. Collected at counter / Paytm / UPI"
                            className="w-full bg-gray-50 border-none rounded-full py-3 pl-5 pr-5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#549E9E]/20 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      {/* selectedPrescription.appointment?.status !== 'Completed' && ( */}
                      <button
                        onClick={handleSubmitDispensing}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-[#549E9E] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#549E9E]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                      >
                        {isSubmitting ? (
                          <RefreshCcw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            {t('dispense.confirm_dispensed', 'Confirm & Mark as Dispensed')}
                          </>
                        )}
                      </button>
                      {/* ) */}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
