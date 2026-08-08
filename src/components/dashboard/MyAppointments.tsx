import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Search,
  Filter,
  ChevronDown,
  Trash2,
  AlertTriangle,
  FileText,
  Activity,
  Pill,
  X,
  User,
  Phone,
  Copy,
  Check,
  Ticket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';
import { getDosePreview, getMedicationRoleLabel } from '../../utils/prescriptionFormat';
import MedicationDispensingStatus from '../MedicationDispensingStatus';

interface Appointment {
  appointment_id: number;
  auid: string;
  branch_name: string;
  treatment_name: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  token_number: number;
  appointment_date: string;
  symptoms: string | null;
  status: string;
  created_at: string;
  prescription?: any;
  // New backend fields (Phase 1)
  display_token_number?: number;
  display_token_display?: string;
  queue_bucket?: string;
  booked_for_type?: string;
  fk_patient_family_member_id?: number | null;
  family_member_relationship?: string | null;
  family_member_full_name?: string | null;
  family_member_age?: number | null;
  family_member_gender?: string | null;
  family_member_description?: string | null;
  patient_full_name?: string;
  patient_age?: number;
  patient_gender?: string;
  scheduled_start_time?: string;
  live_estimated_start_at?: string | null;
  live_delay_minutes?: number;
  template_start_time?: string;
}

const extractTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) {
    const parts = dateTimeStr.split(/[ T]/);
    const timePart = parts[1] || '';
    return timePart.slice(0, 5);
  }
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'cancelled':
        return 'bg-red-50 text-red-600 border-red-100';
      case 'completed':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle2 size={12} />;
      case 'pending': return <Clock size={12} />;
      case 'cancelled': return <XCircle size={12} />;
      case 'completed': return <CheckCircle2 size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  const getStatusLabel = () => {
    switch (status.toLowerCase()) {
      case 'pending': return t('my_appointments.status.pending');
      case 'confirmed': return t('my_appointments.status.confirmed');
      case 'cancelled': return t('my_appointments.status.cancelled');
      case 'completed': return t('my_appointments.status.completed');
      default: return status;
    }
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyles()}`}>
      {getStatusIcon()}
      {getStatusLabel()}
    </div>
  );
};

const CustomSelect = ({
  label,
  options,
  value,
  onChange,
  icon: Icon
}: {
  label: string,
  options: { id: string | number, label: string }[],
  value: string | number,
  onChange: (val: any) => void,
  icon: any
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 border border-gray-100 rounded-none py-2.5 px-4 text-xs font-bold text-gray-600 outline-none transition-all cursor-pointer flex items-center justify-between ${isOpen ? 'border-primary-teal bg-white ring-2 ring-primary-teal/5' : 'hover:border-gray-200'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon size={14} className={isOpen ? 'text-primary-teal' : 'text-gray-400'} />
          <span className="truncate">{selectedOption ? selectedOption.label : label}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180 text-primary-teal' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-[100] max-h-60 overflow-y-auto"
          >
            {options.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${value === opt.id ? 'bg-primary-teal text-white' : 'text-gray-600 hover:bg-primary-teal/5 hover:text-primary-teal'}`}
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

export default function MyAppointments() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterTreatment, setFilterTreatment] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (appointmentToCancel || selectedPrescription) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [appointmentToCancel, selectedPrescription]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/appointments/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setAppointments(result.data);
      } else {
        setError(result.message || 'Failed to fetch appointments');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBranch, filterTreatment, filterDate]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancel_reason: 'Cancelled by patient' })
      });
      const result = await response.json();
      if (result.success) {
        fetchAppointments();
        setAppointmentToCancel(null);
      } else {
        alert(result.message || 'Failed to cancel appointment');
        setIsLoading(false);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.treatment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.auid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.token_number.toString().includes(searchQuery);
    const matchesBranch = filterBranch === 'all' || app.branch_name === filterBranch;
    const matchesTreatment = filterTreatment === 'all' || app.treatment_name === filterTreatment;
    const matchesDate = filterDate === 'all' || app.appointment_date.split('T')[0] === filterDate;

    return matchesSearch && matchesBranch && matchesTreatment && matchesDate;
  });

  // Extract unique values for filters
  const uniqueBranches = Array.from(new Set(appointments.map(a => a.branch_name))) as string[];
  const uniqueTreatments = Array.from(new Set(appointments.map(a => a.treatment_name))) as string[];
  const uniqueDates = Array.from(new Set(appointments.map(a => a.appointment_date.split('T')[0]))) as string[];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCcw className="text-primary-teal w-10 h-10" />
        </motion.div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('my_appointments.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 rounded-[40px] text-center max-w-lg mx-auto">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={40} />
        <h3 className="text-lg font-black text-red-600 uppercase tracking-widest mb-2">Error Occurred</h3>
        <p className="text-sm font-medium text-red-500 mb-6">{error}</p>
        <button
          onClick={fetchAppointments}
          className="bg-red-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search & Filter Header */}
      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative group w-full md:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary-teal transition-colors" size={18} />
            <input
              type="text"
              placeholder={t('my_appointments.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-gray-50 rounded-none py-5 pl-16 pr-8 text-sm font-bold text-gray-600 outline-none focus:border-primary-teal/20 focus:bg-white transition-all placeholder:text-gray-300"
            />
          </div>
          <button
            onClick={fetchAppointments}
            className="bg-primary-teal/10 text-primary-teal px-8 py-5 text-xs font-black uppercase tracking-widest hover:bg-primary-teal hover:text-white transition-all flex items-center gap-3 border-2 border-primary-teal/5"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('my_appointments.refresh')}
          </button>
        </div>

        {/* Multi-Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <CustomSelect
            label={t('my_appointments.filters.location')}
            icon={MapPin}
            value={filterBranch}
            onChange={setFilterBranch}
            options={[
              { id: 'all', label: t('my_appointments.filters.all_locations') },
              ...uniqueBranches.map(b => ({ id: b, label: b }))
            ]}
          />
          <CustomSelect
            label={t('my_appointments.filters.treatment')}
            icon={Stethoscope}
            value={filterTreatment}
            onChange={setFilterTreatment}
            options={[
              { id: 'all', label: t('my_appointments.filters.all_treatments') },
              ...uniqueTreatments.map(t => ({ id: t, label: t }))
            ]}
          />
          <CustomSelect
            label={t('my_appointments.filters.date')}
            icon={Calendar}
            value={filterDate}
            onChange={setFilterDate}
            options={[
              { id: 'all', label: t('my_appointments.filters.all_dates') },
              ...uniqueDates.map(d => ({
                id: d,
                label: new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              }))
            ]}
          />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {appointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow-sm border border-gray-100 p-16 text-center"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Stethoscope className="text-gray-200" size={48} />
            </div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest mb-4">
              {t('my_appointments.no_data')}
            </h3>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
              {t('my_appointments.no_data_sub')}
            </p>
          </motion.div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-xl sm:rounded-none">
            {/* === MOBILE CARD VIEW === */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((app, idx) => (
                <div key={app.appointment_id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-gray-50 rounded-lg">
                        <span className="text-lg font-black text-primary-teal">
                          #{app.display_token_display || app.token_number || '-'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide truncate max-w-[150px]">
                          {app.treatment_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-gray-500 tracking-wider bg-gray-100 px-2 py-1 rounded-md">{app.auid}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleCopy(app.auid); }} className="text-gray-400 p-1">
                            {copiedId === app.auid ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="flex flex-col gap-1 mb-3 mt-2">
                    {app.booked_for_type === 'FAMILY_MEMBER' ? (
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest w-max">
                        For: {app.family_member_full_name} ({app.family_member_relationship})
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100 text-[8px] font-black uppercase tracking-widest w-max">
                        For: Self
                      </span>
                    )}
                    {app.symptoms && (
                      <p className="text-[10px] text-gray-400 italic font-medium mt-1">"{app.symptoms}"</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-50">
                    <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-primary-teal" />
                        {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        {app.slot_name} ({formatTime(app.template_start_time || app.scheduled_start_time || app.start_time)})
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 gap-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-[#E6C682]" />
                        {app.branch_name.replace(' Branch', '')}
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    {app.live_estimated_start_at && (
                      <div className="flex items-center justify-between bg-amber-50 p-2 rounded border border-amber-100 mt-1">
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                          Delay: {app.live_delay_minutes || 0} min
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-700">
                          ETA: {formatTime(extractTime(app.live_estimated_start_at))}
                        </span>
                      </div>
                    )}
                    {app.queue_bucket && (
                      <span className={`inline-flex items-center w-fit px-2 py-1 mt-1 rounded-md border text-[8px] font-black uppercase tracking-widest ${app.queue_bucket === 'IN_PROGRESS' ? 'bg-primary-teal/10 text-primary-teal border-primary-teal/20' :
                          app.queue_bucket === 'READY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            app.queue_bucket === 'CALLED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                        Queue: {app.queue_bucket.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                    {app.status.toLowerCase() !== 'cancelled' && app.status.toLowerCase() !== 'completed' && (
                      <button
                        onClick={() => setAppointmentToCancel(app.appointment_id)}
                        className="flex-1 cursor-pointer py-2.5 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100/50 gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Trash2 size={14} /> Cancel
                      </button>
                    )}
                    {app.status.toLowerCase() === 'completed' && app.prescription && (
                      <button
                        onClick={() => setSelectedPrescription(app)}
                        className="flex-1 cursor-pointer py-2.5 text-[10px] font-black text-white bg-[#549E9E] rounded-xl uppercase tracking-widest hover:bg-[#438787] transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText size={14} /> Prescription
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* === DESKTOP TABLE VIEW === */}
            <div className="hidden sm:block overflow-x-auto lg:overflow-x-visible">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50/50 text-nowrap">
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.sno')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.token')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest text-nowrap">{t('my_appointments.table.unique_id')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.treatment')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.date_time')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.location')}</th>
                    <th className="px-6 py-6 text-left text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.status')}</th>
                    <th className="px-6 py-6 text-right text-xs font-black text-gray-800 uppercase tracking-widest">{t('my_appointments.table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((app, idx) => (
                    <motion.tr
                      key={app.appointment_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-primary-teal/[0.02] transition-colors group"
                    >
                      {/* S.No. */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
                      </td>

                      {/* Token */}
                      <td className="px-6 py-5">
                        <div className="w-12 h-12 flex items-center justify-center text-gray-800 font-black text-base relative group/token">
                          <Ticket size={40} className="absolute text-red-500/20 -rotate-12 transition-transform group-hover/token:rotate-0" fill="currentColor" />
                          <span className="relative z-10">{app.display_token_display || app.token_number}</span>
                        </div>
                      </td>

                      {/* AUID */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 group/auid">
                          <span className="text-[10px] font-black text-gray-500 tracking-wider bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            {app.auid}
                          </span>
                          <button
                            onClick={() => handleCopy(app.auid)}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${copiedId === app.auid ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}
                            title="Copy ID"
                          >
                            {copiedId === app.auid ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Treatment */}
                      <td className="px-6 py-5">
                        <div className="max-w-[180px]">
                          <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide truncate">{app.treatment_name}</p>
                          {app.booked_for_type === 'FAMILY_MEMBER' ? (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                              For: {app.family_member_full_name} ({app.family_member_relationship})
                            </span>
                          ) : (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100 text-[8px] font-black uppercase tracking-widest">
                              For: Self
                            </span>
                          )}
                          {app.symptoms && (
                            <p className="text-[10px] text-gray-400 italic truncate font-medium mt-1">"{app.symptoms}"</p>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-gray-800 font-black text-xs">
                            <Calendar size={13} className="text-primary-teal" />
                            {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={13} />
                            {app.slot_name} ({formatTime(app.template_start_time || app.scheduled_start_time || app.start_time)})
                          </div>
                          {app.live_estimated_start_at && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded w-fit uppercase tracking-wider">
                                Delay: {app.live_delay_minutes || 0} min
                              </span>
                              <span className="text-[10px] font-extrabold text-amber-700">
                                ETA: {formatTime(extractTime(app.live_estimated_start_at))}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-gray-600 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
                          <MapPin size={13} className="text-[#E6C682]" />
                          {app.branch_name.replace(' Branch', '')}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <StatusBadge status={app.status} />
                          {app.queue_bucket && (
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${app.queue_bucket === 'IN_PROGRESS' ? 'bg-primary-teal/10 text-primary-teal border-primary-teal/20' :
                                app.queue_bucket === 'READY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  app.queue_bucket === 'CALLED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-gray-50 text-gray-500 border-gray-100'
                              }`}>
                              Queue: {app.queue_bucket.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.status.toLowerCase() !== 'cancelled' && app.status.toLowerCase() !== 'completed' && (
                            <button
                              onClick={() => setAppointmentToCancel(app.appointment_id)}
                              className="cursor-pointer w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100/50"
                              title="Cancel Appointment"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {app.status.toLowerCase() === 'completed' && app.prescription && (
                            <button
                              onClick={() => setSelectedPrescription(app)}
                              className="cursor-pointer text-[10px] font-black text-[#549E9E] bg-[#549E9E]/10 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-colors"
                            >
                              Prescription
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAppointments.length / pageSize)} onPageChange={setCurrentPage} />
          </div>
        )}
      </AnimatePresence>

      {/* Custom Cancellation Modal */}
      <AnimatePresence>
        {appointmentToCancel && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAppointmentToCancel(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-2">{t('my_appointments.cancel_modal.title')}</h3>
                <p className="text-sm font-medium text-gray-400 leading-relaxed px-4">
                  {t('my_appointments.cancel_modal.description')}
                </p>
              </div>

              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => setAppointmentToCancel(null)}
                  className="cursor-pointer flex-1 px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all border-r border-gray-100"
                >
                  {t('my_appointments.cancel_modal.keep')}
                </button>
                <button
                  onClick={() => handleCancel(appointmentToCancel)}
                  className="cursor-pointer flex-1 px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 transition-all"
                >
                  {t('my_appointments.cancel_modal.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prescription Modal */}
      <AnimatePresence>
        {selectedPrescription && selectedPrescription.prescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 lg:p-8 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSelectedPrescription(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col relative"
            >
              {/* Header */}
              <div className="bg-[#549E9E] px-8 py-6 flex justify-between items-start text-white shrink-0">
                <div>
                  <h2 className="text-2xl font-black tracking-widest uppercase mb-1">
                    {selectedPrescription.booked_for_type === 'FAMILY_MEMBER' 
                      ? selectedPrescription.family_member_full_name 
                      : (user?.name || 'Patient')}{' '}
                    {t('consultation_modal.consult_form', 'Consult Form')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      {t('consultation_modal.token', 'TOKEN')} #{selectedPrescription.display_token_display || selectedPrescription.token_number} • {selectedPrescription.treatment_name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/30 text-amber-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      <User size={13} className="text-amber-200" />
                      {t('consultation_modal.age_gender', 'AGE / GENDER')}:{' '}
                      {selectedPrescription.booked_for_type === 'FAMILY_MEMBER'
                        ? `${selectedPrescription.family_member_age ? `${selectedPrescription.family_member_age} Yrs` : 'N/A'} ${selectedPrescription.family_member_gender ? `/ ${selectedPrescription.family_member_gender}` : ''}`
                        : `${user?.age ? `${user.age} Yrs` : 'N/A'} ${user?.gender ? `/ ${user.gender}` : ''}`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/25 border border-emerald-300/30 text-emerald-100 text-[11px] font-black tracking-wider backdrop-blur-xs shadow-xs">
                      <Phone size={13} className="text-emerald-200" />
                      {t('consultation_modal.mobile', 'MOBILE')}: {user?.phone || 'N/A'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/25 border border-sky-300/30 text-sky-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      <MapPin size={13} className="text-sky-200" />
                      {t('consultation_modal.branch', 'BRANCH')}: {selectedPrescription.branch_name}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedPrescription(null)} className="cursor-pointer bg-white/20 hover:bg-white text-white hover:text-[#549E9E] p-2 rounded-full transition-colors flex-shrink-0">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div
                className="p-8 overflow-y-auto min-h-0 overscroll-behavior-contain space-y-8 bg-white flex-1 relative z-10"
                data-lenis-prevent
              >

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Findings & Advice */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-[#549E9E] mb-3">
                        <FileText size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('consultation_modal.chief_complaint', 'CHIEF COMPLAINT')}</span>
                      </div>
                      <div className="bg-gray-50/50 border border-gray-100 p-5 min-h-[80px]">
                        <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{selectedPrescription.prescription.symptoms || selectedPrescription.symptoms}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-[#549E9E] mb-3">
                        <FileText size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('consultation_modal.clinical_findings', 'CLINICAL FINDINGS')}</span>
                      </div>
                      <div className="bg-gray-50/50 border border-gray-100 p-5 min-h-[100px]">
                        <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{selectedPrescription.prescription.treatment_advice || 'No specific findings recorded.'}</p>
                      </div>
                    </div>

                    {selectedPrescription.prescription.diagnosis && (
                      <div>
                        <div className="flex items-center gap-2 text-[#549E9E] mb-3">
                          <FileText size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('consultation_modal.diagnosis', 'DIAGNOSIS')}</span>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 p-5 min-h-[80px]">
                          <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{selectedPrescription.prescription.diagnosis}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Medications */}
                  <div className="space-y-8">
                    {/* Treatment Duration */}
                    <div>
                      <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-3 block">{t('consultation_modal.treatment_duration', 'TREATMENT DURATION')}</span>
                      <div className="flex gap-2">
                        {[7, 15, 30].map(days => (
                          <div
                            key={days}
                            className={`flex-1 py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border-2 transition-colors ${selectedPrescription.prescription.medication_duration_days === days
                                ? 'bg-[#549E9E]/40 border-[#549E9E]/40 text-white shadow-sm'
                                : 'bg-white border-gray-100 text-gray-300'
                              }`}
                          >
                            {days} {t('consultation_modal.days', 'DAYS')}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prescriptions (Numeric) */}
                    <div>
                      <div className="flex items-center gap-2 text-[#549E9E] mb-3">
                        <Pill size={16} /> {/* Fallback icon, link icon in screenshot */}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('consultation_modal.prescription', 'PRESCRIPTION')}</span>
                      </div>

                      <div className="space-y-4">
                        {selectedPrescription.prescription.medications?.filter((m: any) => m.medicine_type === 'NUMERIC').map((med: any, idx: number) => (
                          <div key={idx} className="border border-gray-200 p-4 md:p-6 bg-white shadow-sm">
                            <div className="bg-gray-50/80 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
                              <span className="text-sm font-bold text-gray-700">{t('consultation_modal.remedy_no', 'Remedy No.')} {med.medicine_value}</span>
                              <ChevronDown size={16} className="text-gray-300" />
                            </div>
                            <MedicationDispensingStatus medication={med} />

                            <div className="rounded-xl border border-[#549E9E]/10 bg-[#549E9E]/[0.03] px-4 py-3">
                              <span className="text-[11px] font-black text-[#549E9E] uppercase tracking-widest">
                                {getDosePreview(med, selectedPrescription.prescription.medication_duration_days) || 'No dose details'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom / Syrups (Text) */}
                    {selectedPrescription.prescription.medications?.some((m: any) => m.medicine_type === 'TEXT') && (
                      <div>
                        <div className="flex items-center gap-2 text-[#549E9E] mb-3">
                          <FileText size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('consultation_modal.other_medications', 'OTHER MEDICATIONS (CUSTOM / SYRUPS)')}</span>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 p-5 min-h-[100px]">
                          {selectedPrescription.prescription.medications?.filter((m: any) => m.medicine_type === 'TEXT').map((med: any, idx: number) => {
                            const roleLabel = getMedicationRoleLabel(med);
                            return (
                              <div key={idx} className="mb-3 last:mb-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {roleLabel && (
                                    <span className="px-2 py-1 rounded-md bg-[#549E9E]/10 text-[#549E9E] text-[9px] font-black uppercase tracking-widest">
                                      {roleLabel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{med.medicine_value}</p>
                                {med.remark && (
                                  <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{med.remark}</p>
                                )}
                                <MedicationDispensingStatus medication={med} compact />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
