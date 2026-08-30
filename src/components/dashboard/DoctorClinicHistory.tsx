import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  Search,
  RefreshCcw,
  AlertCircle,
  Phone,
  Calendar,
  User,
  FileText,
  Pill,
  X,
  Activity,
  Clock,
  MapPin,
  ClipboardList,
  ChevronDown,
  Tag,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { dedupedFetch } from "../../utils/dedupedFetch";
import CustomDatePicker from "../CustomDatePicker";
import Pagination from "../Pagination";
import PrescriptionPrint from "../PrescriptionPrint";
import { Download, Eye } from "lucide-react";
import {
  getDosePreview,
  getMedicationPricingAmount,
  getMedicationRoleLabel,
  formatNumericMedicineWithFormula,
} from "../../utils/prescriptionFormat";
import { useTranslation } from "react-i18next";
import MedicationDispensingStatus from "../MedicationDispensingStatus";
import PaymentSplitDisplay from "../PaymentSplitDisplay";

export default function DoctorClinicHistory() {
  const { t } = useTranslation();
  const { token, branchScope } = useAuth();
  const location = useLocation();
  const selectedBranchId = branchScope?.selected_branch_id ? Number(branchScope.selected_branch_id) : null;

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useNotifications();

  const [search, setSearch] = useState(() => location.state?.patientSearch || "");
  const [fromDate, setFromDate] = useState(() => {
    if (location.state?.fromDate) return location.state.fromDate;
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    if (location.state?.toDate) return location.state.toDate;
    return new Date().toISOString().split("T")[0];
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    return location.state?.filterStatus || "all";
  });

  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(
    null,
  );
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState<
    any | null
  >(null);
  const [autoPrintPrescription, setAutoPrintPrescription] = useState(false);
  const [prescriptionLang, setPrescriptionLang] = useState<'en' | 'hi'>('en');
  const [
    expandedHistoryChainAppointmentId,
    setExpandedHistoryChainAppointmentId,
  ] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 8;

  const getChainSummary = (chain: any[] = []) => {
    if (!Array.isArray(chain) || chain.length === 0) {
      return null;
    }

    const first = chain[0];
    const last = chain[chain.length - 1];

    return {
      totalVisits: chain.length,
      firstLabel: first?.treatment_name || "Visit",
      lastLabel: last?.treatment_name || "Visit",
    };
  };

  const FilterDropdown = ({
    label,
    options,
    value,
    onChange,
    icon: Icon,
  }: {
    label: string;
    options: { id: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    icon: any;
  }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.id === value);

    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node))
          setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
      <div className="space-y-1.5 relative" ref={ref}>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </label>
        <div
          onClick={() => setOpen(!open)}
          className={`w-full bg-white border border-gray-200 py-3 px-4 text-xs font-bold text-gray-700 cursor-pointer flex items-center justify-between transition-all rounded-xl ${open ? "border-[#549E9E] ring-2 ring-[#549E9E]/5" : "hover:border-gray-300"}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Icon
              size={14}
              className={open ? "text-[#549E9E]" : "text-gray-400"}
            />
            <span className="truncate">{selected?.label || label}</span>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 text-gray-400 ${open ? "rotate-180 text-[#549E9E]" : ""}`}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 shadow-xl z-[100] max-h-60 overflow-y-auto rounded-xl"
            >
              {options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`px-4 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${value === opt.id ? "bg-[#549E9E] text-white" : "text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]"}`}
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

  const isPendingStatus = (status?: string) =>
    String(status || "").trim().toLowerCase() === "pending";

  const StatusBadge = ({ status }: { status: string }) => {
    const s = status.toLowerCase();
    const styles: Record<string, string> = {
      confirmed: "bg-emerald-50 text-emerald-600 border-emerald-100",
      pending: "bg-amber-50 text-amber-600 border-amber-100",
      cancelled: "bg-red-50 text-red-600 border-red-100",
      completed: "bg-blue-50 text-blue-600 border-blue-100",
    };
    const icons: Record<string, React.ReactNode> = {
      confirmed: <CheckCircle2 size={12} />,
      pending: <Clock size={12} />,
      cancelled: <X size={12} />,
      completed: <CheckCircle2 size={12} />,
    };
    return (
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[s] || "bg-gray-50 text-gray-600 border-gray-100"}`}
      >
        {icons[s] || <AlertCircle size={12} />}
        {t(`clinic_history.filters.${s}`, t(`dashboard.status_labels.${s}`, status))}
      </div>
    );
  };

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate && fromDate !== "all") params.append("from_date", fromDate);
      if (toDate && toDate !== "all") params.append("to_date", toDate);
      if (filterStatus && filterStatus !== "all")
        params.append("status", filterStatus);
      if (search.trim()) params.append("patient_search", search.trim());
      if (selectedBranchId) params.append("branch_id", String(selectedBranchId));
      params.append("page", String(currentPage));
      params.append("page_size", String(pageSize));

      const res = await dedupedFetch(
        `/api/v1/doctors/consultations-history?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setHistoryItems(data.data || []);
        setTotalPages(Number(data.meta?.total_pages || 1));
      } else {
        addToast(data.message || "Failed to fetch history", "error");
      }
    } catch (err) {
      addToast("Network error while fetching history", "error");
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, filterStatus, search, selectedBranchId, token, addToast, currentPage, pageSize]);

  useEffect(() => {
    const delay = search.trim() ? 500 : 0;
    const timer = window.setTimeout(() => { void fetchHistory(); }, delay);
    return () => window.clearTimeout(timer);
  }, [fetchHistory, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, filterStatus, search]);

  useEffect(() => {
    if (!showPrescriptionPreview || !autoPrintPrescription) return;

    const timer = window.setTimeout(() => {
      window.print();
      setAutoPrintPrescription(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [showPrescriptionPreview, autoPrintPrescription]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedConsultation || showPrescriptionPreview) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedConsultation, showPrescriptionPreview]);

  useEffect(() => {
    if (!selectedConsultation?.appointment?.appointment_id) {
      setExpandedHistoryChainAppointmentId(null);
      return;
    }

    setExpandedHistoryChainAppointmentId(
      Number(selectedConsultation.appointment.appointment_id),
    );
  }, [selectedConsultation]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-[#549E9E] p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <History size={24} /> {t("clinic_history.title", "Clinic History")}
          </h3>
          <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mt-1">
            {t(
              "clinic_history.subtitle",
              "View completed consultations and medical records",
            )}
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="cursor-pointer bg-white text-[#549E9E] px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />{" "}
          {t("clinic_history.refresh", "Refresh")}
        </button>
      </div>

      <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-gray-50/50 p-4 border border-gray-100">
          <CustomDatePicker
            label={t("clinic_history.filters.from_date", "From Date")}
            value={fromDate}
            onChange={setFromDate}
          />
          <CustomDatePicker
            label={t("clinic_history.filters.to_date", "To Date")}
            value={toDate}
            onChange={setToDate}
          />

          <FilterDropdown
            label={t("clinic_history.filters.status", "Status")}
            icon={Tag}
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              {
                id: "all",
                label: t("clinic_history.filters.all_statuses", "All Statuses"),
              },
              { id: "Completed", label: t("clinic_history.filters.completed", "Completed") },
              { id: "Pending", label: t("clinic_history.filters.pending", "Pending") },
              { id: "Cancelled", label: t("clinic_history.filters.cancelled", "Cancelled") },
            ]}
          />

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {t("clinic_history.filters.search_label", "Search")}
            </label>
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#549E9E] transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder={t(
                  "clinic_history.filters.search_placeholder",
                  "Search...",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 py-3 pl-12 pr-4 text-xs font-bold text-gray-700 rounded-xl outline-none focus:border-[#549E9E] transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Content Table */}
        {isLoading && historyItems.length === 0 ? (
          <div className="flex justify-center py-20">
            <RefreshCcw className="text-[#549E9E] w-10 h-10 animate-spin" />
          </div>
        ) : historyItems.length === 0 ? (
          <div className="text-center py-20 border border-gray-100 bg-gray-50/30">
            <History className="mx-auto text-gray-200 mb-4" size={48} />
            <h3 className="text-lg font-black text-gray-700 uppercase tracking-widest">
              {t("clinic_history.no_records.title", "No Records Found")}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {t(
                "clinic_history.no_records.desc",
                "Try adjusting your dates or search query.",
              )}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 overflow-hidden shadow-sm bg-white rounded-xl sm:rounded-none">
            {/* === MOBILE CARD VIEW === */}
            <div className="sm:hidden divide-y divide-gray-100">
              {historyItems
                .map((item, idx) => {
                  const { appointment, consultation } = item;
                  const emrSummary = getChainSummary(item.follow_up_chain);
                  const isPending = isPendingStatus(appointment.status);
                  return (
                    <motion.div
                      key={consultation?.consultation_id || idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      className={`p-4 transition-colors group ${isPending ? "cursor-not-allowed" : "hover:bg-[#549E9E]/5 cursor-pointer"}`}
                      onClick={() => {
                        if (isPending) return;
                        setSelectedConsultation(item);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 flex flex-col items-center justify-center bg-gray-50 rounded-lg text-gray-800 font-black text-sm relative group/token shrink-0">
                            <Ticket
                              size={24}
                              className="absolute text-red-500/10 -rotate-12 transition-transform group-hover/token:rotate-0"
                              fill="currentColor"
                            />
                            <span className="relative z-10 text-primary-teal">
                              #{appointment.display_token_display || appointment.token_number}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-black text-gray-800 uppercase tracking-wider block">
                              {appointment.patient_full_name}
                              {appointment.booked_for_type === "FAMILY_MEMBER" && (
                                <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                  {appointment.family_member_relationship}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-[#549E9E] bg-[#549E9E]/10 px-1.5 py-0.5 rounded-md">
                                {appointment.patient_uuid}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500">
                                {appointment.patient_mobile_no}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {emrSummary && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-md uppercase tracking-widest">
                            EMR {emrSummary.totalVisits} Visit{emrSummary.totalVisits > 1 ? "s" : ""}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                            {emrSummary.firstLabel} → {emrSummary.lastLabel}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-50">
                        <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 gap-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary-teal" />
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400" />
                            {appointment.start_time} - {appointment.end_time}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-gray-500 gap-2">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-[#E6C682]" />
                            {appointment.branch_name.replace(' Branch', '')}
                          </div>
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded">
                            {appointment.treatment_name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          {consultation?.medication_duration_days ? (
                            <span className="inline-flex w-fit text-[9px] font-black text-[#549E9E] bg-[#549E9E]/10 px-2 py-1 rounded-md uppercase tracking-widest">
                              {consultation.medication_duration_days} Days
                            </span>
                          ) : (
                            <span />
                          )}
                          <StatusBadge status={appointment.status} />
                        </div>
                        <div className="mt-2">
                          <PaymentSplitDisplay
                            cashAmount={item.payment_summary?.cash_amount}
                            onlineAmount={item.payment_summary?.online_amount}
                            paymentMode={item.payment_summary?.payment_mode}
                            compact
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPending) return;
                            setSelectedConsultation(item);
                          }}
                          className={`flex-1 text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest transition-colors text-center ${
                            isPending
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-[#549E9E] bg-[#549E9E]/10 hover:bg-[#549E9E] hover:text-white cursor-pointer"
                          }`}
                        >
                          {t("clinic_history.table.view_details", "View Details")}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPending) return;
                            setShowPrescriptionPreview(item);
                          }}
                          className={`flex-1 text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${
                            isPending
                              ? "text-gray-400 bg-gray-200 cursor-not-allowed"
                              : "text-white bg-amber-500 hover:bg-amber-600 cursor-pointer"
                          }`}
                          title={t("clinic_history.table.view_prescription", "View Prescription")}
                        >
                          <Eye size={12} /> {t("clinic_history.table.view_prescription", "View Prescription")}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* === DESKTOP TABLE VIEW === */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t("clinic_history.table.date_time", "Date & Time")}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t("clinic_history.table.token", "Token")}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t(
                        "clinic_history.table.patient_details",
                        "Patient Details",
                      )}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t(
                        "clinic_history.table.branch_treatment",
                        "Branch & Treatment",
                      )}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t("clinic_history.table.status", "Status")}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {t("clinic_history.table.payment", "Payment")}
                    </th>
                    <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">
                      {t("clinic_history.table.action", "Action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyItems
                    .map((item, idx) => {
                      const { appointment, consultation } = item;
                      const emrSummary = getChainSummary(item.follow_up_chain);
                      const isPending = isPendingStatus(appointment.status);
                      return (
                        <motion.tr
                          key={appointment.appointment_id || idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                          className={`transition-colors group ${isPending ? "cursor-not-allowed" : "hover:bg-[#549E9E]/5 cursor-pointer"}`}
                          onClick={() => {
                            if (isPending) return;
                            setSelectedConsultation(item);
                          }}
                        >
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">
                                {new Date(
                                  appointment.appointment_date,
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {appointment.start_time} -{" "}
                                {appointment.end_time}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="w-12 h-12 flex items-center justify-center text-gray-800 font-black text-sm relative group/token">
                              <Ticket
                                size={40}
                                className="absolute text-red-500/20 -rotate-12 transition-transform group-hover/token:rotate-0"
                                fill="currentColor"
                              />
                              <span className="relative z-10">
                                {appointment.display_token_display ||
                                  appointment.token_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                {appointment.patient_full_name}
                                {appointment.booked_for_type ===
                                  "FAMILY_MEMBER" && (
                                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                      {appointment.family_member_relationship}
                                    </span>
                                  )}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-[#549E9E] bg-[#549E9E]/10 px-1.5 py-0.5 rounded-md">
                                  {appointment.patient_uuid}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500">
                                  {appointment.patient_mobile_no}
                                  {appointment.booked_for_type ===
                                    "FAMILY_MEMBER" &&
                                    appointment.primary_patient_full_name && (
                                      <span className="text-gray-400">
                                        {" "}
                                        (Account:{" "}
                                        {appointment.primary_patient_full_name})
                                      </span>
                                    )}
                                </span>
                              </div>
                              {emrSummary && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-md uppercase tracking-widest">
                                    EMR {emrSummary.totalVisits} Visit
                                    {emrSummary.totalVisits > 1 ? "s" : ""}
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                    {emrSummary.firstLabel} →{" "}
                                    {emrSummary.lastLabel}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">
                                {appointment.treatment_name}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                                <MapPin size={10} /> {appointment.branch_name}
                              </span>
                              {consultation?.follow_up_after_days || consultation?.medication_duration_days ? (
                                <span className="mt-2 inline-flex w-fit text-[9px] font-black text-[#549E9E] bg-[#549E9E]/10 px-2 py-1 rounded-md uppercase tracking-widest">
                                  {consultation.follow_up_after_days || consultation.medication_duration_days} Days
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={appointment.status} />
                          </td>
                          <td className="px-5 py-4">
                            <PaymentSplitDisplay
                              cashAmount={item.payment_summary?.cash_amount}
                              onlineAmount={item.payment_summary?.online_amount}
                              paymentMode={item.payment_summary?.payment_mode}
                              compact
                            />
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPending) return;
                                  setSelectedConsultation(item);
                                }}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors ${
                                  isPending
                                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                    : "text-[#549E9E] bg-[#549E9E]/10 hover:bg-[#549E9E] hover:text-white cursor-pointer"
                                }`}
                              >
                                {t(
                                  "clinic_history.table.view_details",
                                  "View Details",
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPending) return;
                                  setShowPrescriptionPreview(item);
                                }}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors flex items-center gap-1 ${
                                  isPending
                                    ? "text-gray-400 bg-gray-200 cursor-not-allowed"
                                    : "text-white bg-amber-500 hover:bg-amber-600 cursor-pointer"
                                }`}
                                title={t(
                                  "clinic_history.table.view_prescription",
                                  "View Prescription",
                                )}
                              >
                                <Eye size={12} />{" "}
                                {t(
                                  "clinic_history.table.view_prescription",
                                  "View Prescription",
                                )}
                              </button>
                              {/* <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPrescriptionPreview(item);
                                  setAutoPrintPrescription(true);
                                }}
                                className="text-[10px] font-black text-white bg-[#549E9E] px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-[#438787] transition-colors cursor-pointer flex items-center gap-1"
                                title={t("clinic_history.table.print", "Print")}
                              >
                                <Download size={12} />{" "}
                                {t("clinic_history.table.print", "Print")}
                              </button> */}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal for Details */}
      <AnimatePresence>
        {selectedConsultation && selectedConsultation.consultation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-gray-900/60 backdrop-blur-md no-print"
            onClick={() => setSelectedConsultation(null)}
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
                    {selectedConsultation.appointment.patient_full_name}{" "}
                    {t("consultation_modal.consult_form", "Consult Form")}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      {t("consultation_modal.token", "TOKEN")} #
                      {selectedConsultation.appointment.display_token_display ||
                        selectedConsultation.appointment.token_number}{" "}
                      • {selectedConsultation.appointment.treatment_name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/30 text-amber-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      <User size={13} className="text-amber-200" />
                      {t("consultation_modal.age_gender", "AGE / GENDER")}:{" "}
                      {selectedConsultation.appointment.patient_age
                        ? `${selectedConsultation.appointment.patient_age} Yrs`
                        : "N/A"}{" "}
                      {selectedConsultation.appointment.patient_gender
                        ? `/ ${selectedConsultation.appointment.patient_gender}`
                        : ""}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/25 border border-emerald-300/30 text-emerald-100 text-[11px] font-black tracking-wider backdrop-blur-xs shadow-xs">
                      <Phone size={13} className="text-emerald-200" />
                      {t("consultation_modal.mobile", "MOBILE")}:{" "}
                      {selectedConsultation.appointment.patient_mobile_no || "N/A"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/25 border border-sky-300/30 text-sky-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                      <MapPin size={13} className="text-sky-200" />
                      {t("consultation_modal.branch", "BRANCH")}:{" "}
                      {selectedConsultation.appointment.branch_name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="cursor-pointer bg-white text-[#549E9E] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <Download size={16} />{" "}
                    {t(
                      "consultation_modal.download_prescription",
                      "Download Prescription",
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedConsultation(null)}
                    className="cursor-pointer bg-white/20 hover:bg-white text-white hover:text-[#549E9E] p-2 rounded-full transition-colors flex-shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div
                className="p-8 overflow-y-auto min-h-0 overscroll-behavior-contain space-y-8 bg-white flex-1 relative z-10"
                data-lenis-prevent
              >

                {(() => {
                  const consultation = selectedConsultation.consultation || {};
                  const allMeds =
                    selectedConsultation.consultation?.medications ||
                    selectedConsultation.consultation?.prescription
                      ?.medications ||
                    [];
                  const tests = selectedConsultation.consultation?.tests || [];
                  const numericMeds = allMeds.filter(
                    (m: any) => m.medicine_type?.toUpperCase() === "NUMERIC",
                  );
                  const textMeds = allMeds.filter(
                    (m: any) => m.medicine_type?.toUpperCase() === "TEXT",
                  );
                  const pricing = selectedConsultation.pricing;
                  const followUpChain = Array.isArray(
                    selectedConsultation.follow_up_chain,
                  )
                    ? selectedConsultation.follow_up_chain
                    : [];
                  const hasAnyVitals = Boolean(
                    consultation.consultation_mode ||
                    consultation.oxygen_saturation ||
                    consultation.blood_pressure ||
                    consultation.patient_height ||
                    consultation.patient_weight,
                  );

                  return (
                    <div className="space-y-6">
                      <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5">
                        <div className="flex flex-wrap items-start gap-3 justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                {
                                  selectedConsultation.appointment
                                    .patient_full_name
                                }
                              </span>
                              {selectedConsultation.appointment
                                .booked_for_type === "FAMILY_MEMBER" && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                    {
                                      selectedConsultation.appointment
                                        .family_member_relationship
                                    }
                                  </span>
                                )}
                              <span className="text-[10px] font-black text-[#549E9E] bg-[#549E9E]/10 px-2 py-1 rounded-md uppercase tracking-widest">
                                #
                                {selectedConsultation.appointment
                                  .display_token_display ||
                                  selectedConsultation.appointment.token_number}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                              <span>
                                {selectedConsultation.appointment.patient_age
                                  ? `${selectedConsultation.appointment.patient_age} Yrs`
                                  : "Age N/A"}
                                {selectedConsultation.appointment.patient_gender
                                  ? ` • ${selectedConsultation.appointment.patient_gender}`
                                  : ""}
                              </span>
                              <span>•</span>
                              <span>
                                {selectedConsultation.appointment
                                  .patient_mobile_no || "Mobile N/A"}
                              </span>
                              <span>•</span>
                              <span>
                                {selectedConsultation.appointment.branch_name}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(
                                  selectedConsultation.appointment
                                    .appointment_date,
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[9px] font-black uppercase tracking-widest text-gray-600">
                                {
                                  selectedConsultation.appointment
                                    .treatment_name
                                }
                              </span>
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[9px] font-black uppercase tracking-widest text-[#549E9E]">
                                {consultation.follow_up_after_days || consultation.medication_duration_days || "—"}{" "}
                                {t("consultation_modal.days", "DAYS")}
                              </span>
                              {selectedConsultation.appointment
                                .patient_uuid && (
                                  <span className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[9px] font-black uppercase tracking-widest text-gray-500">
                                    {
                                      selectedConsultation.appointment
                                        .patient_uuid
                                    }
                                  </span>
                                )}
                            </div>
                          </div>

                          {selectedConsultation.appointment.booked_for_type ===
                            "FAMILY_MEMBER" &&
                            selectedConsultation.appointment
                              .primary_patient_full_name && (
                              <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                  Account Holder
                                </p>
                                <p className="text-xs font-bold text-gray-700">
                                  {
                                    selectedConsultation.appointment
                                      .primary_patient_full_name
                                  }
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {followUpChain.length > 0 && (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                                Patient EMR
                              </p>
                              <p className="text-sm font-bold text-gray-700">
                                Linked visit chain for this patient case
                              </p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                              {followUpChain.length} visit
                              {followUpChain.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {followUpChain.map(
                              (chainItem: any, chainIndex: number) => {
                                const isCurrent =
                                  Number(chainItem.appointment_id) ===
                                  Number(
                                    selectedConsultation.appointment
                                      .appointment_id,
                                  );
                                const isExpanded =
                                  Number(expandedHistoryChainAppointmentId) ===
                                  Number(chainItem.appointment_id);
                                const chainMeds = Array.isArray(
                                  chainItem.consultation?.medications,
                                )
                                  ? chainItem.consultation.medications
                                  : [];
                                const doctorMeds = chainMeds.filter(
                                  (med: any) =>
                                    String(
                                      med?.added_by_role || "",
                                    ).toUpperCase() !== "MEDICAL",
                                );
                                const medicalMeds = chainMeds.filter(
                                  (med: any) =>
                                    String(
                                      med?.added_by_role || "",
                                    ).toUpperCase() === "MEDICAL",
                                );
                                const chainTests = Array.isArray(
                                  chainItem.consultation?.tests,
                                )
                                  ? chainItem.consultation.tests
                                  : [];

                                return (
                                  <div
                                    key={chainItem.appointment_id}
                                    className={`border rounded-xl overflow-hidden ${isCurrent ? "bg-white border-red-200" : "bg-white/80 border-red-100"}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedHistoryChainAppointmentId(
                                          (prev) =>
                                            prev === chainItem.appointment_id
                                              ? null
                                              : chainItem.appointment_id,
                                        )
                                      }
                                      className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-xs font-black uppercase tracking-widest text-gray-700">
                                            {chainIndex + 1}.{" "}
                                            {chainItem.treatment_name}
                                          </p>
                                          {isCurrent && (
                                            <span className="px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                              Current
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                                          {new Date(
                                            chainItem.appointment_date,
                                          ).toLocaleDateString()}{" "}
                                          • {chainItem.auid}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {chainItem.consultation?.follow_up_after_days || chainItem.consultation?.medication_duration_days ? (
                                            <span className="px-2 py-1 bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                              {chainItem.consultation.follow_up_after_days || chainItem.consultation.medication_duration_days}{" "}
                                              Days
                                            </span>
                                          ) : null}
                                          {chainMeds.length > 0 ? (
                                            <span className="px-2 py-1 bg-[#549E9E]/10 text-[#549E9E] text-[9px] font-black uppercase tracking-widest rounded-lg">
                                              {chainMeds.length} Medicines
                                            </span>
                                          ) : null}
                                          {medicalMeds.length > 0 ? (
                                            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                              {medicalMeds.length} Medical Added
                                            </span>
                                          ) : null}
                                          <PaymentSplitDisplay
                                            cashAmount={chainItem.payment_summary?.cash_amount}
                                            onlineAmount={chainItem.payment_summary?.online_amount}
                                            paymentMode={chainItem.payment_summary?.payment_mode}
                                            chips
                                          />
                                        </div>
                                      </div>
                                      <ChevronDown
                                        size={18}
                                        className={`text-red-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    </button>

                                    {isExpanded && chainItem.consultation && (
                                      <div className="border-t border-red-100 bg-white/80 p-4 space-y-4">
                                        <div className="grid md:grid-cols-3 gap-3">
                                          <div className="bg-white border border-gray-100 rounded-xl p-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                              Symptoms / Findings
                                            </p>
                                            <p className="text-xs font-bold text-gray-700 whitespace-pre-wrap">
                                              {chainItem.consultation
                                                .symptoms || "—"}
                                            </p>
                                          </div>
                                          <div className="bg-white border border-gray-100 rounded-xl p-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                              Treatment Advice
                                            </p>
                                            <p className="text-xs font-bold text-gray-700 whitespace-pre-wrap">
                                              {chainItem.consultation
                                                .treatment_advice || "—"}
                                            </p>
                                          </div>
                                          <div className="bg-white border border-gray-100 rounded-xl p-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                              Payment Mode
                                            </p>
                                            <PaymentSplitDisplay
                                              cashAmount={chainItem.payment_summary?.cash_amount}
                                              onlineAmount={chainItem.payment_summary?.online_amount}
                                              paymentMode={chainItem.payment_summary?.payment_mode}
                                            />
                                          </div>
                                        </div>

                                        {doctorMeds.length > 0 && (
                                          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#549E9E]">
                                              Doctor Prescription
                                            </p>
                                            <div className="space-y-2">
                                              {doctorMeds.map((med: any) => (
                                                <div
                                                  key={
                                                    med.consultation_medication_id
                                                  }
                                                  className="border border-gray-100 rounded-lg p-3"
                                                >
                                                  <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                      <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                                        {formatNumericMedicineWithFormula(
                                                          med.medicine_value,
                                                          chainItem.consultation
                                                            ?.quick_formula_input,
                                                        )}
                                                      </p>
                                                      {med.remark ? (
                                                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                                                          {med.remark}
                                                        </p>
                                                      ) : null}
                                                      <p className="text-[11px] font-bold text-gray-500 mt-1">
                                                        {getDosePreview(
                                                          med,
                                                          chainItem.consultation
                                                            .medication_duration_days,
                                                        ) ||
                                                          `${chainItem.consultation.medication_duration_days} days`}
                                                      </p>
                                                      <MedicationDispensingStatus
                                                        medication={med}
                                                        pricing={chainItem.pricing}
                                                        compact
                                                      />
                                                    </div>
                                                    {/* <span className="text-[11px] font-black text-[#549E9E]">
                                                      ₹
                                                      {Number(
                                                        getMedicationPricingAmount(
                                                          chainItem.pricing,
                                                          med,
                                                        ) || 0,
                                                      ).toFixed(2)}
                                                    </span> */}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {medicalMeds.length > 0 && (
                                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                              Medical Added / Updated
                                            </p>
                                            <div className="space-y-2">
                                              {medicalMeds.map((med: any) => (
                                                <div
                                                  key={
                                                    med.consultation_medication_id
                                                  }
                                                  className="border border-amber-100 rounded-lg p-3 bg-white/90"
                                                >
                                                  <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                                          {formatNumericMedicineWithFormula(
                                                            med.medicine_value,
                                                            chainItem.consultation
                                                              ?.quick_formula_input,
                                                          )}
                                                        </p>
                                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                                                          {getMedicationRoleLabel(
                                                            med,
                                                          ) || "Medical Added"}
                                                        </span>
                                                      </div>
                                                      {med.remark ? (
                                                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                                                          {med.remark}
                                                        </p>
                                                      ) : null}
                                                      <MedicationDispensingStatus
                                                        medication={med}
                                                        pricing={chainItem.pricing}
                                                        compact
                                                      />
                                                      <p className="text-[11px] font-bold text-gray-500 mt-1">
                                                        {getDosePreview(
                                                          med,
                                                          chainItem.consultation
                                                            .medication_duration_days,
                                                        ) ||
                                                          `${chainItem.consultation.medication_duration_days} days`}
                                                      </p>
                                                    </div>
                                                    <span className="text-[11px] font-black text-amber-700">
                                                      ₹
                                                      {Number(
                                                        getMedicationPricingAmount(
                                                          chainItem.pricing,
                                                          med,
                                                        ) || 0,
                                                      ).toFixed(2)}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {chainTests.length > 0 && (
                                          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                              Tests
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {chainTests.map((test: any) => (
                                                <span
                                                  key={
                                                    test.consultation_test_id
                                                  }
                                                  className="px-3 py-2 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-700 bg-gray-50"
                                                >
                                                  {test.test_name}{" "}
                                                  {test.amount != null
                                                    ? `• ₹${Number(test.amount).toFixed(2)}`
                                                    : ""}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}

                      {hasAnyVitals && (
                        <div className="bg-white border border-[#549E9E]/10 rounded-2xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
                              <Activity size={14} />{" "}
                              {t(
                                "consultation_modal.consultation_mode_vitals",
                                "Consultation Mode & Vitals",
                              )}
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {consultation.consultation_mode && (
                              <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                  {t(
                                    "consultation_modal.consultation_type",
                                    "Consultation Type",
                                  )}
                                </span>
                                <p className="text-sm font-bold text-gray-800">
                                  {consultation.consultation_mode === "ON_CALL"
                                    ? "On Call Consultant"
                                    : "Patient Physical Present"}
                                </p>
                              </div>
                            )}
                            {consultation.oxygen_saturation && (
                              <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                  {t("consultation_modal.o2_value", "O2 Value")}
                                </span>
                                <p className="text-sm font-bold text-gray-800">
                                  {consultation.oxygen_saturation}
                                </p>
                              </div>
                            )}
                            {consultation.blood_pressure && (
                              <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                  {t("consultation_modal.bp_value", "BP Value")}
                                </span>
                                <p className="text-sm font-bold text-gray-800">
                                  {consultation.blood_pressure}
                                </p>
                              </div>
                            )}
                            {consultation.patient_height && (
                              <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                  {t("consultation_modal.height", "Height")}
                                </span>
                                <p className="text-sm font-bold text-gray-800">
                                  {consultation.patient_height}
                                </p>
                              </div>
                            )}
                            {consultation.patient_weight && (
                              <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                  {t("consultation_modal.weight", "Weight")}
                                </span>
                                <p className="text-sm font-bold text-gray-800">
                                  {consultation.patient_weight}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(pricing || selectedConsultation.payment_summary) && (
                        <div className="bg-[#549E9E]/5 border border-[#549E9E]/10 rounded-xl p-5">
                          {pricing && (
                            <>
                              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] block mb-2">
                                Amount
                              </label>
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-bold text-gray-500">
                                  Consultation prescription total
                                </p>
                                <div className="min-w-[160px] px-4 py-3 bg-white border border-[#549E9E]/15 rounded-lg text-right text-lg font-black text-[#549E9E]">
                                  ₹ {pricing.total_amount || 0}
                                </div>
                              </div>
                            </>
                          )}
                          <div className={pricing ? "mt-4" : ""}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] mb-2">
                              Payment mode
                            </p>
                            <PaymentSplitDisplay
                              cashAmount={selectedConsultation.payment_summary?.cash_amount}
                              onlineAmount={selectedConsultation.payment_summary?.online_amount}
                              paymentMode={selectedConsultation.payment_summary?.payment_mode}
                            />
                          </div>
                          {pricing?.remark && (
                            <div className="mt-4 pt-4 border-t border-[#549E9E]/10">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                Dispensing Remark
                              </p>
                              <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">
                                {pricing.remark}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prescription Preview Modal */}
      <AnimatePresence>
        {showPrescriptionPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-8 bg-gray-900/80 backdrop-blur-md no-print"
            onClick={() => {
              setShowPrescriptionPreview(null);
              setAutoPrintPrescription(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-100 w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-3xl"
            >
              {/* Toolbar */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#549E9E]/10 rounded-full flex items-center justify-center text-[#549E9E]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                      Prescription Preview
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Official Clinic Document
                    </p>
                  </div>
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

                  <button
                    onClick={() => window.print()}
                    className="cursor-pointer bg-[#549E9E] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#458b8b] flex items-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <Download size={16} /> Download PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowPrescriptionPreview(null);
                      setAutoPrintPrescription(false);
                    }}
                    className="cursor-pointer bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 p-2.5 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-auto p-4 md:p-12 bg-gray-200/50 flex justify-center items-start overscroll-contain"
                data-lenis-prevent
              >
                <div
                  className="bg-white shadow-xl shrink-0 p-0 md:p-8 rounded-sm border border-gray-100 mx-auto flex flex-col"
                  style={{ width: '210mm', minHeight: '297mm' }}
                >
                  <PrescriptionPrint
                    consultation={showPrescriptionPreview.consultation}
                    appointment={showPrescriptionPreview.appointment}
                    lang={prescriptionLang}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(showPrescriptionPreview || selectedConsultation) && createPortal(
        <div className="print-only">
          <PrescriptionPrint
            consultation={
              (showPrescriptionPreview || selectedConsultation).consultation
            }
            appointment={
              (showPrescriptionPreview || selectedConsultation).appointment
            }
            lang={prescriptionLang}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
