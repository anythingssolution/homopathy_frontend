import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ClipboardList,
  Edit2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';

type PreviousPatient = {
  previous_patient_id: number;
  full_name: string;
  patient_id: string | null;
  age: number;
  gender: string;
  mobile_no: string;
  email: string | null;
  address: string | null;
  area_name: string | null;
  ward_no: string | null;
  vidhan_sabha: string | null;
  pincode: string | null;
  city: string | null;
  description: string | null;
  entered_by_user_id: number;
  entered_by_role: string;
  entered_by_name: string | null;
  created_at: string;
};

type ThemeSelectOption = { id: string; label: string };

const ThemeSelect = ({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select',
}: {
  value: string;
  options: ThemeSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) => {
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
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
          isOpen
            ? 'border-[#549E9E] ring-2 ring-[#549E9E]/15 text-slate-800'
            : 'border-slate-200 text-slate-700 hover:border-[#549E9E]'
        }`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#549E9E] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-xl">
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold transition ${
                  isSelected
                    ? 'bg-[#549E9E] text-white'
                    : 'text-slate-600 hover:bg-[#e7f5f4] hover:text-[#2d8789]'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const emptyForm = {
  full_name: '',
  patient_id: '',
  age: '',
  gender: 'other',
  mobile_no: '',
  email: '',
  address: '',
  ward_no: '',
  vidhan_sabha: '',
  pincode: '',
  city: '',
  description: '',
};

export default function PreviousManualPatients() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [patients, setPatients] = useState<PreviousPatient[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingPatient, setEditingPatient] = useState<PreviousPatient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const genderOptions = [
    { id: 'male', label: t('previous_patients.male', 'Male') },
    { id: 'female', label: t('previous_patients.female', 'Female') },
    { id: 'other', label: t('previous_patients.other', 'Other') },
  ];

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/v1/previous-patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to fetch previous patients');
      }

      setPatients(result.data || []);
      setTotal(Number(result.meta?.total || 0));
      setTotalPages(Number(result.meta?.total_pages || 1));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to fetch previous patients');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => {
    const timer = window.setTimeout(fetchPatients, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openForm = () => {
    setForm(emptyForm);
    setEditingPatient(null);
    setFormError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (patient: PreviousPatient) => {
    setForm({
      full_name: patient.full_name || '',
      patient_id: patient.patient_id || '',
      age: patient.age ? String(patient.age) : '',
      gender: patient.gender || 'other',
      mobile_no: patient.mobile_no || '',
      email: patient.email || '',
      address: patient.area_name || patient.address || '',
      ward_no: patient.ward_no || '',
      vidhan_sabha: patient.vidhan_sabha || '',
      pincode: patient.pincode || '',
      city: patient.city || '',
      description: patient.description || '',
    });
    setEditingPatient(patient);
    setFormError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPatient(null);
    setFormError('');
  };

  const savePatient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    const age = Number(form.age);
    if (!form.full_name.trim()) {
      setFormError('Full name is required');
      return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setFormError('Age must be between 1 and 120');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile_no)) {
      setFormError('Mobile number must be exactly 10 digits and start with 6, 7, 8 or 9');
      return;
    }
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      setFormError('Pincode must be exactly 6 digits');
      return;
    }

    setIsSaving(true);
    setFormError('');
    setSuccess('');

    try {
      const response = await fetch(editingPatient ? `/api/v1/previous-patients/${editingPatient.previous_patient_id}` : '/api/v1/previous-patients', {
        method: editingPatient ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          patient_id: form.patient_id.trim() || null,
          age,
          gender: form.gender,
          mobile_no: form.mobile_no,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          ward_no: form.ward_no.trim() || null,
          vidhan_sabha: form.vidhan_sabha.trim() || null,
          pincode: form.pincode.trim() || null,
          city: form.city.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to save previous patient');
      }

      setSuccess(editingPatient ? 'Previous patient updated successfully' : 'Previous patient recorded successfully');
      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingPatient(null);
      setFormError('');
      await fetchPatients();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error ? saveError.message : 'Unable to save previous patient',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d7ebea] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#549E9E]">
              {t('previous_patients.eyebrow', 'Legacy Records')}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {t('previous_patients.title', 'Previous Patients')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              {t(
                'previous_patients.subtitle',
                'Enter patients handled manually before this software. Mobile numbers must be unique across the system.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-[#e7f5f4] px-5 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
                {t('previous_patients.total', 'Records')}
              </p>
              <p className="mt-1 text-3xl font-black text-slate-900">{total}</p>
            </div>
            <button
              type="button"
              onClick={openForm}
              className="flex h-12 items-center gap-2 rounded-2xl bg-[#549E9E] px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#397f80]"
            >
              <Plus size={16} />
              {t('previous_patients.add', 'Add Previous Patient')}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'previous_patients.search_placeholder',
                'Search name, patient ID, mobile or email',
              )}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#549E9E]"
            />
          </div>
          <button
            type="button"
            onClick={fetchPatients}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-xs font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E] hover:text-[#2d8789]"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-5">Patient</th>
                <th className="px-6 py-5">Patient ID</th>
                <th className="px-6 py-5">Mobile</th>
                <th className="px-6 py-5">Gender / Age</th>
                <th className="px-6 py-5">Entered By</th>
                <th className="px-6 py-5">Entered At</th>
                <th className="px-6 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto animate-spin text-[#549E9E]" size={28} />
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm font-bold text-slate-400">
                    No previous patients found
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.previous_patient_id} className="transition hover:bg-[#f7fbfb]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f5f4] text-[#2d8789]">
                          <UserRound size={18} />
                        </span>
                        <div>
                          <p className="font-black text-slate-900">{patient.full_name}</p>
                          {(patient.email || patient.address) && (
                            <p className="mt-1 max-w-xs truncate text-xs font-semibold text-slate-400">
                              {patient.email || patient.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-700">
                      {patient.patient_id || '—'}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-700">{patient.mobile_no}</td>
                    <td className="px-6 py-5 text-sm font-bold capitalize text-slate-700">
                      {patient.gender} / {patient.age}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-slate-800">
                        {patient.entered_by_name || 'Staff'}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {patient.entered_by_role}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                      {formatDateTime(patient.created_at)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => openEditForm(patient)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                        title="Edit previous patient"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4">
          <form
            onSubmit={savePatient}
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
          >
            <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#549E9E]">
                    Manual Entry
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                    {editingPatient ? 'Edit Previous Patient' : 'Add Previous Patient'}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                    {editingPatient
                      ? 'Update corrected patient details. Mobile and patient ID cannot belong to another patient.'
                      : 'Same address details as patient registration. Existing mobile numbers are linked automatically.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl bg-slate-100 p-2 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="grid gap-3 px-5 py-4 sm:grid-cols-6 sm:gap-4 sm:px-7 sm:py-5">
              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Full Name *
                </span>
                <input
                  required
                  maxLength={100}
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Patient ID
                </span>
                <input
                  maxLength={50}
                  value={form.patient_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      patient_id: event.target.value.trimStart().slice(0, 50),
                    }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                  placeholder="Legacy / manual patient ID"
                />
              </label>

              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Mobile Number *
                </span>
                <input
                  required
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  title="Enter a 10-digit mobile number starting with 6, 7, 8 or 9"
                  value={form.mobile_no}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mobile_no: event.target.value.replace(/\D/g, '').slice(0, 10),
                    }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                  placeholder="10 digits, starts with 6-9"
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Age *
                </span>
                <input
                  required
                  inputMode="numeric"
                  value={form.age}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      age: event.target.value.replace(/\D/g, '').slice(0, 3),
                    }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Gender *
                </span>
                <div className="mt-1.5">
                  <ThemeSelect
                    value={form.gender}
                    onChange={(gender) => setForm((current) => ({ ...current, gender }))}
                    options={genderOptions}
                  />
                </div>
              </label>

              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Area / Mohalla / Colony
                </span>
                <input
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ward No
                </span>
                <input
                  value={form.ward_no}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ward_no: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Vidhan Sabha
                </span>
                <input
                  value={form.vidhan_sabha}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vidhan_sabha: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Pincode
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pincode: event.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  City
                </span>
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block sm:col-span-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Description / Notes
                </span>
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                  placeholder="Optional notes"
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <ClipboardList size={14} />
                {editingPatient ? 'Correction is saved with your staff account' : 'Entry is logged with your staff account'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex min-w-36 items-center justify-center gap-2 rounded-2xl bg-[#549E9E] px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
                >
                  {isSaving && <Loader2 size={15} className="animate-spin" />}
                  {editingPatient ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
