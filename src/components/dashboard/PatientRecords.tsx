import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronDown,
  Download,
  FileText,
  Printer,
  RefreshCcw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import CustomDatePicker from "../CustomDatePicker";
import Pagination from "../Pagination";
import PrescriptionPrint from "../PrescriptionPrint";
import AllVisitsPrint from "../AllVisitsPrint";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 12;

const HISTORY_TYPES = [
  { value: "", label: "All visits" },
  { value: "APPOINTMENT", label: "All completed visits" },
  { value: "CONSULTATION", label: "Consultation visits" },
  { value: "PRESCRIPTION", label: "Printable prescription visits" },
  { value: "BILL", label: "Visits with bills" },
  { value: "DOCUMENT", label: "Visits with documents" },
];

type PatientRegistryRow = {
  patient_id: number;
  patient_uuid?: string | null;
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  mobile_no?: string | null;
  ward_no?: string | null;
  vidhan_sabha?: string | null;
  latest_visit_date?: string | null;
  summary?: {
    completed_appointments_count?: number;
    consultations_count?: number;
    prescriptions_count?: number;
    bills_count?: number;
    family_members_count?: number;
  };
};

type FamilyMember = {
  family_member_id: number;
  full_name: string;
  relationship: string;
  age?: number | null;
  gender?: string | null;
  summary?: Record<string, any>;
};

type TimelineItem = {
  timeline_type: string;
  source_id: number | string;
  event_date?: string | null;
  title?: string | null;
  status?: string | null;
  branch_name?: string | null;
  doctor_full_name?: string | null;
  appointment_id?: number | null;
  consultation_id?: number | null;
  bill_id?: number | null;
  document_id?: number | null;
  document_type?: string | null;
  subject?: {
    subject_type?: string | null;
    patient_uuid?: string | null;
    primary_patient_full_name?: string | null;
    primary_patient_mobile_no?: string | null;
    relationship_label?: string | null;
    display_name?: string | null;
  };
  details?: Record<string, any>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "No visit";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (value?: number | string | null) => {
  const size = Number(value || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getTypeBadgeClass = (type: string) => {
  const styles: Record<string, string> = {
    APPOINTMENT: "bg-[#549E9E]/10 text-[#549E9E] border-[#549E9E]/20",
    VISIT: "bg-[#549E9E]/10 text-[#549E9E] border-[#549E9E]/20",
    CONSULTATION: "bg-violet-50 text-violet-600 border-violet-100",
    PRESCRIPTION: "bg-emerald-50 text-emerald-600 border-emerald-100",
    BILL: "bg-amber-50 text-amber-600 border-amber-100",
    DOCUMENT: "bg-sky-50 text-sky-600 border-sky-100",
  };
  return styles[String(type || "").toUpperCase()] || "bg-gray-50 text-gray-600 border-gray-100";
};

const getVisitStatusBadge = (item: TimelineItem, t: any) => {
  if (!item.consultation_id) {
    return { label: t('patient_records.modal.status.no_consultation', 'No consultation'), className: "bg-red-50 text-red-600 border-red-100" };
  }
  if (Number(item.details?.pending_amount || 0) > 0) {
    return { label: t('patient_records.modal.status.bill_pending', 'Bill pending'), className: "bg-amber-50 text-amber-600 border-amber-100" };
  }
  return { label: t('patient_records.modal.status.completed_visit', 'Completed visit'), className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
};

const getReference = (item: TimelineItem) => {
  if (item.details?.auid) return item.details.auid;
  if (item.details?.bill_number) return item.details.bill_number;
  if (item.appointment_id) return `Appointment #${item.appointment_id}`;
  if (item.consultation_id) return `Consultation #${item.consultation_id}`;
  if (item.document_id) return `Document #${item.document_id}`;
  return `#${item.source_id}`;
};

const getSecondaryDetail = (item: TimelineItem) => {
  if (item.timeline_type === "DOCUMENT") {
    return [item.document_type, item.details?.original_filename, formatFileSize(item.details?.file_size)].filter(Boolean).join(" • ");
  }
  if (item.timeline_type === "BILL") {
    return [item.details?.bill_type, item.details?.total_amount ? `₹ ${Number(item.details.total_amount).toFixed(2)}` : null].filter(Boolean).join(" • ");
  }
  if (item.timeline_type === "PRESCRIPTION") {
    return [
      item.details?.medicine_count ? `${item.details.medicine_count} medicines` : null,
      item.details?.test_count ? `${item.details.test_count} tests` : null,
    ].filter(Boolean).join(" • ") || "Saved prescription";
  }
  if (item.timeline_type === "VISIT") {
    return [
      item.details?.treatment_name,
      item.doctor_full_name ? `Dr. ${item.doctor_full_name}` : null,
      item.details?.has_prescription ? "Printable prescription" : null,
      item.details?.bills_count ? `${item.details.bills_count} bill${Number(item.details.bills_count) > 1 ? "s" : ""}` : null,
    ].filter(Boolean).join(" • ");
  }
  return [item.details?.treatment_name, item.details?.slot_name].filter(Boolean).join(" • ");
};

export default function PatientRecords() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [patients, setPatients] = useState<PatientRegistryRow[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const [patientTotalPages, setPatientTotalPages] = useState(1);
  const [patientTotal, setPatientTotal] = useState(0);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ scope: "ALL" | "SELF" | "FAMILY_MEMBER"; familyMemberId?: number; label: string }>({
    scope: "ALL",
    label: "All linked visits",
  });
  const [historyItems, setHistoryItems] = useState<TimelineItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyType, setHistoryType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<number | string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [isPrescriptionLoading, setIsPrescriptionLoading] = useState(false);
  const [printAfterPreviewLoad, setPrintAfterPreviewLoad] = useState(false);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');

  const [selectedAllVisits, setSelectedAllVisits] = useState<{ patient: any; visits: any[] } | null>(null);
  const [isAllVisitsLoading, setIsAllVisitsLoading] = useState(false);
  const [allVisitsLang, setAllVisitsLang] = useState<'en' | 'hi'>('en');
  const [printAfterAllVisitsLoad, setPrintAfterAllVisitsLoad] = useState(false);

  const fetchPatients = useCallback(async (pageNum = patientPage) => {
    if (!token) return;
    setIsRegistryLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (patientSearch.trim()) params.set("patient_search", patientSearch.trim());
      params.set("page", String(pageNum));
      params.set("page_size", String(PAGE_SIZE));

      const response = await fetch(`/api/v1/patient-records/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load patients");
      }

      setPatients(result.data?.items || []);
      setPatientTotal(result.data?.meta?.total || 0);
      setPatientTotalPages(result.data?.meta?.total_pages || 1);
      setPatientPage(result.data?.meta?.page || pageNum);
    } catch (fetchError: any) {
      setError(fetchError.message || "Unable to load patients");
    } finally {
      setIsRegistryLoading(false);
    }
  }, [token, patientSearch, patientPage]);

  const fetchPatientDetail = async (patient: PatientRegistryRow) => {
    if (!token) return;
    setError("");
    setSelectedSubject({ scope: "ALL", label: "All linked visits" });
    setHistoryType("");
    setHistoryPage(1);

    try {
      const response = await fetch(`/api/v1/patient-records/patients/${patient.patient_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load patient detail");
      }
      setSelectedPatient(result.data);
    } catch (detailError: any) {
      setError(detailError.message || "Unable to load patient detail");
    }
  };

  const fetchHistory = useCallback(async (pageNum = historyPage) => {
    if (!token || !selectedPatient?.patient?.patient_id) return;
    setIsHistoryLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (historyType) params.set("timeline_type", historyType);
      if (selectedSubject.scope === "SELF") params.set("subject_scope", "SELF");
      if (selectedSubject.familyMemberId) params.set("family_member_id", String(selectedSubject.familyMemberId));
      params.set("page", String(pageNum));
      params.set("page_size", String(HISTORY_PAGE_SIZE));

      const response = await fetch(`/api/v1/patient-records/patients/${selectedPatient.patient.patient_id}/visits?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load patient history");
      }

      setHistoryItems(result.data?.items || []);
      setExpandedVisitId(null);
      setHistoryTotal(result.data?.meta?.total || 0);
      setHistoryTotalPages(result.data?.meta?.total_pages || 1);
      setHistoryPage(result.data?.meta?.page || pageNum);
    } catch (historyError: any) {
      setError(historyError.message || "Unable to load patient history");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, selectedPatient, selectedSubject, fromDate, toDate, historyType, historyPage]);

  useEffect(() => {
    fetchPatients(patientPage);
  }, [fetchPatients, patientPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPatientPage(1);
      fetchPatients(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    if (selectedPatient) fetchHistory(historyPage);
  }, [selectedPatient, selectedSubject, historyType, fromDate, toDate, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedSubject, historyType, fromDate, toDate]);

  useEffect(() => {
    if (selectedPatient || selectedPrescription || selectedAllVisits) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedPatient, selectedPrescription, selectedAllVisits]);

  const openPrescriptionPreview = async (item: TimelineItem, printAfterLoad = false) => {
    if (!token || !item.consultation_id) return;
    setIsPrescriptionLoading(true);
    setPrintAfterPreviewLoad(printAfterLoad);
    setError("");

    try {
      const roleCode = String(user?.role_code || "").toUpperCase();
      const role = String(user?.role || "").toLowerCase();
      const isReceptionist = roleCode === "REC" || role === "rec" || role === "receptionist";
      const endpoint = isReceptionist
        ? `/api/v1/receptionist/prescriptions/${item.consultation_id}`
        : `/api/v1/medical/prescriptions/${item.consultation_id}`;
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load prescription");
      }
      setSelectedPrescription({ consultation: result.data, appointment: result.data });
    } catch (previewError: any) {
      setPrintAfterPreviewLoad(false);
      setError(previewError.message || "Unable to load prescription");
    } finally {
      setIsPrescriptionLoading(false);
    }
  };

  const openAllVisitsPreview = async (printAfterLoad = false) => {
    if (!token || !selectedPatient?.patient?.patient_id) return;
    setIsAllVisitsLoading(true);
    setPrintAfterAllVisitsLoad(printAfterLoad);
    setError("");

    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (historyType) params.set("timeline_type", historyType);
      if (selectedSubject.scope === "SELF") params.set("subject_scope", "SELF");
      if (selectedSubject.familyMemberId) params.set("family_member_id", String(selectedSubject.familyMemberId));
      params.set("page", "1");
      params.set("page_size", "50");

      const response = await fetch(`/api/v1/patient-records/patients/${selectedPatient.patient.patient_id}/visits?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load visits");
      }

      const items: TimelineItem[] = result.data?.items || [];
      const visitsWithConsultation = items.filter((item: TimelineItem) => Boolean(item.consultation_id));

      if (visitsWithConsultation.length === 0) {
        throw new Error("No consultation prescriptions found for these visits.");
      }

      const roleCode = String(user?.role_code || "").toUpperCase();
      const role = String(user?.role || "").toLowerCase();
      const isReceptionist = roleCode === "REC" || role === "rec" || role === "receptionist";
      const endpointPrefix = isReceptionist ? '/api/v1/receptionist/prescriptions/' : '/api/v1/medical/prescriptions/';

      const fetchedVisits = await Promise.all(
        visitsWithConsultation.map(async (vItem) => {
          try {
            const res = await fetch(`${endpointPrefix}${vItem.consultation_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
              return {
                ...vItem,
                consultation: resData.data,
                appointment: resData.data,
              };
            }
          } catch (e) {
            // fallback
          }
          return {
            ...vItem,
            consultation: {},
            appointment: {},
          };
        })
      );

      setSelectedAllVisits({
        patient: selectedPatient.patient,
        visits: fetchedVisits,
      });
    } catch (err: any) {
      setPrintAfterAllVisitsLoad(false);
      setError(err.message || "Unable to load all visits preview");
    } finally {
      setIsAllVisitsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPrescription || !printAfterPreviewLoad) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintAfterPreviewLoad(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [selectedPrescription, printAfterPreviewLoad]);

  useEffect(() => {
    if (!selectedAllVisits || !printAfterAllVisitsLoad) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintAfterAllVisitsLoad(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [selectedAllVisits, printAfterAllVisitsLoad]);

  const registrySummary = useMemo(() => patients.reduce((acc, patient) => ({
    patients: acc.patients + 1,
    prescriptions: acc.prescriptions + Number(patient.summary?.prescriptions_count || 0),
    family: acc.family + Number(patient.summary?.family_members_count || 0),
  }), { patients: 0, prescriptions: 0, family: 0 }), [patients]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-[#549E9E]">{t('patient_records.category', 'Patient History & Records')}</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('patient_records.title', 'Patient Registry')}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 max-w-3xl">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl shadow-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-slate-800 mb-0.5">{patientTotal}</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('patient_records.stats.total_patients', 'Total patients')}</div>
          </div>
          <div className="bg-[#549E9E]/10 border border-[#549E9E]/25 p-3.5 sm:p-4 rounded-xl shadow-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-[#2d8789] mb-0.5">{registrySummary.patients}</div>
            <div className="text-[9px] font-black text-[#549E9E] uppercase tracking-widest">{t('patient_records.stats.this_page', 'This page')}</div>
          </div>
          <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 sm:p-4 rounded-xl shadow-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-amber-800 mb-0.5">{registrySummary.prescriptions}</div>
            <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{t('patient_records.stats.prescriptions', 'Prescriptions')}</div>
          </div>
          <div className="bg-sky-50/80 border border-sky-200/80 p-3.5 sm:p-4 rounded-xl shadow-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-sky-800 mb-0.5">{registrySummary.family}</div>
            <div className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{t('patient_records.stats.family_members', 'Family members')}</div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6 rounded-xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E]" size={22} />
          <input
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder={t('patient_records.search_placeholder', 'Search primary patient, mobile, patient ID, family member, AUID...')}
            className="w-full border-2 border-gray-50 bg-white py-4 pl-14 pr-6 text-sm font-bold text-gray-600 outline-none transition-all placeholder:text-gray-300 focus:border-[#549E9E]/20 rounded-xl"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchPatients(patientPage)}
          className="inline-flex items-center justify-center gap-3 border-2 border-[#549E9E]/10 bg-[#549E9E]/10 px-6 py-4 text-xs font-black uppercase tracking-widest text-[#549E9E] transition-all hover:bg-[#549E9E] hover:text-white shrink-0 cursor-pointer rounded-xl active:scale-95"
        >
          <RefreshCcw size={16} className={isRegistryLoading ? "animate-spin" : ""} />
          {t('patient_records.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 border border-red-100 bg-red-50 p-5 text-red-600">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
          <button onClick={() => fetchPatients(patientPage)} className="text-xs font-black uppercase tracking-widest underline">Retry</button>
        </div>
      )}

      <div className="relative overflow-hidden border border-gray-200 bg-white shadow-sm">
        {isRegistryLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#549E9E]/20 border-t-[#549E9E]" />
          </div>
        )}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full whitespace-nowrap text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.table.patient', 'Patient')}</th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.table.identity', 'Identity')}</th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.table.summary', 'Summary')}</th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.table.latest_visit', 'Latest visit')}</th>
                <th className="px-5 py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.table.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.length > 0 ? patients.map((patient) => (
                <tr key={patient.patient_id} className="transition-colors hover:bg-[#549E9E]/[0.02]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#549E9E]/10 text-[#549E9E]">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#2d8789]">{patient.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-gray-600">
                    <p>{patient.mobile_no || "No mobile"}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">{[patient.age ? `${patient.age}Y` : null, patient.gender].filter(Boolean).join(" • ") || "No demographics"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-widest">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">{patient.summary?.completed_appointments_count || 0} {t('patient_records.badges.visits', 'visits')}</span>
                      <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-700">{patient.summary?.prescriptions_count || 0} {t('patient_records.badges.rx', 'Rx')}</span>
                      <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">{patient.summary?.family_members_count || 0} {t('patient_records.badges.family', 'family')}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-black text-gray-700">{formatDate(patient.latest_visit_date)}</td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => fetchPatientDetail(patient)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#549E9E] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[#438787] hover:shadow-md">
                      <FileText size={14} /> {t('patient_records.table.open_record', 'Open Record')}
                    </button>
                  </td>
                </tr>
              )) : !isRegistryLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center">
                    <Users size={34} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">No patients found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y divide-gray-100">
          {patients.map((patient) => (
            <button key={patient.patient_id} onClick={() => fetchPatientDetail(patient)} className="block w-full p-4 text-left">
              <p className="text-sm font-black text-[#2d8789]">{patient.full_name}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-widest">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">{patient.summary?.completed_appointments_count || 0} {t('patient_records.badges.visits', 'visits')}</span>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-700">{patient.summary?.prescriptions_count || 0} {t('patient_records.badges.rx', 'Rx')}</span>
                <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">{patient.summary?.family_members_count || 0} {t('patient_records.badges.family', 'family')}</span>
              </div>
              <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#549E9E] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                <FileText size={14} /> {t('patient_records.table.open_record', 'Open Record')}
              </span>
            </button>
          ))}
        </div>
        <Pagination currentPage={patientPage} totalPages={patientTotalPages} onPageChange={setPatientPage} />
      </div>

      {selectedPatient && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 no-print">
          <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">{t('patient_records.modal.primary_patient', 'Primary patient')}</p>
                <h2 className="text-2xl font-black text-gray-900">{selectedPatient.patient.full_name}</h2>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  {selectedPatient.patient.patient_uuid} • {selectedPatient.patient.mobile_no || "No mobile"} • {selectedSubject.scope === "ALL" ? t('patient_records.modal.all_linked_visits', 'All linked visits') : selectedSubject.scope === "SELF" ? t('patient_records.modal.self', 'Self') : selectedSubject.label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isAllVisitsLoading}
                  onClick={() => openAllVisitsPreview(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-emerald-700 disabled:bg-gray-300 active:scale-95 cursor-pointer"
                >
                  <FileText size={16} /> {isAllVisitsLoading ? "Loading..." : "View All Visits"}
                </button>
                <button
                  type="button"
                  disabled={isAllVisitsLoading}
                  onClick={() => openAllVisitsPreview(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:bg-gray-100 active:scale-95 cursor-pointer"
                >
                  <Printer size={16} /> Print All
                </button>
                <button onClick={() => setSelectedPatient(null)} className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-red-50 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5" data-lenis-prevent>
              <div className="mb-4 border-b border-gray-100 pb-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.record_scope', 'Record scope')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSubject({ scope: "ALL", label: t('patient_records.modal.all_linked_visits', 'All linked visits') })}
                    className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSubject.scope === "ALL" ? "border-[#549E9E] bg-[#549E9E] text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-[#549E9E]/40 hover:text-[#549E9E]"}`}
                  >
                    {t('patient_records.modal.primary_plus_family', 'Primary + family')}
                  </button>
                  <button
                    onClick={() => setSelectedSubject({ scope: "SELF", label: t('patient_records.modal.self', 'Self') })}
                    className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSubject.scope === "SELF" ? "border-[#549E9E] bg-[#549E9E] text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-[#549E9E]/40 hover:text-[#549E9E]"}`}
                  >
                    {t('patient_records.modal.self', 'Self')} • {selectedPatient.self?.summary?.completed_appointments_count || 0} {t('patient_records.badges.visits', 'visits')} • {selectedPatient.self?.summary?.prescriptions_count || 0} {t('patient_records.badges.rx', 'Rx')}
                  </button>
                  {selectedPatient.family_members.map((member: FamilyMember) => (
                    <button
                      key={member.family_member_id}
                      onClick={() => setSelectedSubject({ scope: "FAMILY_MEMBER", familyMemberId: member.family_member_id, label: `${member.full_name} (${member.relationship})` })}
                      className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSubject.familyMemberId === member.family_member_id ? "border-[#549E9E] bg-[#549E9E] text-white shadow-sm" : "border-purple-100 bg-purple-50 text-purple-700 hover:border-purple-200"}`}
                    >
                      {member.full_name} • {member.relationship} • {member.summary?.completed_appointments_count || 0} {t('patient_records.badges.visits', 'visits')} • {member.summary?.prescriptions_count || 0} {t('patient_records.badges.rx', 'Rx')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5 grid gap-4 md:grid-cols-4 items-end">
                <div className="space-y-1.5 w-full">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('patient_records.modal.visit_type_label', 'Visit Type')}</label>
                  <select value={historyType} onChange={(event) => setHistoryType(event.target.value)} className="w-full border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-600 outline-none transition-all hover:border-[#549E9E]/50 focus:border-[#549E9E] rounded-xl h-[42px]">
                    <option value="">{t('patient_records.modal.history_types.all_visits', 'All visits')}</option>
                    <option value="APPOINTMENT">{t('patient_records.modal.history_types.all_completed', 'All completed visits')}</option>
                    <option value="CONSULTATION">{t('patient_records.modal.history_types.consultations', 'Consultation visits')}</option>
                    <option value="PRESCRIPTION">{t('patient_records.modal.history_types.prescriptions', 'Printable prescription visits')}</option>
                    <option value="BILL">{t('patient_records.modal.history_types.bills', 'Visits with bills')}</option>
                    <option value="DOCUMENT">{t('patient_records.modal.history_types.documents', 'Visits with documents')}</option>
                  </select>
                </div>
                <CustomDatePicker label={t('patient_records.modal.from_date', 'From Date')} value={fromDate} onChange={setFromDate} placeholder={t('patient_records.modal.all_dates', 'All Dates')} />
                <CustomDatePicker label={t('patient_records.modal.to_date', 'To Date')} value={toDate} onChange={setToDate} placeholder={t('patient_records.modal.all_dates', 'All Dates')} />
                <div className="w-full">
                  <button onClick={() => fetchHistory(1)} className="w-full bg-[#549E9E] hover:bg-[#438787] text-white py-3 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all h-[42px] cursor-pointer shadow-sm active:scale-[0.98]">
                    {t('patient_records.modal.apply', 'Apply')}
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden border border-gray-200">
                {isHistoryLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#549E9E]/20 border-t-[#549E9E]" />
                  </div>
                )}
                <div className="divide-y divide-gray-100">
                  {historyItems.length > 0 ? historyItems.map((item) => {
                    const visitId = item.appointment_id || item.source_id;
                    const isExpanded = expandedVisitId === visitId;
                    const statusBadge = getVisitStatusBadge(item, t);
                    return (
                      <div key={`${item.timeline_type}-${item.source_id}`} className="bg-white">
                        <div
                          className="grid cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-[#549E9E]/[0.02] lg:grid-cols-[132px_minmax(190px,1fr)_minmax(170px,0.9fr)_minmax(250px,1.15fr)_220px]"
                          onClick={() => setExpandedVisitId(isExpanded ? null : visitId)}
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.table.date', 'Date')}</p>
                            <p className="mt-1 text-xs font-black text-gray-800">{formatDate(item.event_date)}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{getReference(item)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.table.treatment', 'Treatment')}</p>
                            <p className="mt-1 whitespace-normal text-sm font-black text-[#2d8789]">{item.details?.treatment_name || "Treatment not recorded"}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.details?.slot_name || "Slot not recorded"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.table.doctor_status', 'Doctor / Status')}</p>
                            <p className="mt-1 text-xs font-black text-gray-700">{item.doctor_full_name ? `Dr. ${item.doctor_full_name}` : "Doctor not recorded"}</p>
                            <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadge.className}`}>{statusBadge.label}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.table.patient', 'Patient')}</p>
                            <p className="mt-1 text-sm font-black text-gray-800">{item.subject?.display_name || "Patient not recorded"}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.subject?.relationship_label || t('patient_records.modal.self', 'Self')}</p>
                            <p className="mt-1 whitespace-normal text-xs font-bold text-gray-500">{getSecondaryDetail(item) || statusBadge.label}</p>
                          </div>
                          <div className="flex items-center justify-start gap-2 lg:justify-end" onClick={(event) => event.stopPropagation()}>
                            {item.details?.has_prescription && item.consultation_id ? (
                              <>
                                <button disabled={isPrescriptionLoading} onClick={() => openPrescriptionPreview(item)} className="inline-flex items-center gap-2 rounded-lg bg-[#549E9E] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#438787] disabled:bg-gray-300">
                                  <FileText size={14} /> {t('patient_records.modal.action.view', 'View')}
                                </button>
                                <button disabled={isPrescriptionLoading} onClick={() => openPrescriptionPreview(item, true)} className="inline-flex items-center gap-2 rounded-lg border border-[#549E9E]/30 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E] hover:bg-[#549E9E]/10 disabled:border-gray-200 disabled:text-gray-300">
                                  <Printer size={14} /> {t('patient_records.modal.action.print', 'Print')}
                                </button>
                              </>
                            ) : (
                              <span className={`inline-flex rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            )}
                            <button onClick={() => setExpandedVisitId(isExpanded ? null : visitId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#549E9E] hover:text-[#549E9E]" title={isExpanded ? "Hide details" : "Show details"}>
                              <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-3">
                            <div className="grid gap-3 text-xs font-bold text-gray-600 md:grid-cols-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.details.consultation', 'Consultation')}</p>
                                <p className="mt-1 text-gray-800">{item.consultation_id ? `Consultation #${item.consultation_id}` : "Consultation data missing"}</p>
                                <p>{item.details?.consultation_status || "Status not recorded"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.details.prescription', 'Prescription')}</p>
                                <p className="mt-1">{item.consultation_id ? "Printable consultation prescription available" : "No consultation to print"}</p>
                                <p>{[item.details?.medicine_count ? `${item.details.medicine_count} medicines` : null, item.details?.test_count ? `${item.details.test_count} tests` : null].filter(Boolean).join(" • ") || "No medicines/tests recorded"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.details.bill', 'Bill')}</p>
                                <p className="mt-1">{item.details?.bills_count ? `${item.details.bills_count} bill${Number(item.details.bills_count) > 1 ? "s" : ""}` : "No active bill"}</p>
                                <p>{item.details?.total_amount ? `₹ ${Number(item.details.total_amount).toFixed(2)} total` : "Amount not recorded"}</p>
                                {item.details?.payment_status && <p>{item.details.payment_status}</p>}
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.details.documents', 'Documents')}</p>
                                <p className="mt-1">{item.details?.documents_count ? `${item.details.documents_count} linked document${Number(item.details.documents_count) > 1 ? "s" : ""}` : "No linked documents"}</p>
                                {item.details?.document_types && <p>{item.details.document_types}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }) : !isHistoryLoading && (
                    <div className="px-5 py-16 text-center">
                      <FileText size={34} className="mx-auto mb-3 text-gray-200" />
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">{t('patient_records.modal.no_history', 'No history found')}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{historyTotal} {t('patient_records.modal.completed_visits_count', 'completed visits')}</p>
                </div>
                <Pagination currentPage={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
              </div>
            </div>
          </div>
        </div>, document.body)}

      {selectedPrescription && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-md no-print">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-gray-100 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{t('patient_records.modal.prescription_preview', 'Prescription Preview')}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('patient_records.modal.saved_prescription_sub', 'Saved doctor consultation prescription')}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Language Toggle Options */}
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
                <button onClick={() => {
                  setSelectedPrescription(null);
                  setPrintAfterPreviewLoad(false);
                }} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-200/50 p-4 md:p-12" data-lenis-prevent>
              <div className="mx-auto flex min-h-[297mm] w-[210mm] shrink-0 flex-col rounded-sm border border-gray-100 bg-white p-0 shadow-xl md:p-8">
                <PrescriptionPrint consultation={selectedPrescription.consultation} appointment={selectedPrescription.appointment} lang={prescriptionLang} />
              </div>
            </div>
          </div>
        </div>, document.body)}

      <div className="print-only">
        {selectedPrescription && <PrescriptionPrint consultation={selectedPrescription.consultation} appointment={selectedPrescription.appointment} lang={prescriptionLang} />}
        {selectedAllVisits && <AllVisitsPrint patient={selectedAllVisits.patient} visits={selectedAllVisits.visits} lang={allVisitsLang} />}
      </div>

      {selectedAllVisits && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-md no-print">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-gray-100 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">All Visits & Prescriptions Preview</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Complete visit history for {selectedAllVisits.patient.full_name}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Language Toggle */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setAllVisitsLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                      allVisitsLang === 'en'
                        ? 'bg-[#549E9E] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllVisitsLang('hi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                      allVisitsLang === 'hi'
                        ? 'bg-[#549E9E] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>

                <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[#549E9E] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-[#458b8b]">
                  <Download size={16} /> Print All
                </button>
                <button onClick={() => {
                  setSelectedAllVisits(null);
                  setPrintAfterAllVisitsLoad(false);
                }} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-200/50 p-4 md:p-12" data-lenis-prevent>
              <div className="mx-auto flex min-h-[297mm] w-[210mm] shrink-0 flex-col rounded-sm border border-gray-100 bg-white p-0 shadow-xl md:p-8">
                <AllVisitsPrint patient={selectedAllVisits.patient} visits={selectedAllVisits.visits} lang={allVisitsLang} />
              </div>
            </div>
          </div>
        </div>, document.body)}
      <style>{`
        @media screen {
          .print-only {
            display: none;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
