import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  Clock, Users, Search, CheckCircle2, Calendar, History,
  RefreshCcw, AlertCircle, MapPin, Stethoscope, Tag,
  XCircle, ChevronDown, ChevronLeft, ChevronRight, Copy, Check, User, Phone, Mail,
  FileText, Filter, Ticket, Hash, UserCheck, UserX, X, Pill, Plus, Trash2, Minus, PhoneForwarded, Layout, WandSparkles, MessageSquare, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../services/socket';
import { useNotifications } from '../context/NotificationContext';
import { useCoalescedCallback } from '../hooks/useCoalescedCallback';
import { dedupedFetch } from '../utils/dedupedFetch';
import CustomAlertDialog, { CustomAlertState } from './CustomAlertDialog';
import {
  formatTimeTo12Hour,
  isDevendraNagarFridaySchedule,
  normalizeTimeToSeconds,
  FRIDAY_SCHEDULE_START_TIME,
} from '../utils/dateUtils';

type DoctorAppointment = {
  appointment_id: number;
  auid: string;
  fk_patient_id: number;
  fk_branch_id: number;
  branch_name: string;
  fk_treatment_id: number;
  treatment_name: string;
  fk_slot_id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  token_number: number;
  appointment_date: string;
  symptoms: string | null;
  status: string;
  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancelled_by_role: string | null;
  cancel_reason: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  patient_id: number;
  patient_uuid: string;
  patient_full_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  patient_email: string | null;
  patient_mobile_no: string;
  patient_description: string | null;
  consultation_payment_status: string | null;
  queue_status?: string;
  // New backend fields (Phase 1)
  display_token_number?: number;
  display_token_display?: string;
  current_token_number?: number;
  current_token_display?: string;
  queue_bucket?: string;
  live_queue_position?: number;
  runtime_priority_rank?: number;
  current_queue_position?: number;
  ready_queue_position?: number;
  active_queue_position?: number | null;
  completed_before?: number;
  session_queue_position?: number | null;
  queue_position_basis?: string | null;
  position_explanation?: string | null;
  actual_called_at?: string | null;
  actual_started_at?: string | null;
  actual_completed_at?: string | null;
  slot_protected?: boolean;
  effective_runtime_eta?: string | null;
  checked_in_at?: string | null;
  template_start_time?: string | null;
  booked_for_type?: string;
  fk_patient_family_member_id?: number | null;
  family_member_relationship?: string | null;
  family_member_full_name?: string | null;
  family_member_age?: number | null;
  family_member_gender?: string | null;
  family_member_description?: string | null;
  primary_patient_full_name?: string | null;
};

const isTerminalDoctorQueueItem = (appointment: DoctorAppointment) =>
  appointment.status === 'Completed' ||
  ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'SKIPPED'].includes(appointment.queue_status || '');

const getDoctorSessionQueuePosition = (appointment: DoctorAppointment) =>
  isTerminalDoctorQueueItem(appointment)
    ? null
    : appointment.session_queue_position ??
      appointment.live_queue_position ??
      appointment.current_queue_position ??
      appointment.ready_queue_position ??
      null;

const getDoctorActiveQueuePosition = (appointment: DoctorAppointment) =>
  appointment.active_queue_position ??
  appointment.live_queue_position ??
  appointment.current_queue_position ??
  appointment.ready_queue_position ??
  null;

type DateSlotTiming = {
  slot_id: number;
  slot_name: string;
  default_start_time: string;
  default_end_time: string;
  effective_start_time: string;
  effective_end_time: string;
  override_id: number | null;
  reason: string | null;
  has_override: boolean;
};

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

const QueueBucketBadge = ({ bucket }: { bucket?: string }) => {
  if (!bucket) return <span className="text-[10px] text-gray-300 font-bold">—</span>;
  const bucketStyles: Record<string, string> = {
    'IN_PROGRESS': 'bg-primary-teal/10 text-primary-teal border-primary-teal/20',
    'READY': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'CALLED': 'bg-amber-50 text-amber-600 border-amber-100',
    'NOT_ARRIVED': 'bg-gray-100 text-gray-500 border-gray-200',
    'CHECKED_IN': 'bg-blue-50 text-blue-600 border-blue-100',
    'WAITING': 'bg-cyan-50 text-cyan-600 border-cyan-100',
    'BOOKED': 'bg-purple-50 text-purple-600 border-purple-100',
  };
  const label = bucket.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${bucketStyles[bucket] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {label}
    </span>
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

import CustomDatePicker from './CustomDatePicker';

const queueSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.85,
} as const;

export default function DoctorPortal() {
  const { t, i18n } = useTranslation();

  const getLocalizedSlotName = useCallback((name: string | null | undefined) => {
    if (!name) return '';
    const key = `doctor_portal.slots.${name}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;

    if (i18n.language === 'hi') {
      if (/morning/i.test(name)) return name.replace(/morning session/i, 'सुबह का सत्र (Morning Session)').replace(/morning/i, 'सुबह');
      if (/evening/i.test(name)) return name.replace(/evening session/i, 'शाम का सत्र (Evening Session)').replace(/evening/i, 'शाम');
      if (/full day/i.test(name)) return name.replace(/full day session/i, 'पूरे दिन का सत्र (Full Day Session)');
      if (/slot\s*1/i.test(name)) return name.replace(/slot\s*1/i, 'स्लॉट 1 (Slot 1)');
      if (/slot\s*2/i.test(name)) return name.replace(/slot\s*2/i, 'स्लॉट 2 (Slot 2)');
    }
    return name;
  }, [t, i18n.language]);

  const { token, branchScope } = useAuth();
  const { addToast } = useNotifications();
  const [alertModal, setAlertModal] = useState<CustomAlertState | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [startingConsultationId, setStartingConsultationId] = useState<number | null>(null);

  // Session status & real-time clock
  const [isAtDesk, setIsAtDesk] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isDoctorGloballyAvailable, setIsDoctorGloballyAvailable] = useState(false);
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [trackedDoctorId, setTrackedDoctorId] = useState<number | null>(null);
  const [activeSessionBranchId, setActiveSessionBranchId] = useState<number | null>(null);
  const [activeSessionBranchName, setActiveSessionBranchName] = useState<string | null>(null);
  const [sessionActionMessage, setSessionActionMessage] = useState<string | null>(null);
  const selectedBranchId = branchScope?.selected_branch_id ? Number(branchScope.selected_branch_id) : null;
  const [dateSlotTimings, setDateSlotTimings] = useState<DateSlotTiming[]>([]);
  const [selectedTimingSlotId, setSelectedTimingSlotId] = useState<number | null>(null);
  const [overrideStartTime, setOverrideStartTime] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSlotTimingOpen, setIsSlotTimingOpen] = useState(false);
  const [isSavingSlotTiming, setIsSavingSlotTiming] = useState(false);
  const [slotTimingMessage, setSlotTimingMessage] = useState<string | null>(null);
  const isActiveInAnotherBranch = Boolean(isDoctorGloballyAvailable && selectedBranchId && activeSessionBranchId && activeSessionBranchId !== selectedBranchId);
  const selectedDateSlotTiming = dateSlotTimings.find((slot) => slot.slot_id === selectedTimingSlotId) || null;
  const isFridayRecurringRule = Boolean(
    selectedDateSlotTiming?.has_override &&
      isDevendraNagarFridaySchedule(selectedBranchId, filterDate) &&
      (
        !selectedDateSlotTiming.override_id ||
        /friday|recurring/i.test(String(selectedDateSlotTiming.reason || '')) ||
        normalizeTimeToSeconds(selectedDateSlotTiming.effective_start_time) === FRIDAY_SCHEDULE_START_TIME
      ),
  );

  const toTimeInputValue = (value?: string | null) => String(value || '').slice(0, 5);
  const calculateShiftedEndTime = (slot: DateSlotTiming | null, startTime: string) => {
    if (!slot || !/^\d{2}:\d{2}$/.test(startTime)) return '';
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
      return (hours * 60) + minutes;
    };
    const duration = toMinutes(slot.default_end_time) - toMinutes(slot.default_start_time);
    const shiftedEnd = toMinutes(startTime) + duration;
    if (duration <= 0 || shiftedEnd >= 24 * 60) return '';
    return `${String(Math.floor(shiftedEnd / 60)).padStart(2, '0')}:${String(shiftedEnd % 60).padStart(2, '0')}`;
  };
  const shiftedEndTime = calculateShiftedEndTime(selectedDateSlotTiming, overrideStartTime);

  const fetchDateSlotTimings = async () => {
    if (!selectedBranchId || !filterDate || filterDate === 'all') {
      setDateSlotTimings([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        branch_id: String(selectedBranchId),
        appointment_date: filterDate,
      });
      const response = await dedupedFetch(`/api/v1/doctors/slot-time-overrides?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) {
        setSlotTimingMessage(result.message || 'Unable to load slot timing');
        return;
      }
      const slots = (result.data || []) as DateSlotTiming[];
      setDateSlotTimings(slots);
      setSelectedTimingSlotId((current) => (
        current && slots.some((slot) => slot.slot_id === current)
          ? current
          : slots[0]?.slot_id || null
      ));
    } catch {
      setSlotTimingMessage('Unable to load slot timing');
    }
  };

  useEffect(() => {
    fetchDateSlotTimings();
  }, [token, selectedBranchId, filterDate]);

  useEffect(() => {
    if (!selectedDateSlotTiming) {
      setOverrideStartTime('');
      setOverrideReason('');
      return;
    }
    setOverrideStartTime(toTimeInputValue(selectedDateSlotTiming.effective_start_time));
    setOverrideReason(selectedDateSlotTiming.reason || '');
    setSlotTimingMessage(null);
  }, [selectedTimingSlotId, dateSlotTimings]);

  const saveDateSlotTiming = async () => {
    if (!selectedBranchId || !selectedTimingSlotId || !overrideStartTime || !shiftedEndTime) return;
    setIsSavingSlotTiming(true);
    setSlotTimingMessage(null);
    try {
      const response = await fetch('/api/v1/doctors/slot-time-overrides', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          slot_id: selectedTimingSlotId,
          appointment_date: filterDate,
          override_start_time: overrideStartTime,
          reason: overrideReason,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setSlotTimingMessage(result.message || 'Slot timing update failed');
        return;
      }
      setSlotTimingMessage('Slot timing shifted successfully');
      await Promise.all([fetchDateSlotTimings(), fetchAppointments(), fetchDashboardStats()]);
    } catch {
      setSlotTimingMessage('Slot timing update failed');
    } finally {
      setIsSavingSlotTiming(false);
    }
  };

  const resetDateSlotTiming = async () => {
    if (!selectedBranchId || !selectedTimingSlotId) return;
    setIsSavingSlotTiming(true);
    setSlotTimingMessage(null);
    try {
      const response = await fetch('/api/v1/doctors/slot-time-overrides/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          slot_id: selectedTimingSlotId,
          appointment_date: filterDate,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setSlotTimingMessage(result.message || 'Slot timing reset failed');
        return;
      }
      setSlotTimingMessage(result.message);
      await Promise.all([fetchDateSlotTimings(), fetchAppointments(), fetchDashboardStats()]);
    } catch {
      setSlotTimingMessage('Slot timing reset failed');
    } finally {
      setIsSavingSlotTiming(false);
    }
  };

  const applyDoctorSessionStatus = (statusData: any) => {
    if (!statusData || statusData.is_doctor_available === undefined) return;

    const normalizedBranchId = statusData.branch_id ? Number(statusData.branch_id) : null;
    const hasOpenSession = Boolean(statusData.has_open_session ?? statusData.is_doctor_available ?? statusData.is_on_break);
    const isAvailable = Boolean(statusData.is_doctor_available);
    const isBreak = Boolean(statusData.is_on_break);
    const isActiveInSelectedBranch = isAvailable && (!selectedBranchId || normalizedBranchId === selectedBranchId);
    const isBreakInSelectedBranch = isBreak && (!selectedBranchId || normalizedBranchId === selectedBranchId);

    setIsDoctorGloballyAvailable(hasOpenSession);
    setIsAtDesk(isActiveInSelectedBranch);
    setIsOnBreak(isBreakInSelectedBranch);
    setTrackedDoctorId(statusData.doctor_id ? Number(statusData.doctor_id) : null);
    setActiveSessionBranchId(normalizedBranchId);
    setActiveSessionBranchName(statusData.branch_name || null);

    if (statusData.break_started_at && isBreakInSelectedBranch) {
      const d = new Date(statusData.break_started_at);
      setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (statusData.started_at && isActiveInSelectedBranch) {
      const d = new Date(statusData.started_at);
      setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (statusData.time && (isActiveInSelectedBranch || isBreakInSelectedBranch)) {
      const d = new Date(statusData.time);
      setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setActiveSince(null);
    }

    if (hasOpenSession && selectedBranchId && normalizedBranchId && normalizedBranchId !== selectedBranchId) {
      setSessionActionMessage(`Doctor already has an open session in ${statusData.branch_name || `Branch ${normalizedBranchId}`}`);
    } else if (isBreakInSelectedBranch) {
      setSessionActionMessage('Doctor is currently on break');
    } else if (isActiveInSelectedBranch || !hasOpenSession) {
      setSessionActionMessage(null);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await dedupedFetch('/api/v1/doctors/session/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          applyDoctorSessionStatus(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch initial status:', err);
      }
    };
    fetchStatus();
  }, [branchScope?.selected_branch_id, token]);
  const [realTime, setRealTime] = useState('');

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async (status: boolean) => {
    try {
      if (status) {
        if (!branchScope?.selected_branch_id) {
          console.error('Selected branch is required before starting a doctor session.');
          return;
        }

        if (isActiveInAnotherBranch) {
          return;
        }

        const res = await fetch('/api/v1/doctors/session/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ branch_id: branchScope.selected_branch_id, note: 'Started session' })
        });
        const data = await res.json();
        if (data.success && data.data) {
          applyDoctorSessionStatus(data.data);
          setSessionActionMessage(null);
        } else if (data?.message) {
          setSessionActionMessage(data.message);
        }
      } else {
        const res = await fetch('/api/v1/doctors/session/pause', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ note: 'Paused session' })
        });
        const data = await res.json();
        if (data.success) {
          applyDoctorSessionStatus(data.data);
          setSessionActionMessage(null);
        } else if (data?.message) {
          setSessionActionMessage(data.message);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const toggleBreak = async (resume = false) => {
    try {
      const endpoint = resume ? '/api/v1/doctors/session/resume-break' : '/api/v1/doctors/session/break';
      const note = resume ? 'Resumed from break' : 'Started break';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branch_id: branchScope?.selected_branch_id, note })
      });
      const data = await res.json();
      if (data.success && data.data) {
        applyDoctorSessionStatus(data.data);
      } else if (data?.message) {
        setSessionActionMessage(data.message);
      }
    } catch (err) {
      console.error('Failed to update break status:', err);
    }
  };

  const triggerCustomAlert = (message: string, type: 'warning' | 'error' | 'success' | 'info' = 'warning', title?: string) => {
    addToast(message, type);
    const isSessionError = message.toLowerCase().includes('doctor session not started') || message.toLowerCase().includes('session first');
    setAlertModal({
      isOpen: true,
      title: title || (isSessionError ? 'Doctor Session Required' : type === 'error' ? 'Action Failed' : 'Notice'),
      message,
      type,
      primaryAction: isSessionError ? {
        label: 'Start Session Now',
        onClick: () => toggleStatus(true),
        icon: <UserCheck size={16} />
      } : undefined,
      confirmText: 'Got it',
    });
  };

  const appointmentsRequestIdRef = useRef(0);
  const dashboardRequestIdRef = useRef(0);
  const hasLoadedAppointmentsRef = useRef(false);

  const fetchAppointments = useCallback(async () => {
    const requestId = ++appointmentsRequestIdRef.current;
    setError(null);
    if (!hasLoadedAppointmentsRef.current) {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) params.append('branch_id', String(selectedBranchId));
      if (filterDate && filterDate !== 'all') params.append('appointment_date', filterDate);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      if (patientSearch.trim()) params.append('patient_search', patientSearch.trim());

      const url = `/api/v1/doctors/appointments${params.toString() ? '?' + params.toString() : ''}`;
      const response = await dedupedFetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (requestId !== appointmentsRequestIdRef.current) return;
      if (result.success) {
        hasLoadedAppointmentsRef.current = true;
        setError(null);
        setAppointments(
          (result.data || []).filter((appointment: DoctorAppointment) =>
            appointment?.status !== 'Cancelled' && Number(appointment?.is_active ?? 1) === 1
          )
        );
      } else if (!hasLoadedAppointmentsRef.current) {
        setError(result.message || 'Failed to fetch appointments');
      }
    } catch {
      if (requestId !== appointmentsRequestIdRef.current) return;
      if (!hasLoadedAppointmentsRef.current) {
        setError('Network error. Please try again.');
      }
    } finally {
      if (requestId === appointmentsRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filterDate, filterStatus, patientSearch, selectedBranchId, token]);

  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const fetchDashboardStats = useCallback(async () => {
    const requestId = ++dashboardRequestIdRef.current;
    try {
      const params = new URLSearchParams();
      if (filterDate && filterDate !== 'all') params.append('date', filterDate);
      if (selectedBranchId) params.append('branch_id', String(selectedBranchId));
      if (selectedTimingSlotId) params.append('slot_id', String(selectedTimingSlotId));
      params.append('summary_only', 'true');

      const response = await dedupedFetch(`/api/v1/doctors/dashboard${params.toString() ? '?' + params.toString() : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (requestId !== dashboardRequestIdRef.current) return;
      if (result.success && result.data && result.data.summary) {
        setDashboardStats(result.data.summary);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    }
  }, [filterDate, selectedBranchId, selectedTimingSlotId, token]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const delay = patientSearch.trim() ? 500 : 0;
    const timer = window.setTimeout(() => { void fetchAppointments(); }, delay);
    return () => window.clearTimeout(timer);
  }, [fetchAppointments, patientSearch]);

  const scheduleSocketListSync = useCoalescedCallback(() => {
    void fetchAppointments();
    void fetchDashboardStats();
  }, 800);

  // Real-time socket updates for appointments list and queue changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const patchAppointmentsFromQueuePayload = (payload: any) => {
      const updates = new Map<number, Partial<DoctorAppointment>>();

      const collect = (item: any, forcedStatus?: string) => {
        const appointmentId = Number(item?.appointment_id || 0);
        if (!appointmentId) return;

        updates.set(appointmentId, {
          queue_status: forcedStatus || item.queue_status,
          queue_bucket: item.queue_bucket,
          live_queue_position: item.live_queue_position,
          runtime_priority_rank: item.runtime_priority_rank,
          current_queue_position: item.current_queue_position,
          ready_queue_position: item.ready_queue_position,
          active_queue_position: item.active_queue_position,
          completed_before: item.completed_before,
          session_queue_position: item.session_queue_position,
          queue_position_basis: item.queue_position_basis,
          position_explanation: item.position_explanation,
          actual_called_at: item.actual_called_at,
          actual_started_at: item.actual_started_at,
          actual_completed_at: item.actual_completed_at,
        });
      };

      collect(payload?.current_running_token, 'IN_PROGRESS');
      [
        ...(Array.isArray(payload?.active_queue) ? payload.active_queue : []),
        ...(Array.isArray(payload?.ready_queue) ? payload.ready_queue : []),
        ...(Array.isArray(payload?.called_queue) ? payload.called_queue : []),
        ...(Array.isArray(payload?.waiting_queue) ? payload.waiting_queue : []),
      ].forEach((item) => collect(item));

      if (updates.size === 0) return;

      setAppointments((previous) => previous.map((appointment) => {
        const update = updates.get(Number(appointment.appointment_id));
        return update ? { ...appointment, ...update } : appointment;
      }));
    };

    // Listen to appointment changes for doctors (e.g. receptionist booking)
    const handleDoctorAppointmentsUpdated = (payload: any) => {
      console.log("[DoctorPortal] Received doctor.appointments.updated event:", payload);
      scheduleSocketListSync();
    };

    // Listen to any live queue status change (e.g. check-in, check-out, skip, complete)
    const handleQueueUpdated = (payload: any) => {
      console.log("[DoctorPortal] Received queue-updated event:", payload);
      patchAppointmentsFromQueuePayload(payload);
      scheduleSocketListSync();
    };

    // Listen to real-time doctor session updates
    const handleDoctorSessionUpdated = (payload: any) => {
      console.log("[DoctorPortal] Received doctor session update:", payload);
      const statusData = payload?.data || payload;
      if (!trackedDoctorId) {
        return;
      }
      if (trackedDoctorId && statusData?.doctor_id && Number(statusData.doctor_id) !== Number(trackedDoctorId)) {
        return;
      }
      if (statusData && statusData.is_doctor_available !== undefined) {
        applyDoctorSessionStatus(statusData);
      }
    };

    socket.on('doctor.appointments.updated', handleDoctorAppointmentsUpdated);
    socket.on('queue-updated', handleQueueUpdated);
    socket.on('doctor.session.current', handleDoctorSessionUpdated);
    socket.on('doctor.session.updated', handleDoctorSessionUpdated);

    const canSubscribeLiveQueue = Boolean(selectedBranchId && filterDate && filterDate !== 'all');

    if (canSubscribeLiveQueue) {
      socket.emit('live-queue.subscribe', {
        branch_id: selectedBranchId,
        appointment_date: filterDate
      }, (response: any) => {
        if (response?.success) {
          console.log(`[DoctorPortal] Subscribed to live queue rooms: ${response.rooms?.join(', ') || response.room}`);
        }
      });
    }

    return () => {
      socket.off('doctor.appointments.updated', handleDoctorAppointmentsUpdated);
      socket.off('queue-updated', handleQueueUpdated);
      socket.off('doctor.session.current', handleDoctorSessionUpdated);
      socket.off('doctor.session.updated', handleDoctorSessionUpdated);

      if (canSubscribeLiveQueue) {
        socket.emit('live-queue.unsubscribe', {
          branch_id: selectedBranchId,
          appointment_date: filterDate
        });
      }
    };
  }, [filterDate, selectedBranchId, trackedDoctorId, scheduleSocketListSync]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Consultation helpers
  const openConsultation = async (app: DoctorAppointment) => {
    const appointmentStatus = app.status.toLowerCase();
    const queueStatus = String(app.queue_status || '').toUpperCase();
    const queueBucket = String(app.queue_bucket || '').toUpperCase();
    const isAlreadyStarted =
      queueStatus === 'IN_PROGRESS' ||
      queueBucket === 'IN_PROGRESS';

    if (appointmentStatus === 'completed' || isAlreadyStarted) {
      navigate(`/consult/${app.appointment_id}`, { state: { app } });
      return;
    }

    if (startingConsultationId) return;

    setStartingConsultationId(app.appointment_id);
    try {
      const res = await fetch(`/api/v1/live-queue/appointments/${app.appointment_id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (data.success) {
        fetchAppointments();
        fetchDashboardStats();
        navigate(`/consult/${app.appointment_id}`, { state: { app } });
      } else {
        triggerCustomAlert(data.message || 'Unable to start consultation. Start doctor session first.', 'warning');
      }
    } catch (err) {
      console.error('Start consultation error:', err);
      triggerCustomAlert('Unable to start consultation. Please try again.', 'error');
    } finally {
      setStartingConsultationId(null);
    }
  };

  // Call Next Ready Token
  const handleCallNext = async () => {
    if (isCallingNext) return;
    setIsCallingNext(true);
    try {
      // We need a slot_id. Get it from first appointment of the day
      const todayAppts = appointments.filter(a => a.appointment_date === filterDate);
      if (todayAppts.length === 0) {
        triggerCustomAlert('No appointments found for today to call next.', 'info');
        return;
      }
      const slotId = todayAppts[0].fk_slot_id;
      const branchId = todayAppts[0].fk_branch_id;

      const res = await fetch(`/api/v1/live-queue/${slotId}/call-next`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: branchId,
          appointment_date: filterDate
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh appointments list to reflect the change
        fetchAppointments();
        fetchDashboardStats();
        addToast('Next patient called successfully', 'success');
      } else {
        triggerCustomAlert(data.message || 'No ready patient to call', 'warning');
      }
    } catch (err) {
      console.error('Call next error:', err);
      triggerCustomAlert('Failed to call next patient', 'error');
    } finally {
      setIsCallingNext(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      {dashboardStats && (() => {
        const entries = Object.entries(dashboardStats).filter(
          ([key]) => key !== 'unique_patients' && !key.includes('cancelled') && key !== 'slot_id' && key !== 'slot_name'
        );

        const todayColors: Record<string, string> = {
          today_appointments: 'bg-gradient-to-br from-[#549E9E] to-[#3d7f7f]',
          today_pending: 'bg-gradient-to-br from-amber-400 to-amber-500',
          today_completed: 'bg-gradient-to-br from-blue-400 to-blue-500',
        };

        return (
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
            {entries.map(([key, value], idx) => {
              const isToday = key.startsWith('today_');
              const todayBg = todayColors[key];

              if (isToday && todayBg) {
                const label = key.replace('today_', '').replace(/_/g, ' ');
                const slotLabel = dashboardStats?.slot_name ? getLocalizedSlotName(dashboardStats.slot_name) : t('doctor_portal.today');

                return (
                  <motion.div
                    key={key}
                    onClick={() => {
                      const today = new Date();
                      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                      const todayDate = today.toISOString().split('T')[0];

                      if (key === 'today_appointments') {
                        navigate('/clinic-history', {
                          state: {
                            fromDate: todayDate,
                            toDate: todayDate,
                            filterStatus: 'all',
                            branchId: selectedBranchId,
                          },
                        });
                        return;
                      }

                      if (key === 'today_pending') setFilterStatus('Pending');
                      else if (key === 'today_completed') setFilterStatus('Completed');
                      setFilterDate(todayDate);

                      setTimeout(() => {
                        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`${todayBg} p-3 sm:p-5 rounded-xl sm:rounded-none shadow-lg relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-6 -mt-6 blur-xl" />
                    <div className="relative z-10 text-center">
                      <div className="text-xl sm:text-3xl lg:text-4xl font-black text-white mb-1">
                        {value === null || value === undefined ? '0' : String(value)}
                      </div>
                      <div className="text-[8px] font-black text-white/50 uppercase tracking-widest truncate">
                        {slotLabel}
                      </div>
                      <div className="text-[10px] font-black text-white uppercase tracking-widest capitalize truncate">
                        {t(`doctor_portal.stats.${key.replace('today_', '')}`, label)}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              const isCancelled = key.includes('cancelled');
              const isCompleted = key.includes('completed');
              const isNavigable = key === 'total_appointments' || key === 'total_consultations';
              return (
                <motion.div
                  key={key}
                  onClick={() => {
                    if (isNavigable) {
                      const today = new Date();
                      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                      navigate('/clinic-history', {
                        state: {
                          fromDate: '2026-01-01',
                          toDate: today.toISOString().split('T')[0],
                          filterStatus: key === 'total_consultations' ? 'Completed' : 'all',
                          branchId: selectedBranchId
                        }
                      });
                    }
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 sm:p-5 rounded-xl sm:rounded-none border ${isCancelled ? 'bg-red-50/50 border-red-100' :
                    isCompleted ? 'bg-blue-50/50 border-blue-100' :
                      'bg-gray-50/50 border-gray-100'
                    } shadow-sm flex flex-col justify-center items-center text-center ${isNavigable ? 'cursor-pointer hover:opacity-80 transition-all' : ''}`}
                >
                  <div className={`text-lg sm:text-2xl lg:text-3xl font-black ${isCancelled ? 'text-red-600' : isCompleted ? 'text-blue-600' : 'text-[#549E9E]'}`}>
                    {value === null || value === undefined ? '0' : String(value)}
                  </div>
                  <div className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest mt-1 text-gray-400">
                    {t(`doctor_portal.stats.${key}`, key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })()}

      {/* Clock + Filters */}
      <div className="bg-white p-4 sm:p-6 border border-gray-200 shadow-sm space-y-4 sm:space-y-6 rounded-2xl sm:rounded-none">
        {/* === MOBILE SESSION CARD === */}
        <div className="sm:hidden space-y-3">
          {/* Session + Break Row */}
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => toggleStatus(!(isAtDesk || isOnBreak))}
              disabled={!isAtDesk && !isOnBreak && isActiveInAnotherBranch}
              className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 border transition-all rounded-2xl ${isAtDesk
                  ? 'bg-[#549E9E] text-white border-[#549E9E] shadow-md shadow-[#549E9E]/20'
                  : isOnBreak
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                    : isActiveInAnotherBranch
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'glow-blink-start-btn bg-white cursor-pointer'
                }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${isAtDesk ? 'bg-white/20' : isOnBreak ? 'bg-white/20' : 'bg-[#549E9E]/10'
                }`}>
                {isAtDesk ? <UserCheck size={16} className="text-white" /> : isOnBreak ? <Clock size={16} className="text-white" /> : <UserX size={16} className="text-[#549E9E]" />}
              </div>
              <div className="text-left min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-widest leading-tight truncate">
                  {isAtDesk ? t('doctor_portal.at_desk') : isOnBreak ? t('doctor_portal.on_break', 'On Break') : t('doctor_portal.not_at_desk')}
                </span>
                <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${isAtDesk || isOnBreak ? 'text-white/75' : 'text-gray-400'}`}>
                  {isAtDesk || isOnBreak ? t('doctor_portal.end_session', 'End Session') : t('doctor_portal.start_session')}
                </span>
              </div>
            </button>
            {(isAtDesk || isOnBreak) && (
              <button
                onClick={() => toggleBreak(isOnBreak)}
                className={`flex items-center gap-2 px-3 py-2.5 border transition-all rounded-2xl shrink-0 ${isOnBreak
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-white text-amber-600 border-amber-200'
                  }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${isOnBreak ? 'bg-white/20' : 'bg-amber-50'}`}>
                  {isOnBreak ? <RefreshCcw size={16} className="text-white" /> : <Clock size={16} className="text-amber-600" />}
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-widest leading-tight">
                    {isOnBreak ? t('doctor_portal.resume', 'Resume') : t('doctor_portal.take_break', 'Take Break')}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${isOnBreak ? 'text-white/75' : 'text-amber-500'}`}>
                    {isOnBreak ? t('doctor_portal.back_to_queue', 'Back To Queue') : t('doctor_portal.same_slot_hold', 'Same Slot Hold')}
                  </span>
                </div>
              </button>
            )}
          </div>
          {/* Clock + Active Branch Warning */}
          <AnimatePresence>
            {(isAtDesk || isOnBreak) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`${isOnBreak ? 'bg-amber-50 border-amber-200' : 'bg-[#549E9E]/5 border-[#549E9E]/10'} px-4 py-2.5 border rounded-xl flex items-center justify-between`}>
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isOnBreak ? 'text-amber-500/70' : 'text-[#549E9E]/50'}`}>{t('doctor_portal.real_time')}</span>
                    <span className={`text-base font-black tabular-nums tracking-wider ml-2 ${isOnBreak ? 'text-amber-600' : 'text-[#549E9E]'}`}>{realTime}</span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${isOnBreak ? 'text-amber-600/70' : 'text-[#549E9E]/60'}`}>
                    {isOnBreak ? t('doctor_portal.on_break', 'On Break') : ''} {activeSince ? `${t('doctor_portal.since')} ${activeSince}` : ''}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {isActiveInAnotherBranch && (
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {sessionActionMessage || `Active in ${activeSessionBranchName || `Branch ${activeSessionBranchId}`}`}
            </div>
          )}
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={16} />
            <input
              type="text"
              placeholder={t('doctor_portal.search_placeholder')}
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 py-3 pl-11 pr-4 text-sm font-bold text-gray-600 outline-none focus:border-[#549E9E]/30 transition-all rounded-xl placeholder:text-gray-300"
            />
          </div>
          {/* Mobile Action Buttons — icon-only compact row */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/doctor-formula-master')}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 active:scale-95 transition-transform">
              <WandSparkles size={15} />
              <span>{t('doctor_portal.formula_master', 'Formula Master')}</span>
            </button>
            <button onClick={() => navigate('/doctor-portal/cms')}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-purple-100 active:scale-95 transition-transform">
              <Layout size={15} />
              <span>{t('doctor_portal.manage_cms', 'Manage CMS')}</span>
            </button>
            <button onClick={fetchAppointments}
              className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5 rounded-xl active:scale-95">
              <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              {t('doctor_portal.refresh')}
            </button>
          </div>
        </div>

        {/* === DESKTOP SESSION CONTROLS (hidden on mobile) === */}
        <div className="hidden sm:flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* Session Status Toggle */}
              <button
                onClick={() => toggleStatus(!(isAtDesk || isOnBreak))}
                disabled={!isAtDesk && !isOnBreak && isActiveInAnotherBranch}
                className={`flex items-center gap-3 px-5 py-3 border transition-all rounded-[20px] shadow-sm hover:shadow-md ${isAtDesk
                    ? 'bg-[#549E9E] text-white border-[#549E9E] shadow-lg shadow-[#549E9E]/20 scale-[1.02]'
                    : isOnBreak
                      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : isActiveInAnotherBranch
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'glow-blink-start-btn bg-white cursor-pointer'
                  }`}
              >
                <div className={`w-9 h-9 flex items-center justify-center transition-colors rounded-xl ${isAtDesk ? 'bg-white/20' : isOnBreak ? 'bg-white/20' : 'bg-[#549E9E]/10'
                  }`}>
                  {isAtDesk ? <UserCheck size={18} className="text-white" /> : isOnBreak ? <Clock size={18} className="text-white" /> : <UserX size={18} className="text-[#549E9E]" />}
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-widest leading-tight">
                    {isAtDesk ? t('doctor_portal.at_desk') : isOnBreak ? t('doctor_portal.on_break', 'On Break') : t('doctor_portal.not_at_desk')}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${isAtDesk || isOnBreak ? 'text-white/75' : 'text-gray-400'}`}>
                    {isAtDesk || isOnBreak ? t('doctor_portal.end_session', 'End Session') : t('doctor_portal.start_session')}
                  </span>
                </div>
              </button>
              {(isAtDesk || isOnBreak) && (
                <button
                  onClick={() => toggleBreak(isOnBreak)}
                  className={`flex items-center gap-3 px-5 py-3 border transition-all rounded-[20px] shadow-sm hover:shadow-md ${isOnBreak
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-white text-amber-600 border-amber-200 hover:border-amber-300'
                    }`}
                >
                  <div className={`w-9 h-9 flex items-center justify-center rounded-xl ${isOnBreak ? 'bg-white/20' : 'bg-amber-50'}`}>
                    {isOnBreak ? <RefreshCcw size={18} className="text-white" /> : <Clock size={18} className="text-amber-600" />}
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-black uppercase tracking-widest leading-tight">
                      {isOnBreak ? t('doctor_portal.resume', 'Resume') : t('doctor_portal.take_break', 'Take Break')}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${isOnBreak ? 'text-white/75' : 'text-amber-500'}`}>
                      {isOnBreak ? t('doctor_portal.back_to_queue', 'Back To Queue') : t('doctor_portal.same_slot_hold', 'Same Slot Hold')}
                    </span>
                  </div>
                </button>
              )}
              {isActiveInAnotherBranch && (
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {sessionActionMessage || `Doctor already active in ${activeSessionBranchName || `Branch ${activeSessionBranchId}`}`}
                </div>
              )}

              {/* Real-Time Clock */}
              <AnimatePresence>
                {(isAtDesk || isOnBreak) && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`${isOnBreak ? 'bg-amber-50 border-amber-200' : 'bg-[#549E9E]/5 border-[#549E9E]/10'} px-6 border text-center flex flex-col justify-center h-[62px] min-w-[120px]`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest block leading-tight ${isOnBreak ? 'text-amber-500/70' : 'text-[#549E9E]/40'}`}>{t('doctor_portal.real_time')}</span>
                      <span className={`text-xl font-black tabular-nums tracking-widest leading-none my-0.5 ${isOnBreak ? 'text-amber-600' : 'text-[#549E9E]'}`}>{realTime}</span>
                      <div className={`text-[8px] font-bold uppercase tracking-widest leading-tight ${isOnBreak ? 'text-amber-600/70' : 'text-[#549E9E]/60'}`}>{isOnBreak ? t('doctor_portal.on_break', 'Break Since') : `${t('doctor_portal.since')} ${activeSince}`}{isOnBreak && activeSince ? ` ${activeSince}` : ''}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end mt-4 xl:mt-0">
              <button onClick={() => navigate('/doctor-formula-master')}
                className="cursor-pointer bg-emerald-50 text-emerald-700 px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 border-2 border-emerald-50 rounded-xl">
                <WandSparkles size={16} />
                {t('doctor_portal.formula_master', 'Formula Master')}
              </button>
              <button onClick={() => navigate('/doctor-portal/cms')}
                className="cursor-pointer bg-purple-50 text-purple-600 px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 border-2 border-purple-50 rounded-xl">
                <Layout size={16} />
                {t('doctor_portal.manage_cms', 'Manage CMS')}
              </button>
              <button onClick={fetchAppointments}
                className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-3 border-2 border-[#549E9E]/5 rounded-xl">
                <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                {t('doctor_portal.refresh')}
              </button>
            </div>
          </div>
        </div>

        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-gray-100 items-end scroll-mt-24">
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t('doctor_portal.search_label', 'Search Patient')}
            </label>
            <div className="relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={16} />
              <input
                type="text"
                placeholder={t('doctor_portal.search_placeholder')}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 py-2.5 pl-11 pr-4 text-xs font-bold text-gray-600 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 transition-all placeholder:text-gray-300 rounded-xl"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <CustomDatePicker
              label={t('doctor_portal.today_appointment_date')}
              value={filterDate}
              onChange={setFilterDate}
            />
          </div>
          <div className="md:col-span-3">
            <FilterDropdown
              label={t('doctor_portal.status')}
              icon={Tag}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { id: 'all', label: t('doctor_portal.all_statuses') },
                { id: 'Pending', label: t('doctor_portal.pending') },
                { id: 'Completed', label: t('doctor_portal.completed') },
              ]}
            />
          </div>
        </div>

        <div className="border border-[#549E9E]/20 bg-[#549E9E]/[0.03] rounded-xl overflow-hidden transition-all shadow-sm">
          <button
            onClick={() => setIsSlotTimingOpen(!isSlotTimingOpen)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-[#549E9E]/5 transition-colors focus:outline-none"
          >
            <div>
              <p className="text-[10px] font-black text-[#549E9E] uppercase tracking-[0.2em]">{t('doctor_portal.manage_slot_timing', 'Manage Slot Timing')}</p>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 mt-1">{t('doctor_portal.shift_timing_note', 'Shift this date only. Token order and treatment durations stay unchanged.')}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {selectedDateSlotTiming && (
                <span className={`hidden sm:inline-block px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded-md ${
                  isFridayRecurringRule
                    ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm'
                    : selectedDateSlotTiming.has_override
                      ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  }`}>
                  {isFridayRecurringRule
                    ? t('doctor_portal.recurring_rule', 'Recurring Rule')
                    : selectedDateSlotTiming.has_override
                      ? t('doctor_portal.shifted_timing', 'Shifted Timing')
                      : t('doctor_portal.default_timing', 'Default Timing')}
                </span>
              )}
              <div className={`p-1.5 rounded-md bg-white border border-gray-200 shadow-sm transition-transform duration-300 ${isSlotTimingOpen ? 'rotate-180 bg-[#549E9E]/10 border-[#549E9E]/30 text-[#549E9E]' : 'text-gray-400'}`}>
                <ChevronDown size={16} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isSlotTimingOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 pt-0 space-y-5 border-t border-[#549E9E]/10 mt-2">
                  {dateSlotTimings.length === 0 ? (
                    <div className="flex items-center justify-center p-6 bg-white border border-gray-100 rounded-xl">
                      <p className="text-xs font-bold text-gray-400">{t('doctor_portal.no_active_slot_available', 'No active slot is available for this branch.')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="z-10">
                        <FilterDropdown
                          label={t('doctor_portal.slot_label', 'Slot')}
                          icon={Clock}
                          value={selectedTimingSlotId ? String(selectedTimingSlotId) : ''}
                          onChange={(v) => setSelectedTimingSlotId(Number(v))}
                          options={dateSlotTimings.map((slot) => ({
                            id: String(slot.slot_id),
                            label: getLocalizedSlotName(slot.slot_name)
                          }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('doctor_portal.default_time', 'Default Time')}</span>
                        <div className="bg-gray-50 border border-gray-100 px-4 py-3 text-xs font-black text-gray-600 rounded-xl flex items-center shadow-inner">
                          {toTimeInputValue(selectedDateSlotTiming?.default_start_time)} - {toTimeInputValue(selectedDateSlotTiming?.default_end_time)}
                        </div>
                      </div>
                      {isFridayRecurringRule && selectedDateSlotTiming && (
                        <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
                          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                            <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-violet-100 text-violet-800 border border-violet-200">
                              RECURRING_RULE
                            </span>
                            <span className="text-xs font-black text-violet-800">
                              {formatTimeTo12Hour(selectedDateSlotTiming.effective_start_time)} -{' '}
                              {formatTimeTo12Hour(selectedDateSlotTiming.effective_end_time)}
                            </span>
                            <span className="text-[11px] font-bold text-violet-700">
                              {selectedDateSlotTiming.reason ||
                                'Devendra Nagar Friday Recurring Rule'}
                            </span>
                          </div>
                        </div>
                      )}
                      <label className="space-y-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('doctor_portal.new_start_time', 'New Start Time')}</span>
                        <div className="relative">
                          <input
                            type="time"
                            value={overrideStartTime}
                            onChange={(event) => setOverrideStartTime(event.target.value)}
                            className="w-full bg-white border border-gray-200 px-4 py-3 text-xs font-black text-gray-700 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 rounded-xl transition-all shadow-sm"
                          />
                        </div>
                      </label>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('doctor_portal.auto_end_time', 'Auto End Time')}</span>
                        <div className={`px-4 py-3 text-xs font-black rounded-xl border shadow-sm transition-colors ${shiftedEndTime ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                          {shiftedEndTime || t('doctor_portal.invalid_end_time', 'Invalid end time')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDateSlotTiming && (
                    <div className="flex flex-col md:flex-row gap-3 pt-2">
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        maxLength={500}
                        placeholder={t('doctor_portal.reason_remark_optional', 'Reason / remark (optional)')}
                        className="flex-1 bg-white border border-gray-200 px-4 py-3.5 text-xs font-bold text-gray-600 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 rounded-xl transition-all shadow-sm"
                      />
                      <button
                        onClick={saveDateSlotTiming}
                        disabled={isSavingSlotTiming || !shiftedEndTime}
                        className="px-6 py-3.5 bg-[#549E9E] text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-[#458585] transition-colors shadow-md shadow-[#549E9E]/20"
                      >
                        {isSavingSlotTiming ? t('doctor_portal.updating', 'Updating...') : t('doctor_portal.apply_shift', 'Apply Shift')}
                      </button>
                      {selectedDateSlotTiming.has_override && (
                        <button
                          onClick={resetDateSlotTiming}
                          disabled={isSavingSlotTiming}
                          className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          {t('doctor_portal.reset_default', 'Reset Default')}
                        </button>
                      )}
                    </div>
                  )}
                  {slotTimingMessage && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl mt-2">
                      <AlertCircle size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">{slotTimingMessage}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <RefreshCcw className="text-[#549E9E] w-10 h-10" />
          </motion.div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Loading Appointments...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={40} />
          <h3 className="text-lg font-black text-red-600 uppercase tracking-widest mb-2">Error</h3>
          <p className="text-sm font-medium text-red-500 mb-6">{error}</p>
          <button onClick={fetchAppointments} className="bg-red-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest">Try Again</button>
        </div>
      ) : appointments.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Users className="text-gray-200" size={48} />
          </div>
          <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest mb-4">{t('doctor_portal.no_appointments_found', 'No Appointments Found')}</h3>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">{t('doctor_portal.try_changing_filters', 'Try changing filters or date')}</p>
        </motion.div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-2xl sm:rounded-none">
          <LayoutGroup id="doctor-dashboard-queue">
          {/* === MOBILE CARD VIEW === */}
          <div className="sm:hidden divide-y divide-gray-100">
            <AnimatePresence mode="popLayout" initial={false}>
            {appointments.map((app) => (
              <motion.div
                key={app.appointment_id}
                layout
                layoutId={`doctor-queue-${app.appointment_id}`}
                initial={{ opacity: 0, y: 28, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.985 }}
                transition={queueSpring}
                className="p-4 active:bg-[#549E9E]/[0.03] transition-colors"
                onClick={() => setExpandedId(expandedId === app.appointment_id ? null : app.appointment_id)}
              >
                <div className="flex items-start gap-3">
                  {/* Token Badge */}
                  <div className="w-12 h-12 flex items-center justify-center text-gray-800 relative shrink-0">
                    <Ticket size={40} className="absolute text-red-500/20 -rotate-12" fill="currentColor" />
                    <span className="relative z-10 text-base font-black tracking-tight">{app.display_token_display || app.token_number}</span>
                  </div>
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide truncate">
                        {app.patient_full_name}
                      </p>
                      {app.booked_for_type === 'FAMILY_MEMBER' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[7px] font-black uppercase shrink-0">
                          {app.family_member_relationship}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400">{app.patient_mobile_no}</span>
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{app.auid}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <StatusBadge status={app.status} />
                      <QueueBucketBadge bucket={app.queue_bucket} />
                      {app.checked_in_at && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border bg-blue-50 text-blue-600 border-blue-100">
                          In: {new Date(app.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {app.consultation_payment_status && (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${app.consultation_payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                          {app.consultation_payment_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={11} className="text-[#549E9E]" />{new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{getLocalizedSlotName(app.slot_name)}</span>
                        <span className="text-xs font-black text-gray-600">{app.treatment_name}</span>
                      </div>
                      {app.template_start_time && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 mt-1">
                          <Clock size={10} className="text-indigo-400" />
                          Planned: {app.template_start_time}
                        </div>
                      )}
                      {['pending', 'confirmed', 'completed'].includes(app.status.toLowerCase()) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openConsultation(app); }}
                          disabled={startingConsultationId === app.appointment_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 ${startingConsultationId === app.appointment_id ? 'opacity-60 cursor-wait' : ''} ${app.status.toLowerCase() === 'completed'
                              ? 'bg-blue-500 shadow-blue-500/20'
                              : 'bg-[#549E9E] shadow-[#549E9E]/20'
                            }`}
                        >
                          <Stethoscope size={12} />{startingConsultationId === app.appointment_id ? 'Starting...' : (app.status.toLowerCase() === 'completed' ? 'View' : 'Consult')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === app.appointment_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Age</span>
                            <p className="text-sm font-bold text-gray-700">{app.patient_age || '—'}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gender</span>
                            <p className="text-sm font-bold text-gray-700 capitalize">{app.patient_gender || '—'}</p>
                          </div>
                        </div>
                        {app.symptoms && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Symptoms</span>
                            <p className="text-xs text-gray-600 italic mt-0.5">"{app.symptoms}"</p>
                          </div>
                        )}
                        {app.checked_in_at && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500">
                            <span>Checked In: {new Date(app.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
          {/* === DESKTOP TABLE VIEW === */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-gray-50/50 text-nowrap">
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.token', 'Token')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.auid', 'AUID')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.patient', 'Patient')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.treatment', 'Treatment')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.queue', 'Queue')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.date_slot', 'Date & Slot')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.status', 'Status')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">{t('doctor_portal.table.payment', 'Payment')}</th>
                  <th className="px-4 py-4 text-xs font-black text-gray-800 uppercase tracking-widest text-center">{t('doctor_portal.table.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout" initial={false}>
                {appointments.map((app) => (
                  <React.Fragment key={app.appointment_id}>
                    <motion.tr
                      layout
                      layoutId={`doctor-queue-row-${app.appointment_id}`}
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -24 }}
                      transition={queueSpring}
                      className="hover:bg-[#549E9E]/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.appointment_id ? null : app.appointment_id)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {getDoctorSessionQueuePosition(app) != null && (
                            <span
                              title={app.position_explanation || undefined}
                              className="text-[8px] font-black text-gray-900 bg-yellow-300 border border-yellow-400 px-1.5 py-0.5 rounded text-center shadow-sm"
                            >
                              Pos #{getDoctorSessionQueuePosition(app)}
                            </span>
                          )}
                          <div className="w-12 h-12 flex items-center justify-center text-gray-800 relative group/token">
                            <Ticket size={40} className="absolute text-red-500/20 -rotate-12 transition-transform group-hover/token:rotate-0" fill="currentColor" />
                            <span className="relative z-10 text-base font-black tracking-tight">{app.display_token_display || app.token_number}</span>
                          </div>
                          {app.current_token_display && app.display_token_display && app.current_token_display !== app.display_token_display && (
                            <span className="text-[8px] font-bold text-gray-400 text-center">Live: {app.current_token_display}</span>
                          )}
                          {getDoctorActiveQueuePosition(app) != null && app.completed_before != null && app.completed_before > 0 && (
                            <span
                              title={app.position_explanation || undefined}
                              className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-center"
                            >
                              Live #{getDoctorActiveQueuePosition(app)} · {app.completed_before} done
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 tracking-wider bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">{app.auid}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleCopy(app.auid); }}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${copiedId === app.auid ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}>
                            {copiedId === app.auid ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-black text-[#2d8789] uppercase tracking-wide">
                            {app.patient_full_name}
                            {app.booked_for_type === 'FAMILY_MEMBER' && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                {app.family_member_relationship}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            {app.patient_mobile_no}
                            {app.booked_for_type === 'FAMILY_MEMBER' && app.primary_patient_full_name && (
                              <span className="text-gray-400"> (Account: {app.primary_patient_full_name})</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wide">{app.treatment_name}</p>
                        {app.symptoms && <p className="text-[10px] text-gray-400 italic truncate max-w-[140px]">"{app.symptoms}"</p>}
                        {app.template_start_time && (
                          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Clock size={12} className="text-indigo-500" />
                            Planned: {app.template_start_time}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <QueueBucketBadge bucket={app.queue_bucket} />
                          {app.checked_in_at && (
                            <span className="text-xs font-black text-blue-600 mt-0.5">
                              In: {new Date(app.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-gray-800 font-black text-xs">
                            <Calendar size={13} className="text-[#549E9E]" />
                            {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={13} />
                            {getLocalizedSlotName(app.slot_name)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-4">
                        {app.consultation_payment_status ? (
                          <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${app.consultation_payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                            {app.consultation_payment_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {['pending', 'confirmed', 'completed'].includes(app.status.toLowerCase()) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openConsultation(app); }}
                            disabled={startingConsultationId === app.appointment_id}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg ${startingConsultationId === app.appointment_id ? 'opacity-60 cursor-wait' : 'cursor-pointer'} ${app.status.toLowerCase() === 'completed'
                              ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                              : 'bg-[#549E9E] hover:bg-[#438787] shadow-[#549E9E]/20'
                              }`}
                          >
                            <Stethoscope size={14} /> {startingConsultationId === app.appointment_id ? 'Starting...' : (app.status.toLowerCase() === 'completed' ? 'View' : 'Consult')}
                          </button>
                        )}
                      </td>

                    </motion.tr>

                    {/* Expanded Patient Details */}
                    <AnimatePresence>
                      {expandedId === app.appointment_id && (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td colSpan={9} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-[#549E9E]/[0.03] border-t border-b border-[#549E9E]/10 p-4">
                                <div className="grid grid-cols-3 gap-2">
                                  {/* Patient Info */}
                                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <User size={14} /> Patient Information
                                    </h4>
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Full Name</span>
                                        <p className="text-sm font-bold text-gray-700">
                                          {app.patient_full_name}
                                          {app.booked_for_type === 'FAMILY_MEMBER' && (
                                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                              {app.family_member_relationship}
                                            </span>
                                          )}
                                        </p>
                                        {app.booked_for_type === 'FAMILY_MEMBER' && app.primary_patient_full_name && (
                                          <p className="text-[10px] text-gray-400 mt-0.5">Account Owner: {app.primary_patient_full_name}</p>
                                        )}
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Age</span>
                                        <p className="text-sm font-bold text-gray-700">{app.patient_age || '—'}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Gender</span>
                                        <p className="text-sm font-bold text-gray-700 capitalize">{app.patient_gender || '—'}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">UUID</span>
                                        <p className="text-[11px] font-bold text-gray-500 break-all mt-0.5">{app.patient_uuid}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Contact */}
                                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Phone size={14} /> Contact Details
                                    </h4>
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Mobile</span>
                                        <p className="text-sm font-bold text-gray-700">{app.patient_mobile_no}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Email</span>
                                        <p className="text-sm font-bold text-gray-700">{app.patient_email || '—'}</p>
                                      </div>
                                      {app.patient_description && (
                                        <div>
                                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Description</span>
                                          <p className="text-xs text-gray-500 italic mt-0.5">"{app.patient_description}"</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Appointment Meta */}
                                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <FileText size={14} /> Appointment Details
                                    </h4>
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Time Slot</span>
                                        <p className="text-sm font-bold text-gray-700">{app.start_time} – {app.end_time}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Token</span>
                                        <p className="text-sm font-black text-[#549E9E]">#{app.display_token_display || app.token_number}</p>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Booked On</span>
                                        <p className="text-sm font-bold text-gray-700">
                                          {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                      {app.cancel_reason && (
                                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                                          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Cancel Reason</span>
                                          <p className="text-xs font-bold text-red-600 mt-0.5">{app.cancel_reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          </LayoutGroup>
        </div>

      )}
      <CustomAlertDialog alert={alertModal} onClose={() => setAlertModal(null)} />
    </div>
  );
}
