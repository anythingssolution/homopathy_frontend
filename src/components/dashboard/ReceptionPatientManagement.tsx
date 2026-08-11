import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';

type FamilyMember = {
  family_member_id: number;
  fk_primary_patient_id?: number;
  full_name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | string;
  relationship: string;
  description?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

type Patient = {
  patient_id: number;
  patient_uuid: string;
  full_name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile_no: string;
  total_appointments: number;
  last_appointment_date: string | null;
  updated_at: string;
  active_family_members?: number;
  family_members?: FamilyMember[];
};

type AuditEntry = {
  id: number;
  changed_by_name: string | null;
  changed_by_role: string | null;
  changed_fields: string[];
  old_values: Record<string, string | null>;
  new_values: Record<string, string | null>;
  created_at: string;
};

type EditTarget =
  | { type: 'SELF'; patient: Patient }
  | { type: 'FAMILY_MEMBER'; patient: Patient; member: FamilyMember };

type ThemeSelectOption = {
  id: string;
  label: string;
};

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
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-bold outline-none transition ${
          isOpen
            ? 'border-[#549E9E] ring-2 ring-[#549E9E]/15 text-slate-800'
            : 'border-slate-200 text-slate-700 hover:border-[#549E9E]'
        }`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#549E9E] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
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
                {isSelected && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(new Date(value));
};

const formatFieldName = (field: string) =>
  field
    .replace(/^family_member\./, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function ReceptionPatientManagement() {
  const { token, branchScope } = useAuth();
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [hasFamilyOnly, setHasFamilyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    mobile_no: '',
    gender: 'other',
    age: '',
    relationship: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<number>>(new Set());

  const fetchPatients = useCallback(async () => {
    if (!token || !branchScope?.selected_branch_id) return;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (gender) params.set('gender', gender);
      if (hasFamilyOnly) params.set('has_family', '1');

      const response = await fetch(`/api/v1/receptionist/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to fetch patients');
      }

      setPatients(result.data || []);
      setTotal(Number(result.meta?.total || 0));
      setTotalPages(Number(result.meta?.total_pages || 1));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to fetch patients');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [branchScope?.selected_branch_id, gender, hasFamilyOnly, page, search, token]);

  useEffect(() => {
    const timer = window.setTimeout(fetchPatients, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    setPage(1);
  }, [search, gender, hasFamilyOnly, branchScope?.selected_branch_id]);

  useEffect(() => {
    setExpandedPatientIds(new Set());
  }, [page, search, gender, hasFamilyOnly, branchScope?.selected_branch_id]);

  const toggleFamilyMembers = (patientId: number) => {
    setExpandedPatientIds((current) => {
      const next = new Set(current);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const openEditPatient = (patient: Patient) => {
    setEditTarget({ type: 'SELF', patient });
    setEditForm({
      full_name: patient.full_name,
      mobile_no: patient.mobile_no,
      gender: patient.gender,
      age: String(patient.age || ''),
      relationship: '',
    });
    setError('');
  };

  const openEditFamilyMember = (patient: Patient, member: FamilyMember) => {
    setEditTarget({ type: 'FAMILY_MEMBER', patient, member });
    setEditForm({
      full_name: member.full_name,
      mobile_no: patient.mobile_no,
      gender: String(member.gender || 'other').toLowerCase(),
      age: String(member.age || ''),
      relationship: member.relationship || '',
    });
    setError('');
  };

  const savePatient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget || !token) return;

    setIsSaving(true);
    setError('');

    try {
      const isFamily = editTarget.type === 'FAMILY_MEMBER';
      const payload: Record<string, string | number> = {
        full_name: editForm.full_name.trim(),
        gender: editForm.gender,
      };

      if (isFamily) {
        const parsedAge = Number(editForm.age);
        if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
          throw new Error('Age must be between 1 and 120');
        }
        if (!editForm.relationship.trim()) {
          throw new Error('Relationship is required for family members');
        }

        payload.family_member_id = editTarget.member.family_member_id;
        payload.age = parsedAge;
        payload.relationship = editForm.relationship.trim();
      } else {
        payload.mobile_no = editForm.mobile_no;
      }

      const response = await fetch(
        `/api/v1/receptionist/patients/${editTarget.patient.patient_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isFamily ? 'Unable to update family member' : 'Unable to update patient'),
        );
      }

      setEditTarget(null);
      await fetchPatients();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update patient');
    } finally {
      setIsSaving(false);
    }
  };

  const openHistory = async (patient: Patient) => {
    if (!token) return;

    setHistoryPatient(patient);
    setHistory([]);
    setIsHistoryLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/v1/receptionist/patients/${patient.patient_id}/update-history`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to fetch update history');
      }

      setHistory(result.data || []);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to fetch update history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const isEditingFamily = editTarget?.type === 'FAMILY_MEMBER';

  const genderFilterOptions = [
    { id: '', label: t('reception_patients.all_genders', 'All genders') },
    { id: 'male', label: t('reception_patients.male', 'Male') },
    { id: 'female', label: t('reception_patients.female', 'Female') },
    { id: 'other', label: t('reception_patients.other', 'Other') },
  ];

  const genderEditOptions = [
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d7ebea] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#549E9E]">
              {t('reception_patients.eyebrow', 'Reception Desk')}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {t('reception_patients.title', 'Patient Management')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              {t(
                'reception_patients.subtitle',
                'Update patient and family member details. Family members share the account contact number.',
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-[#e7f5f4] px-5 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              {t('reception_patients.total', 'Patients')}
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900">{total}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'reception_patients.search_placeholder',
                'Search name, mobile number or patient ID',
              )}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#549E9E]"
            />
          </div>

          <ThemeSelect
            value={gender}
            onChange={setGender}
            options={genderFilterOptions}
            className="min-w-[180px]"
            placeholder={t('reception_patients.all_genders', 'All genders')}
          />

          <button
            type="button"
            onClick={() => setHasFamilyOnly((current) => !current)}
            aria-pressed={hasFamilyOnly}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-xs font-black uppercase tracking-wider transition ${
              hasFamilyOnly
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700'
            }`}
          >
            <Users size={16} />
            {t('reception_patients.with_family', 'With Family')}
            {hasFamilyOnly && (
              <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                On
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={fetchPatients}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-xs font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E] hover:text-[#2d8789]"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('reception_patients.refresh', 'Refresh')}
          </button>
        </div>

        {hasFamilyOnly && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-sky-700">
              <Users size={13} />
              Showing patients with family members
              <button
                type="button"
                onClick={() => setHasFamilyOnly(false)}
                className="ml-1 rounded-full p-0.5 text-sky-600 hover:bg-sky-100"
                aria-label="Clear family filter"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-5">Patient</th>
                <th className="px-6 py-5">Mobile</th>
                <th className="px-6 py-5">Gender / Age</th>
                <th className="px-6 py-5">Appointments</th>
                <th className="px-6 py-5">Last Visit</th>
                <th className="px-6 py-5 text-right">Actions</th>
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
                    {t('reception_patients.no_patients', 'No patients found')}
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const familyMembers = patient.family_members || [];
                  const isExpanded = expandedPatientIds.has(patient.patient_id);

                  return (
                    <React.Fragment key={patient.patient_id}>
                      <tr className="transition hover:bg-[#f7fbfb]">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f5f4] text-[#2d8789]">
                              <UserRound size={18} />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-slate-900">{patient.full_name}</p>
                                {familyMembers.length > 0 && (
                                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
                                    {familyMembers.length} family
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {patient.patient_uuid}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-700">{patient.mobile_no}</td>
                        <td className="px-6 py-5 text-sm font-bold capitalize text-slate-700">
                          {patient.gender} / {patient.age}
                        </td>
                        <td className="px-6 py-5 text-sm font-black text-slate-700">
                          {Number(patient.total_appointments || 0)}
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                          {formatDate(patient.last_appointment_date)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                            {familyMembers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleFamilyMembers(patient.patient_id)}
                                aria-expanded={isExpanded}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                                  isExpanded
                                    ? 'border-sky-300 bg-sky-50 text-sky-700'
                                    : 'border-slate-200 text-slate-600 hover:border-sky-200 hover:text-sky-700'
                                }`}
                              >
                                <Users size={14} />
                                Family
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openHistory(patient)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E] hover:text-[#2d8789]"
                            >
                              <History size={14} />
                              History
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditPatient(patient)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#549E9E] px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#397f80]"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded &&
                        familyMembers.map((member) => (
                          <tr
                            key={`${patient.patient_id}-fm-${member.family_member_id}`}
                            className="bg-slate-100/90"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3 border-l-4 border-orange-400 pl-5 sm:pl-8">
                                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                                  <Users size={16} />
                                </span>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-bold text-slate-800">{member.full_name}</p>
                                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
                                      {member.relationship}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-orange-500">
                                    Family of {patient.full_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                              {patient.mobile_no}
                              <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-orange-500/80">
                                Shared contact
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold capitalize text-slate-700">
                              {member.gender} / {member.age}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-400">—</td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-400">—</td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openEditFamilyMember(patient, member)}
                                  className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-orange-700 hover:bg-orange-50"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={savePatient}
            className="w-full max-w-3xl rounded-[28px] border border-white/20 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#549E9E]">
                  {isEditingFamily
                    ? editTarget.member.relationship
                    : editTarget.patient.patient_uuid}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {isEditingFamily ? 'Edit Family Member' : 'Edit Patient'}
                </h2>
                {isEditingFamily && (
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Account: {editTarget.patient.full_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Full Name
                </span>
                <input
                  required
                  maxLength={100}
                  value={editForm.full_name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Mobile Number
                </span>
                <input
                  required={!isEditingFamily}
                  disabled={isEditingFamily}
                  inputMode="numeric"
                  pattern="[0-9]{10,15}"
                  value={editForm.mobile_no}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      mobile_no: event.target.value.replace(/\D/g, '').slice(0, 15),
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
                {isEditingFamily && (
                  <span className="mt-2 block text-xs font-semibold text-slate-400">
                    Shared with the primary patient account and cannot be changed here.
                  </span>
                )}
              </label>

              {isEditingFamily && (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Relationship
                  </span>
                  <input
                    required
                    maxLength={50}
                    value={editForm.relationship}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        relationship: event.target.value,
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                  />
                </label>
              )}

              {isEditingFamily && (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Age
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    min={1}
                    max={120}
                    value={editForm.age}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        age: event.target.value.replace(/\D/g, '').slice(0, 3),
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Gender
                </span>
                <div className="mt-2">
                  <ThemeSelect
                    value={editForm.gender}
                    onChange={(nextGender) =>
                      setEditForm((current) => ({ ...current, gender: nextGender }))
                    }
                    options={genderEditOptions}
                  />
                </div>
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {historyPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6 sm:p-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#549E9E]">
                  Audit History
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{historyPatient.full_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPatient(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6 sm:p-8">
              {isHistoryLoading ? (
                <Loader2 className="mx-auto animate-spin text-[#549E9E]" size={28} />
              ) : history.length === 0 ? (
                <p className="py-10 text-center text-sm font-bold text-slate-400">
                  No update history found
                </p>
              ) : (
                history.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-black text-slate-800">
                        {entry.changed_by_name || 'System'}{' '}
                        <span className="text-xs text-slate-400">({entry.changed_by_role || 'N/A'})</span>
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        {formatDate(entry.created_at, true)}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {entry.changed_fields.map((field) => (
                        <div
                          key={field}
                          className="grid gap-1 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-[140px_1fr]"
                        >
                          <span className="font-black text-slate-500">{formatFieldName(field)}</span>
                          <span className="font-semibold text-slate-700">
                            <span className="text-red-500 line-through">
                              {entry.old_values[field.replace(/^family_member\./, '')] ||
                                entry.old_values[field] ||
                                '—'}
                            </span>
                            <span className="mx-2 text-slate-300">→</span>
                            <span className="text-emerald-700">
                              {entry.new_values[field.replace(/^family_member\./, '')] ||
                                entry.new_values[field] ||
                                '—'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
