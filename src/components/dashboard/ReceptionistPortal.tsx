import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../../services/socket";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  FileText,
  Settings,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCcw,
  Bell,
  X,
  PhoneForwarded,
  UserCheck,
  UserX,
  Activity,
  ClipboardList,
  ChevronDown,
  Tags,
  Stethoscope,
  IndianRupee,
} from "lucide-react";
import CustomDatePicker from "../CustomDatePicker";
import { getLocalDateString } from "../../utils/date";
import Pagination from "../Pagination";
import { useNotifications } from "../../context/NotificationContext";
import TokenLayoutManager from "./TokenLayoutManager";

const FilterDropdown = ({
  label,
  options,
  value,
  onChange,
  icon: Icon,
  className = "",
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={ref}>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      <div
        onClick={() => setOpen(!open)}
        className={`w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-700 cursor-pointer flex items-center justify-between transition-all ${
          open
            ? "border-[#549E9E] ring-2 ring-[#549E9E]/20"
            : "hover:border-gray-300"
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <Icon
            size={14}
            className={open ? "text-[#549E9E] shrink-0" : "text-gray-400 shrink-0"}
          />
          <span className="truncate">{selected?.label || label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-300 text-gray-400 ${
            open ? "rotate-180 text-[#549E9E]" : ""
          }`}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-[100] max-h-60 overflow-y-auto rounded-xl"
          >
            {options.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`px-4 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer first:rounded-t-xl last:rounded-b-xl ${
                  value === opt.id
                    ? "bg-[#549E9E] text-white"
                    : "text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]"
                }`}
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

export default function ReceptionistPortal() {
  const { token, user, branchScope } = useAuth();
  const { t } = useTranslation();

  const {
    notificationHistory,
    unreadCount,
    toasts,
    markAllAsRead,
    removeToast,
    addToast,
    refreshTrigger,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"queue" | "billing" | "layout">(
    "queue",
  );
  const selectedBranchId = branchScope?.selected_branch_id
    ? Number(branchScope.selected_branch_id)
    : null;
  const selectedBranchName = branchScope?.selected_branch?.branch_name || null;

  // Appointments State
  const [appointments, setAppointments] = useState<any[]>([]);
  // Use local calendar date — toISOString() is UTC and shows yesterday after midnight IST.
  const [dateStr, setDateStr] = useState(() => getLocalDateString());
  const userPickedFilterDateRef = useRef(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [tokenFilter, setTokenFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState<"ALL" | "M" | "E">("ALL");
  const [patientFilter, setPatientFilter] = useState("");
  const [treatmentFilter, setTreatmentFilter] = useState("ALL");

  // Pagination State
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const pageSize = 8;

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Selection & Bulk Rejection State
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<
    number[]
  >([]);
  const [isBulkReject, setIsBulkReject] = useState(false);

  // Not Available Modal State
  const [isNotAvailableModalOpen, setIsNotAvailableModalOpen] = useState(false);
  const [notAvailableId, setNotAvailableId] = useState<number | null>(null);
  const [isMarkingNotAvailable, setIsMarkingNotAvailable] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState({
    payment_mode: "CASH",
    amount: "",
    transaction_reference: "",
    remark: "Consultation fee",
  });
  const [isApproving, setIsApproving] = useState(false);
  const [checkInPromptAppointmentId, setCheckInPromptAppointmentId] = useState<
    number | null
  >(null);
  const [isCheckInPromptOpen, setIsCheckInPromptOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Optional Vitals Modal State
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsAppointment, setVitalsAppointment] = useState<any | null>(null);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [vitalsO2Value, setVitalsO2Value] = useState("");
  const [vitalsBpValue, setVitalsBpValue] = useState("");
  const [vitalsHeightValue, setVitalsHeightValue] = useState("");
  const [vitalsHeightUnit, setVitalsHeightUnit] = useState<"cm" | "ft">("cm");
  const [vitalsWeightValue, setVitalsWeightValue] = useState("");

  // Extended History Modal State
  const [isExtendedHistoryModalOpen, setIsExtendedHistoryModalOpen] = useState(false);
  const [historyAppointment, setHistoryAppointment] = useState<any | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  const [extOccupation, setExtOccupation] = useState("");
  const [extPersonalSocialHistory, setExtPersonalSocialHistory] = useState("");
  const [extHistoryPresentIllness, setExtHistoryPresentIllness] = useState("");
  const [extHistoryPastIllness, setExtHistoryPastIllness] = useState("");
  const [extFamilyHistory, setExtFamilyHistory] = useState("");
  const [extAllergiesHistory, setExtAllergiesHistory] = useState("");
  const [extGynecologicalHistory, setExtGynecologicalHistory] = useState("");
  const [extMentalMindStatus, setExtMentalMindStatus] = useState("");
  const [extGeneralExamination, setExtGeneralExamination] = useState("");
  const [extSystematicExamination, setExtSystematicExamination] = useState("");
  const [extDisease, setExtDisease] = useState("");
  const [extFollowUp, setExtFollowUp] = useState("");
  const [extDifferentialDiagnosis, setExtDifferentialDiagnosis] = useState("");

  const openExtendedHistoryModal = (appointment: any) => {
    setHistoryAppointment(appointment);
    setExtOccupation(appointment?.occupation || "");
    setExtPersonalSocialHistory(appointment?.personal_social_history || "");
    setExtHistoryPresentIllness(appointment?.history_present_illness || "");
    setExtHistoryPastIllness(appointment?.history_past_illness || "");
    setExtFamilyHistory(appointment?.family_history || "");
    setExtAllergiesHistory(appointment?.allergies_history || "");
    setExtGynecologicalHistory(appointment?.gynecological_history || "");
    setExtMentalMindStatus(appointment?.mental_mind_status || "");
    setExtGeneralExamination(appointment?.general_examination || "");
    setExtSystematicExamination(appointment?.systematic_examination || "");
    setExtDisease(appointment?.disease || "");
    setExtFollowUp(appointment?.follow_up || "");
    setExtDifferentialDiagnosis(appointment?.differential_diagnosis || "");

    const rawO2 = String(appointment?.oxygen_saturation || "").trim();
    const rawBp = String(appointment?.blood_pressure || "").trim();
    const rawHeight = String(appointment?.patient_height || "").trim();
    const rawWeight = String(appointment?.patient_weight || "").trim();
    setVitalsO2Value(rawO2.replace("%", "").trim());
    setVitalsBpValue(rawBp);
    if (rawHeight.includes("cm")) {
      setVitalsHeightUnit("cm");
      setVitalsHeightValue(rawHeight.replace("cm", "").trim());
    } else if (rawHeight) {
      setVitalsHeightUnit("ft");
      setVitalsHeightValue(rawHeight);
    } else {
      setVitalsHeightUnit("cm");
      setVitalsHeightValue("");
    }
    setVitalsWeightValue(rawWeight.replace("kg", "").trim());

    setIsExtendedHistoryModalOpen(true);
  };

  const closeExtendedHistoryModal = () => {
    if (isSavingHistory) return;
    setIsExtendedHistoryModalOpen(false);
    setHistoryAppointment(null);
  };

  const saveExtendedHistory = async () => {
    if (!historyAppointment?.appointment_id) return;

    setIsSavingHistory(true);
    try {
      const response = await fetch(
        `/api/v1/receptionist/appointments/${historyAppointment.appointment_id}/vitals`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oxygen_saturation: vitalsO2Value.trim()
              ? `${vitalsO2Value.trim()}%`
              : "",
            blood_pressure: vitalsBpValue.trim(),
            patient_height: vitalsHeightValue.trim()
              ? vitalsHeightUnit === "cm"
                ? `${vitalsHeightValue.trim()} cm`
                : vitalsHeightValue.trim()
              : "",
            patient_weight: vitalsWeightValue.trim()
              ? `${vitalsWeightValue.trim()} kg`
              : "",
            occupation: extOccupation.trim(),
            personal_social_history: extPersonalSocialHistory.trim(),
            history_present_illness: extHistoryPresentIllness.trim(),
            history_past_illness: extHistoryPastIllness.trim(),
            family_history: extFamilyHistory.trim(),
            allergies_history: extAllergiesHistory.trim(),
            gynecological_history: extGynecologicalHistory.trim(),
            mental_mind_status: extMentalMindStatus.trim(),
            general_examination: extGeneralExamination.trim(),
            systematic_examination: extSystematicExamination.trim(),
            disease: extDisease.trim(),
            follow_up: extFollowUp.trim(),
            differential_diagnosis: extDifferentialDiagnosis.trim(),
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        alert(data.message || "Failed to save extended history");
        return;
      }

      addToast(data.message || "Extended History saved successfully", "success");
      closeExtendedHistoryModal();
      fetchAppointments();
    } catch (error) {
      console.error(error);
      alert("Failed to save extended history");
    } finally {
      setIsSavingHistory(false);
    }
  };

  // Billing State
  const [bills, setBills] = useState<any[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [billsPage, setBillsPage] = useState(1);
  const [billTypeFilter, setBillTypeFilter] = useState<
    "ALL" | "CONSULTATION" | "MEDICATION"
  >("ALL");
  const [billStatusFilter, setBillStatusFilter] = useState<
    "ALL" | "UNPAID" | "PAID" | "PARTIAL"
  >("ALL");

  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);

  // Listen to global refresh trigger
  useEffect(() => {
    if (token) {
      if (activeTab === "queue") fetchAppointments();
      if (activeTab === "billing") fetchBills();
    }
  }, [refreshTrigger, token, activeTab]);

  useEffect(() => {
    if (activeTab === "queue") {
      fetchAppointments();
      setAppointmentsPage(1);
    }
  }, [dateStr, token, activeTab]);

  // Keep filter on local "today" across midnight unless the user picked another date.
  useEffect(() => {
    const syncToLocalToday = () => {
      if (userPickedFilterDateRef.current) return;
      const today = getLocalDateString();
      setDateStr((prev) => (prev === today ? prev : today));
    };

    syncToLocalToday();
    const intervalId = window.setInterval(syncToLocalToday, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncToLocalToday();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "billing") {
      fetchBills();
      setBillsPage(1);
    }
  }, [billTypeFilter, billStatusFilter, token, activeTab]);

  useEffect(() => {
    setSelectedAppointmentIds([]);
    setIsBulkReject(false);
  }, [dateStr, activeTab, appointments]);

  const fetchBills = async () => {
    setIsLoadingBills(true);
    try {
      let url = `/api/v1/bills?`;
      if (billTypeFilter !== "ALL") url += `type=${billTypeFilter}&`;
      if (billStatusFilter !== "ALL")
        url += `payment_status=${billStatusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBills(false);
    }
  };

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch(
        `/api/v1/receptionist/appointments?appointment_date=${dateStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setAppointments(
          (data.data || []).filter(
            (appointment: any) =>
              appointment?.status !== "Cancelled" &&
              Number(appointment?.is_active ?? 1) === 1,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const openVitalsModal = (appointment: any) => {
    const rawHeight = String(appointment?.patient_height || "").trim();
    const rawWeight = String(appointment?.patient_weight || "").trim();
    const rawO2 = String(appointment?.oxygen_saturation || "").trim();

    setVitalsAppointment(appointment);
    setVitalsO2Value(rawO2.replace("%", "").trim());
    setVitalsBpValue(String(appointment?.blood_pressure || "").trim());

    if (rawHeight.includes("cm")) {
      setVitalsHeightUnit("cm");
      setVitalsHeightValue(rawHeight.replace("cm", "").trim());
    } else if (rawHeight) {
      setVitalsHeightUnit("ft");
      setVitalsHeightValue(rawHeight);
    } else {
      setVitalsHeightUnit("cm");
      setVitalsHeightValue("");
    }

    setVitalsWeightValue(rawWeight.replace("kg", "").trim());
    setIsVitalsModalOpen(true);
  };

  const closeVitalsModal = () => {
    if (isSavingVitals) return;
    setIsVitalsModalOpen(false);
    setVitalsAppointment(null);
    setVitalsO2Value("");
    setVitalsBpValue("");
    setVitalsHeightValue("");
    setVitalsHeightUnit("cm");
    setVitalsWeightValue("");
  };

  const saveVitals = async () => {
    if (!vitalsAppointment?.appointment_id) return;

    setIsSavingVitals(true);
    try {
      const response = await fetch(
        `/api/v1/receptionist/appointments/${vitalsAppointment.appointment_id}/vitals`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oxygen_saturation: vitalsO2Value.trim()
              ? `${vitalsO2Value.trim()}%`
              : "",
            blood_pressure: vitalsBpValue.trim(),
            patient_height: vitalsHeightValue.trim()
              ? vitalsHeightUnit === "cm"
                ? `${vitalsHeightValue.trim()} cm`
                : vitalsHeightValue.trim()
              : "",
            patient_weight: vitalsWeightValue.trim()
              ? `${vitalsWeightValue.trim()} kg`
              : "",
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        alert(data.message || "Failed to save vitals");
        return;
      }

      addToast(data.message || "Vitals saved successfully", "success");
      closeVitalsModal();
      fetchAppointments();
    } catch (error) {
      console.error(error);
      alert("Failed to save vitals");
    } finally {
      setIsSavingVitals(false);
    }
  };

  // Real-time socket updates for receptionist appointments list
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleQueueUpdated = (payload: any) => {
      console.log(
        "[ReceptionistPortal] Received queue-updated event:",
        payload,
      );
      fetchAppointments();
    };

    socket.on("queue-updated", handleQueueUpdated);

    // Identify unique combinations of branch/slot/date from current appointments list
    // to subscribe to live-queue rooms
    const activeRooms = new Set<string>();

    const subscribeToRooms = () => {
      const uniqueRooms = appointments
        .filter((app: any) => app.appointment_date === dateStr)
        .reduce(
          (acc: Array<{ branchId: number; slotId: number }>, app: any) => {
            const exists = acc.some(
              (item) =>
                item.branchId === app.fk_branch_id &&
                item.slotId === app.fk_slot_id,
            );
            if (!exists) {
              acc.push({ branchId: app.fk_branch_id, slotId: app.fk_slot_id });
            }
            return acc;
          },
          [],
        );

      uniqueRooms.forEach(({ branchId, slotId }) => {
        const roomName = `live-queue:${branchId}:${slotId}:${dateStr}`;
        if (!activeRooms.has(roomName)) {
          socket.emit(
            "live-queue.subscribe",
            {
              branch_id: branchId,
              slot_id: slotId,
              appointment_date: dateStr,
            },
            (response: any) => {
              if (response?.success) {
                activeRooms.add(roomName);
                console.log(
                  `[ReceptionistPortal] Subscribed to live queue room: ${roomName}`,
                );
              }
            },
          );
        }
      });
    };

    if (appointments.length > 0) {
      subscribeToRooms();
    }

    return () => {
      socket.off("queue-updated", handleQueueUpdated);

      // Unsubscribe from rooms
      activeRooms.forEach((roomName) => {
        const match = roomName.match(/^live-queue:(\d+):(\d+):(.+)$/);
        if (match) {
          const [_, branchId, slotId, appDate] = match;
          socket.emit("live-queue.unsubscribe", {
            branch_id: parseInt(branchId),
            slot_id: parseInt(slotId),
            appointment_date: appDate,
          });
          console.log(
            `[ReceptionistPortal] Unsubscribed from live queue room: ${roomName}`,
          );
        }
      });
    };
  }, [token, appointments, dateStr, selectedBranchId]);

  const isFollowUpAutoPaidAppointment = (appointment: any) =>
    appointment?.consultation_payment_status === "PAID" &&
    appointment?.consultation_payment_settlement_type === "FOLLOW_UP";

  const openConsultationPaymentModal = (appointment: any, amount?: number) => {
    setApprovingId(Number(appointment.appointment_id));
    setPaymentData({
      payment_mode: "CASH",
      amount:
        amount !== undefined
          ? String(amount)
          : appointment.consultation_fee
            ? String(appointment.consultation_fee)
            : "",
      transaction_reference: "",
      remark: "Consultation fee",
    });
    setIsPaymentModalOpen(true);
  };

  const handleApprove = async (id: number) => {
    const appointment = appointments.find(
      (item: any) => Number(item.appointment_id) === Number(id),
    );
    setApprovingId(id);

    if (isFollowUpAutoPaidAppointment(appointment)) {
      setIsApproving(true);
      try {
        const res = await fetch(
          `/api/v1/receptionist/appointments/${id}/approve-and-collect-payment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );
        const data = await res.json();
        if (data.success) {
          addToast(
            data.message || "Follow-up appointment approved successfully",
            "success",
          );
          setCheckInPromptAppointmentId(id);
          setIsCheckInPromptOpen(true);
          fetchAppointments();
        } else {
          addToast(data.message || "Failed to approve", "error");
        }
      } catch (err) {
        console.error(err);
        addToast("Failed to approve", "error");
      } finally {
        setIsApproving(false);
        setApprovingId(null);
      }
      return;
    }

    openConsultationPaymentModal(appointment);
  };

  const closeCheckInPrompt = () => {
    setIsCheckInPromptOpen(false);
    setCheckInPromptAppointmentId(null);
  };

  const performCheckIn = async (
    appointmentId: number,
    options?: { silent?: boolean },
  ) => {
    setIsCheckingIn(true);
    try {
      const res = await fetch(
        `/api/v1/live-queue/appointments/${appointmentId}/check-in`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await res.json();
      if (data.success) {
        if (!options?.silent) {
          addToast("Patient checked in successfully", "success");
        }
        fetchAppointments();
        return true;
      }
      if (res.status === 409 && data.code === "CONSULTATION_PAYMENT_REQUIRED") {
        const appointment = appointments.find(
          (item: any) => Number(item.appointment_id) === Number(appointmentId),
        ) || { appointment_id: appointmentId };
        setIsCheckInPromptOpen(false);
        setCheckInPromptAppointmentId(null);
        openConsultationPaymentModal(appointment, Number(data.data?.amount) || 0);
        addToast(data.message || "Consultation payment is required before check-in", "warning");
        fetchAppointments();
        return false;
      }
      addToast(data.message || "Failed to check in patient", "error");
      return false;
    } catch (err) {
      console.error(err);
      addToast("Failed to check in patient", "error");
      return false;
    } finally {
      setIsCheckingIn(false);
    }
  };

  const confirmPayment = async () => {
    if (!approvingId) return;
    if (
      paymentData.payment_mode === "ONLINE" &&
      !paymentData.transaction_reference.trim()
    ) {
      addToast("Transaction reference is required for ONLINE payment", "warning");
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch(
        `/api/v1/receptionist/appointments/${approvingId}/approve-and-collect-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...paymentData,
            amount: Number(paymentData.amount),
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        addToast(
          data.message || "Appointment approved successfully",
          "success",
        );
        setIsPaymentModalOpen(false);
        setCheckInPromptAppointmentId(approvingId);
        setIsCheckInPromptOpen(true);
        fetchAppointments();
      } else {
        addToast(data.message || "Failed to approve", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsApproving(false);
      setApprovingId(null);
    }
  };

  const handleReject = (id: number) => {
    setIsBulkReject(false);
    setRejectingId(id);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleBulkReject = () => {
    if (selectedAppointmentIds.length === 0) return;
    setIsBulkReject(true);
    setRejectingId(null);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const confirmRejection = async () => {
    if (!isBulkReject && !rejectingId) return;
    if (isBulkReject && selectedAppointmentIds.length === 0) return;
    if (!rejectionReason.trim()) return;

    setIsRejecting(true);
    try {
      const url = isBulkReject
        ? `/api/v1/receptionist/appointments/bulk-reject`
        : `/api/v1/receptionist/appointments/${rejectingId}/reject`;

      const body = isBulkReject
        ? JSON.stringify({
          appointment_ids: selectedAppointmentIds,
          reason: rejectionReason,
        })
        : JSON.stringify({ reason: rejectionReason });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          isBulkReject
            ? `${selectedAppointmentIds.length} Appointments Rejected`
            : "Appointment Rejected",
          "error",
        );
        setIsRejectModalOpen(false);
        setRejectingId(null);
        setSelectedAppointmentIds([]);
        setIsBulkReject(false);
        setRejectionReason("");
        fetchAppointments();
      } else {
        addToast(data.message || "Failed to reject", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to reject", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedAppointmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = (visibleIds: number[]) => {
    const isAllVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedAppointmentIds.includes(id));
    if (isAllVisibleSelected) {
      setSelectedAppointmentIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedAppointmentIds((prev) => {
        const next = [...prev];
        visibleIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleNotAvailable = (appointmentId: number) => {
    setNotAvailableId(appointmentId);
    setIsNotAvailableModalOpen(true);
  };

  const confirmNotAvailable = async () => {
    if (!notAvailableId) return;
    setIsMarkingNotAvailable(true);
    try {
      const res = await fetch(
        `/api/v1/receptionist/appointments/${notAvailableId}/not-available`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: "Patient not present when called" }),
        },
      );
      const data = await res.json();
      if (data.success) {
        addToast("Patient marked as not available", "success");
        setIsNotAvailableModalOpen(false);
        setNotAvailableId(null);
        fetchAppointments();
      } else {
        addToast(data.message || "Action failed", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingNotAvailable(false);
    }
  };

  const canShowCheckInButton = (app: any) =>
    !app.checked_in_at &&
    !["Cancelled", "Completed"].includes(app.status) &&
    app.reception_status === "APPROVED_BY_RECEPTION" &&
    app.consultation_payment_status === "PAID" &&
    ["BOOKED", "WAITING"].includes(app.queue_status);

  const isTerminalQueueItem = (app: any) =>
    app.status === "Completed" ||
    ["COMPLETED", "CANCELLED", "NO_SHOW", "SKIPPED"].includes(
      app.queue_status || "",
    );

  const getSessionQueuePosition = (app: any) =>
    isTerminalQueueItem(app)
      ? null
      : app.session_queue_position ??
        app.live_queue_position ??
        app.current_queue_position ??
        app.ready_queue_position ??
        null;

  const getActiveQueuePosition = (app: any) =>
    app.active_queue_position ??
    app.live_queue_position ??
    app.current_queue_position ??
    app.ready_queue_position ??
    null;

  const sortedAppointments = useMemo(() => {
    const backendSequenceRank = (app: any) => {
      if (isTerminalQueueItem(app)) {
        return Number.MAX_SAFE_INTEGER;
      }

      return Number(
          app.runtime_priority_rank ??
          app.live_queue_position ??
          app.current_queue_position ??
          app.ready_queue_position ??
          Number.MAX_SAFE_INTEGER,
      );
    };

    return [...appointments].sort((left: any, right: any) => {
      const leftRank = backendSequenceRank(left);
      const rightRank = backendSequenceRank(right);
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftToken = Number(
        left.current_token_number ||
        left.token_number ||
        Number.MAX_SAFE_INTEGER,
      );
      const rightToken = Number(
        right.current_token_number ||
        right.token_number ||
        Number.MAX_SAFE_INTEGER,
      );
      if (leftToken !== rightToken) return leftToken - rightToken;

      return (
        Number(left.appointment_id || Number.MAX_SAFE_INTEGER) -
        Number(right.appointment_id || Number.MAX_SAFE_INTEGER)
      );
    });
  }, [appointments]);

  const treatmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          appointments
            .map((appointment) =>
              String(appointment.treatment_name || "").trim(),
            )
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const normalizedToken = tokenFilter.trim().toLowerCase();
    const normalizedPatient = patientFilter.trim().toLowerCase();

    return sortedAppointments.filter((appointment) => {
      const displayToken = String(
        appointment.display_token_display || "",
      ).toUpperCase();
      const slotName = String(appointment.slot_name || "").toLowerCase();
      const appointmentSlot = displayToken.startsWith("M-")
        ? "M"
        : displayToken.startsWith("E-")
          ? "E"
          : slotName.includes("morning")
            ? "M"
            : slotName.includes("evening")
              ? "E"
              : "";
      const tokenValues = [
        appointment.display_token_display,
        appointment.current_token_number,
        appointment.token_number,
        appointment.original_token_number,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase());
      const patientValues = [
        appointment.patient_full_name,
        appointment.primary_patient_full_name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return (
        (!normalizedToken ||
          tokenValues.some((value) => value.includes(normalizedToken))) &&
        (slotFilter === "ALL" || appointmentSlot === slotFilter) &&
        (!normalizedPatient ||
          patientValues.some((value) => value.includes(normalizedPatient))) &&
        (treatmentFilter === "ALL" ||
          String(appointment.treatment_name || "") === treatmentFilter)
      );
    });
  }, [
    sortedAppointments,
    tokenFilter,
    slotFilter,
    patientFilter,
    treatmentFilter,
  ]);

  useEffect(() => {
    setAppointmentsPage(1);
  }, [dateStr, tokenFilter, slotFilter, patientFilter, treatmentFilter]);

  // Call Next Ready Token
  const handleCallNext = async () => {
    if (isCallingNext) return;
    setIsCallingNext(true);
    try {
      const todayAppts = appointments.filter(
        (a: any) => a.appointment_date === dateStr,
      );
      if (todayAppts.length === 0) {
        addToast("No appointments found for today.", "warning");
        return;
      }
      const slotId = todayAppts[0].fk_slot_id;
      const branchId = todayAppts[0].fk_branch_id;

      const res = await fetch(`/api/v1/live-queue/${slotId}/call-next`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch_id: branchId,
          appointment_date: dateStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("Next patient called successfully", "success");
        fetchAppointments();
      } else {
        addToast(data.message || "No ready patient to call", "warning");
      }
    } catch (err) {
      console.error("Call next error:", err);
      addToast("Failed to call next patient", "error");
    } finally {
      setIsCallingNext(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-[#549E9E] p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              {t("receptionist.dashboard_title", "Receptionist Dashboard")}
            </h3>
            <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mt-1">
              {t("receptionist.manage_portal", "Manage Portal")}
            </p>
          </div>

          <div className="flex gap-2 bg-black/10 p-1 rounded-xl w-full sm:w-max overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "queue"
                  ? "bg-white text-[#549E9E] shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              <Calendar size={14} /> {t("receptionist.queue", "Queue")}
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "billing"
                  ? "bg-white text-[#549E9E] shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              <FileText size={14} /> {t("receptionist.billing", "Billing")}
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "layout"
                  ? "bg-white text-[#549E9E] shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              <Settings size={14} />{" "}
              {t("receptionist.token_layout", "Token Layout")}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setShowNotificationsDropdown(!showNotificationsDropdown)
              }
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 text-gray-800"
                >
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-[#549E9E] uppercase tracking-wider hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notificationHistory.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-gray-400">
                        No recent notifications
                      </div>
                    ) : (
                      notificationHistory.map((notif) => (
                        <div
                          key={notif.notification_id}
                          className={`p-3 border-b border-gray-50 text-xs ${!notif.is_read ? "bg-blue-50/30" : ""}`}
                        >
                          <p className="font-bold text-gray-800 mb-1">
                            {notif.title}
                          </p>
                          <p className="text-gray-500">{notif.message}</p>
                          <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {activeTab === "queue" && (
        <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 md:grid-cols-2 xl:grid-cols-6 items-end">
            <CustomDatePicker
              label={t("receptionist.filter_date", "Filter Date")}
              value={dateStr}
              onChange={(nextDate) => {
                userPickedFilterDateRef.current = true;
                setDateStr(nextDate);
              }}
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Token Number
              </label>
              <input
                type="text"
                value={tokenFilter}
                onChange={(event) => setTokenFilter(event.target.value)}
                placeholder="M-1, E-2 or 2"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#549E9E]/20 placeholder:text-gray-300"
              />
            </div>
            <FilterDropdown
              label="Slot"
              icon={Clock}
              value={slotFilter}
              onChange={(value) => setSlotFilter(value as "ALL" | "M" | "E")}
              options={[
                { id: "ALL", label: "All Slots" },
                { id: "M", label: "M Slot" },
                { id: "E", label: "E Slot" },
              ]}
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Patient Name
              </label>
              <input
                type="text"
                value={patientFilter}
                onChange={(event) => setPatientFilter(event.target.value)}
                placeholder="Search patient"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#549E9E]/20 placeholder:text-gray-300"
              />
            </div>
            <FilterDropdown
              label="Treatment Type"
              icon={Stethoscope}
              value={treatmentFilter}
              onChange={setTreatmentFilter}
              options={[
                { id: "ALL", label: "All Treatments" },
                ...treatmentOptions.map((treatmentName) => ({
                  id: treatmentName,
                  label: treatmentName,
                })),
              ]}
            />
            <button
              onClick={fetchAppointments}
              className="h-[42px] cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-[#549E9E]/5 rounded-xl"
            >
              <RefreshCcw
                size={16}
                className={isLoadingAppointments ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl sm:rounded-none overflow-hidden">
            {/* === MOBILE CARD VIEW === */}
            <div className="sm:hidden divide-y divide-gray-100">
              {isLoadingAppointments && appointments.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-bold">No appointments match these filters.</div>
              ) : (
                filteredAppointments
                  .slice((appointmentsPage - 1) * pageSize, appointmentsPage * pageSize)
                  .map((app) => (
                    <div
                      key={app.appointment_id}
                      className={`p-4 ${app.is_shifted ? "bg-orange-50/30" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-gray-50 rounded-lg">
                          {getSessionQueuePosition(app) != null && (
                            <span
                              title={app.position_explanation || undefined}
                              className="text-[8px] font-black text-gray-900 bg-yellow-300 border border-yellow-400 px-1 rounded shadow-sm"
                            >
                              Pos #{getSessionQueuePosition(app)}
                            </span>
                          )}
                          <span className="text-lg font-black text-[#549E9E]">
                            #{app.display_token_display ?? app.current_token_number ?? app.token_number ?? "-"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-gray-800 uppercase tracking-wider truncate">
                              {app.patient_full_name}
                            </p>
                            {app.booked_for_type === "FAMILY_MEMBER" && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase shrink-0">
                                {app.family_member_relationship}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[10px] font-bold text-gray-500">{app.patient_mobile_no}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {app.queue_bucket ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${app.queue_bucket === "IN_PROGRESS" ? "bg-primary-teal/10 text-primary-teal border-primary-teal/20" :
                                  app.queue_bucket === "READY" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    app.queue_bucket === "CALLED" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      app.queue_bucket === "NOT_ARRIVED" ? "bg-gray-100 text-gray-500 border-gray-200" :
                                        app.queue_bucket === "CHECKED_IN" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                          "bg-gray-50 text-gray-500 border-gray-100"
                                }`}>
                                {app.queue_bucket.replace(/_/g, " ")}
                              </span>
                            ) : null}
                            {app.consultation_payment_status && (
                              <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${app.consultation_payment_status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                                }`}>
                                {app.consultation_payment_status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] font-bold text-gray-400">{app.treatment_name} • {app.start_time}-{app.end_time}</span>
                          </div>
                          {app.template_start_time && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={10} className="text-indigo-400" />
                              <span className="text-[10px] font-bold text-indigo-500">
                                Planned: {app.template_start_time}
                              </span>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
                            {["Cancelled", "Completed"].includes(app.status) ? (
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{app.status}</span>
                            ) : app.reception_status === "APPROVED_BY_RECEPTION" ? (
                              <>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                  {app.checked_in_at ? `Checked In: ${new Date(app.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Approved"}
                                </span>
                                {canShowCheckInButton(app) && (
                                  <button onClick={() => performCheckIn(app.appointment_id)} disabled={isCheckingIn} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-60 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-blue-100">
                                    Check-In
                                  </button>
                                )}
                                {app.consultation_payment_status === "UNPAID" && (
                                  <button
                                    onClick={() => openConsultationPaymentModal(app)}
                                    className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-orange-100 whitespace-nowrap"
                                  >
                                    Collect Payment
                                  </button>
                                )}
                              </>
                            ) : app.reception_status === "REJECTED_BY_RECEPTION" ? (
                              <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">Rejected</span>
                            ) : (
                              <>
                                <button onClick={() => openVitalsModal(app)} className="bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-sky-100 flex items-center gap-1">
                                  <Activity size={12} /> Vitals
                                </button>
                                <button onClick={() => openExtendedHistoryModal(app)} className="bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-teal-100 flex items-center gap-1">
                                  <ClipboardList size={12} /> History
                                </button>
                                <button onClick={() => handleApprove(app.appointment_id)} className="bg-[#549E9E] text-white hover:bg-[#468686] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm shadow-[#549E9E]/20 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Approve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
            {/* === DESKTOP TABLE VIEW === */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.token", "Token")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.patient", "Patient")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.details", "Details")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.queue", "Queue")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.status_source", "Status/Source")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                      {t("receptionist.payment", "Payment")}
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest text-center">
                      {t("receptionist.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoadingAppointments && appointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-gray-400 font-bold"
                      >
                        No appointments match these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments
                      .slice(
                        (appointmentsPage - 1) * pageSize,
                        appointmentsPage * pageSize,
                      )
                      .map((app) => (
                        <tr
                          key={app.appointment_id}
                          className={`hover:bg-[#549E9E]/5 transition-colors ${app.is_shifted ? "bg-orange-50/30" : ""}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              {getSessionQueuePosition(app) != null && (
                                <span
                                  title={app.position_explanation || undefined}
                                  className="text-[9px] font-black text-gray-900 bg-yellow-300 border border-yellow-400 px-1.5 py-0.5 rounded text-center mb-1 shadow-sm"
                                >
                                  Pos #{getSessionQueuePosition(app)}
                                </span>
                              )}
                              <span className="text-xl font-black text-[#549E9E]">
                                #
                                {app.display_token_display ??
                                  app.current_token_number ??
                                  app.token_number ??
                                  "-"}
                              </span>
                              {getActiveQueuePosition(app) != null &&
                                app.completed_before != null &&
                                app.completed_before > 0 && (
                                  <span
                                    title={app.position_explanation || undefined}
                                    className="text-[8px] font-bold text-gray-500 text-center mt-0.5"
                                  >
                                    Live #{getActiveQueuePosition(app)} · {app.completed_before} done
                                  </span>
                                )}
                              {Boolean(app.is_shifted) && (
                                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mt-1">
                                  Shifted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                {app.patient_full_name}
                                {app.booked_for_type === "FAMILY_MEMBER" && (
                                  <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                    {app.family_member_relationship}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500">
                                {app.patient_mobile_no}
                                {app.booked_for_type === "FAMILY_MEMBER" &&
                                  app.primary_patient_full_name && (
                                    <span className="text-gray-400">
                                      {" "}
                                      (Account: {app.primary_patient_full_name})
                                    </span>
                                  )}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">
                                {app.treatment_name}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {app.start_time} - {app.end_time}
                              </span>
                              {app.template_start_time && (
                                <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} className="text-indigo-400" />
                                  Planned: {app.template_start_time}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              {app.queue_bucket ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${app.queue_bucket === "IN_PROGRESS"
                                      ? "bg-primary-teal/10 text-primary-teal border-primary-teal/20"
                                      : app.queue_bucket === "READY"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : app.queue_bucket === "CALLED"
                                          ? "bg-amber-50 text-amber-600 border-amber-100"
                                          : app.queue_bucket === "NOT_ARRIVED"
                                            ? "bg-gray-100 text-gray-500 border-gray-200"
                                            : app.queue_bucket === "CHECKED_IN"
                                              ? "bg-blue-50 text-blue-600 border-blue-100"
                                              : "bg-gray-50 text-gray-500 border-gray-100"
                                    }`}
                                >
                                  {app.queue_bucket.replace(/_/g, " ")}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-300 font-bold">
                                  —
                                </span>
                              )}
                              {app.checked_in_at && (
                                <span className="text-[8px] font-bold text-blue-500">
                                  Arrived:{" "}
                                  {new Date(app.checked_in_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              )}
                              {app.queue_bucket === "NOT_ARRIVED" &&
                                app.live_estimated_start_at && (
                                  <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                                    <Clock size={9} />
                                    Est.{" "}
                                    {new Date(
                                      app.live_estimated_start_at,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${app.booked_by_type === "RECEPTIONIST"
                                  ? "bg-purple-50 text-purple-600 border-purple-100"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                }`}
                            >
                              {app.booked_by_type || "SELF"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {app.consultation_payment_status ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${app.consultation_payment_status === "PAID"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-orange-50 text-orange-600 border-orange-100"
                                    }`}
                                >
                                  {app.consultation_payment_status}
                                </span>
                                {app.consultation_payment_settlement_type ===
                                  "FOLLOW_UP" && (
                                    <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-blue-50 text-blue-600 border-blue-100">
                                      FOLLOW_UP
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {["Cancelled", "Completed"].includes(app.status) ? (
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {app.status}
                              </span>
                            ) : app.reception_status ===
                              "APPROVED_BY_RECEPTION" ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                  {app.checked_in_at ? `Checked In: ${new Date(app.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Approved"}
                                </span>
                                {canShowCheckInButton(app) && (
                                  <button
                                    onClick={() =>
                                      performCheckIn(app.appointment_id)
                                    }
                                    disabled={isCheckingIn}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-60 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-blue-100 whitespace-nowrap"
                                  >
                                    Check-In
                                  </button>
                                )}
                                {app.queue_bucket !== "IN_PROGRESS" &&
                                  app.queue_bucket !== "CALLED" && (
                                    <button
                                      onClick={() =>
                                        handleReject(app.appointment_id)
                                      }
                                      className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-red-100 flex items-center justify-center gap-1 whitespace-nowrap"
                                    >
                                      <XCircle size={12} /> Reject
                                    </button>
                                  )}
                              </div>
                            ) : app.reception_status ===
                              "REJECTED_BY_RECEPTION" ? (
                              <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                Rejected
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openVitalsModal(app)}
                                  className="bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-sky-100 flex items-center justify-center gap-1 whitespace-nowrap"
                                >
                                  <Activity size={12} /> Vitals
                                </button>
                                <button
                                  onClick={() => openExtendedHistoryModal(app)}
                                  className="bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-teal-100 flex items-center justify-center gap-1 whitespace-nowrap"
                                  title="Extended Patient History & Examination"
                                >
                                  <ClipboardList size={12} /> History
                                </button>
                                <button
                                  onClick={() => handleReject(app.appointment_id)}
                                  className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-red-100 flex items-center justify-center gap-1 whitespace-nowrap"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                                <button
                                  onClick={() =>
                                    handleApprove(app.appointment_id)
                                  }
                                  className="bg-[#549E9E] text-white hover:bg-[#468686] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm shadow-[#549E9E]/20 flex items-center justify-center gap-1 whitespace-nowrap"
                                >
                                  <CheckCircle2 size={12} /> Approve
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={appointmentsPage}
              totalPages={Math.ceil(filteredAppointments.length / pageSize)}
              onPageChange={setAppointmentsPage}
            />
          </div>
        </div>
      )}

          {activeTab === "billing" && (
            <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex flex-wrap gap-4">
                  <FilterDropdown
                    className="w-48"
                    label={t("receptionist.bill_type", "Bill Type")}
                    icon={IndianRupee}
                    value={billTypeFilter}
                    onChange={(value) => setBillTypeFilter(value as any)}
                    options={[
                      {
                        id: "ALL",
                        label: t("receptionist.all_types", "All Types"),
                      },
                      {
                        id: "CONSULTATION",
                        label: t("receptionist.consultation", "Consultation"),
                      },
                      {
                        id: "MEDICATION",
                        label: t("receptionist.medication", "Medication"),
                      },
                    ]}
                  />
                  <FilterDropdown
                    className="w-40"
                    label={t("receptionist.status", "Status")}
                    icon={Tags}
                    value={billStatusFilter}
                    onChange={(value) => setBillStatusFilter(value as any)}
                    options={[
                      {
                        id: "ALL",
                        label: t("receptionist.all_status", "All Status"),
                      },
                      {
                        id: "UNPAID",
                        label: t("receptionist.unpaid", "Unpaid"),
                      },
                      {
                        id: "PAID",
                        label: t("receptionist.paid", "Paid"),
                      },
                      {
                        id: "PARTIAL",
                        label: t("receptionist.partial", "Partial"),
                      },
                    ]}
                  />
                </div>
                <button
                  onClick={fetchBills}
                  className="h-[42px] cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 text-xs font-black uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-[#549E9E]/5 rounded-xl"
                >
                  <RefreshCcw
                    size={16}
                    className={isLoadingBills ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-xl sm:rounded-none overflow-hidden">
                {/* === MOBILE CARD VIEW === */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {isLoadingBills && bills.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                  ) : bills.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-bold">No bills found.</div>
                  ) : (
                    bills
                      .slice((billsPage - 1) * pageSize, billsPage * pageSize)
                      .map((bill) => (
                        <div key={bill.bill_id} className="p-4 hover:bg-gray-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-black text-[#549E9E] block">BILL-{bill.bill_id}</span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{bill.bill_type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-gray-800 block">₹{bill.total_amount}</span>
                              {bill.pending_amount > 0 && <span className="text-[10px] font-bold text-orange-500 block">Pending: ₹{bill.pending_amount}</span>}
                            </div>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm font-black text-gray-800 uppercase tracking-wider block">
                              {bill.patient_full_name || "N/A"}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 block">{bill.patient_mobile_no}</span>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                            <span className="text-[10px] font-bold text-gray-400">{new Date(bill.created_at).toLocaleDateString()}</span>
                            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${bill.bill_status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                bill.bill_status === "UNPAID" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                  "bg-blue-50 text-blue-600 border-blue-100"
                              }`}>
                              {bill.bill_status}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                {/* === DESKTOP TABLE VIEW === */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                          {t("receptionist.bill_id_type", "Bill ID & Type")}
                        </th>
                        <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                          {t("receptionist.patient_details", "Patient & Details")}
                        </th>
                        <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                          {t("receptionist.date", "Date")}
                        </th>
                        <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                          {t("receptionist.amount", "Amount")}
                        </th>
                        <th className="px-5 py-4 text-xs font-black text-gray-800 uppercase tracking-widest">
                          {t("receptionist.status", "Status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {isLoadingBills && bills.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            Loading...
                          </td>
                        </tr>
                      ) : bills.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-gray-400 font-bold"
                          >
                            No bills found.
                          </td>
                        </tr>
                      ) : (
                        bills
                          .slice((billsPage - 1) * pageSize, billsPage * pageSize)
                          .map((bill) => (
                            <tr
                              key={bill.bill_id}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-[#549E9E]">
                                    BILL-{bill.bill_id}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {bill.bill_type}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                    {bill.patient_full_name || "N/A"}
                                    {bill.booked_for_type === "FAMILY_MEMBER" && (
                                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                                        {bill.family_member_relationship}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500">
                                    {bill.patient_mobile_no}
                                    {bill.booked_for_type === "FAMILY_MEMBER" &&
                                      bill.primary_patient_full_name && (
                                        <span className="text-gray-400">
                                          {" "}
                                          (Account: {bill.primary_patient_full_name})
                                        </span>
                                      )}
                                  </span>
                                  {bill.treatment_name && (
                                    <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                                      {bill.treatment_name}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs font-bold text-gray-600">
                                  {new Date(bill.created_at).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-800">
                                    ₹{bill.total_amount}
                                  </span>
                                  {bill.pending_amount > 0 && (
                                    <span className="text-[10px] font-bold text-orange-500">
                                      Pending: ₹{bill.pending_amount}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${bill.bill_status === "PAID"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : bill.bill_status === "UNPAID"
                                        ? "bg-orange-50 text-orange-600 border-orange-100"
                                        : "bg-blue-50 text-blue-600 border-blue-100"
                                    }`}
                                >
                                  {bill.bill_status}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={billsPage}
                  totalPages={Math.ceil(bills.length / pageSize)}
                  onPageChange={setBillsPage}
                />
              </div>
            </div>
          )}

              {activeTab === "layout" && (
                <TokenLayoutManager
                  token={token}
                  addToast={addToast}
                  branchId={selectedBranchId}
                />
              )}
              {/* Footer Decoration */}
              <div className="fixed bottom-0 left-0 w-full h-1 flex opacity-20">
                <div className="bg-blue-500 flex-1" />
                <div className="bg-emerald-500 flex-1" />
                <div className="bg-purple-500 flex-1" />
                <div className="bg-primary-teal flex-1" />
              </div>

              {/* Rejection Modal */}
              <AnimatePresence>
                {isVitalsModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={closeVitalsModal}
                      className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Activity size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-1">
                          {t("receptionist.optional_vitals", "Vitals (Optional)")}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {vitalsAppointment?.full_name ||
                            t("receptionist.patient", "Patient")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            O2 / SPO2
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={vitalsO2Value}
                              onChange={(e) => setVitalsO2Value(e.target.value)}
                              placeholder="98"
                              disabled={isSavingVitals}
                              className="w-full bg-gray-50 border-none rounded-[24px] py-4 pl-6 pr-12 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                              %
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            BP
                          </label>
                          <input
                            type="text"
                            value={vitalsBpValue}
                            onChange={(e) => setVitalsBpValue(e.target.value)}
                            placeholder="120/80"
                            disabled={isSavingVitals}
                            className="w-full bg-gray-50 border-none rounded-[24px] py-4 px-6 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            Height
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={vitalsHeightValue}
                              onChange={(e) => setVitalsHeightValue(e.target.value)}
                              placeholder={vitalsHeightUnit === "cm" ? "170" : `5'8"`}
                              disabled={isSavingVitals}
                              className="w-full bg-gray-50 border-none rounded-[24px] py-4 pl-6 pr-20 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setVitalsHeightUnit(
                                  vitalsHeightUnit === "cm" ? "ft" : "cm",
                                )
                              }
                              disabled={isSavingVitals}
                              className="absolute right-4 bg-[#549E9E]/10 hover:bg-[#549E9E]/20 text-[#549E9E] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                              {vitalsHeightUnit}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            Weight
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={vitalsWeightValue}
                              onChange={(e) => setVitalsWeightValue(e.target.value)}
                              placeholder="65"
                              disabled={isSavingVitals}
                              className="w-full bg-gray-50 border-none rounded-[24px] py-4 pl-6 pr-14 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                              kg
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-400 font-bold mt-5 px-1">
                        {t(
                          "receptionist.vitals_optional_note",
                          "Sab fields optional hain. Jo available ho wahi save karo.",
                        )}
                      </p>

                      <div className="flex gap-4 pt-6">
                        <button
                          onClick={closeVitalsModal}
                          disabled={isSavingVitals}
                          className="flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          {t("common.logout_modal.cancel", "Cancel")}
                        </button>
                        <button
                          onClick={saveVitals}
                          disabled={isSavingVitals}
                          className={`flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isSavingVitals ? "bg-gray-300 shadow-none" : "bg-[#549E9E] shadow-[#549E9E]/20 hover:bg-[#468686]"}`}
                        >
                          {isSavingVitals ? (
                            <RefreshCcw size={14} className="animate-spin" />
                          ) : (
                            <>{t("receptionist.save_vitals", "Save Vitals")}</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Extended Patient History & Examination Modal */}
              <AnimatePresence>
                {isExtendedHistoryModalOpen && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 no-print">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]"
                    >
                      <div className="bg-gradient-to-r from-[#549E9E] to-teal-700 p-4 text-white flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                            <ClipboardList size={22} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-base uppercase tracking-wider text-white">
                              Extended Patient History & Examination
                            </h3>
                            <p className="text-xs text-white/80 font-bold">
                              Comprehensive EMR medical records, lifestyle, examinations & observations ({historyAppointment?.patient_full_name || "Patient"})
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={closeExtendedHistoryModal}
                          disabled={isSavingHistory}
                          className="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div
                        className="p-6 overflow-y-auto space-y-6 flex-1 h-full min-h-0"
                        style={{ overscrollBehavior: "contain" }}
                      >
                        {/* Basic & Lifestyle */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                          <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
                            Basic & Lifestyle
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Occupation
                              </label>
                              <input
                                type="text"
                                disabled={isSavingHistory}
                                value={extOccupation}
                                onChange={(e) => setExtOccupation(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
                                placeholder="e.g. Teacher, Engineer..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Personal & Social History
                              </label>
                              <input
                                type="text"
                                disabled={isSavingHistory}
                                value={extPersonalSocialHistory}
                                onChange={(e) => setExtPersonalSocialHistory(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
                                placeholder="e.g. Smoking, Alcohol..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Medical History */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                          <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
                            Medical History
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                History of Present Illness
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extHistoryPresentIllness}
                                onChange={(e) => setExtHistoryPresentIllness(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Details of current illness..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                History of Past Illness
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extHistoryPastIllness}
                                onChange={(e) => setExtHistoryPastIllness(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Details of past illnesses..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Family History
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extFamilyHistory}
                                onChange={(e) => setExtFamilyHistory(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Relevant family diseases..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Allergies History
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extAllergiesHistory}
                                onChange={(e) => setExtAllergiesHistory(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Known allergies..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Specialty & Mind */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                          <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
                            Specialty & Mind
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Gynecological History
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extGynecologicalHistory}
                                onChange={(e) => setExtGynecologicalHistory(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Gynecological details (if applicable)..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Mental / Mind Status
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extMentalMindStatus}
                                onChange={(e) => setExtMentalMindStatus(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Psychological assessment..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Examinations */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                          <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
                            Examinations
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                General Examination
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extGeneralExamination}
                                onChange={(e) => setExtGeneralExamination(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="General physical exam findings..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Systematic Examination
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extSystematicExamination}
                                onChange={(e) => setExtSystematicExamination(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="System-specific exam findings..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Diagnosis & Follow Up */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                          <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
                            Diagnosis & Follow Up
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Disease
                              </label>
                              <input
                                type="text"
                                disabled={isSavingHistory}
                                value={extDisease}
                                onChange={(e) => setExtDisease(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
                                placeholder="Identified disease..."
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Follow Up Advice
                              </label>
                              <input
                                type="text"
                                disabled={isSavingHistory}
                                value={extFollowUp}
                                onChange={(e) => setExtFollowUp(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
                                placeholder="Next visit instructions..."
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                                Differential Diagnosis
                              </label>
                              <textarea
                                disabled={isSavingHistory}
                                value={extDifferentialDiagnosis}
                                onChange={(e) => setExtDifferentialDiagnosis(e.target.value)}
                                rows={2}
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                                placeholder="Possible alternative diagnoses..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={saveExtendedHistory}
                          disabled={isSavingHistory}
                          className="px-5 py-2.5 bg-[#549E9E] hover:bg-[#438787] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-60"
                        >
                          {isSavingHistory ? (
                            <RefreshCcw size={14} className="animate-spin" />
                          ) : null}
                          SAVE & CLOSE
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Rejection Modal */}
              <AnimatePresence>
                {isRejectModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !isRejecting && setIsRejectModalOpen(false)}
                      className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
                    >
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <XCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-2">
                          {isBulkReject
                            ? `Reject ${selectedAppointmentIds.length} Appointments`
                            : "Reject Appointment"}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Please provide a valid reason for rejection
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            Reason for Rejection
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Missing required clinical data..."
                            className="w-full bg-gray-50 border-none rounded-[24px] py-4 px-6 outline-none text-gray-700 font-medium min-h-[120px] focus:ring-2 focus:ring-[#549E9E]/20 transition-all resize-none"
                            disabled={isRejecting}
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            onClick={() => setIsRejectModalOpen(false)}
                            disabled={isRejecting}
                            className="flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmRejection}
                            disabled={isRejecting || !rejectionReason.trim()}
                            className={`flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isRejecting || !rejectionReason.trim()
                                ? "bg-gray-300 shadow-none"
                                : "bg-red-500 shadow-red-500/20 hover:bg-red-600"
                              }`}
                          >
                            {isRejecting ? (
                              <RefreshCcw size={14} className="animate-spin" />
                            ) : (
                              <>Confirm Reject</>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Not Available Modal */}
              <AnimatePresence>
                {isNotAvailableModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() =>
                        !isMarkingNotAvailable && setIsNotAvailableModalOpen(false)
                      }
                      className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 text-center"
                    >
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-2">
                        Mark Not Available?
                      </h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
                        This patient's token will be shifted.
                      </p>

                      <div className="flex gap-4 pt-2">
                        <button
                          onClick={() => setIsNotAvailableModalOpen(false)}
                          disabled={isMarkingNotAvailable}
                          className="flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmNotAvailable}
                          disabled={isMarkingNotAvailable}
                          className={`flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isMarkingNotAvailable
                              ? "bg-gray-300 shadow-none"
                              : "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600"
                            }`}
                        >
                          {isMarkingNotAvailable ? (
                            <RefreshCcw size={14} className="animate-spin" />
                          ) : (
                            <>Confirm</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isCheckInPromptOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !isCheckingIn && closeCheckInPrompt()}
                      className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-1">
                          {t("receptionist.check_in_patient", "Check-In Patient?")}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {t(
                            "receptionist.payment_completed",
                            "Payment completed successfully",
                          )}
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 text-center leading-relaxed">
                        {t(
                          "receptionist.check_in_prompt",
                          "Kya patient ko abhi check-in bhi karna hai? Agar nahi, to baad me list wale Check-In button se kar sakte ho.",
                        )}
                      </p>

                      <div className="flex gap-4 pt-6">
                        <button
                          onClick={closeCheckInPrompt}
                          disabled={isCheckingIn}
                          className="flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          {t("receptionist.no_later", "No, Later")}
                        </button>
                        <button
                          onClick={async () => {
                            if (!checkInPromptAppointmentId) return;
                            const ok = await performCheckIn(
                              checkInPromptAppointmentId,
                              { silent: true },
                            );
                            if (ok) {
                              addToast(
                                "Payment collected and patient checked in",
                                "success",
                              );
                              closeCheckInPrompt();
                            }
                          }}
                          disabled={isCheckingIn || !checkInPromptAppointmentId}
                          className={`flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isCheckingIn || !checkInPromptAppointmentId
                              ? "bg-gray-300 shadow-none"
                              : "bg-[#549E9E] shadow-[#549E9E]/20 hover:bg-[#468686]"
                            }`}
                        >
                          {isCheckingIn ? (
                            <RefreshCcw size={14} className="animate-spin" />
                          ) : (
                            <>{t("receptionist.yes_check_in", "Yes, Check-In")}</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Payment Modal */}
              <AnimatePresence>
                {isPaymentModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !isApproving && setIsPaymentModalOpen(false)}
                      className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-1">
                          {t("receptionist.approve_collect", "Approve & Collect")}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {t("receptionist.consultation_fee", "Consultation Fee")}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() =>
                              setPaymentData({ ...paymentData, payment_mode: "CASH" })
                            }
                            className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${paymentData.payment_mode === "CASH" ? "bg-[#549E9E] text-white shadow-lg shadow-[#549E9E]/30" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                          >
                            {t("receptionist.cash", "Cash")}
                          </button>
                          <button
                            onClick={() =>
                              setPaymentData({ ...paymentData, payment_mode: "ONLINE" })
                            }
                            className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${paymentData.payment_mode === "ONLINE" ? "bg-[#549E9E] text-white shadow-lg shadow-[#549E9E]/30" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                          >
                            {t("receptionist.online_upi", "Online / UPI")}
                          </button>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            {t("receptionist.amount", "Amount")}
                          </label>
                          <input
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, amount: e.target.value })
                            }
                            placeholder="e.g. 500"
                            className="w-full bg-gray-50 border-none rounded-[24px] py-4 px-6 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                          />
                        </div>

                        <AnimatePresence>
                          {paymentData.payment_mode === "ONLINE" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1 overflow-hidden"
                            >
                              <div className="pt-2">
                                <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                                  {t("receptionist.transaction_ref", "Transaction Ref")}
                                </label>
                                <input
                                  type="text"
                                  value={paymentData.transaction_reference}
                                  onChange={(e) =>
                                    setPaymentData({
                                      ...paymentData,
                                      transaction_reference: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. UPI-REF-12345"
                                  className="w-full bg-gray-50 border-none rounded-[24px] py-4 px-6 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest pl-4">
                            {t("receptionist.remark_optional", "Remark (Optional)")}
                          </label>
                          <input
                            type="text"
                            value={paymentData.remark}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, remark: e.target.value })
                            }
                            className="w-full bg-gray-50 border-none rounded-[24px] py-4 px-6 outline-none text-gray-700 font-medium focus:ring-2 focus:ring-[#549E9E]/20 transition-all"
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            onClick={() => setIsPaymentModalOpen(false)}
                            disabled={isApproving}
                            className="flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            {t("common.logout_modal.cancel", "Cancel")}
                          </button>
                          <button
                            onClick={confirmPayment}
                            disabled={isApproving || !paymentData.amount}
                            className={`flex-1 py-4 px-6 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isApproving || !paymentData.amount
                                ? "bg-gray-300 shadow-none"
                                : "bg-[#549E9E] shadow-[#549E9E]/20 hover:bg-[#468686]"
                              }`}
                          >
                            {isApproving ? (
                              <RefreshCcw size={14} className="animate-spin" />
                            ) : (
                              <>
                                {t("receptionist.confirm_collect", "Confirm & Collect")}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
}
