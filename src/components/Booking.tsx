import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, User, CheckCircle2, MapPin, ChevronDown, Phone, X, Smartphone, Download, Zap, Users, Lock, Mail, Stethoscope, Eye, EyeOff, Key, MessageSquare, Link2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getSocket } from '../services/socket';
import CustomDatePicker from './CustomDatePicker';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  formatTimeTo12Hour,
  getEffectiveSlotDisplayEndTime,
  getEffectiveSlotDisplayTime,
  isBeforeFridayScheduleStart,
  isDevendraNagarFridaySchedule,
} from '../utils/dateUtils';
const ENV_RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const DEFAULT_TEST_SITE_KEY = '6Lc9y90sAAAAAGoF-RwPTnE1IyeMOZfe1B7HZOg6';

if (!ENV_RECAPTCHA_SITE_KEY) {
  if (import.meta.env.DEV) {
    console.warn(
      "reCAPTCHA VITE_RECAPTCHA_SITE_KEY is not defined in the environment. Falling back to Google's public test key."
    );
  } else {
    console.error(
      "reCAPTCHA VITE_RECAPTCHA_SITE_KEY is not defined. The reCAPTCHA widget will not load correctly in production."
    );
  }
}

const RECAPTCHA_SITE_KEY = ENV_RECAPTCHA_SITE_KEY || DEFAULT_TEST_SITE_KEY;

const getLocalDateString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split('T')[0];
};

const getLocalTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};


const CustomSelect = ({
  label,
  options,
  value,
  onChange,
  icon: Icon,
  noOptionsMessage,
  disabled
}: {
  label: string,
  options: { id: string | number, label: string, description?: string }[],
  value: string | number,
  onChange: (val: any) => void,
  icon: any,
  noOptionsMessage?: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [disabled]);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer group'}`}
      >
        <div className={`w-full bg-gray-50 border-none rounded-full py-3 pl-12 pr-12 transition-all outline-none text-[#6A6A50] font-medium flex items-center ${isOpen ? 'ring-2 ring-primary-teal/20 shadow-lg bg-white' : disabled ? '' : 'hover:bg-gray-100/50'}`}>
          <Icon size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-primary-teal' : 'text-gray-300'}`} />
          <span className="truncate">{selectedOption ? selectedOption.label : label}</span>
          <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-300 text-gray-300 ${isOpen ? 'rotate-180 text-primary-teal' : ''}`} />
        </div>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden z-[100] py-2"
            >
              {options.length > 0 ? options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`px-8 py-4 text-sm font-bold transition-all flex items-center justify-between group ${value === opt.id ? 'bg-primary-teal text-white' : 'text-[#6A6A50] hover:bg-primary-teal/5 hover:text-primary-teal'}`}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="leading-tight">{opt.label}</span>
                    {opt.description && (
                      <span className={`text-[9px] font-medium leading-tight ${value === opt.id ? 'text-white/70' : 'text-gray-400'}`}>
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {value === opt.id && <CheckCircle2 size={14} className="text-white shrink-0 ml-2" />}
                </div>
              )) : (
                <div className="px-8 py-4 text-[10px] font-bold text-gray-400 italic uppercase tracking-widest text-center">
                  {noOptionsMessage || 'No options available'}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SegmentedOTPInput = ({
  length = 6,
  value,
  onChange,
  error
}: {
  length?: number,
  value: string,
  onChange: (val: string) => void,
  error?: string
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const newValue = value.split('');
    // Fill starting from current index
    const digits = val.split('');
    let currentIndex = index;

    for (const digit of digits) {
      if (currentIndex < length) {
        newValue[currentIndex] = digit;
        currentIndex++;
      }
    }

    onChange(newValue.join('').slice(0, length));

    // Move focus to the next empty input or last input
    const nextToFocus = Math.min(currentIndex, length - 1);
    inputRefs.current[nextToFocus]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      // Focus the last digit or the first empty one
      const focusIdx = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex justify-center gap-2 lg:gap-3 w-full">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            autoComplete="one-time-code"
            maxLength={length} // Keep it long to allow pasting multiple digits
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-10 h-12 lg:w-14 lg:h-16 text-center text-xl lg:text-2xl font-black border-2 transition-all outline-none 
              ${error ? 'border-red-100 bg-red-50/30 text-red-500' : 'bg-gray-50 border-gray-100 focus:border-primary-teal focus:bg-white text-primary-teal'}
              rounded-none shadow-sm`}
          />
        ))}
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>}
    </div>
  );
};

export default function Booking() {
  type ReceptionistPatientOption = {
    patient_id: number;
    patient_uuid: string;
    full_name: string;
    age?: number;
    gender?: string;
    email?: string;
    mobile_no: string;
    description?: string;
    total_appointments?: number;
    last_appointment_date?: string | null;
  };
  type BookingTokenPlateItem = {
    token_number: number;
    visit_type_code: string;
    visit_type_label: string;
    short_label: string;
    duration_minutes: number;
    estimated_start_at: string;
    estimated_end_at: string;
    color_code: string;
    is_booked: boolean;
    is_selectable: boolean;
    selection_disabled_reason: string | null;
  };
  type BookingTokenPlateData = {
    treatment_name: string;
    selected_visit_type_code: string;
    selected_visit_type_supported: boolean;
    tokens: BookingTokenPlateItem[];
    slot?: {
      id?: number;
      slot_id?: number;
      branch_id?: number;
      slot_name: string;
      start_time?: string;
      end_time?: string;
      default_start_time?: string;
      default_end_time?: string;
      effective_start_time?: string;
      effective_end_time?: string;
      has_time_override?: boolean;
      has_override?: boolean;
      reason?: string | null;
    };
  };

  const [phone, setPhone] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [loginPhone, setLoginPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  // reCAPTCHA
  const loginCaptchaRef = useRef<ReCAPTCHA>(null);
  const regCaptchaRef = useRef<ReCAPTCHA>(null);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [regCaptchaToken, setRegCaptchaToken] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, token, user, branchScope } = useAuth();
  const { t, i18n } = useTranslation();
  const { addToast } = useNotifications();

  // Redirect non-patient roles away from booking page
  useEffect(() => {
    if (isAuthenticated && user) {
      // Do not redirect if we are inside a cross-role view
      if (window.location.pathname.startsWith('/cross-role')) {
        return;
      }
      const rc = user.role_code?.toUpperCase();
      const rl = user.role?.toLowerCase();
      if (rc === 'DOC' || rl === 'doc' || rl === 'doctor') {
        navigate('/doctor-portal', { replace: true });
      } else if (rc === 'MED' || rl === 'med' || rl === 'medical') {
        navigate('/medical-welcome', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const isReceptionist = user?.role_code === 'REC' ||
    user?.role?.toLowerCase() === 'rec' ||
    user?.role?.toLowerCase() === 'receptionist' ||
    window.location.pathname.startsWith('/cross-role/receptionist');
  const isDoctor = user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor';

  // Registration Fields
  const [regStep, setRegStep] = useState(1);
  const [regOtp, setRegOtp] = useState('');
  const [showRegOtpField, setShowRegOtpField] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment Booking Fields
  const [appointmentLocation, setAppointmentLocation] = useState<number | ''>('');

  useEffect(() => {
    if (isReceptionist && branchScope?.selected_branch_id) {
      setAppointmentLocation(prev => prev || branchScope.selected_branch_id as number);
    }
  }, [isReceptionist, branchScope?.selected_branch_id]);
  const [treatmentType, setTreatmentType] = useState<number | ''>('');
  const [appointmentDate, setAppointmentDate] = useState(getLocalDateString());
  const [timeSlot, setTimeSlot] = useState<number | ''>('');
  const [symptoms, setSymptoms] = useState('');
  const [isAppointmentSuccess, setIsAppointmentSuccess] = useState(false);
  const [patientFullName, setPatientFullName] = useState('');
  const [patientMobileNo, setPatientMobileNo] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ReceptionistPatientOption | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<ReceptionistPatientOption[]>([]);
  const [isPatientLookupLoading, setIsPatientLookupLoading] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const patientSuggestionsRef = useRef<HTMLDivElement>(null);

  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [bookedForType, setBookedForType] = useState<'SELF' | 'FAMILY_MEMBER'>('SELF');
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<number | ''>('');
  const [selectedParentAppointmentId, setSelectedParentAppointmentId] = useState<number | ''>('');
  const [eligibleFollowUps, setEligibleFollowUps] = useState<any[]>([]);
  const [isEligibleFollowUpsLoading, setIsEligibleFollowUpsLoading] = useState(false);
  const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);
  const [isFamilyMemberSaving, setIsFamilyMemberSaving] = useState(false);
  const [newFamilyMember, setNewFamilyMember] = useState({
    full_name: '',
    age: '',
    gender: '',
    relationship: '',
    description: '',
  });


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientSuggestionsRef.current && !patientSuggestionsRef.current.contains(event.target as Node)) {
        setShowPatientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<{
    branches: any[];
    treatments: any[];
    slots: any[];
    meta: any;
  } | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [bookingAvailability, setBookingAvailability] = useState<{
    branch_id: number;
    appointment_date: string;
    booking_enabled: boolean;
    reason: string | null;
    source: string | null;
    leave?: {
      leave_id: number;
      leave_date: string;
      leave_reason: string | null;
    } | null;
    slot_time_overrides?: {
      id: number;
      fk_slot_id: number;
      override_start_time: string;
      override_end_time: string;
      default_start_time: string;
      default_end_time: string;
    }[];
  } | null>(null);
  const [tokenPlate, setTokenPlate] = useState<BookingTokenPlateItem[]>([]);
  const [tokenPlateMeta, setTokenPlateMeta] = useState<BookingTokenPlateData | null>(null);
  const [selectedTokenNumber, setSelectedTokenNumber] = useState<number | ''>('');
  const [isTokenPlateLoading, setIsTokenPlateLoading] = useState(false);
  const [tokenPlateError, setTokenPlateError] = useState('');
  const [tokenPlateRefreshKey, setTokenPlateRefreshKey] = useState(0);
  const followUpTreatmentIds = formData?.meta?.follow_up_rules?.follow_up_treatment_ids || [];
  const isFollowUpVisitSelected = Boolean(treatmentType && followUpTreatmentIds.includes(Number(treatmentType)));
  const hasEligibleFollowUps = eligibleFollowUps.length > 0;
  const isDoctorUnavailable = bookingAvailability?.booking_enabled === false;
  const selectedTreatment = useMemo(
    () => (formData?.treatments || []).find((item: any) => Number(item.id) === Number(treatmentType)) || null,
    [formData?.treatments, treatmentType]
  );
  const selectedTreatmentVisitType = selectedTreatment?.visit_type_code || null;
  const shouldUseTokenPlate = Boolean(
    appointmentLocation
    && treatmentType
    && appointmentDate
    && timeSlot
    && selectedTreatmentVisitType
    && selectedTreatmentVisitType !== 'OTHER'
    && !isDoctorUnavailable
  );
  const todayStr = getLocalDateString();
  const isToday = appointmentDate === todayStr;
  const isPastDate = appointmentDate < todayStr;
  const currentTimeStr = isToday ? getLocalTimeString() : '';

  const patientFollowUpBookingMessage = 'Only doctor-advised follow-up visits can be booked here.';
  const followUpNoOptionsMessage = isEligibleFollowUpsLoading
    ? 'Loading eligible follow-ups...'
    : isReceptionist
      ? 'No eligible follow-up found. Reception can still continue with direct booking.'
      : patientFollowUpBookingMessage;

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !appointmentLocation || !timeSlot || !appointmentDate) return;

    const subscription = {
      branch_id: Number(appointmentLocation),
      slot_id: Number(timeSlot),
      appointment_date: appointmentDate,
    };
    const handleQueueUpdate = (payload: any) => {
      const matchesDate = String(payload?.appointment_date || '').split(/[ T]/)[0] === appointmentDate;
      const matchesSlot = (payload?.groups || []).some(
        (group: any) => Number(group.branch_id) === Number(appointmentLocation)
          && Number(group.slot_id) === Number(timeSlot)
      );
      if (matchesDate && matchesSlot) {
        setTokenPlateRefreshKey((value) => value + 1);
      }
    };

    socket.emit('live-queue.subscribe', subscription);
    socket.on('queue-updated', handleQueueUpdate);

    return () => {
      socket.off('queue-updated', handleQueueUpdate);
      socket.emit('live-queue.unsubscribe', subscription);
    };
  }, [appointmentLocation, timeSlot, appointmentDate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Only fetch form data for roles that can book appointments
      const rc = user.role_code?.toUpperCase();
      const rl = user.role?.toLowerCase();
      const isPatientOrReceptionist = rc === 'PAT' || rl === 'patient' || rc === 'REC' || rl === 'rec' || rl === 'receptionist' || isReceptionist;

      if (!isPatientOrReceptionist) return;

      const fetchFormData = async () => {
        setIsDataLoading(true);
        try {
          const isRec = rc === 'REC' || rl === 'rec' || rl === 'receptionist' || isReceptionist;
          const endpoint = isRec ? '/api/v1/receptionist/form-data' : '/api/v1/appointments/form-data';

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          if (result.success) {
            setFormData(result.data);
          }
        } catch (error) {
          console.error('Error fetching appointment form data:', error);
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchFormData();

      if (rc === 'PAT' || rl === 'patient') {
        const fetchFamilyMembers = async () => {
          try {
            const response = await fetch('/api/v1/family-members?include_inactive=0', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
              setFamilyMembers(result.data.filter((m: any) => m.is_active === 1));
            }
          } catch (error) {
            console.error('Error fetching patient family members:', error);
          }
        };
        fetchFamilyMembers();
      }
    }
  }, [isAuthenticated, user, token, isReceptionist]);

  useEffect(() => {
    if (!formData) return;

    const followUpParentParam = searchParams.get('followup_parent_appointment_id');
    const followUpFamilyMemberParam = searchParams.get('followup_family_member_id');
    const followUpTreatmentId = formData?.meta?.follow_up_rules?.follow_up_treatment_ids?.[0];

    if ((followUpParentParam || followUpFamilyMemberParam) && followUpTreatmentId && !treatmentType) {
      setTreatmentType(followUpTreatmentId);
    }

    if (followUpFamilyMemberParam) {
      const parsedFamilyMemberId = Number(followUpFamilyMemberParam);
      if (Number.isInteger(parsedFamilyMemberId) && parsedFamilyMemberId > 0) {
        setBookedForType('FAMILY_MEMBER');
        setSelectedFamilyMemberId(parsedFamilyMemberId);
      }
    }

    if (followUpParentParam) {
      const parsedParentId = Number(followUpParentParam);
      if (Number.isInteger(parsedParentId) && parsedParentId > 0) {
        setSelectedParentAppointmentId(parsedParentId);
      }
    }
  }, [formData, searchParams]);

  useEffect(() => {
    if (!appointmentLocation || !appointmentDate) {
      setBookingAvailability(null);
      setIsAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchAvailability = async () => {
      setIsAvailabilityLoading(true);
      try {
        const query = new URLSearchParams({
          branch_id: String(appointmentLocation),
          date: appointmentDate,
        });

        const response = await fetch(`/api/v1/public/doctor-booking-availability?${query.toString()}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (result.success && result.data) {
          setBookingAvailability(result.data);
          if (result.data.booking_enabled === false) {
            setTimeSlot('');
          }
        } else {
          setBookingAvailability(null);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        setBookingAvailability(null);
      } finally {
        setIsAvailabilityLoading(false);
      }
    };

    fetchAvailability();

    return () => controller.abort();
  }, [appointmentLocation, appointmentDate]);

  useEffect(() => {
    if (!appointmentLocation || !treatmentType || !appointmentDate || !timeSlot || isDoctorUnavailable) {
      setTokenPlate([]);
      setTokenPlateMeta(null);
      setSelectedTokenNumber('');
      setTokenPlateError('');
      setIsTokenPlateLoading(false);
      return;
    }

    if (!selectedTreatmentVisitType || selectedTreatmentVisitType === 'OTHER') {
      setTokenPlate([]);
      setTokenPlateMeta(null);
      setSelectedTokenNumber('');
      setTokenPlateError('');
      setIsTokenPlateLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchTokenPlate = async () => {
      setIsTokenPlateLoading(true);
      setTokenPlateError('');
      try {
        const query = new URLSearchParams({
          branch_id: String(appointmentLocation),
          treatment_id: String(treatmentType),
          slot_id: String(timeSlot),
          appointment_date: appointmentDate,
        });
        const endpoint = isReceptionist
          ? '/api/v1/receptionist/token-plate'
          : '/api/v1/appointments/token-plate';
        const response = await fetch(`${endpoint}?${query.toString()}`, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json();

        if (!controller.signal.aborted && result.success && result.data) {
          const tokens = Array.isArray(result.data.tokens) ? result.data.tokens : [];
          setTokenPlate(tokens);
          setTokenPlateMeta(result.data);
          setSelectedTokenNumber((previousValue) =>
            tokens.some((item: BookingTokenPlateItem) => item.token_number === previousValue && item.is_selectable)
              ? previousValue
              : ''
          );
        } else if (!controller.signal.aborted) {
          setTokenPlate([]);
          setTokenPlateMeta(null);
          setSelectedTokenNumber('');
          setTokenPlateError(result.message || 'Failed to load token plate.');
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        setTokenPlate([]);
        setTokenPlateMeta(null);
        setSelectedTokenNumber('');
        setTokenPlateError('Unable to load token grid right now.');
      } finally {
        if (!controller.signal.aborted) {
          setIsTokenPlateLoading(false);
        }
      }
    };

    fetchTokenPlate();

    return () => controller.abort();
  }, [
    appointmentLocation,
    treatmentType,
    appointmentDate,
    timeSlot,
    isDoctorUnavailable,
    isReceptionist,
    token,
    selectedTreatmentVisitType,
    tokenPlateRefreshKey,
  ]);

  const fetchReceptionistPatientFamilyMembers = async (patientId: number) => {
    try {
      const response = await fetch(`/api/v1/receptionist/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success && result.data) {
        const activeMembers = result.data.family_members?.filter((m: any) => m.is_active === 1) || [];
        setFamilyMembers(activeMembers);
        return activeMembers;
      }
    } catch (error) {
      console.error('Error fetching selected patient family members:', error);
    }

    return [];
  };

  useEffect(() => {
    if (isReceptionist && token && selectedPatient?.patient_id) {
      fetchReceptionistPatientFamilyMembers(selectedPatient.patient_id);
    } else {
      if (isReceptionist) {
        setFamilyMembers([]);
      }
    }
    setBookedForType('SELF');
    setSelectedFamilyMemberId('');
    setIsAddingFamilyMember(false);
    setNewFamilyMember({
      full_name: '',
      age: '',
      gender: '',
      relationship: '',
      description: '',
    });
  }, [selectedPatient, isReceptionist, token]);

  const fetchEligibleFollowUps = async () => {
    if (!token || !isFollowUpVisitSelected) {
      setEligibleFollowUps([]);
      setIsEligibleFollowUpsLoading(false);
      return;
    }

    if (isReceptionist && !selectedPatient?.patient_id) {
      setEligibleFollowUps([]);
      setSelectedParentAppointmentId('');
      setIsEligibleFollowUpsLoading(false);
      return;
    }

    if (bookedForType === 'FAMILY_MEMBER' && !selectedFamilyMemberId) {
      setEligibleFollowUps([]);
      setSelectedParentAppointmentId('');
      setIsEligibleFollowUpsLoading(false);
      return;
    }

    setIsEligibleFollowUpsLoading(true);
    try {
      const params = new URLSearchParams();
      if (isReceptionist && selectedPatient?.patient_id) {
        params.set('patient_id', String(selectedPatient.patient_id));
      }
      if (bookedForType === 'FAMILY_MEMBER' && selectedFamilyMemberId) {
        params.set('family_member_id', String(selectedFamilyMemberId));
      } else if (bookedForType === 'SELF') {
        params.set('family_member_id', 'null');
      }

      const response = await fetch(`/api/v1/appointments/eligible-followups?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        const items = Array.isArray(result.data) ? result.data : [];
        setEligibleFollowUps(items);
        setSelectedParentAppointmentId((prev) => {
          if (prev && items.some((item: any) => Number(item.parent_appointment_id) === Number(prev))) {
            return prev;
          }
          return items[0]?.parent_appointment_id || '';
        });
      } else {
        setEligibleFollowUps([]);
        setSelectedParentAppointmentId('');
      }
    } catch (error) {
      console.error('Error fetching eligible follow-ups:', error);
      setEligibleFollowUps([]);
      setSelectedParentAppointmentId('');
    } finally {
      setIsEligibleFollowUpsLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleFollowUps();
  }, [token, isFollowUpVisitSelected, bookedForType, selectedFamilyMemberId, selectedPatient?.patient_id]);

  useEffect(() => {
    if (!isFollowUpVisitSelected) {
      setEligibleFollowUps([]);
      setSelectedParentAppointmentId('');
      setIsEligibleFollowUpsLoading(false);
    }
  }, [isFollowUpVisitSelected]);

  useEffect(() => {
    if (!isReceptionist || !token) {
      setIsPatientLookupLoading(false);
      setPatientSearchResults([]);
      setShowPatientSuggestions(false);
      setSelectedPatient(null);
      return;
    }

    const trimmedName = patientFullName.trim();
    const trimmedMobile = patientMobileNo.trim();
    const searchValue = trimmedMobile.length >= 3 ? trimmedMobile : trimmedName;

    if (
      selectedPatient &&
      trimmedName === selectedPatient.full_name &&
      trimmedMobile === selectedPatient.mobile_no
    ) {
      setIsPatientLookupLoading(false);
      setPatientSearchResults([]);
      setShowPatientSuggestions(false);
      return;
    }

    if (searchValue.length < 2) {
      setIsPatientLookupLoading(false);
      setPatientSearchResults([]);
      setShowPatientSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsPatientLookupLoading(true);
      try {
        const response = await fetch(`/api/v1/receptionist/patients?search=${encodeURIComponent(searchValue)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!controller.signal.aborted && result.success) {
          setPatientSearchResults(Array.isArray(result.data) ? result.data : []);
          setShowPatientSuggestions(true);
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Error searching receptionist patients:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPatientLookupLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isReceptionist, token, patientFullName, patientMobileNo, selectedPatient]);

  // Validation States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpToken, setForgotOtpToken] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showForgotSuccess, setShowForgotSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!regName.trim()) newErrors.name = t('booking.errors.name_req');

    if (!phone) {
      newErrors.phone = t('booking.errors.phone_req');
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      newErrors.phone = t('booking.errors.phone_inv');
    }

    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      newErrors.email = t('booking.errors.email_inv');
    }

    if (!regAge) {
      newErrors.age = t('booking.errors.age_req');
    } else if (parseInt(regAge) <= 0 || parseInt(regAge) > 120) {
      newErrors.age = t('booking.errors.age_inv');
    }

    if (!regGender) newErrors.gender = t('booking.errors.gender_req');

    if (!regPassword) {
      newErrors.password = t('booking.errors.pass_req');
    } else if (regPassword.length < 8) {
      newErrors.password = t('booking.errors.pass_min');
    }

    if (!regConfirmPassword) {
      newErrors.confirmPassword = t('booking.errors.confirm_pass_req');
    } else if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = t('booking.errors.pass_mismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isPhoneValid = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep === 1) {
      if (!showRegOtpField) {
        if (isPhoneValid) {
          setIsSubmitting(true);
          try {
            console.log('--- Requesting OTP ---');
            console.log('URL: /api/v1/auth/register/otp/request');
            console.log('Body:', { mobile_no: phone });

            const response = await fetch('/api/v1/auth/register/otp/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile_no: phone, captcha_token: regCaptchaToken }),
            });
            const result = await response.json();
            console.log('Response:', result);

            if (result.success) {
              setOtpSessionToken(result.data.otp_session_token);
              setShowRegOtpField(true);
            } else {
              setErrors({ phone: result.message || 'Failed to send OTP' });
            }
          } catch (error) {
            console.error('Error requesting OTP:', error);
            setErrors({ phone: 'Network error. Please try again.' });
          } finally {
            setIsSubmitting(false);
            regCaptchaRef.current?.reset();
            setRegCaptchaToken(null);
          }
        }
      } else {
        if (regOtp.length === 6) {
          setIsSubmitting(true);
          try {
            console.log('--- Verifying OTP ---');
            console.log('URL: /api/v1/auth/register/otp/verify');
            console.log('Body:', { mobile_no: phone, otp: regOtp, otp_session_token: otpSessionToken });

            const response = await fetch('/api/v1/auth/register/otp/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mobile_no: phone,
                otp: regOtp,
                otp_session_token: otpSessionToken
              }),
            });
            const result = await response.json();
            console.log('Response:', result);

            if (result.success) {
              setRegistrationToken(result.data.registration_token);
              setRegStep(2);
            } else {
              setErrors({ otp: result.message || 'Invalid OTP' });
            }
          } catch (error) {
            console.error('Error verifying OTP:', error);
            setErrors({ otp: 'Network error. Please try again.' });
          } finally {
            setIsSubmitting(false);
          }
        }
      }
    } else {
      if (validateForm()) {
        setIsSubmitting(true);
        try {
          const payload = {
            full_name: regName,
            age: parseInt(regAge),
            gender: regGender.toLowerCase(),
            email: regEmail || undefined,
            mobile_no: phone,
            password: regPassword,
            address: regAddress || undefined,
            registration_token: registrationToken,
            captcha_token: regCaptchaToken
          };

          console.log('--- Completing Registration ---');
          console.log('URL: /api/v1/auth/register');
          console.log('Body:', payload);

          const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          console.log('Response:', result);

          if (result.success) {
            const patientData = result.data.patient;
            login({
              id: patientData.uuid,
              name: patientData.full_name,
              phone: patientData.mobile_no,
              role: 'patient'
            }, result.data.token, result.data.branch_scope || null);

            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
              navigate('/dashboard');
            }, 2000);
          } else {
            setErrors({ general: result.message || 'Registration failed' });
          }
        } catch (error) {
          console.error('Error completing registration:', error);
          setErrors({ general: 'Network error. Please try again.' });
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMethod === 'password') {
      if (loginPhone.length === 10 && loginPassword) {
        setIsSubmitting(true);
        try {
          console.log('--- Logging in with Password ---');
          console.log('URL: /api/v1/auth/login');
          console.log('Body:', { mobile_no: loginPhone, password: loginPassword });

          const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mobile_no: loginPhone,
              password: loginPassword,
              captcha_token: loginCaptchaToken
            }),
          });
          const result = await response.json();
          console.log('Response:', result);

          if (result.success) {
            const patientData = result.data.patient;
            const pwRole = patientData.role;
            const pwRoleCode = patientData.role_code;
            login({
              id: patientData.uuid,
              name: patientData.full_name,
              phone: patientData.mobile_no,
              role: pwRole,
              role_code: pwRoleCode,
              has_cross_module_access: patientData.has_cross_module_access !== undefined ? patientData.has_cross_module_access : result.data.has_cross_module_access,
              can_access_reception_module: patientData.can_access_reception_module !== undefined ? patientData.can_access_reception_module : result.data.can_access_reception_module,
              can_access_medical_module: patientData.can_access_medical_module !== undefined ? patientData.can_access_medical_module : result.data.can_access_medical_module
            }, result.data.token, result.data.branch_scope || null);

            const pwRoleLower = pwRole?.toLowerCase();
            if (pwRoleCode === 'DOC' || pwRoleLower === 'doc' || pwRoleLower === 'doctor') {
              navigate('/doctor-portal', { replace: true });
            } else if (pwRoleCode === 'REC' || pwRoleCode === 'MED' || pwRoleLower === 'receptionist' || pwRoleLower === 'medical' || pwRoleLower === 'rec' || pwRoleLower === 'med') {
              navigate('/medical-welcome', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            setErrors({ loginPassword: result.message || 'Invalid credentials' });
          }
        } catch (error) {
          console.error('Error logging in with password:', error);
          setErrors({ loginPassword: 'Network error. Please try again.' });
        } finally {
          setIsSubmitting(false);
          loginCaptchaRef.current?.reset();
          setLoginCaptchaToken(null);
        }
      }
    } else {
      // OTP Logic
      if (!showOtpField) {
        if (loginPhone.length === 10) {
          setIsSubmitting(true);
          try {
            console.log('--- Requesting Login OTP ---');
            console.log('URL: /api/v1/auth/login/otp/request');
            console.log('Body:', { mobile_no: loginPhone });

            const response = await fetch('/api/v1/auth/login/otp/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile_no: loginPhone, captcha_token: loginCaptchaToken }),
            });
            const contentType = response.headers.get('content-type') || '';
            let result;

            if (contentType.toLowerCase().includes('application/json')) {
              result = await response.json();
            } else {
              const rawResponse = (await response.text()).slice(0, 200);
              throw new Error(`Unexpected non-JSON response: ${response.status} ${rawResponse}`);
            }
            console.log('Response:', result);

            if (result.success) {
              setShowOtpField(true);
            } else {
              setErrors({ loginPhone: result.message || 'Failed to send OTP' });
            }
          } catch (error) {
            console.error('Error requesting login OTP:', error);
            setErrors({ loginPhone: 'Network error. Please try again.' });
          } finally {
            setIsSubmitting(false);
            loginCaptchaRef.current?.reset();
            setLoginCaptchaToken(null);
          }
        }
      } else {
        if (otp.length === 6) {
          setIsSubmitting(true);
          try {
            console.log('--- Verifying Login OTP ---');
            console.log('URL: /api/v1/auth/login/otp/verify');
            console.log('Body:', { mobile_no: loginPhone, otp: otp });

            const response = await fetch('/api/v1/auth/login/otp/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mobile_no: loginPhone,
                otp: otp
              }),
            });
            const result = await response.json();
            console.log('Response:', result);

            if (result.success) {
              const patientData = result.data.patient;
              const userRole = patientData.role;
              const userRoleCode = patientData.role_code;

              login({
                id: patientData.uuid,
                name: patientData.full_name,
                phone: patientData.mobile_no,
                role: userRole,
                role_code: userRoleCode,
                has_cross_module_access: patientData.has_cross_module_access !== undefined ? patientData.has_cross_module_access : result.data.has_cross_module_access,
                can_access_reception_module: patientData.can_access_reception_module !== undefined ? patientData.can_access_reception_module : result.data.can_access_reception_module,
                can_access_medical_module: patientData.can_access_medical_module !== undefined ? patientData.can_access_medical_module : result.data.can_access_medical_module
              }, result.data.token, result.data.branch_scope || null);

              const roleLower = userRole?.toLowerCase();
              if (userRoleCode === 'DOC' || userRole === 'doc' || userRole === 'DOC' || roleLower === 'doctor') {
                navigate('/doctor-portal', { replace: true });
              } else if (userRoleCode === 'REC' || userRoleCode === 'MED' || userRole === 'REC' || userRole === 'MED' || roleLower === 'receptionist' || roleLower === 'medical' || roleLower === 'med' || roleLower === 'rec') {
                navigate('/medical-welcome', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            } else {
              setErrors({ loginOtp: result.message || 'Invalid OTP' });
            }
          } catch (error) {
            console.error('Error verifying login OTP:', error);
            setErrors({ loginOtp: 'Network error. Please try again.' });
          } finally {
            setIsSubmitting(false);
          }
        }
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      if (forgotStep === 1) {
        // Request OTP
        const response = await fetch('/api/v1/auth/password/forgot/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile_no: forgotPhone })
        });
        const result = await response.json();
        if (result.success) {
          setForgotOtpToken(result.data.otp_session_token);
          setForgotStep(2);
        } else {
          setErrors({ forgotPhone: result.message || 'Error requesting OTP' });
        }
      } else if (forgotStep === 2) {
        // Verify OTP
        const response = await fetch('/api/v1/auth/password/forgot/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile_no: forgotPhone,
            otp: forgotOtp,
            otp_session_token: forgotOtpToken
          })
        });
        const result = await response.json();
        if (result.success) {
          setForgotResetToken(result.data.reset_token);
          setForgotStep(3);
        } else {
          setErrors({ forgotOtp: result.message || 'Invalid OTP' });
        }
      } else if (forgotStep === 3) {
        // Reset Password
        if (newPassword !== confirmNewPassword) {
          setErrors({ confirmNewPassword: t('forgot_password.errors.pass_mismatch') });
          setIsSubmitting(false);
          return;
        }

        const response = await fetch('/api/v1/auth/password/forgot/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile_no: forgotPhone,
            new_password: newPassword,
            reset_token: forgotResetToken
          })
        });
        const result = await response.json();
        if (result.success) {
          setShowForgotSuccess(true);
          setTimeout(() => {
            setShowForgotSuccess(false);
            setIsForgotPassword(false);
            setForgotStep(1);
            // Reset fields
            setForgotPhone('');
            setForgotOtp('');
            setNewPassword('');
            setConfirmNewPassword('');
          }, 3000);
        } else {
          setErrors({ general: result.message || 'Error resetting password' });
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFamilyMemberForReceptionist = async () => {
    if (!selectedPatient?.patient_id) {
      setErrors({ appointment: 'Select an existing patient before adding a family member.' });
      return;
    }

    const fullName = newFamilyMember.full_name.trim();
    const relationship = newFamilyMember.relationship.trim();
    const parsedAge = Number(newFamilyMember.age);
    const gender = newFamilyMember.gender.trim().toLowerCase();

    if (!fullName || !relationship || !newFamilyMember.age || !gender) {
      setErrors({ appointment: 'Family member name, relationship, age and gender are required.' });
      return;
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setErrors({ appointment: 'Family member age must be between 1 and 120.' });
      return;
    }

    if (!['male', 'female', 'other'].includes(gender)) {
      setErrors({ appointment: 'Please select a valid family member gender.' });
      return;
    }

    setIsFamilyMemberSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/v1/receptionist/patients/${selectedPatient.patient_id}/family-members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          relationship,
          age: parsedAge,
          gender,
          description: newFamilyMember.description.trim() || null,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        setErrors({ appointment: result.message || 'Failed to add family member.' });
        return;
      }

      const activeMembers = await fetchReceptionistPatientFamilyMembers(selectedPatient.patient_id);
      const createdMemberId = result.data?.family_member_id;

      setNewFamilyMember({
        full_name: '',
        age: '',
        gender: '',
        relationship: '',
        description: '',
      });
      setIsAddingFamilyMember(false);
      setBookedForType('FAMILY_MEMBER');
      setSelectedFamilyMemberId(createdMemberId || activeMembers[0]?.family_member_id || '');
    } catch (error) {
      console.error('Error creating family member:', error);
      setErrors({ appointment: 'Network error adding family member. Please try again.' });
    } finally {
      setIsFamilyMemberSaving(false);
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appointmentLocation && treatmentType && appointmentDate && timeSlot) {
      if (bookingAvailability && bookingAvailability.booking_enabled === false) {
        setErrors({ appointment: bookingAvailability.reason || 'Doctor is not available in clinic' });
        return;
      }

      if (isFollowUpVisitSelected) {
        if (!isReceptionist && !hasEligibleFollowUps) {
          setErrors({ appointment: patientFollowUpBookingMessage });
          return;
        }

        if (hasEligibleFollowUps && !selectedParentAppointmentId) {
          setErrors({ appointment: 'Please select the parent visit for this follow-up booking.' });
          return;
        }
      }

      if (shouldUseTokenPlate && !selectedTokenNumber) {
        setErrors({ appointment: 'Please select one token from the booking grid.' });
        return;
      }

      if (shouldUseTokenPlate && selectedTokenNumber) {
        const selectedToken = tokenPlate.find((t) => Number(t.token_number) === Number(selectedTokenNumber));
        if (selectedToken) {
          const isPastOrCurrent = isPastDate || (isToday && currentTimeStr >= selectedToken.estimated_start_at);
          if (isPastOrCurrent) {
            setErrors({ appointment: 'The selected token slot is in the past or currently running and cannot be booked.' });
            return;
          }

          if (
            isBeforeFridayScheduleStart(
              appointmentLocation,
              appointmentDate,
              selectedToken.estimated_start_at,
            )
          ) {
            setErrors({
              appointment:
                'Devendra Nagar (Pandri) Friday schedule starts at 3:00 PM. Please select a token at or after 3:00 PM.',
            });
            return;
          }
        }
      }


      if (isReceptionist) {
        const trimmedPatientName = patientFullName.trim();
        const trimmedPatientMobile = patientMobileNo.trim();
        const parsedPatientAge = Number(patientAge);
        const normalizedPatientGender = patientGender.trim().toLowerCase();

        if (!trimmedPatientName || !trimmedPatientMobile) {
          setErrors({ appointment: 'Patient full name and mobile number are required.' });
          return;
        }

        if (!selectedPatient?.patient_id) {
          if (!patientAge || !patientGender) {
            setErrors({ appointment: 'Age and gender are required to create a new patient before booking.' });
            return;
          }

          if (!Number.isInteger(parsedPatientAge) || parsedPatientAge < 1 || parsedPatientAge > 120) {
            setErrors({ appointment: 'Age must be between 1 and 120.' });
            return;
          }

          if (!['male', 'female', 'other'].includes(normalizedPatientGender)) {
            setErrors({ appointment: 'Please select a valid gender.' });
            return;
          }
        }
      }

      setIsSubmitting(true);
      setErrors({});
      try {
        const payload: any = {
          fk_branch_id: appointmentLocation,
          fk_treatment_id: treatmentType,
          appointment_date: appointmentDate,
          fk_slot_id: timeSlot,
          token_number: selectedTokenNumber || undefined,
          symptoms: symptoms.trim() || null
        };

        let apiUrl = '/api/v1/appointments';

        if (isReceptionist) {
          apiUrl = '/api/v1/receptionist/book-appointment';
          if (selectedPatient?.patient_id) {
            payload.fk_patient_id = selectedPatient.patient_id;
          } else {
            payload.patient = {
              full_name: patientFullName.trim(),
              mobile_no: patientMobileNo.trim(),
              age: Number(patientAge),
              gender: patientGender.trim().toLowerCase(),
            };
          }
        }

        if (bookedForType === 'FAMILY_MEMBER' && selectedFamilyMemberId) {
          payload.booking_for = 'FAMILY_MEMBER';
          payload.fk_patient_family_member_id = selectedFamilyMemberId;
        } else {
          payload.booking_for = 'SELF';
        }

        if (isFollowUpVisitSelected && selectedParentAppointmentId) {
          payload.parent_appointment_id = selectedParentAppointmentId;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          addToast(result.message || 'Appointment booked successfully', 'success');
          setIsAppointmentSuccess(true);
          setBookedForType('SELF');
          setSelectedFamilyMemberId('');
          const isCrossRoleRec = window.location.pathname.startsWith('/cross-role/receptionist');
          setTimeout(() => {
            setIsAppointmentSuccess(false);
            if (isCrossRoleRec) {
              navigate('/cross-role/receptionist');
            } else {
              navigate(isReceptionist ? '/medical-welcome' : (isDoctor ? '/doctor-portal' : '/my-appointments'));
            }
          }, 3000);
        } else {
          setErrors({ appointment: result.message || 'Booking failed' });
        }
      } catch (error) {
        console.error('Error booking appointment:', error);
        setErrors({ appointment: 'Network error. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const patientAuthToggle = (
    <div className="flex justify-center mb-8">
      <div className="bg-gray-100 p-1 rounded-full flex gap-1">
        <button
          type="button"
          onClick={() => setIsLoginView(true)}
          className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isLoginView ? 'bg-primary-teal text-white shadow-lg' : 'text-gray-400 hover:text-primary-teal'}`}
        >
          {t('booking.returning_patient')}
        </button>
        <button
          type="button"
          onClick={() => setIsLoginView(false)}
          className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${!isLoginView ? 'bg-[#F2D06B] text-[#549E9E] shadow-lg' : 'text-gray-400 hover:text-primary-teal'}`}
        >
          {t('booking.new_patient')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#FDFDF7] ${isAuthenticated ? 'pt-0' : 'pt-24 lg:pt-28'}`}>
      <div className={`max-w-4xl mx-auto px-6 relative ${isAuthenticated ? 'pb-8' : 'pb-16'}`}>
        <AnimatePresence mode="wait">
          {isAuthenticated ? (
            <motion.div
              key="appointment-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[50px] shadow-sm border border-gray-100 p-8 lg:p-12 mb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-[#549E9E] mb-2 tracking-wide">
                  {t('booking.appointment')}
                </h2>
                <p className="text-base text-gray-400 font-medium">{t('booking.schedule_subtitle')}</p>
              </div>

              <form className="space-y-8" onSubmit={handleAppointmentSubmit}>
                {isReceptionist && (
                  <div className="grid md:grid-cols-2 gap-6 mb-2 border-b border-gray-100 pb-4">
                    <div className="space-y-2 relative" ref={patientSuggestionsRef}>
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.patient_full_name', 'Patient Full Name')}</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="text"
                          value={patientFullName}
                          onChange={(e) => {
                            setPatientFullName(e.target.value);
                            setSelectedPatient(null);
                            setShowPatientSuggestions(true);
                          }}
                          onFocus={() => setShowPatientSuggestions(true)}
                          required={isReceptionist}
                          placeholder={t('booking.enter_patient_name', 'Enter patient name')}
                          className="w-full bg-gray-50 border-none rounded-full py-3 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                        />

                        <AnimatePresence>
                          {showPatientSuggestions && (isPatientLookupLoading || patientSearchResults.length > 0 || patientFullName.trim() || patientMobileNo.trim()) && !selectedPatient && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[30px] shadow-2xl border border-gray-100 overflow-hidden z-[100] py-2"
                            >
                              <div className="px-8 py-3 border-b border-gray-100">
                                <p className="text-[10px] font-black text-primary-teal uppercase tracking-widest">
                                  {isPatientLookupLoading ? 'Searching patients...' : 'Select matching patient'}
                                </p>
                              </div>

                              {patientSearchResults.length > 0 ? (
                                <div className="max-h-64 overflow-y-auto">
                                  {patientSearchResults.map((patient) => (
                                    <button
                                      key={patient.patient_id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPatient(patient);
                                        setPatientFullName(patient.full_name || '');
                                        setPatientMobileNo(patient.mobile_no || '');
                                        setPatientAge(patient.age ? String(patient.age) : '');
                                        setPatientGender((patient.gender || '').toLowerCase());
                                        setPatientSearchResults([]);
                                        setShowPatientSuggestions(false);
                                      }}
                                      className="w-full text-left px-8 py-4 border-b last:border-b-0 border-gray-100 hover:bg-primary-teal/5 hover:text-primary-teal transition-all cursor-pointer block"
                                    >
                                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{patient.full_name}</p>
                                      <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                                        {patient.mobile_no}
                                        {patient.patient_uuid ? ` • ${patient.patient_uuid}` : ''}
                                        {patient.age ? ` • Age ${patient.age}` : ''}
                                        {patient.gender ? ` • ${patient.gender}` : ''}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              ) : !isPatientLookupLoading && (
                                <div className="px-8 py-4">
                                  <p className="text-[11px] font-bold text-amber-600">
                                    No matching existing patient found. Fill age and gender to create a new patient, then the appointment will be booked.
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.patient_mobile_no', 'Patient Mobile No')}</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="tel"
                          value={patientMobileNo}
                          onChange={(e) => {
                            setPatientMobileNo(e.target.value.replace(/\D/g, ''));
                            setSelectedPatient(null);
                            setShowPatientSuggestions(true);
                          }}
                          required={isReceptionist}
                          maxLength={10}
                          placeholder={t('booking.enter_mobile_number', 'Enter mobile number')}
                          className="w-full bg-gray-50 border-none rounded-full py-3 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.patient_age', 'Patient Age')}</label>
                      <div className="relative">
                        <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={patientAge}
                          onChange={(e) => {
                            if (selectedPatient) return;
                            setPatientAge(e.target.value.replace(/\D/g, '').slice(0, 3));
                          }}
                          disabled={Boolean(selectedPatient)}
                          required={isReceptionist && !selectedPatient}
                          placeholder={t('booking.enter_age', 'Enter age')}
                          className="w-full bg-gray-50 border-none rounded-full py-3 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all disabled:opacity-70"
                        />
                      </div>
                    </div>
                    <CustomSelect
                      label={t('booking.patient_gender', 'Patient Gender')}
                      options={[
                        { id: 'male', label: t('profile.male', 'Male') },
                        { id: 'female', label: t('profile.female', 'Female') },
                        { id: 'other', label: t('profile.other', 'Other') }
                      ]}
                      value={patientGender}
                      onChange={(val) => {
                        if (selectedPatient) return;
                        setPatientGender(val);
                      }}
                      icon={Users}
                      disabled={Boolean(selectedPatient)}
                    />
                    <div className="md:col-span-2">
                      {selectedPatient && (
                        <div className="py-3 px-4 bg-emerald-50/50 border border-emerald-100 rounded-[16px] flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">{t('booking.selected_patient', 'Selected Patient')}</p>
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <p className="text-sm font-black text-gray-800 uppercase tracking-wide">{selectedPatient.full_name}</p>
                              <p className="text-[11px] font-bold text-gray-500">
                                • {selectedPatient.mobile_no}
                                {selectedPatient.patient_uuid ? ` • ${selectedPatient.patient_uuid}` : ''}
                                {selectedPatient.age ? ` • ${t('booking.age', 'Age')} ${selectedPatient.age}` : ''}
                                {selectedPatient.gender ? ` • ${selectedPatient.gender}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatient(null);
                              setShowPatientSuggestions(true);
                            }}
                            className="shrink-0 text-[10px] px-3 py-1.5 bg-white border border-emerald-200 rounded-full font-black uppercase tracking-widest text-emerald-700 hover:text-white hover:bg-emerald-600 hover:border-emerald-600 transition-all cursor-pointer shadow-sm"
                          >
                            {t('booking.change', 'Change')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Family Member Selection Toggle */}
                {((!isReceptionist && isAuthenticated) || (isReceptionist && selectedPatient)) && (
                  <div className="bg-gray-50/50 rounded-[30px] p-6 border border-gray-100 mb-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-primary-teal uppercase tracking-widest">{t('booking.booking_for', 'Booking for')}</p>
                        <p className="text-sm text-gray-400 font-medium mt-1">{t('booking.whom_booking_for', 'Whom are you booking this appointment for?')}</p>
                      </div>

                      <div className="flex bg-gray-100 rounded-full p-1 max-w-xs shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setBookedForType('SELF');
                            setSelectedFamilyMemberId('');
                          }}
                          className={`cursor-pointer px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${bookedForType === 'SELF'
                            ? 'bg-primary-teal text-white shadow-md'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                          {t('booking.self', 'Self')}
                        </button>
                        <button
                          type="button"
                          disabled={isReceptionist ? (!selectedPatient || familyMembers.length === 0) : familyMembers.length === 0}
                          onClick={() => {
                            setBookedForType('FAMILY_MEMBER');
                            if (familyMembers.length > 0) {
                              setSelectedFamilyMemberId(familyMembers[0].family_member_id);
                            }
                          }}
                          className={`cursor-pointer px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${(isReceptionist ? (!selectedPatient || familyMembers.length === 0) : familyMembers.length === 0)
                            ? 'opacity-40 cursor-not-allowed text-gray-300'
                            : bookedForType === 'FAMILY_MEMBER'
                              ? 'bg-primary-teal text-white shadow-md'
                              : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                          {t('booking.family_member', 'Family Member')}
                        </button>
                      </div>
                    </div>

                    {isReceptionist && selectedPatient && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {t('booking.add_dependent_info', 'Add a dependent here if this patient has come with a family member.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddingFamilyMember((value) => !value)}
                          className="cursor-pointer shrink-0 px-5 py-2.5 rounded-full bg-white border border-primary-teal/20 text-primary-teal text-[10px] font-black uppercase tracking-widest hover:bg-primary-teal hover:text-white transition-all"
                        >
                          {isAddingFamilyMember ? t('booking.close', 'Close') : t('booking.add_family_member', 'Add Family Member')}
                        </button>
                      </div>
                    )}

                    {isReceptionist && !selectedPatient && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-4">
                        {t('booking.search_select_patient', 'Search and select an existing patient first to enable family-member booking options.')}
                      </p>
                    )}

                    {isReceptionist && selectedPatient && isAddingFamilyMember && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="grid md:grid-cols-2 gap-4 bg-white rounded-[24px] border border-gray-100 p-5"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.family_member_name', 'Family Member Name')}</label>
                          <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                              type="text"
                              value={newFamilyMember.full_name}
                              onChange={(e) => setNewFamilyMember((value) => ({ ...value, full_name: e.target.value }))}
                              placeholder={t('booking.enter_family_member_name', 'Enter family member name')}
                              className="w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.relationship', 'Relationship')}</label>
                          <div className="relative">
                            <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                              type="text"
                              value={newFamilyMember.relationship}
                              onChange={(e) => setNewFamilyMember((value) => ({ ...value, relationship: e.target.value }))}
                              placeholder={t('booking.relationship_placeholder', 'Father, Mother, Spouse...')}
                              className="w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.age', 'Age')}</label>
                          <div className="relative">
                            <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={newFamilyMember.age}
                              onChange={(e) => setNewFamilyMember((value) => ({ ...value, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                              placeholder={t('booking.enter_age', 'Enter age')}
                              className="w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                            />
                          </div>
                        </div>

                        <CustomSelect
                          label={t('booking.gender', 'Gender')}
                          options={[
                            { id: 'male', label: t('profile.male', 'Male') },
                            { id: 'female', label: t('profile.female', 'Female') },
                            { id: 'other', label: t('profile.other', 'Other') }
                          ]}
                          value={newFamilyMember.gender}
                          onChange={(val) => setNewFamilyMember((value) => ({ ...value, gender: val }))}
                          icon={Users}
                        />

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.notes', 'Notes')}</label>
                          <div className="relative">
                            <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                              type="text"
                              value={newFamilyMember.description}
                              onChange={(e) => setNewFamilyMember((value) => ({ ...value, description: e.target.value }))}
                              placeholder={t('booking.optional_notes', 'Optional health notes')}
                              className="w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setIsAddingFamilyMember(false)}
                            className="cursor-pointer px-6 py-3 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                          >
                            {t('booking.cancel', 'Cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={isFamilyMemberSaving}
                            onClick={handleCreateFamilyMemberForReceptionist}
                            className="cursor-pointer px-6 py-3 rounded-full bg-primary-teal text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-teal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isFamilyMemberSaving ? t('booking.saving', 'Saving...') : t('booking.save_and_select', 'Save & Select')}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Dropdown to select family member */}
                    {bookedForType === 'FAMILY_MEMBER' && familyMembers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-gray-100"
                      >
                        <CustomSelect
                          label={t('booking.select_family_member', 'Select Family Member')}
                          options={familyMembers.map((m) => ({
                            id: m.family_member_id,
                            label: `${m.full_name} (${m.relationship})`,
                            description: `Age: ${m.age} • Gender: ${m.gender}`,
                          }))}
                          value={selectedFamilyMemberId}
                          onChange={(val) => setSelectedFamilyMemberId(val as number)}
                          icon={Users}
                        />
                      </motion.div>
                    )}

                    {!isReceptionist && familyMembers.length === 0 && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {t('booking.no_family_members', 'No active family members registered. You can add them in your')}{' '}
                        <Link to="/family-members" className="text-primary-teal hover:underline">
                          {t('booking.family_members_page', 'Family Members Page')}
                        </Link>{t('booking.add_them_in', '.')}
                      </p>
                    )}

                    {isReceptionist && familyMembers.length === 0 && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {t('booking.no_active_family_members_receptionist', 'No active family members registered for this patient account.')}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  <CustomSelect
                    label={t('booking.clinic_location')}
                    options={(formData?.branches || [])
                      .filter(b => (isReceptionist && branchScope?.selected_branch_id) ? b.id === branchScope.selected_branch_id : true)
                      .map(b => ({
                        id: b.id,
                        label: b.branch_name,
                        description: b.address
                      }))}
                    value={appointmentLocation}
                    onChange={(val) => {
                      setAppointmentLocation(val);
                      setTimeSlot(''); // Reset slot when branch changes
                    }}
                    icon={MapPin}
                  />
                  <CustomSelect
                    label={t('booking.treatment_type')}
                    options={formData?.treatments.map(t => ({
                      id: t.id,
                      label: t.treatment_name,
                      description: t.description
                    })) || []}
                    value={treatmentType}
                    onChange={setTreatmentType}
                    icon={Stethoscope}
                  />
                </div>

                {isFollowUpVisitSelected && (
                  <div className="space-y-3 bg-red-50/40 border border-red-100 rounded-[26px] p-5">
                    <CustomSelect
                      label={t('booking.follow_up_parent_visit', 'Parent Visit')}
                      options={eligibleFollowUps.map((item) => ({
                        id: item.parent_appointment_id,
                        label: `${item.parent_auid} • ${item.treatment_name} • ${item.parent_appointment_date}`,
                        description: `${item.branch_name}${item.doctor_name ? ` • ${item.doctor_name}` : ''}${item.family_member_relationship ? ` • ${item.family_member_relationship}` : ''}`,
                      }))}
                      value={selectedParentAppointmentId}
                      onChange={(val) => setSelectedParentAppointmentId(val as number)}
                      icon={Link2}
                      disabled={isEligibleFollowUpsLoading || (!isReceptionist && !hasEligibleFollowUps)}
                      noOptionsMessage={followUpNoOptionsMessage}
                    />

                    {!isEligibleFollowUpsLoading && !hasEligibleFollowUps && (
                      <p className={`text-[11px] uppercase tracking-widest ${isReceptionist ? 'font-bold text-amber-600' : 'font-black text-red-500'}`}>
                        {isReceptionist
                          ? 'No eligible follow-up found. Reception can still continue with direct booking.'
                          : patientFollowUpBookingMessage}
                      </p>
                    )}

                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  <CustomDatePicker
                    label={t('booking.appointment_date')}
                    value={appointmentDate}
                    onChange={(date) => {
                      if (date && date !== 'all') {
                        setAppointmentDate(date);
                      }
                    }}
                    minDate={getLocalDateString()}
                    allowClear={false}
                  />
                  <CustomSelect
                    label={t('booking.time_slot_label')}
                    options={
                      !appointmentLocation
                        ? []
                        : formData?.slots
                          .filter(s => Number(s.fk_branch_id) === Number(appointmentLocation))
                          .map(s => {
                            const activeOverride = bookingAvailability?.slot_time_overrides?.find(
                              (o: any) => Number(o.fk_slot_id) === Number(s.id)
                            );
                            const plateSlot = tokenPlateMeta?.slot;
                            const plateMatchesSlot =
                              Number(plateSlot?.id || plateSlot?.slot_id) === Number(s.id);
                            const hasOverride =
                              !!activeOverride ||
                              (plateMatchesSlot &&
                                Boolean(plateSlot?.has_time_override || plateSlot?.has_override));

                            const rawStart =
                              activeOverride?.override_start_time ||
                              (plateMatchesSlot &&
                                (plateSlot?.effective_start_time || plateSlot?.start_time)) ||
                              s.start_time;
                            const rawEnd =
                              activeOverride?.override_end_time ||
                              (plateMatchesSlot &&
                                (plateSlot?.effective_end_time || plateSlot?.end_time)) ||
                              s.end_time;

                            const startLabel =
                              hasOverride || plateMatchesSlot
                                ? formatTimeTo12Hour(String(rawStart || ''))
                                : getEffectiveSlotDisplayTime(
                                    Number(appointmentLocation),
                                    String(s.start_time || ''),
                                    appointmentDate,
                                  );
                            const endLabel =
                              hasOverride || plateMatchesSlot
                                ? formatTimeTo12Hour(String(rawEnd || ''))
                                : getEffectiveSlotDisplayEndTime(
                                    Number(appointmentLocation),
                                    String(s.start_time || ''),
                                    String(s.end_time || ''),
                                    appointmentDate,
                                  );

                            return {
                              id: s.id,
                              label: `${s.slot_name} (${startLabel} - ${endLabel})`,
                            };
                          }) || []
                    }
                    value={timeSlot}
                    onChange={setTimeSlot}
                    icon={Clock}
                    disabled={!appointmentLocation || isDoctorUnavailable || isAvailabilityLoading}
                    noOptionsMessage={!appointmentLocation ? "Select location first" : "No slots available"}
                  />
                </div>

                {isDevendraNagarFridaySchedule(appointmentLocation, appointmentDate) && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-xl text-amber-800 text-sm">
                    <span className="font-semibold">Friday Schedule Note:</span>{' '}
                    First available slot for Devendra Nagar (Pandri) Branch starts at{' '}
                    <strong>3:00 PM</strong>.
                  </div>
                )}

                {appointmentLocation && appointmentDate && (
                  <div className={`p-4 rounded-[22px] border ${
                    isAvailabilityLoading
                      ? 'bg-amber-50 border-amber-100 text-amber-600'
                      : isDoctorUnavailable
                      ? 'bg-red-50 border-red-100 text-red-600'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}>
                    <p className="text-[11px] font-black uppercase tracking-widest">
                      {isAvailabilityLoading
                        ? t('booking.checking_doctor_availability', 'Checking doctor availability')
                        : isDoctorUnavailable
                          ? (bookingAvailability?.reason || t('booking.doctor_unavailable', 'Doctor is not available in clinic'))
                          : t('booking.doctor_available', 'Doctor is available for the selected date')}
                    </p>
                    {!isAvailabilityLoading && bookingAvailability?.leave?.leave_reason && (
                      <p className="text-sm mt-2 opacity-80">
                        {bookingAvailability.leave.leave_reason}
                      </p>
                    )}
                    {!isAvailabilityLoading &&
                      tokenPlateMeta?.slot?.reason &&
                      (tokenPlateMeta.slot.has_override || tokenPlateMeta.slot.has_time_override) && (
                        <p className="text-sm mt-2 opacity-80">
                          {tokenPlateMeta.slot.reason}
                        </p>
                      )}
                  </div>
                )}

                {appointmentLocation && treatmentType && appointmentDate && timeSlot && !isDoctorUnavailable && selectedTreatmentVisitType && selectedTreatmentVisitType !== 'OTHER' && (
                  <div className="space-y-4 bg-gray-50 border border-gray-100 rounded-[26px] p-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary-teal">
                        Booking Token Grid
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        Select one token for <span className="font-black text-gray-800">{selectedTreatment?.treatment_name || tokenPlateMeta?.treatment_name || 'selected treatment'}</span>.
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Only matching visit-type token cards are selectable.
                      </p>
                      {(tokenPlateMeta?.slot?.effective_start_time ||
                        tokenPlateMeta?.slot?.start_time) && (
                        <p className="text-[11px] font-bold text-gray-500">
                          Session starts at{' '}
                          <span className="font-black text-gray-800">
                            {formatTimeTo12Hour(
                              String(
                                tokenPlateMeta.slot.effective_start_time ||
                                  tokenPlateMeta.slot.start_time ||
                                  '',
                              ),
                            )}
                          </span>
                          {(tokenPlateMeta.slot.effective_end_time ||
                            tokenPlateMeta.slot.end_time) && (
                            <>
                              {' '}
                              –{' '}
                              {formatTimeTo12Hour(
                                String(
                                  tokenPlateMeta.slot.effective_end_time ||
                                    tokenPlateMeta.slot.end_time ||
                                    '',
                                ),
                              )}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {isTokenPlateLoading && (
                      <div className="p-4 rounded-[20px] border border-amber-100 bg-amber-50 text-[11px] font-black uppercase tracking-widest text-amber-600 text-center">
                        Loading token grid...
                      </div>
                    )}

                    {!isTokenPlateLoading && tokenPlateError && (
                      <div className="p-4 rounded-[20px] border border-red-100 bg-red-50 text-[11px] font-black uppercase tracking-widest text-red-500 text-center">
                        {tokenPlateError}
                      </div>
                    )}

                    {!isTokenPlateLoading && !tokenPlateError && tokenPlate.length > 0 && (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                          {tokenPlate.map((tokenCard) => {
                            const isPastOrCurrentTimeSlot = isPastDate || (isToday && currentTimeStr >= tokenCard.estimated_start_at);
                            const isSelected = Number(selectedTokenNumber) === Number(tokenCard.token_number);
                            const isDisabled = !tokenCard.is_selectable || isSubmitting || isPastOrCurrentTimeSlot;
                            return (
                              <button
                                key={tokenCard.token_number}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setSelectedTokenNumber(tokenCard.token_number)}
                                className={`text-center rounded-xl border p-2 transition-all ${
                                  isDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'
                                } ${isSelected ? 'ring-2 ring-offset-2 ring-primary-teal shadow-md' : 'shadow-sm'}`}
                                style={{
                                  borderColor: tokenCard.color_code,
                                  backgroundColor: isSelected ? `${tokenCard.color_code}20` : `${tokenCard.color_code}12`,
                                }}
                              >
                                <div className="text-center">
                                  <span className="text-base font-black text-gray-900">
                                    #{tokenCard.token_number}
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  <p className="text-[9px] font-extrabold uppercase tracking-wider truncate" style={{ color: tokenCard.color_code }} title={tokenCard.visit_type_label}>
                                    {tokenCard.short_label}
                                  </p>
                                  <p className="mt-0.5 text-xs font-black text-gray-800">
                                    {formatTimeTo12Hour(tokenCard.estimated_start_at)}
                                  </p>
                                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                    {(tokenCard.is_booked || isPastOrCurrentTimeSlot)
                                      ? 'Booked'
                                      : tokenCard.is_selectable
                                        ? 'Available'
                                        : 'Reserved'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedTokenNumber ? (
                          <div className="p-4 rounded-[20px] border border-emerald-100 bg-emerald-50 text-center">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                              Selected token #{selectedTokenNumber}
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 rounded-[20px] border border-gray-100 bg-white text-center">
                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                              Select one available token card to continue
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {user && (user.role === 'patient' || user.role_code === 'PAT') && (
                  <div className="bg-gray-50 border border-gray-100 rounded-[26px] p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-3">
                        <MapPin size={20} className="text-primary-teal shrink-0 mt-1" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary-teal mb-1">Your Address</p>
                          {user.address ? (
                            <p className="text-sm font-medium text-gray-600">{user.address}</p>
                          ) : (
                            <p className="text-sm font-medium text-gray-400 italic">No address provided</p>
                          )}
                        </div>
                      </div>
                      {!user.address && (
                        <button
                          type="button"
                          onClick={() => navigate('/profile')}
                          className="px-4 py-2 bg-primary-teal/10 text-primary-teal text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-primary-teal/20 transition-colors whitespace-nowrap"
                        >
                          Add Address
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.symptoms_reason', 'Symptoms / Reason (Optional)')}</label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder={t('booking.symptoms_placeholder', 'Describe your symptoms or reason for visit...')}
                    className="w-full bg-gray-50 border-none rounded-[30px] py-4 px-6 outline-none text-gray-700 font-medium min-h-[120px] focus:ring-2 focus:ring-primary-teal/20 transition-all"
                  />
                </div>

                {errors.appointment && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] text-center">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{errors.appointment}</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!appointmentLocation || !treatmentType || !appointmentDate || !timeSlot || isSubmitting || isDataLoading || isAvailabilityLoading || isDoctorUnavailable || isTokenPlateLoading || (shouldUseTokenPlate && !selectedTokenNumber)}
                  className={`w-full py-5 bg-primary-teal text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-teal/20 flex items-center justify-center gap-4 mt-8 transition-all ${(!appointmentLocation || !treatmentType || !appointmentDate || !timeSlot || isSubmitting || isDataLoading || isAvailabilityLoading || isDoctorUnavailable || isTokenPlateLoading || (shouldUseTokenPlate && !selectedTokenNumber)) ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <span>{isSubmitting ? t('booking.processing') : t('booking.confirm_appointment')}</span>
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap size={18} />
                    </motion.div>
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </motion.button>
              </form>
            </motion.div>
          ) : isForgotPassword ? (
            <motion.div
              key="forgot-password-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-[50px] shadow-sm border border-gray-100 p-8 lg:p-12 mb-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-teal/10 rounded-2xl flex items-center justify-center text-primary-teal mx-auto mb-6">
                  <Key size={24} />
                </div>
                <h2 className="text-2xl font-bold text-[#549E9E] mb-2 uppercase tracking-widest">{t('forgot_password.title')}</h2>
                <p className="text-base text-gray-400 font-medium">
                  {forgotStep === 1 ? t('forgot_password.enter_mobile') :
                    forgotStep === 2 ? t('forgot_password.verify_subtitle') :
                      t('forgot_password.new_password_subtitle')}
                </p>
              </div>

              {showForgotSuccess ? (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-100">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-600 uppercase tracking-widest mb-2">{t('forgot_password.success_title')}</h3>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">{t('forgot_password.success_desc')}</p>
                  </div>
                </div>
              ) : (
                <form className="space-y-6 max-w-md mx-auto" onSubmit={handleForgotPasswordSubmit}>
                  {forgotStep === 1 && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.mobile_number')}</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="tel"
                          placeholder={t('booking.enter_mobile_number')}
                          value={forgotPhone}
                          onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.forgotPhone ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                        />
                      </div>
                      {errors.forgotPhone && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.forgotPhone}</p>}
                    </div>
                  )}

                  {forgotStep === 2 && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4 block text-center">{t('booking.enter_otp')}</label>
                      <SegmentedOTPInput
                        value={forgotOtp}
                        onChange={setForgotOtp}
                        error={errors.forgotOtp}
                      />
                    </div>
                  )}

                  {forgotStep === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('forgot_password.new_password')}</label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input
                            type="password"
                            placeholder={t('forgot_password.new_password')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium focus:ring-primary-teal/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('forgot_password.confirm_new_password')}</label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input
                            type="password"
                            placeholder={t('forgot_password.confirm_new_password')}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.confirmNewPassword ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                          />
                        </div>
                        {errors.confirmNewPassword && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.confirmNewPassword}</p>}
                      </div>
                    </div>
                  )}

                  {errors.general && <p className="text-[10px] text-red-500 font-bold mt-2 text-center uppercase tracking-widest">{errors.general}</p>}

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || (forgotStep === 1 && forgotPhone.length < 10) || (forgotStep === 2 && forgotOtp.length < 6) || (forgotStep === 3 && (!newPassword || !confirmNewPassword))}
                    className={`w-full py-5 bg-primary-teal text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-teal/20 flex items-center justify-center gap-4 mt-4 transition-all ${isSubmitting ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                  >
                    <span>{isSubmitting ? t('booking.processing') : (forgotStep === 1 ? t('forgot_password.btn_request') : forgotStep === 2 ? t('forgot_password.btn_verify') : t('forgot_password.btn_reset'))}</span>
                    <Zap size={18} />
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotStep(1);
                      setErrors({});
                    }}
                    className="w-full text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 hover:text-primary-teal transition-colors"
                  >
                    {t('forgot_password.back_to_login')}
                  </button>
                </form>
              )}
            </motion.div>
          ) : isLoginView ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-[50px] shadow-sm border border-gray-100 p-8 lg:p-12 mb-8"
            >
              {patientAuthToggle}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-teal/10 rounded-2xl flex items-center justify-center text-primary-teal mx-auto mb-6">
                  <Lock size={24} />
                </div>
                <h2 className="text-2xl font-bold text-[#549E9E] mb-2 uppercase tracking-widest">{t('common.login')}</h2>
                <p className="text-base text-gray-400 font-medium">{t('booking.login_subtitle')}</p>
              </div>

              <form className="space-y-6 max-w-md mx-auto" onSubmit={handleLoginSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.mobile_number')}</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="tel"
                      placeholder={t('booking.enter_mobile_number')}
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        if (errors.loginPhone) setErrors(prev => { const n = { ...prev }; delete n.loginPhone; return n; });
                      }}
                      className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.loginPhone ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                      disabled={(loginMethod === 'otp' && showOtpField) || isSubmitting}
                    />
                    {errors.loginPhone && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.loginPhone}</p>}
                    {loginMethod === 'otp' && showOtpField && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtpField(false);
                          setErrors(prev => { const n = { ...prev }; delete n.loginOtp; delete n.loginPhone; return n; });
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary-teal uppercase tracking-widest hover:underline"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {loginMethod === 'password' ? (
                    <motion.div
                      key="password-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.password')}</label>
                      <div className="relative">
                        <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.loginPassword ? 'text-red-400' : 'text-gray-300'}`} />
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          placeholder={t('booking.password')}
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (errors.loginPassword) setErrors(prev => { const n = { ...prev }; delete n.loginPassword; return n; });
                          }}
                          className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-12 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.loginPassword ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-teal transition-colors"
                        >
                          {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.loginPassword && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.loginPassword}</p>}
                    </motion.div>
                  ) : (
                    showOtpField && (
                      <motion.div
                        key="otp-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex justify-between items-center px-4">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest">{t('booking.enter_otp')}</label>
                          <button type="button" className="text-[10px] font-bold text-primary-teal/60 hover:text-primary-teal uppercase tracking-widest">{t('booking.resend_otp')}</button>
                        </div>
                        <SegmentedOTPInput
                          value={otp}
                          onChange={(val) => {
                            setOtp(val);
                            if (errors.loginOtp) setErrors(prev => { const n = { ...prev }; delete n.loginOtp; return n; });
                          }}
                          error={errors.loginOtp}
                        />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center px-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
                      setShowOtpField(false);
                      setErrors({});
                    }}
                    className="text-[10px] font-bold text-primary-teal uppercase tracking-widest hover:underline flex items-center gap-2"
                  >
                    {loginMethod === 'password' ? (
                      <>
                        <MessageSquare size={12} />
                        <span>{t('booking.login_via_otp')}</span>
                      </>
                    ) : (
                      <>
                        <Key size={12} />
                        <span>{t('booking.login_via_password')}</span>
                      </>
                    )}
                  </button>

                  {loginMethod === 'password' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotStep(1);
                        setForgotPhone(loginPhone);
                      }}
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-primary-teal transition-colors"
                    >
                      {t('forgot_password.link')}
                    </button>
                  )}
                </div>

                {/* reCAPTCHA */}
                {!showOtpField && (
                  <div className="flex justify-center mt-4">
                    <ReCAPTCHA
                      ref={loginCaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(token) => setLoginCaptchaToken(token)}
                      onExpired={() => setLoginCaptchaToken(null)}
                      theme="light"
                      size="normal"
                    />
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginPhone.length < 10 || (loginMethod === 'password' && !loginPassword) || (!showOtpField && !loginCaptchaToken) || isSubmitting}
                  className={`w-full py-5 bg-primary-teal text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-teal/20 flex items-center justify-center gap-4 mt-4 transition-all ${loginPhone.length < 10 || (loginMethod === 'password' && !loginPassword) || (!showOtpField && !loginCaptchaToken) || isSubmitting ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <span>{isSubmitting ? t('booking.processing') : (loginMethod === 'password' ? t('common.login') : (showOtpField ? t('booking.verify_login') : t('booking.send_otp')))}</span>
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap size={18} />
                    </motion.div>
                  ) : (
                    <Zap size={18} />
                  )}
                </motion.button>

                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
                  {t('booking.dont_have_account')} <button type="button" onClick={() => setIsLoginView(false)} className="text-primary-teal">{t('booking.join_new_patient')}</button>
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="reg-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-[50px] shadow-sm border border-gray-100 p-8 lg:p-12"
            >
              {patientAuthToggle}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[#549E9E] mb-2 uppercase tracking-widest">
                  {regStep === 1 ? t('booking.mobile_verification') : t('booking.patient_details')}
                </h2>
                <p className="text-base text-gray-400 font-medium">
                  {regStep === 1 ? t('booking.verify_start_reg') : t('booking.tell_about_yourself')}
                </p>
              </div>

              <form className="space-y-8" onSubmit={handleRegistrationSubmit}>
                <AnimatePresence mode="wait">
                  {regStep === 1 ? (
                    <motion.div
                      key="reg-step-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 max-w-md mx-auto"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.mobile_number')}</label>
                        <div className="relative">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input
                            type="tel"
                            placeholder={t('booking.mobile_number')}
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                              if (errors.phone) setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                            }}
                            className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.phone ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                            disabled={showRegOtpField}
                          />
                          {showRegOtpField && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowRegOtpField(false);
                                setErrors(prev => { const n = { ...prev }; delete n.otp; delete n.phone; return n; });
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary-teal uppercase tracking-widest hover:underline"
                            >
                              {t('booking.change')}
                            </button>
                          )}
                        </div>
                        {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.phone}</p>}
                      </div>

                      {showRegOtpField && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4"
                        >
                          <div className="flex justify-between items-center px-4">
                            <label className="text-xs font-black text-primary-teal uppercase tracking-widest">{t('booking.enter_otp')}</label>
                            <button type="button" className="text-[10px] font-bold text-primary-teal/60 hover:text-primary-teal uppercase tracking-widest">{t('booking.resend_otp')}</button>
                          </div>
                          <SegmentedOTPInput
                            value={regOtp}
                            onChange={(val) => {
                              setRegOtp(val);
                              if (errors.otp) setErrors(prev => { const n = { ...prev }; delete n.otp; return n; });
                            }}
                            error={errors.otp}
                          />
                        </motion.div>
                      )}

                      {/* reCAPTCHA */}
                      {!showRegOtpField && (
                        <div className="flex justify-center mt-4">
                          <ReCAPTCHA
                            ref={regCaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(token) => setRegCaptchaToken(token)}
                            onExpired={() => setRegCaptchaToken(null)}
                            theme="light"
                            size="normal"
                          />
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={!isPhoneValid || (showRegOtpField && regOtp.length < 6) || (!showRegOtpField && !regCaptchaToken) || isSubmitting}
                        className={`w-full py-5 bg-[#F2D06B] text-[#549E9E] rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-yellow-200/50 flex items-center justify-center gap-4 mt-8 transition-all ${(!isPhoneValid || (showRegOtpField && regOtp.length < 6) || (!showRegOtpField && !regCaptchaToken) || isSubmitting) ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span>{isSubmitting ? t('booking.processing') : (showRegOtpField ? t('booking.verify_continue') : t('booking.get_otp'))}</span>
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Zap size={18} />
                          </motion.div>
                        ) : (
                          <Zap size={18} />
                        )}
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reg-step-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center gap-4 p-4 bg-primary-teal/5 rounded-[30px] mb-8">
                        <div className="w-10 h-10 bg-primary-teal/10 rounded-full flex items-center justify-center text-primary-teal">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('booking.verified_number')}</p>
                          <p className="text-sm font-black text-[#549E9E] tracking-widest">+91 {phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="ml-auto text-[10px] font-bold text-primary-teal uppercase tracking-widest hover:underline"
                        >
                          {t('booking.change')}
                        </button>
                      </div>

                      {/* Row 1: Name & Email */}
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.full_name')}</label>
                          <div className="relative">
                            <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-gray-300'}`} />
                            <input
                              type="text"
                              placeholder={t('booking.full_name')}
                              value={regName}
                              onChange={(e) => {
                                setRegName(e.target.value);
                                if (errors.name) setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                              }}
                              className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.name ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                            />
                            {errors.name && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.name}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.email')}</label>
                          <div className="relative">
                            <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-gray-300'}`} />
                            <input
                              type="email"
                              placeholder="your@email.com"
                              value={regEmail}
                              onChange={(e) => {
                                setRegEmail(e.target.value);
                                if (errors.email) setErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                              }}
                              className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.email ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                            />
                            {errors.email && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.email}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Age & Gender */}
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.age')}</label>
                          <input
                            type="number"
                            placeholder={t('booking.age')}
                            value={regAge}
                            onChange={(e) => {
                              setRegAge(e.target.value);
                              if (errors.age) setErrors(prev => { const n = { ...prev }; delete n.age; return n; });
                            }}
                            className={`w-full bg-gray-50 border-none rounded-full py-4 px-6 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.age ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                          />
                          {errors.age && <p className="text-[10px] text-red-500 font-bold mt-2 ml-2 uppercase tracking-widest">{errors.age}</p>}
                        </div>
                        <div className="space-y-0">
                          <CustomSelect
                            label={t('booking.gender')}
                            options={[
                              { id: 'Male', label: 'Male' },
                              { id: 'Female', label: 'Female' },
                              { id: 'Other', label: 'Other' }
                            ]}
                            value={regGender}
                            onChange={(val) => {
                              setRegGender(val);
                              if (errors.gender) setErrors(prev => { const n = { ...prev }; delete n.gender; return n; });
                            }}
                            icon={User}
                          />
                          {errors.gender && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.gender}</p>}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">Address (Optional)</label>
                        <div className="relative">
                          <MapPin size={18} className="absolute left-4 top-4 text-gray-300" />
                          <textarea
                            placeholder="Enter your full address"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-[30px] py-4 pl-12 pr-6 outline-none text-[#6A6A50] font-medium min-h-[100px] focus:ring-2 focus:ring-primary-teal/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Row 4: Passwords */}
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.password')}</label>
                          <div className="relative">
                            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-gray-300'}`} />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder={t('booking.password')}
                              value={regPassword}
                              onChange={(e) => {
                                setRegPassword(e.target.value);
                                if (errors.password) setErrors(prev => { const n = { ...prev }; delete n.password; return n; });
                              }}
                              className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-12 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.password ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-teal transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {errors.password && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.password}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary-teal uppercase tracking-widest pl-4">{t('booking.confirm_password')}</label>
                          <div className="relative">
                            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.confirmPassword ? 'text-red-400' : 'text-gray-300'}`} />
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder={t('booking.confirm_password')}
                              value={regConfirmPassword}
                              onChange={(e) => {
                                setRegConfirmPassword(e.target.value);
                                if (errors.confirmPassword) setErrors(prev => { const n = { ...prev }; delete n.confirmPassword; return n; });
                              }}
                              className={`w-full bg-gray-50 border-none rounded-full py-4 pl-12 pr-12 focus:ring-2 transition-all outline-none text-[#6A6A50] font-medium ${errors.confirmPassword ? 'ring-2 ring-red-100 bg-red-50/30' : 'focus:ring-primary-teal/20'}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-teal transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold mt-2 ml-4 uppercase tracking-widest">{errors.confirmPassword}</p>}
                          </div>
                        </div>
                      </div>

                      {errors.general && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] text-center">
                          <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{errors.general}</p>
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-5 bg-[#F2D06B] text-[#549E9E] rounded-full font-black text-lg uppercase tracking-widest shadow-xl shadow-yellow-200/50 flex items-center justify-center gap-4 mt-8 transition-all ${isSubmitting ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span>{isSubmitting ? t('booking.processing') : t('booking.register_button')}</span>
                        {isSubmitting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <CheckCircle2 size={24} />
                          </motion.div>
                        ) : (
                          <CheckCircle2 size={24} />
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* App Promotion Section */}
      {!isReceptionist && (
        <div className="bg-[#549E9E]/5 py-24 border-t border-[#549E9E]/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-white rounded-[60px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row items-center gap-12 lg:gap-20 p-10 lg:p-20 relative">
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-teal/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/5 rounded-full -ml-32 -mb-32 blur-3xl" />

              <div className="flex-1 space-y-8 relative z-10">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary-teal/10 rounded-full text-primary-teal font-black text-[10px] uppercase tracking-widest">
                  <Smartphone size={14} />
                  <span>{t('booking.app_promo.mobile_app_available')}</span>
                </div>

                <h2 className="text-3xl lg:text-5xl font-black text-[#549E9E] tracking-tight leading-tight">
                  {t('booking.app_promo.title_1')}<br />
                  <span className="text-[#F2D06B]">{t('booking.app_promo.title_2')}</span>
                </h2>

                <p className="text-gray-500 font-medium leading-relaxed max-w-xl">
                  {t('booking.app_promo.description')}
                </p>

                <div className="grid sm:grid-cols-2 gap-6 pt-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary-teal/10 flex items-center justify-center text-primary-teal shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[#549E9E] uppercase tracking-wide">{t('booking.app_promo.features.booking_title')}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{t('booking.app_promo.features.booking_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#F2D06B]/10 flex items-center justify-center text-[#F2D06B] shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[#549E9E] uppercase tracking-wide">{t('booking.app_promo.features.queue_title')}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{t('booking.app_promo.features.queue_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[#549E9E] uppercase tracking-wide">{t('booking.app_promo.features.save_time_title')}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{t('booking.app_promo.features.save_time_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[#549E9E] uppercase tracking-wide">{t('booking.app_promo.features.records_title')}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{t('booking.app_promo.features.records_desc')}</p>
                    </div>
                  </div>
                </div>


              </div>

              <div className="lg:w-1/3 flex flex-col items-center gap-6 relative">
                <div className="relative group">
                  {/* Scanner Frame */}
                  <div className="absolute inset-0 border-2 border-primary-teal rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                  <div className="bg-white p-6 rounded-[40px] shadow-2xl relative z-10 border border-gray-50">
                    <img
                      src="/QR.png"
                      alt="Scan to Download"
                      className="w-48 h-48 lg:w-56 lg:h-56 object-contain"
                    />
                    {/* Scanning Line Animation */}
                    <motion.div
                      animate={{ top: ['10%', '90%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-[10%] right-[10%] h-0.5 bg-primary-teal shadow-[0_0_15px_rgba(84,158,158,0.8)] z-20"
                    />
                    {/* Status Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/80 z-30 rounded-[40px]">
                      <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100">{t('booking.app_promo.under_development')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-2 animate-pulse">{t('booking.app_promo.coming_soon')}</p>
                  <div className="flex justify-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-[#F2D06B]" />
                    <div className="w-1 h-1 rounded-full bg-primary-teal/30" />
                    <div className="w-1 h-1 rounded-full bg-primary-teal/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {(showSuccess || isAppointmentSuccess) && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowSuccess(false); setIsAppointmentSuccess(false); }}
              className="absolute inset-0 bg-[#549E9E]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[50px] shadow-2xl overflow-hidden p-12 text-center"
            >
              <button
                onClick={() => { setShowSuccess(false); setIsAppointmentSuccess(false); }}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>

              <div className="w-24 h-24 bg-primary-teal/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} className="text-primary-teal" />
              </div>

              <h3 className="text-2xl font-black text-[#549E9E] uppercase tracking-tight mb-4">
                {isAppointmentSuccess ? t('booking.booking_confirmed') : t('booking.reg_complete')}
              </h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10">
                {isAppointmentSuccess
                  ? t('booking.booking_success_desc')
                  : t('booking.reg_success_desc')
                }
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowSuccess(false); setIsAppointmentSuccess(false); if (isAppointmentSuccess) navigate('/my-appointments'); }}
                className="w-full py-4 bg-[#549E9E] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-teal/20"
              >
                {isAppointmentSuccess ? t('booking.view_appointments') : t('common.got_it')}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
