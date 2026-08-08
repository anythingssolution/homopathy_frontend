import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getDosePreview, getMedicationPricingAmount, getMedicationRoleLabel } from '../../utils/prescriptionFormat';
import { useTranslation } from 'react-i18next';
import MedicationDispensingStatus from '../MedicationDispensingStatus';

export default function DispensaryHistory() {
  const { t } = useTranslation();
  const { token, branchScope } = useAuth();
  const { addToast } = useNotifications();
  const [patientSearch, setPatientSearch] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
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

  return (
    <div className="space-y-8 pb-12">
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
            className="bg-[#549E9E]/10 text-[#549E9E] py-4 px-6 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-3 border-2 border-[#549E9E]/5"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('dispensary_history.refresh', 'Refresh')}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <CustomDatePicker label={t('dispensary_history.filters.appointment_date', 'Appointment Date')} value={filterDate} onChange={setFilterDate} />
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
                  <span className="text-xs font-black text-gray-300">{((page - 1) * 20 + idx + 1).toString().padStart(2, '0')}</span>
                </div>
                
                <div className="flex flex-col gap-1 mb-3 mt-2">
                  <p className="text-[10px] text-gray-500 font-bold">{p.patient?.mobile_no}</p>
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
                <th className="px-5 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('dispensary_history.table.action', 'Action')}</th>
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
                      <span className="text-xs font-black text-gray-300">{((page - 1) * 20 + idx + 1).toString().padStart(2, '0')}</span>
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
                        <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">{p.patient?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{p.patient?.mobile_no}</p>
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
                        onClick={() => handleViewDetails(p)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#549E9E] hover:bg-[#438787] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
                      >
                        <FileText size={14} /> {t('dispensary_history.table.view', 'View')}
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : !isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-20">
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
              className="relative w-full max-w-5xl bg-white rounded-none border-2 border-gray-100 shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Prescription Details</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Patient: {selectedPrescription.patient?.full_name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Side: Medication List */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-100 p-6 space-y-4 h-full min-h-[400px]">
                      <h3 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                        <Pill size={14} />
                        Medication List
                      </h3>

                      {(selectedPrescription.prescription?.medications || []).length > 0 ? (
                        <div className="space-y-4">
                          {selectedPrescription.prescription.medications.map((med: any, idx: number) => {
                            const medAmount = getMedicationPricingAmount(selectedPrescription.prescription?.pricing, med);
                            const dosePreview = getDosePreview(
                              med,
                              selectedPrescription.prescription?.medication_duration_days
                            );
                            const roleLabel = getMedicationRoleLabel(med);

                            return (
                              <div key={idx} className="bg-white p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-4 group/med transition-all">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-black text-gray-800">{med.medicine_value}</p>
                                    {roleLabel && (
                                      <span className="px-2 py-1 rounded-md bg-[#549E9E]/10 text-[#549E9E] text-[9px] font-black uppercase tracking-widest">
                                        {roleLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-[9px] font-black text-[#549E9E]/70 uppercase tracking-widest">
                                      {dosePreview || 'No dose details'}
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
                                <div className="text-xs font-black text-gray-600">
                                  ₹ {medAmount}
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
                            <p className="text-[10px] font-black text-[#549E9E]/60 uppercase tracking-widest">Total Bill Amount</p>
                            <p className="text-2xl font-black text-[#549E9E]">₹ {amount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1">Items</span>
                          <span className="bg-[#549E9E]/10 text-[#549E9E] px-2 py-1 rounded-md text-[10px] font-black">{(selectedPrescription.prescription?.medications || []).length}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Dispensing Remark / Notes</label>
                        <div className="w-full bg-white border-2 border-gray-100 py-4 px-6 text-sm font-bold text-gray-700 min-h-[180px] shadow-inner">
                          {remark}
                        </div>
                      </div>
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
