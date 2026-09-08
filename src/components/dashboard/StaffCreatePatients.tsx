import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  KeyRound,
  Loader2,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';
import CustomDatePicker from '../CustomDatePicker';

type StaffPatient = {
  patient_id: number;
  patient_uuid: string;
  full_name: string;
  age: number;
  gender: string;
  mobile_no: string;
  created_at: string;
  created_by_user_id: number | null;
  created_by_name: string | null;
  created_by_role: string;
};

type ThemeSelectOption = { id: string; label: string };

const todayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTime = (value: string, locale: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const roleTagClass = (role: string) => {
  switch (String(role || '').toUpperCase()) {
    case 'DOC':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'REC':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'MED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'SELF':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-[#e7f5f4] text-[#2d8789] border-[#cfe8e7]';
  }
};

const ThemeSelect = ({
  value,
  options,
  onChange,
  className = '',
  placeholder,
  disabled = false,
}: {
  value: string;
  options: ThemeSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const selectPlaceholder = placeholder || t('staff_patients.select', 'Select');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left text-sm font-bold outline-none transition ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
            : isOpen
            ? 'border-[#549E9E] bg-white ring-2 ring-[#549E9E]/15 text-slate-800'
            : 'border-slate-200 bg-white text-slate-700 hover:border-[#549E9E]'
        }`}
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected?.label || selectPlaceholder}</span>
        <ChevronDown size={16} className={`text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold hover:bg-[#f7fbfb] ${
                option.id === value ? 'text-[#2d8789]' : 'text-slate-700'
              }`}
            >
              {option.label}
              {option.id === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function StaffCreatePatients() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';
  const defaultDate = useMemo(() => todayIsoDate(), []);

  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [search, setSearch] = useState('');
  const [createdFrom, setCreatedFrom] = useState(defaultDate);
  const [createdTo, setCreatedTo] = useState(defaultDate);
  const [createdByRole, setCreatedByRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [listNonce, setListNonce] = useState(0);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    mobile_no: '',
    age: '',
    gender: 'other',
  });

  const genderOptions = [
    { id: 'male', label: t('staff_patients.male', 'Male') },
    { id: 'female', label: t('staff_patients.female', 'Female') },
    { id: 'other', label: t('staff_patients.other', 'Other') },
  ];

  const pageSizeOptions = [
    { id: '10', label: t('staff_patients.per_page', { count: 10 }) },
    { id: '20', label: t('staff_patients.per_page', { count: 20 }) },
    { id: '50', label: t('staff_patients.per_page', { count: 50 }) },
  ];

  const creatorFilterOptions = [
    { id: 'ALL', label: t('staff_patients.filter_all', 'All creators') },
    { id: 'DOC', label: t('staff_patients.role_doctor', 'Doctor') },
    { id: 'REC', label: t('staff_patients.role_receptionist', 'Receptionist') },
    { id: 'MED', label: t('staff_patients.role_medical', 'Medical') },
    { id: 'SELF', label: t('staff_patients.role_self', 'Self registered') },
  ];

  const creatorRoleLabel = (role: string) => {
    switch (String(role || '').toUpperCase()) {
      case 'DOC':
        return t('staff_patients.role_doctor', 'Doctor');
      case 'REC':
        return t('staff_patients.role_receptionist', 'Receptionist');
      case 'MED':
        return t('staff_patients.role_medical', 'Medical');
      case 'SELF':
        return t('staff_patients.role_self', 'Self registered');
      default:
        return t('staff_patients.role_staff', 'Staff');
    }
  };

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search.trim()) params.set('search', search.trim());
      if (createdFrom && createdFrom !== 'all') params.set('created_from', createdFrom);
      if (createdTo && createdTo !== 'all') params.set('created_to', createdTo);
      if (createdByRole && createdByRole !== 'ALL') params.set('created_by_role', createdByRole);

      const response = await fetch(`/api/v1/staff-patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('staff_patients.error_fetch'));
      }

      setPatients(result.data || []);
      setTotal(Number(result.meta?.total || 0));
      setTotalPages(Number(result.meta?.total_pages || 1));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t('staff_patients.error_fetch'));
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [createdByRole, createdFrom, createdTo, listNonce, page, pageSize, search, t, token]);

  useEffect(() => {
    const timer = window.setTimeout(fetchPatients, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    setPage(1);
  }, [search, createdFrom, createdTo, createdByRole, pageSize]);

  const isPhoneValid = /^[6-9]\d{9}$/.test(form.mobile_no);

  const resetMobileVerification = () => {
    setOtp('');
    setOtpSessionToken('');
    setRegistrationToken('');
    setOtpSent(false);
    setMobileVerified(false);
    setDevOtpHint('');
  };

  const sendOtp = async () => {
    if (!isPhoneValid) {
      setFormError(t('staff_patients.error_mobile'));
      return;
    }

    setIsOtpSending(true);
    setFormError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/auth/register/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_no: form.mobile_no }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('staff_patients.error_otp_send'));
      }

      setOtpSessionToken(result.data?.otp_session_token || '');
      setOtpSent(true);
      setOtp('');
      setRegistrationToken('');
      setMobileVerified(false);
      setDevOtpHint(result.data?.default_otp ? String(result.data.default_otp) : '');
      setSuccess(t('staff_patients.otp_sent'));
    } catch (sendError) {
      setFormError(sendError instanceof Error ? sendError.message : t('staff_patients.error_otp_send'));
    } finally {
      setIsOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpSessionToken || otp.trim().length < 4) {
      setFormError(t('staff_patients.error_otp'));
      return;
    }

    setIsOtpVerifying(true);
    setFormError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/auth/register/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_no: form.mobile_no,
          otp: otp.trim(),
          otp_session_token: otpSessionToken,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('staff_patients.error_otp_verify'));
      }

      setRegistrationToken(result.data?.registration_token || '');
      setMobileVerified(true);
      setSuccess(t('staff_patients.otp_verified'));
    } catch (verifyError) {
      setFormError(verifyError instanceof Error ? verifyError.message : t('staff_patients.error_otp_verify'));
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const createPatient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    if (!mobileVerified || !registrationToken) {
      setFormError(t('staff_patients.error_verify_first'));
      return;
    }

    const age = Number(form.age);
    if (!form.full_name.trim()) {
      setFormError(t('staff_patients.error_name'));
      return;
    }
    if (!isPhoneValid) {
      setFormError(t('staff_patients.error_mobile'));
      return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setFormError(t('staff_patients.error_age'));
      return;
    }

    setIsSaving(true);
    setFormError('');
    setSuccess('');
    setError('');

    try {
      const response = await fetch('/api/v1/staff-patients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          mobile_no: form.mobile_no.trim(),
          age,
          gender: form.gender,
          registration_token: registrationToken,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('staff_patients.error_save'));
      }

      const createdUuid = result.data?.patient_uuid || '';
      setSuccess(
        createdUuid
          ? t('staff_patients.success_create_id', { id: createdUuid })
          : t('staff_patients.success_create'),
      );
      setForm({ full_name: '', mobile_no: '', age: '', gender: 'other' });
      resetMobileVerification();
      setCreatedFrom(todayIsoDate());
      setCreatedTo(todayIsoDate());
      setCreatedByRole('ALL');
      setPage(1);
      setListNonce((current) => current + 1);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t('staff_patients.error_save'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d7ebea] bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#549E9E]">
            {t('staff_patients.eyebrow', 'Staff Desk')}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            {t('staff_patients.title', 'Create Patient')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
            {t(
              'staff_patients.subtitle',
              'First verify the mobile number with OTP. If it is already registered, the patient will not be created again. Then enter details and create the ID.',
            )}
          </p>
        </div>

        <form onSubmit={createPatient} className="mt-6 space-y-5">
          <div className={`grid grid-cols-1 gap-4 ${otpSent ? 'lg:grid-cols-2' : 'lg:max-w-xl'} items-start`}>
            <div>
              <label className="mb-2 block h-4 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                {t('staff_patients.mobile', 'Mobile *')}
              </label>
              <div className="flex h-11 items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.mobile_no}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, mobile_no: event.target.value.replace(/\D/g, '').slice(0, 10) }));
                      resetMobileVerification();
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    disabled={mobileVerified}
                    className="h-11 w-full rounded-xl border border-slate-200 py-0 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#549E9E] disabled:bg-slate-50"
                    placeholder={t('staff_patients.mobile_placeholder', '10 digits starting with 6-9')}
                  />
                </div>
                {!mobileVerified ? (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={!isPhoneValid || isOtpSending}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#549E9E] px-4 text-[11px] font-black uppercase tracking-wider text-white hover:bg-[#397f80] disabled:opacity-60"
                  >
                    {isOtpSending ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                    {otpSent ? t('staff_patients.resend_otp', 'Resend OTP') : t('staff_patients.send_otp', 'Send OTP')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, full_name: '', age: '', gender: 'other' }));
                      resetMobileVerification();
                    }}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E]"
                  >
                    {t('staff_patients.change_number', 'Change number')}
                  </button>
                )}
              </div>
              <p className="mt-2 min-h-5 text-xs font-bold text-red-600">
                {form.mobile_no && !isPhoneValid ? t('staff_patients.error_mobile') : ''}
              </p>
            </div>

            {otpSent && (
              <div>
                <label className="mb-2 block h-4 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                  {t('staff_patients.otp', 'OTP *')}
                </label>
                <div className="flex h-11 items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      disabled={mobileVerified}
                      className="h-11 w-full rounded-xl border border-slate-200 py-0 pl-10 pr-3 text-sm font-semibold tracking-[0.2em] outline-none focus:border-[#549E9E] disabled:bg-slate-50"
                      placeholder={t('staff_patients.otp_placeholder', '6-digit OTP')}
                    />
                  </div>
                  {mobileVerified ? (
                    <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                      <ShieldCheck size={14} />
                      {t('staff_patients.otp_verified_short', 'Verified')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={otp.length < 4 || isOtpVerifying}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2d8789] px-4 text-[11px] font-black uppercase tracking-wider text-white hover:bg-[#246e70] disabled:opacity-60"
                    >
                      {isOtpVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {t('staff_patients.verify_otp', 'Verify OTP')}
                    </button>
                  )}
                </div>
                <p className="mt-2 min-h-5 text-xs font-bold text-amber-700">
                  {devOtpHint && !mobileVerified ? t('staff_patients.dev_otp_hint', { otp: devOtpHint }) : ''}
                </p>
              </div>
            )}
          </div>

          {otpSent && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_140px_180px] md:items-start">
                <div>
                  <label className="mb-2 block h-4 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                    {t('staff_patients.full_name', 'Full Name *')}
                  </label>
                  <input
                    value={form.full_name}
                    onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    disabled={!mobileVerified}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#549E9E] disabled:bg-slate-50"
                    placeholder={t('staff_patients.name_placeholder', 'Patient full name')}
                  />
                </div>
                <div>
                  <label className="mb-2 block h-4 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                    {t('staff_patients.age', 'Age *')}
                  </label>
                  <input
                    value={form.age}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, age: event.target.value.replace(/\D/g, '') }))
                    }
                    inputMode="numeric"
                    disabled={!mobileVerified}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-[#549E9E] disabled:bg-slate-50"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="mb-2 block h-4 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                    {t('staff_patients.gender', 'Gender *')}
                  </label>
                  <ThemeSelect
                    value={form.gender}
                    options={genderOptions}
                    onChange={(value) => setForm((current) => ({ ...current, gender: value }))}
                    disabled={!mobileVerified}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !mobileVerified}
                  className="inline-flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-[#549E9E] px-6 text-[11px] font-black uppercase tracking-wider text-white hover:bg-[#397f80] disabled:opacity-60"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {t('staff_patients.create', 'Create Patient')}
                </button>
                <p className="text-center text-xs font-semibold text-slate-400">
                  {t('staff_patients.footer_create', 'This record is tagged with your staff account.')}
                </p>
              </div>
            </>
          )}
        </form>

        {formError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {formError}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#549E9E]">
            <UserPlus size={18} />
            <h2 className="text-lg font-black text-slate-900">
              {t('staff_patients.list_title', 'Created patients')}
            </h2>
          </div>
          <div className="rounded-xl bg-[#e7f5f4] px-4 py-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              {t('staff_patients.total', 'In filter')}
            </p>
            <p className="text-xl font-black text-slate-900">{total}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('staff_patients.search_placeholder', 'Search name, mobile or patient ID')}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#549E9E]"
            />
          </div>
          <div className="w-full sm:w-[180px] [&>div]:w-full [&>div>div:first-of-type]:h-11 [&>div>div:first-of-type]:box-border [&>div>div:first-of-type]:py-0">
            <CustomDatePicker
              label=""
              value={createdFrom || 'all'}
              onChange={(date) => setCreatedFrom(date === 'all' ? '' : date)}
              placeholder={t('staff_patients.created_from', 'Created from')}
            />
          </div>
          <div className="w-full sm:w-[180px] [&>div]:w-full [&>div>div:first-of-type]:h-11 [&>div>div:first-of-type]:box-border [&>div>div:first-of-type]:py-0">
            <CustomDatePicker
              label=""
              value={createdTo || 'all'}
              onChange={(date) => setCreatedTo(date === 'all' ? '' : date)}
              placeholder={t('staff_patients.created_to', 'Created to')}
              minDate={createdFrom || undefined}
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <ThemeSelect value={createdByRole} options={creatorFilterOptions} onChange={setCreatedByRole} />
          </div>
          <div className="w-full sm:w-[140px]">
            <ThemeSelect
              value={String(pageSize)}
              options={pageSizeOptions}
              onChange={(value) => setPageSize(Number(value))}
            />
          </div>
          <button
            type="button"
            onClick={fetchPatients}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E] hover:text-[#2d8789]"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('staff_patients.refresh', 'Refresh')}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-5">{t('staff_patients.col_patient', 'Patient')}</th>
                  <th className="px-6 py-5">{t('staff_patients.col_patient_id', 'Patient ID')}</th>
                  <th className="px-6 py-5">{t('staff_patients.col_mobile', 'Mobile')}</th>
                  <th className="px-6 py-5">{t('staff_patients.col_gender_age', 'Gender / Age')}</th>
                  <th className="px-6 py-5">{t('staff_patients.col_created_by', 'Created by')}</th>
                  <th className="px-6 py-5">{t('staff_patients.col_created_on', 'Created on')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2 className="mx-auto animate-spin text-[#549E9E]" size={28} />
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-bold text-slate-400">
                      {t('staff_patients.empty', 'No patients found for this filter')}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.patient_id} className="transition hover:bg-[#f7fbfb]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f5f4] text-[#2d8789]">
                            <UserRound size={18} />
                          </span>
                          <p className="font-black text-slate-900">{patient.full_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-700">{patient.patient_uuid}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-700">{patient.mobile_no}</td>
                      <td className="px-6 py-5 text-sm font-bold capitalize text-slate-700">
                        {patient.gender} / {patient.age}
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-800">
                          {patient.created_by_name || t('staff_patients.role_self', 'Self registered')}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${roleTagClass(patient.created_by_role)}`}
                        >
                          {creatorRoleLabel(patient.created_by_role)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                        {formatDateTime(patient.created_at, dateLocale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            alwaysShow
            totalItems={total}
            pageSize={pageSize}
          />
        </div>
      </section>
    </div>
  );
}
