import React, { useCallback, useEffect, useState } from 'react';
import {
  History,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';

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
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function ReceptionPatientManagement() {
  const { token, branchScope } = useAuth();
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    mobile_no: '',
    gender: 'other',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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
  }, [branchScope?.selected_branch_id, gender, page, search, token]);

  useEffect(() => {
    const timer = window.setTimeout(fetchPatients, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    setPage(1);
  }, [search, gender, branchScope?.selected_branch_id]);

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm({
      full_name: patient.full_name,
      mobile_no: patient.mobile_no,
      gender: patient.gender,
    });
    setError('');
  };

  const savePatient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPatient || !token) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/receptionist/patients/${editingPatient.patient_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to update patient');
      }

      setEditingPatient(null);
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
            <p className="mt-2 text-sm font-medium text-slate-500">
              {t(
                'reception_patients.subtitle',
                'Update patient name, mobile number and gender with a complete audit history.',
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-[#eef8f7] px-5 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              {t('reception_patients.total', 'Patients')}
            </p>
            <p className="text-2xl font-black text-slate-900">{total}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'reception_patients.search_placeholder',
                'Search name, mobile number or patient ID',
              )}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#549E9E] focus:bg-white"
            />
          </label>

          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-[#549E9E]"
          >
            <option value="">{t('reception_patients.all_genders', 'All genders')}</option>
            <option value="male">{t('reception_patients.male', 'Male')}</option>
            <option value="female">{t('reception_patients.female', 'Female')}</option>
            <option value="other">{t('reception_patients.other', 'Other')}</option>
          </select>

          <button
            type="button"
            onClick={fetchPatients}
            disabled={isLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('reception_patients.refresh', 'Refresh')}
          </button>
        </div>
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
                patients.map((patient) => (
                  <tr key={patient.patient_id} className="transition hover:bg-[#f7fbfb]">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f5f4] text-[#2d8789]">
                          <UserRound size={18} />
                        </span>
                        <div>
                          <p className="font-black text-slate-900">{patient.full_name}</p>
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
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openHistory(patient)}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-[#549E9E] hover:text-[#2d8789]"
                        >
                          <History size={14} />
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(patient)}
                          className="flex items-center gap-2 rounded-xl bg-[#549E9E] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#397f80]"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {editingPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={savePatient}
            className="w-full max-w-lg rounded-[28px] border border-white/20 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#549E9E]">
                  {editingPatient.patient_uuid}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Edit Patient</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-7 space-y-4">
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
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10,15}"
                  value={editForm.mobile_no}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      mobile_no: event.target.value.replace(/\D/g, '').slice(0, 15),
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Gender
                </span>
                <select
                  value={editForm.gender}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, gender: event.target.value }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-[#549E9E]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
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
                          className="grid gap-1 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-[120px_1fr]"
                        >
                          <span className="font-black text-slate-500">{formatFieldName(field)}</span>
                          <span className="font-semibold text-slate-700">
                            <span className="text-red-500 line-through">
                              {entry.old_values[field] || '—'}
                            </span>
                            <span className="mx-2 text-slate-300">→</span>
                            <span className="text-emerald-700">{entry.new_values[field] || '—'}</span>
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
