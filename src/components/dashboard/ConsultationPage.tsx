import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Pill,
  Plus,
  Trash2,
  Minus,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  X,
  AlertCircle,
  RefreshCcw,
  ChevronDown,
  ClipboardList,
  WandSparkles,
  RotateCcw,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { useDoctorFormulaMaster } from "../../context/DoctorFormulaMasterContext";
import { useTranslation } from "react-i18next";
import {
  getDosePreview,
  getMedicationPricingAmount,
  getMedicationRoleLabel,
} from "../../utils/prescriptionFormat";
import { parseDoctorFormulaInput } from "../../utils/doctorFormulaParser";

type MedicationEntry = {
  name: string;
  doses: {
    morning: number;
    afternoon: number;
    night: number;
  };
  amount: string;
  baseAmount?: string;
  isQuickFormulaDerived?: boolean;
  quickFormulaToken?: string;
  originalDoses?: {
    morning: number;
    afternoon: number;
    night: number;
  };
};

type TextMedicine = {
  id: number;
  medicine_value: string;
  normalized_value: string;
  medical_products?: any[];
  products: any[];
  radient_pharma_products: any[];
  handwritten_product_prices: any[];
};

type VariantInfo = {
  label: string;
  price: string;
  type: string;
};

type OtherMedEntry = {
  name: string;
  selectedVariant?: VariantInfo | null;
  remark: string;
  amount: string;
};

type LabTestMaster = {
  id: number;
  test_name: string;
  sample_call: string | null;
  amount: string | number | null;
  test_type: string;
};

type TestEntry = {
  master_test_id?: number | null;
  test_name: string;
  amount: string;
};

function NumberDropdown({
  value,
  onChange,
  placeholder,
  disabled,
  options,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  options?: string[];
  id?: string;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const numbers =
    options || Array.from({ length: 148 }, (_, i) => (i + 3).toString());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = numbers.filter((num) =>
    num.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Tab") {
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      dropdownRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      className="relative outline-none rounded-xl focus:ring-4 focus:ring-[#549E9E]/30"
      ref={dropdownRef}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={handleKeyDown}
      id={id}
    >
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full pl-10 pr-4 py-3.5 bg-gray-50/50 border border-transparent rounded-xl font-bold text-sm transition-all text-gray-700 cursor-pointer flex justify-between items-center ${disabled ? "opacity-70 bg-gray-50 cursor-default" : "hover:border-[#549E9E]/30"} ${isOpen ? "border-[#549E9E] bg-white" : ""}`}
      >
        {!isOpen || disabled ? (
          <span className={!value ? "text-gray-400 font-normal" : ""}>
            {value || placeholder}
          </span>
        ) : (
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent outline-none text-sm text-gray-700 font-bold"
            placeholder={t(
              "consultation_modal.search_placeholder",
              "Search...",
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "Enter" ||
                e.key === "Escape" ||
                e.key === "Tab"
              ) {
                e.stopPropagation();
                handleKeyDown(e);
              }
            }}
          />
        )}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((num, i) => (
              <div
                key={num}
                onClick={() => handleSelect(num)}
                className={`px-4 py-2 hover:bg-[#549E9E]/10 hover:text-[#549E9E] cursor-pointer text-sm font-bold text-gray-700 ${i === highlightedIndex ? "bg-[#549E9E]/10 text-[#549E9E]" : ""} ${value === num ? "bg-[#549E9E]/5 text-[#549E9E]" : ""}`}
              >
                {num}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  id,
  allowCustom,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  id?: string;
  allowCustom?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const showCustomOption =
    allowCustom &&
    searchTerm.trim() &&
    !options.some(
      (opt) => opt.label.toLowerCase() === searchTerm.trim().toLowerCase(),
    );
  if (showCustomOption) {
    filteredOptions.push({
      label: `Use "${searchTerm.trim()}"`,
      value: searchTerm.trim(),
    });
  }

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const selectedOption =
    options.find((opt) => opt.value === value) ||
    options.find((opt) => opt.label === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === "Tab") {
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      dropdownRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      className="relative w-full outline-none rounded-xl focus:ring-4 focus:ring-[#549E9E]/30"
      ref={dropdownRef}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={handleKeyDown}
      id={id}
    >
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full px-4 py-3 bg-white border rounded-lg text-sm font-bold text-gray-800 transition-all flex justify-between items-center ${
          disabled
            ? "opacity-80 bg-gray-100 border-gray-200 cursor-default"
            : "border-gray-200 cursor-text focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10"
        }`}
      >
        {!isOpen || disabled ? (
          <span className={`truncate ${!displayValue ? "text-gray-400" : ""}`}>
            {displayValue || placeholder}
          </span>
        ) : (
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent outline-none text-sm font-bold text-gray-800"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "Enter" ||
                e.key === "Escape" ||
                e.key === "Tab"
              ) {
                e.stopPropagation();
                handleKeyDown(e);
              }
            }}
          />
        )}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => (
              <div
                key={i}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-2 hover:bg-[#549E9E]/10 hover:text-[#549E9E] cursor-pointer text-sm text-gray-700 ${i === highlightedIndex ? "bg-[#549E9E]/10 text-[#549E9E] font-bold" : ""} ${value === opt.value || value === opt.label ? "bg-[#549E9E]/5 text-[#549E9E] font-bold" : ""}`}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConsultationPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const {
    snapshot: formulaSnapshot,
    isLoading: isFormulaLoading,
    refreshFormulaMaster,
  } = useDoctorFormulaMaster();

  const app = state?.app;
  const [appointmentDetail, setAppointmentDetail] = useState<any | null>(
    app || null,
  );
  const routeAppointmentId = Number(appointmentId || 0);
  const normalizedRouteAppointmentId =
    Number.isFinite(routeAppointmentId) && routeAppointmentId > 0
      ? routeAppointmentId
      : null;
  const appointmentDetailMatchesRoute =
    appointmentDetail &&
    (!normalizedRouteAppointmentId ||
      Number(appointmentDetail.appointment_id) ===
        normalizedRouteAppointmentId);
  const stateAppMatchesRoute =
    app &&
    (!normalizedRouteAppointmentId ||
      Number(app.appointment_id) === normalizedRouteAppointmentId);
  const currentApp = appointmentDetailMatchesRoute
    ? appointmentDetail
    : stateAppMatchesRoute
      ? app
      : null;
  const isAppointmentContextReady =
    Boolean(currentApp?.appointment_id) &&
    (!normalizedRouteAppointmentId ||
      Number(currentApp.appointment_id) === normalizedRouteAppointmentId);
  const [followUpChain, setFollowUpChain] = useState<any[]>([]);

  const [chiefComplaints, setChiefComplaints] = useState(app?.symptoms || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [hasNoAdvice, setHasNoAdvice] = useState(false);
  const [consultationMode, setConsultationMode] = useState<
    "PHYSICAL_PRESENT" | "ON_CALL"
  >("PHYSICAL_PRESENT");
  const [o2Value, setO2Value] = useState("");
  const [bpValue, setBpValue] = useState("");
  const [heightValue, setHeightValue] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightValue, setWeightValue] = useState("");
  const [globalDuration, setGlobalDuration] = useState("15 Days");
  const [thirtyDaysDoseFrequency, setThirtyDaysDoseFrequency] = useState<
    "2" | "3"
  >("3");
  const [followUpPreset, setFollowUpPreset] = useState<
    "7" | "15" | "30" | "custom"
  >("15");
  const [customFollowUpDays, setCustomFollowUpDays] = useState("");
  const [repeatedFromConsultationId, setRepeatedFromConsultationId] = useState<
    number | null
  >(null);
  const [isLoadingRepeatDraft, setIsLoadingRepeatDraft] = useState(false);
  const [quickNumericInput, setQuickNumericInput] = useState("");
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(true);
  const [lastAppliedQuickFormulaVersion, setLastAppliedQuickFormulaVersion] =
    useState<number | null>(null);
  const [lastAppliedQuickFormulaSetId, setLastAppliedQuickFormulaSetId] =
    useState<number | null>(null);
  const [medications, setMedications] = useState<MedicationEntry[]>([
    { name: "", doses: { morning: 4, afternoon: 4, night: 4 }, amount: "" },
  ]);
  const [otherMedications, setOtherMedications] = useState<OtherMedEntry[]>([
    { name: "", remark: "", amount: "" },
  ]);
  const [tests, setTests] = useState<TestEntry[]>([
    { test_name: "", amount: "" },
  ]);
  const [textMedicines, setTextMedicines] = useState<TextMedicine[]>([]);
  const [labTests, setLabTests] = useState<LabTestMaster[]>([]);

  // Extended History Fields
  const [isExtendedHistoryOpen, setIsExtendedHistoryOpen] = useState(false);
  const [occupation, setOccupation] = useState("");
  const [historyPresentIllness, setHistoryPresentIllness] = useState("");
  const [historyPastIllness, setHistoryPastIllness] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [allergiesHistory, setAllergiesHistory] = useState("");
  const [gynecologicalHistory, setGynecologicalHistory] = useState("");
  const [personalSocialHistory, setPersonalSocialHistory] = useState("");
  const [generalExamination, setGeneralExamination] = useState("");
  const [systematicExamination, setSystematicExamination] = useState("");
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [mentalMindStatus, setMentalMindStatus] = useState("");
  const [disease, setDisease] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [followUpChainClosed, setFollowUpChainClosed] = useState(false);
  const [expandedChainAppointmentId, setExpandedChainAppointmentId] = useState<
    number | null
  >(null);

  useEffect(() => {
    setIsSubmitting(false);
    setIsReadOnly(false);
    setAppointmentDetail(stateAppMatchesRoute ? app : null);
  }, [appointmentId, stateAppMatchesRoute, app]);
  const isFollowUpVisit = useMemo(() => {
    const visitType = String(currentApp?.visit_type_code || "")
      .trim()
      .toUpperCase();
    const treatmentName = String(currentApp?.treatment_name || "")
      .trim()
      .toLowerCase();
    return (
      visitType === "FOLLOW_UP_VISIT" ||
      treatmentName === "follow-up visit" ||
      treatmentName === "follow up visit" ||
      treatmentName === "followup visit"
    );
  }, [currentApp?.treatment_name, currentApp?.visit_type_code]);
  const followUpAfterDays =
    followUpPreset === "custom"
      ? Number(customFollowUpDays)
      : Number(followUpPreset);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const res = await fetch("/api/v1/doctors/masters/text-medicines", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success && result.data) {
          if (Array.isArray(result.data.text_medicines)) {
            setTextMedicines(result.data.text_medicines);
          }
          if (Array.isArray(result.data.lab_tests)) {
            setLabTests(result.data.lab_tests);
          }
        }
      } catch (err) {
        console.error("Failed to fetch doctor masters:", err);
      }
    };

    if (token) {
      fetchMasters();
    }
  }, [token]);

  const getDurationMultiplier = (durationLabel: string) => {
    const normalized = String(durationLabel || "")
      .trim()
      .toLowerCase();
    if (normalized.startsWith("7")) return 1;
    if (normalized.startsWith("15")) return 2;
    if (normalized.startsWith("30")) return 3;
    return 1;
  };

  const scaleBaseAmountByDuration = (
    baseAmount: string | number,
    durationLabel: string,
  ) => {
    const parsedBaseAmount = Number(baseAmount);
    const safeBaseAmount =
      Number.isFinite(parsedBaseAmount) && parsedBaseAmount >= 0
        ? parsedBaseAmount
        : 0;
    return (safeBaseAmount * getDurationMultiplier(durationLabel)).toFixed(2);
  };

  const totalAmount = useMemo(() => {
    const parseAmount = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    const medicationTotal = medications.reduce(
      (sum, med) => sum + (med.name.trim() ? parseAmount(med.amount) : 0),
      0,
    );
    const otherMedicationTotal = otherMedications.reduce(
      (sum, med) => sum + (med.name.trim() ? parseAmount(med.amount) : 0),
      0,
    );
    const testsTotal = tests.reduce(
      (sum, test) =>
        sum + (test.test_name.trim() ? parseAmount(test.amount) : 0),
      0,
    );

    return (medicationTotal + otherMedicationTotal + testsTotal).toFixed(2);
  }, [medications, otherMedications, tests]);

  const quickFormulaPreview = useMemo(
    () => parseDoctorFormulaInput(quickNumericInput, formulaSnapshot),
    [quickNumericInput, formulaSnapshot],
  );

  const quickFormulaPreviewWithDuration = useMemo(
    () =>
      quickFormulaPreview.entries.map((entry) => ({
        ...entry,
        finalAmount: scaleBaseAmountByDuration(
          entry.baseAmount,
          globalDuration,
        ),
      })),
    [quickFormulaPreview.entries, globalDuration],
  );

  useEffect(() => {
    if (!app && !appointmentId) {
      navigate("/doctor-portal");
      return;
    }

    const fetchAppointmentDetail = async () => {
      if (!appointmentId) return;

      try {
        const res = await fetch(
          `/api/v1/doctors/appointments/${appointmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const result = await res.json();
        if (result.success && result.data) {
          setAppointmentDetail(result.data);
          if (Array.isArray(result.data.follow_up_chain)) {
            setFollowUpChain(result.data.follow_up_chain);
          }
          if (!app?.symptoms && result.data.symptoms) {
            setChiefComplaints(result.data.symptoms);
          }

          const canPrefillVitals =
            currentApp?.status?.toLowerCase() !== "completed";
          if (canPrefillVitals) {
            const incomingO2 = (result.data.oxygen_saturation || "")
              .replace("%", "")
              .trim();
            const incomingBp = (result.data.blood_pressure || "").trim();
            const incomingHeight = (result.data.patient_height || "").trim();
            const incomingWeight = (result.data.patient_weight || "")
              .replace("kg", "")
              .trim();

            if (!o2Value.trim() && incomingO2) {
              setO2Value(incomingO2);
            }
            if (!bpValue.trim() && incomingBp) {
              setBpValue(incomingBp);
            }
            if (!heightValue.trim() && incomingHeight) {
              if (incomingHeight.includes("cm")) {
                setHeightUnit("cm");
                setHeightValue(incomingHeight.replace("cm", "").trim());
              } else {
                setHeightUnit("ft");
                setHeightValue(incomingHeight);
              }
            }
            if (!weightValue.trim() && incomingWeight) {
              setWeightValue(incomingWeight);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch appointment detail", err);
      }
    };

    const fetchConsultation = async () => {
      // Only fetch existing consultation data for completed appointments
      if (currentApp?.status?.toLowerCase() !== "completed") return;

      setIsReadOnly(true);
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/v1/doctors/consultations/${currentApp?.appointment_id || appointmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const result = await res.json();
        if (result.success && result.data.consultation) {
          const c = result.data.consultation;
          const isNoPrescriptionConsultation =
            c.workflow_status === "COMPLETED_NO_PRESCRIPTION";
          setFollowUpChainClosed(Boolean(c.follow_up_chain_closed));
          if (Array.isArray(result.data.follow_up_chain)) {
            setFollowUpChain(result.data.follow_up_chain);
          }
          const pricing = result.data.pricing || null;
          const pricingByMedicationId = new Map(
            (pricing?.medications || []).map((item: any) => [
              Number(item.consultation_medication_id),
              item.amount,
            ]),
          );
          setChiefComplaints(c.symptoms || "");

          let advice = c.treatment_advice || "";
          if (advice.startsWith("Diagnosis: ")) {
            const parts = advice.split("\n\n");
            setDiagnosis(parts[0].replace("Diagnosis: ", ""));
            setTreatmentNotes(parts.slice(1).join("\n\n"));
          } else {
            setTreatmentNotes(advice);
          }
          setHasNoAdvice(isNoPrescriptionConsultation);

          setGlobalDuration(`${c.medication_duration_days} Days`);
          const loadedFollowUpDays = Number(c.follow_up_after_days || 15);
          if ([7, 15, 30].includes(loadedFollowUpDays)) {
            setFollowUpPreset(String(loadedFollowUpDays) as "7" | "15" | "30");
            setCustomFollowUpDays("");
          } else {
            setFollowUpPreset("custom");
            setCustomFollowUpDays(String(loadedFollowUpDays));
          }
          setRepeatedFromConsultationId(
            c.repeated_from_consultation_id
              ? Number(c.repeated_from_consultation_id)
              : null,
          );
          setFollowUp(c.follow_up || "");
          setConsultationMode(
            c.consultation_mode === "ON_CALL" ? "ON_CALL" : "PHYSICAL_PRESENT",
          );
          setO2Value((c.oxygen_saturation || "").replace("%", "").trim());
          setBpValue(c.blood_pressure || "");
          const loadedHeight = c.patient_height || "";
          if (loadedHeight.includes("cm")) {
            setHeightUnit("cm");
            setHeightValue(loadedHeight.replace("cm", "").trim());
          } else if (loadedHeight) {
            setHeightUnit("ft");
            setHeightValue(loadedHeight);
          }
          setWeightValue((c.patient_weight || "").replace("kg", "").trim());
          setQuickNumericInput(c.quick_formula_input || "");
          setLastAppliedQuickFormulaVersion(
            c.formula_version_used ? Number(c.formula_version_used) : null,
          );
          setLastAppliedQuickFormulaSetId(
            c.formula_set_id ? Number(c.formula_set_id) : null,
          );

          if (c.medications && c.medications.length > 0) {
            const parsedMeds: MedicationEntry[] = [];
            const otherMeds: OtherMedEntry[] = [];

            c.medications.forEach((m: any) => {
              if (m.medicine_type === "NUMERIC") {
                const medDoses = { morning: 0, afternoon: 0, night: 0 };

                if (m.doses && Array.isArray(m.doses)) {
                  m.doses.forEach((d: any) => {
                    const label = d.dose_label?.toLowerCase();
                    if (label === "morning")
                      medDoses.morning = d.balls_per_dose;
                    else if (label === "afternoon")
                      medDoses.afternoon = d.balls_per_dose;
                    else if (label === "night")
                      medDoses.night = d.balls_per_dose;
                  });
                } else if (m.dosage) {
                  let times = m.dosage.times_per_day || 0;
                  let balls = m.dosage.balls_per_dose || 0;
                  let instr = (m.dosage.instructions || "").toLowerCase();
                  medDoses.morning =
                    instr.includes("morning") || times >= 1 ? balls : 0;
                  medDoses.afternoon =
                    instr.includes("afternoon") || times >= 2 ? balls : 0;
                  medDoses.night =
                    instr.includes("night") || times >= 3 ? balls : 0;
                }

                parsedMeds.push({
                  name: m.medicine_value.toString(),
                  doses: medDoses,
                  amount: pricingByMedicationId.has(
                    Number(m.consultation_medication_id),
                  )
                    ? String(
                        pricingByMedicationId.get(
                          Number(m.consultation_medication_id),
                        ) ?? "",
                      )
                    : "",
                });
              } else {
                // For TEXT type
                let name = m.medicine_value || "";
                let remark = m.remark || "";

                // Fallback for old "name - remark" format if remark is empty
                if (!remark && name.includes(" - ")) {
                  const dashIdx = name.indexOf(" - ");
                  remark = name.substring(dashIdx + 3);
                  name = name.substring(0, dashIdx);
                }

                otherMeds.push({
                  name,
                  remark,
                  amount: pricingByMedicationId.has(
                    Number(m.consultation_medication_id),
                  )
                    ? String(
                        pricingByMedicationId.get(
                          Number(m.consultation_medication_id),
                        ) ?? "",
                      )
                    : "",
                });
              }
            });

            if (parsedMeds.length > 0) {
              setMedications(parsedMeds);
            }
            if (otherMeds.length > 0) {
              setOtherMedications(otherMeds);
            }
          }

          if (Array.isArray(c.tests) && c.tests.length > 0) {
            setTests(
              c.tests.map((test: any) => ({
                master_test_id: null,
                test_name: test.test_name || "",
                amount:
                  test.amount !== undefined && test.amount !== null
                    ? String(test.amount)
                    : "",
              })),
            );
          }

          setIsReadOnly(true);
        }
      } catch (err) {
        console.error(err);
        addToast("Failed to fetch consultation details", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointmentDetail();

    if (currentApp?.status?.toLowerCase() === "completed") {
      setIsReadOnly(true);
      fetchConsultation();
    } else {
      fetchConsultation();
    }
  }, [app, appointmentId, navigate, token, currentApp?.status]);

  useEffect(() => {
    if (followUpChain.length === 0) {
      setExpandedChainAppointmentId(null);
      return;
    }

    const previousCompletedVisit = [...followUpChain]
      .reverse()
      .find(
        (item) =>
          Number(item.appointment_id) !== Number(currentApp?.appointment_id) &&
          item.consultation,
      );

    setExpandedChainAppointmentId(
      previousCompletedVisit?.appointment_id || null,
    );
  }, [followUpChain, currentApp?.appointment_id]);

  if (!currentApp) return null;

  const [focusTrigger, setFocusTrigger] = useState<{
    type: "med" | "other" | "test";
    index: number;
  } | null>(null);

  const addMedication = () => {
    if (isReadOnly) return;
    const newIdx = medications.length;
    setMedications([
      ...medications,
      { name: "", doses: { morning: 4, afternoon: 4, night: 4 }, amount: "" },
    ]);
    setFocusTrigger({ type: "med", index: newIdx });
  };

  const addOtherMedication = () => {
    if (isReadOnly) return;
    const newIdx = otherMedications.length;
    setOtherMedications([
      ...otherMedications,
      { name: "", remark: "", amount: "" },
    ]);
    setFocusTrigger({ type: "other", index: newIdx });
  };

  const addTest = () => {
    if (isReadOnly) return;
    const newIdx = tests.length;
    setTests([...tests, { test_name: "", amount: "" }]);
    setFocusTrigger({ type: "test", index: newIdx });
  };

  const removeMedication = (idx: number) => {
    if (isReadOnly) return;
    if (medications.length > 1)
      setMedications(medications.filter((_, i) => i !== idx));
  };
  const removeOtherMedication = (idx: number) => {
    if (isReadOnly) return;
    setOtherMedications(otherMedications.filter((_, i) => i !== idx));
  };
  const removeTest = (idx: number) => {
    if (isReadOnly) return;
    setTests(tests.filter((_, i) => i !== idx));
  };

  const handleRemoveMedication = (idx: number) => {
    if (isReadOnly) return;
    if (medications.length > 1) {
      removeMedication(idx);
      const nextFocusIdx = idx > 0 ? idx - 1 : 0;
      setTimeout(() => {
        document.getElementById(`med-trigger-${nextFocusIdx}`)?.focus();
      }, 50);
    }
  };

  const handleRemoveOtherMedication = (idx: number) => {
    if (isReadOnly) return;
    removeOtherMedication(idx);
    if (otherMedications.length > 1) {
      const nextFocusIdx = idx > 0 ? idx - 1 : 0;
      setTimeout(() => {
        document.getElementById(`other-trigger-${nextFocusIdx}`)?.focus();
      }, 50);
    } else {
      setTimeout(() => {
        document.getElementById("add-other-med-btn")?.focus();
      }, 50);
    }
  };

  const handleRemoveTest = (idx: number) => {
    if (isReadOnly) return;
    removeTest(idx);
    if (tests.length > 1) {
      const nextFocusIdx = idx > 0 ? idx - 1 : 0;
      setTimeout(() => {
        document.getElementById(`test-trigger-${nextFocusIdx}`)?.focus();
      }, 50);
    } else {
      setTimeout(() => {
        document.getElementById("add-test-btn")?.focus();
      }, 50);
    }
  };
  const updateMedication = (
    idx: number,
    field: keyof MedicationEntry,
    value: any,
  ) => {
    if (isReadOnly) return;
    const updated = [...medications];
    updated[idx] = { ...updated[idx], [field]: value };
    setMedications(updated);
  };

  const updateDose = (
    idx: number,
    time: "morning" | "afternoon" | "night",
    value: number,
  ) => {
    if (isReadOnly) return;
    const updated = [...medications];
    updated[idx].doses = { ...updated[idx].doses, [time]: value };
    setMedications(updated);
  };

  const lastAutoAppliedQuickFormulaKeyRef = useRef<string | null>(null);
  const quickFormulaDebounceTimerRef = useRef<number | null>(null);

  const applyQuickNumericFormula = async ({
    silent = false,
  }: { silent?: boolean } = {}) => {
    if (isReadOnly) return;

    if (!formulaSnapshot) {
      if (!silent) {
        addToast(
          "Formula master abhi load nahi hua. Please try again.",
          "error",
        );
      }
      await refreshFormulaMaster();
      return;
    }

    if (!quickNumericInput.trim()) {
      if (!silent) {
        addToast("Please enter quick numeric medicines first.", "error");
      }
      return;
    }

    if (quickFormulaPreview.errors.length > 0) {
      if (!silent) {
        addToast(
          quickFormulaPreview.errors[0]?.message ||
            "Quick formula parse failed.",
          "error",
        );
      }
      return;
    }

    if (quickFormulaPreview.entries.length === 0) {
      if (!silent) {
        addToast("No valid numeric medicines were parsed.", "error");
      }
      return;
    }

    setMedications(
      quickFormulaPreview.entries.map((entry) => {
        let targetDoses = { ...entry.doses };
        if (globalDuration.startsWith("30")) {
          if (thirtyDaysDoseFrequency === "3") {
            targetDoses = { morning: 3, afternoon: 3, night: 3 };
          } else if (thirtyDaysDoseFrequency === "2") {
            targetDoses = { morning: 6, afternoon: 0, night: 6 };
          }
        }

        return {
          name: entry.name,
          doses: targetDoses,
          originalDoses: { ...entry.doses },
          amount: scaleBaseAmountByDuration(entry.baseAmount, globalDuration),
          baseAmount: entry.baseAmount.toFixed(2),
          isQuickFormulaDerived: true,
          quickFormulaToken: entry.raw_token,
        };
      }),
    );
    setLastAppliedQuickFormulaVersion(formulaSnapshot.version_no || null);
    setLastAppliedQuickFormulaSetId(formulaSnapshot.set_id || null);
    lastAutoAppliedQuickFormulaKeyRef.current = `${quickNumericInput.trim()}::${formulaSnapshot.version_no || ""}`;

    if (!silent && quickFormulaPreview.warnings.length > 0) {
      addToast(
        `Parsed ${quickFormulaPreview.entries.length} medicine(s) with ${quickFormulaPreview.warnings.length} warning(s).`,
        "warning",
      );
    } else if (!silent) {
      addToast(
        `Parsed ${quickFormulaPreview.entries.length} numeric medicine(s) successfully.`,
        "success",
      );
    }
  };

  useEffect(() => {
    if (isReadOnly) return;
    if (!formulaSnapshot) return;

    const trimmedInput = quickNumericInput.trim();
    if (!trimmedInput) return;
    if (
      quickFormulaPreview.errors.length > 0 ||
      quickFormulaPreview.entries.length === 0
    )
      return;

    const nextAutoApplyKey = `${trimmedInput}::${formulaSnapshot.version_no || ""}`;
    if (lastAutoAppliedQuickFormulaKeyRef.current === nextAutoApplyKey) {
      return;
    }

    if (quickFormulaDebounceTimerRef.current) {
      window.clearTimeout(quickFormulaDebounceTimerRef.current);
    }

    quickFormulaDebounceTimerRef.current = window.setTimeout(() => {
      void applyQuickNumericFormula({ silent: true });
    }, 700);

    return () => {
      if (quickFormulaDebounceTimerRef.current) {
        window.clearTimeout(quickFormulaDebounceTimerRef.current);
        quickFormulaDebounceTimerRef.current = null;
      }
    };
  }, [
    quickNumericInput,
    formulaSnapshot,
    isReadOnly,
    quickFormulaPreview.errors.length,
    quickFormulaPreview.entries.length,
  ]);

  useEffect(() => {
    if (isReadOnly) return;

    setMedications((prev) => {
      let hasChanges = false;

      const next = prev.map((med) => {
        if (
          !med.isQuickFormulaDerived ||
          med.baseAmount === undefined ||
          med.baseAmount === null ||
          med.baseAmount === ""
        ) {
          return med;
        }

        let updatedMed = { ...med };
        const scaledAmount = scaleBaseAmountByDuration(
          med.baseAmount,
          globalDuration,
        );
        if (scaledAmount !== med.amount) {
          updatedMed.amount = scaledAmount;
          hasChanges = true;
        }

        let targetDoses = med.originalDoses || med.doses;
        if (globalDuration.startsWith("30")) {
          if (thirtyDaysDoseFrequency === "3") {
            targetDoses = { morning: 3, afternoon: 3, night: 3 };
          } else if (thirtyDaysDoseFrequency === "2") {
            targetDoses = { morning: 6, afternoon: 0, night: 6 };
          }
        }

        if (
          targetDoses.morning !== med.doses.morning ||
          targetDoses.afternoon !== med.doses.afternoon ||
          targetDoses.night !== med.doses.night
        ) {
          updatedMed.doses = targetDoses;
          hasChanges = true;
        }

        return hasChanges ? updatedMed : med;
      });

      return hasChanges ? next : prev;
    });
  }, [globalDuration, thirtyDaysDoseFrequency, isReadOnly]);

  useEffect(() => {
    if (focusTrigger) {
      const id = `${focusTrigger.type}-trigger-${focusTrigger.index}`;
      const element = document.getElementById(id);
      if (element) {
        element.focus();
      }
      setFocusTrigger(null);
    }
  }, [focusTrigger]);

  const completeRef = useRef<(() => Promise<void>) | null>(null);
  const addMedRef = useRef<(() => void) | null>(null);
  const addOtherMedRef = useRef<(() => void) | null>(null);
  const addTestRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    completeRef.current = handleCompleteConsultation;
    addMedRef.current = addMedication;
    addOtherMedRef.current = addOtherMedication;
    addTestRef.current = addTest;
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly || isSubmitting || !isAppointmentContextReady) return;

      // Ctrl + Enter to submit consultation
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        completeRef.current?.();
      }

      // Alt + M to add Remedy Medicine
      if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        addMedRef.current?.();
      }

      // Alt + O to add Other Medication
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        addOtherMedRef.current?.();
      }

      // Alt + T to add Test
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        addTestRef.current?.();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isAppointmentContextReady, isReadOnly, isSubmitting]);

  const labTestOptions = useMemo(
    () =>
      labTests.map((test) => {
        const amountLabel =
          test.amount !== null &&
          test.amount !== undefined &&
          test.amount !== ""
            ? ` • ₹${Number(test.amount).toFixed(2)}`
            : "";
        const sampleLabel = test.sample_call ? ` • ${test.sample_call}` : "";

        return {
          label: `${test.test_name} (${test.test_type}${sampleLabel}${amountLabel})`,
          value: String(test.id),
        };
      }),
    [labTests],
  );

  const getAvailableOtherMedicineOptions = (currentIndex: number) => {
    const selectedMedicineNames = new Set(
      otherMedications
        .map((entry, index) =>
          index === currentIndex ? "" : entry.name.trim(),
        )
        .filter(Boolean),
    );

    return textMedicines
      .filter((medicine) => !selectedMedicineNames.has(medicine.medicine_value))
      .map((medicine) => ({
        label: medicine.medicine_value,
        value: medicine.medicine_value,
      }));
  };

  const getAvailableLabTestOptions = (currentIndex: number) => {
    const selectedLabTestIds = new Set(
      tests
        .map((entry, index) =>
          index === currentIndex ? null : (entry.master_test_id ?? null),
        )
        .filter((value): value is number => value !== null),
    );

    return labTestOptions.filter(
      (option) => !selectedLabTestIds.has(Number(option.value)),
    );
  };

  const getAvailableNumericMedicineOptions = (currentIndex: number) => {
    const selectedMedicineValues = new Set(
      medications
        .map((entry, index) =>
          index === currentIndex ? "" : entry.name.trim(),
        )
        .filter(Boolean),
    );

    return Array.from({ length: 148 }, (_, i) => (i + 3).toString()).filter(
      (value) => !selectedMedicineValues.has(value),
    );
  };

  const loadRepeatTreatmentDraft = async () => {
    if (!currentApp?.appointment_id || !isFollowUpVisit || isReadOnly) return;

    const hasExistingMedicineData =
      medications.some((item) => item.name.trim()) ||
      otherMedications.some((item) => item.name.trim());
    if (
      hasExistingMedicineData &&
      !window.confirm(
        "Current medicine draft will be replaced with the previous treatment. Continue?",
      )
    ) {
      return;
    }

    setIsLoadingRepeatDraft(true);
    try {
      const response = await fetch(
        `/api/v1/doctors/consultations/${currentApp.appointment_id}/repeat-draft`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load previous treatment");
      }

      const numericMedicines: MedicationEntry[] = [];
      const textMedicineDrafts: OtherMedEntry[] = [];

      (result.data.medications || []).forEach((medicine: any) => {
        if (medicine.medicine_type === "NUMERIC") {
          const doses = { morning: 0, afternoon: 0, night: 0 };
          (medicine.doses || []).forEach((dose: any) => {
            const label = String(dose.dose_label || "").toUpperCase();
            if (label === "MORNING")
              doses.morning = Number(dose.balls_per_dose || 0);
            if (label === "AFTERNOON")
              doses.afternoon = Number(dose.balls_per_dose || 0);
            if (label === "NIGHT")
              doses.night = Number(dose.balls_per_dose || 0);
          });
          numericMedicines.push({
            name: String(medicine.medicine_value || ""),
            doses,
            amount: String(medicine.amount ?? 0),
          });
        } else {
          textMedicineDrafts.push({
            name: String(medicine.medicine_value || ""),
            remark: String(medicine.remark || ""),
            amount: String(medicine.amount ?? 0),
          });
        }
      });

      setMedications(
        numericMedicines.length > 0
          ? numericMedicines
          : [
              {
                name: "",
                doses: { morning: 4, afternoon: 4, night: 4 },
                amount: "",
              },
            ],
      );
      setOtherMedications(
        textMedicineDrafts.length > 0
          ? textMedicineDrafts
          : [{ name: "", remark: "", amount: "" }],
      );
      if (result.data.medication_duration_days) {
        setGlobalDuration(`${result.data.medication_duration_days} Days`);
      }
      setRepeatedFromConsultationId(Number(result.data.source_consultation_id));
      setIsPrescriptionOpen(true);
      addToast(
        "Previous treatment copied as a draft. Review it before saving.",
        "success",
      );
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : "Unable to load previous treatment",
        "error",
      );
    } finally {
      setIsLoadingRepeatDraft(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (isReadOnly || isSubmitting) return;

    const submissionAppointmentId =
      normalizedRouteAppointmentId || Number(currentApp?.appointment_id || 0);
    if (!isAppointmentContextReady || !submissionAppointmentId) {
      addToast(
        "Appointment is still loading. Please wait before completing consultation.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const durationDays = parseInt(globalDuration.split(" ")[0]) || 15;
      if (
        !followUpChainClosed &&
        (!Number.isInteger(followUpAfterDays) ||
          followUpAfterDays < 1 ||
          followUpAfterDays > 365)
      ) {
        addToast("Follow-up days must be between 1 and 365.", "error");
        setIsSubmitting(false);
        return;
      }

      const formattedMedications = [];

      for (const med of medications) {
        if (!med.name.trim()) continue;

        const medDoses = [];
        if (med.doses.morning > 0) {
          medDoses.push({
            dose_label: "MORNING",
            sort_order: 1,
            times_per_day: 1,
            balls_per_dose: med.doses.morning,
            instructions: "",
          });
        }
        if (med.doses.afternoon > 0) {
          medDoses.push({
            dose_label: "AFTERNOON",
            sort_order: 2,
            times_per_day: 1,
            balls_per_dose: med.doses.afternoon,
            instructions: "",
          });
        }
        if (med.doses.night > 0) {
          medDoses.push({
            dose_label: "NIGHT",
            sort_order: 3,
            times_per_day: 1,
            balls_per_dose: med.doses.night,
            instructions: "",
          });
        }

        formattedMedications.push({
          medicine_type: "NUMERIC",
          medicine_value: med.name,
          doses: medDoses,
          amount: med.amount === "" ? 0 : Number(med.amount),
        });
      }

      if (otherMedications.length > 0) {
        for (const om of otherMedications) {
          if (!om.name.trim()) continue;

          let finalMedicineValue = om.name.trim();
          if (om.selectedVariant && om.selectedVariant.label) {
            finalMedicineValue += ` - ${om.selectedVariant.label}`;
          }

          formattedMedications.push({
            medicine_type: "TEXT",
            medicine_value: finalMedicineValue,
            remark: om.remark.trim(),
            amount: om.amount === "" ? 0 : Number(om.amount),
          });
        }
      }

      const formattedTests = tests
        .filter((test) => test.test_name.trim())
        .map((test) => ({
          test_name: test.test_name.trim(),
          amount: test.amount === "" ? 0 : Number(test.amount),
        }));

      const finalSymptoms = chiefComplaints.trim();
      const finalDiagnosis = diagnosis.trim() || null;
      const finalTreatmentAdvice = treatmentNotes.trim() || null;
      const hasMeaningfulNoPrescriptionData = Boolean(
        finalSymptoms ||
        finalDiagnosis ||
        finalTreatmentAdvice ||
        formattedMedications.length > 0 ||
        formattedTests.length > 0,
      );

      if (!hasNoAdvice && !finalSymptoms) {
        addToast("Please enter chief complaints / symptoms.", "error");
        setIsSubmitting(false);
        return;
      }

      if (!hasNoAdvice && formattedMedications.length === 0) {
        addToast("Please add at least one medication.", "error");
        setIsSubmitting(false);
        return;
      }

      if (hasNoAdvice && !hasMeaningfulNoPrescriptionData) {
        addToast(
          "Please enter at least one consultation detail before saving.",
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const payload = {
        appointment_id: submissionAppointmentId,
        symptoms: finalSymptoms,
        diagnosis: finalDiagnosis,
        treatment_advice: finalTreatmentAdvice,
        has_no_advice: hasNoAdvice,
        allow_no_prescription: hasNoAdvice,
        medication_duration_days: durationDays,
        follow_up_after_days:
          Number.isInteger(followUpAfterDays) && followUpAfterDays >= 1
            ? followUpAfterDays
            : 15,
        repeated_from_consultation_id: repeatedFromConsultationId,
        follow_up: followUp.trim() || null,
        follow_up_chain_closed: followUpChainClosed,
        consultation_mode: consultationMode,
        oxygen_saturation: o2Value ? `${o2Value}%` : "",
        blood_pressure: bpValue.trim(),
        patient_height: heightValue
          ? heightUnit === "cm"
            ? `${heightValue} cm`
            : heightValue
          : "",
        patient_weight: weightValue ? `${weightValue} kg` : "",
        formula_set_id:
          lastAppliedQuickFormulaSetId || formulaSnapshot?.set_id || null,
        formula_version_used:
          lastAppliedQuickFormulaVersion || formulaSnapshot?.version_no || null,
        quick_formula_input: quickNumericInput.trim() || null,
        total_amount: Number(totalAmount),
        medications: formattedMedications,
        tests: formattedTests,
      };

      const response = await fetch("/api/v1/doctors/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        addToast("Consultation completed successfully", "success");
        navigate("/doctor-portal");
      } else {
        addToast(result.message || "Failed to complete consultation", "error");
      }
    } catch (err) {
      addToast("A network error occurred. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-6 pb-12 consultation-form-override">
      <div className="bg-[#549E9E] p-6 text-white flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            {t("consultation_modal.title", "Patient Consultation")}{" "}
            {isReadOnly &&
              `(${t("consultation_modal.completed", "Completed")})`}
          </h3>
          <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mt-1">
            {currentApp.patient_full_name}
            {currentApp.booked_for_type === "FAMILY_MEMBER" && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-white/20 text-white text-[9px] font-black uppercase tracking-widest">
                {currentApp.family_member_relationship} (Account:{" "}
                {currentApp.primary_patient_full_name})
              </span>
            )}
            {" • "}
            {t("consultation_modal.token", "Token")} #
            {currentApp.display_token_display || currentApp.token_number} •{" "}
            {currentApp.treatment_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/75 mb-2">
              {t("consultation_modal.consultation_type", "Consultation Type")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                {
                  label: t(
                    "consultation_modal.patient_physical_present",
                    "Patient Physical Present",
                  ),
                  value: "PHYSICAL_PRESENT",
                },
                {
                  label: t(
                    "consultation_modal.on_call_consultant",
                    "On Call Consultant",
                  ),
                  value: "ON_CALL",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isReadOnly ? "cursor-default opacity-80" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name="consultation_mode"
                    disabled={isReadOnly}
                    checked={consultationMode === option.value}
                    onChange={() =>
                      setConsultationMode(
                        option.value as "PHYSICAL_PRESENT" | "ON_CALL",
                      )
                    }
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                  <span className="text-white">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-white shadow-sm border border-gray-100 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <RefreshCcw className="animate-spin text-[#549E9E]" size={32} />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: t("consultation_modal.patient", "Patient"),
              value: (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {currentApp.patient_full_name}
                  {currentApp.booked_for_type === "FAMILY_MEMBER" && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-black uppercase tracking-widest">
                      {currentApp.family_member_relationship}
                    </span>
                  )}
                </span>
              ),
              icon: User,
            },
            {
              label: t("consultation_modal.age_gender", "Age / Gender"),
              value: `${currentApp.patient_age || "—"} / ${currentApp.patient_gender || "—"}`,
              icon: User,
            },
            {
              label: t("consultation_modal.mobile", "Mobile"),
              value: (
                <span className="flex flex-col">
                  <span>{currentApp.patient_mobile_no}</span>
                  {currentApp.booked_for_type === "FAMILY_MEMBER" &&
                    currentApp.primary_patient_full_name && (
                      <span className="text-[9px] text-gray-400 font-bold normal-case mt-0.5">
                        Owner: {currentApp.primary_patient_full_name}
                      </span>
                    )}
                </span>
              ),
              icon: Phone,
            },
            {
              label: t("consultation_modal.branch", "Branch"),
              value: currentApp.branch_name,
              icon: MapPin,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-[#549E9E]/[0.03] p-4 rounded-xl border border-[#549E9E]/10 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={12} className="text-[#549E9E]" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  {item.label}
                </span>
              </div>
              <div className="text-sm font-black text-gray-800 capitalize">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Keyboard Navigation Tip Banner */}
        {!isReadOnly && (
          <div className="bg-[#549E9E]/[0.05] border border-[#549E9E]/20 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="p-2 bg-[#549E9E]/10 rounded-lg text-[#549E9E] shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div className="text-xs">
              <span className="font-black text-[#549E9E] uppercase tracking-wider block mb-1">
                {t(
                  "consultation_modal.keyboard_active",
                  "Keyboard Navigation Active",
                )}
              </span>
              <p className="text-gray-600 font-bold leading-normal">
                {t("consultation_modal.use", "Use")}{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-black font-mono">
                  Tab
                </kbd>{" "}
                /{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-black font-mono">
                  Shift + Tab
                </kbd>{" "}
                {t("consultation_modal.to_navigate", "to navigate. Press")}{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-black font-mono">
                  Enter
                </kbd>{" "}
                {t(
                  "consultation_modal.amount_forward",
                  "on Amount to go forward, and",
                )}{" "}
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-black font-mono">
                  Shift + Enter
                </kbd>{" "}
                {t("consultation_modal.to_go_back", "to go back.")}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-gray-500 font-black uppercase text-[9px] tracking-wider">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Alt + M
                  </kbd>{" "}
                  {t("consultation_modal.add_medicine", "Add Medicine")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Alt + O
                  </kbd>{" "}
                  {t("consultation_modal.add_other_med", "Add Other Med")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Alt + T
                  </kbd>{" "}
                  {t("consultation_modal.add_test", "Add Test")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Alt + Delete
                  </kbd>{" "}
                  /{" "}
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Alt + Backspace
                  </kbd>{" "}
                  {t("consultation_modal.delete_row", "Delete Row")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm text-gray-700 font-mono text-[9px]">
                    Ctrl + Enter
                  </kbd>{" "}
                  {t("consultation_modal.save_complete", "Save / Complete")}
                </span>
              </div>
            </div>
          </div>
        )}

        {followUpChain.length > 0 && (
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Follow-up Report
                </p>
                <p className="text-sm font-bold text-gray-700">
                  Linked visit chain for this case
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                {followUpChain.length} visit
                {followUpChain.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {followUpChain.map((item, index) => {
                const isCurrent =
                  Number(item.appointment_id) ===
                  Number(currentApp.appointment_id);
                const isExpanded =
                  Number(expandedChainAppointmentId) ===
                  Number(item.appointment_id);
                const doctorMeds = (
                  item.consultation?.medications || []
                ).filter(
                  (med: any) =>
                    String(med?.added_by_role || "").toUpperCase() !==
                    "MEDICAL",
                );
                const medicalMeds = (
                  item.consultation?.medications || []
                ).filter(
                  (med: any) =>
                    String(med?.added_by_role || "").toUpperCase() ===
                    "MEDICAL",
                );

                return (
                  <div
                    key={item.appointment_id}
                    className={`border rounded-xl overflow-hidden ${isCurrent ? "bg-white border-red-200" : "bg-white/70 border-red-100"}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedChainAppointmentId((prev) =>
                          prev === item.appointment_id
                            ? null
                            : item.appointment_id,
                        )
                      }
                      className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-700">
                            {index + 1}. {item.treatment_name}
                          </p>
                          {isCurrent && (
                            <span className="px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                          {new Date(item.appointment_date).toLocaleDateString()}{" "}
                          • {item.auid}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.medication_duration_days ? (
                            <span className="px-2 py-1 bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg">
                              {item.medication_duration_days} Days
                            </span>
                          ) : null}
                          {item.consultation?.medications?.length ? (
                            <span className="px-2 py-1 bg-[#549E9E]/10 text-[#549E9E] text-[9px] font-black uppercase tracking-widest rounded-lg">
                              {item.consultation.medications.length} Medicines
                            </span>
                          ) : null}
                          {medicalMeds.length > 0 ? (
                            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
                              {medicalMeds.length} Medical Added
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-red-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isExpanded && item.consultation && (
                      <div className="border-t border-red-100 bg-white/80 p-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-white border border-gray-100 rounded-xl p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                              Symptoms / Findings
                            </p>
                            <p className="text-xs font-bold text-gray-700 whitespace-pre-wrap">
                              {item.consultation.symptoms || "—"}
                            </p>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-xl p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                              Treatment Advice
                            </p>
                            <p className="text-xs font-bold text-gray-700 whitespace-pre-wrap">
                              {item.consultation.treatment_advice || "—"}
                            </p>
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
                                  key={med.consultation_medication_id}
                                  className="border border-gray-100 rounded-lg p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                        {med.medicine_value}
                                      </p>
                                      {med.remark ? (
                                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                                          {med.remark}
                                        </p>
                                      ) : null}
                                      <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        {getDosePreview(
                                          med,
                                          item.consultation
                                            .medication_duration_days,
                                        ) ||
                                          `${item.consultation.medication_duration_days} days`}
                                      </p>
                                    </div>
                                    <span className="text-[11px] font-black text-[#549E9E]">
                                      ₹
                                      {Number(
                                        getMedicationPricingAmount(
                                          item.pricing,
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

                        {medicalMeds.length > 0 && (
                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                              Medical Added / Updated
                            </p>
                            <div className="space-y-2">
                              {medicalMeds.map((med: any) => (
                                <div
                                  key={med.consultation_medication_id}
                                  className="border border-amber-100 rounded-lg p-3 bg-white/90"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                          {med.medicine_value}
                                        </p>
                                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                                          {getMedicationRoleLabel(med) ||
                                            "Medical Added"}
                                        </span>
                                      </div>
                                      {med.remark ? (
                                        <p className="text-[11px] font-bold text-gray-500 mt-1">
                                          {med.remark}
                                        </p>
                                      ) : null}
                                      <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        {getDosePreview(
                                          med,
                                          item.consultation
                                            .medication_duration_days,
                                        ) ||
                                          `${item.consultation.medication_duration_days} days`}
                                      </p>
                                    </div>
                                    <span className="text-[11px] font-black text-amber-700">
                                      ₹
                                      {Number(
                                        getMedicationPricingAmount(
                                          item.pricing,
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

                        {Array.isArray(item.consultation?.tests) &&
                          item.consultation.tests.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Tests
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.consultation.tests.map((test: any) => (
                                  <span
                                    key={test.consultation_test_id}
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

                    {isExpanded && !item.consultation && (
                      <div className="border-t border-red-100 bg-white/80 p-4">
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                          Consultation details not available for this visit yet.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extended History Card */}
        <div className="bg-white border border-[#549E9E]/10 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setIsExtendedHistoryOpen(!isExtendedHistoryOpen)}
            className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-transparent"
            style={{
              borderBottomColor: isExtendedHistoryOpen
                ? "rgba(84, 158, 158, 0.1)"
                : "transparent",
            }}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[#549E9E]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#549E9E]">
                {t(
                  "consultation_modal.extended_history",
                  "Extended Patient History & Examination",
                )}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-300 ${isExtendedHistoryOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {isExtendedHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-5 space-y-6">
                  {/* Basic Details */}
                  <div>
                    <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest mb-3 block border-b border-gray-100 pb-2">
                      {t(
                        "consultation_modal.basic_lifestyle",
                        "Basic & Lifestyle",
                      )}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t("consultation_modal.occupation", "Occupation")}
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
                          className="w-full h-10 px-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80"
                          placeholder={t(
                            "consultation_modal.occupation_placeholder",
                            "e.g. Teacher, Engineer...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.personal_social_history",
                            "Personal & Social History",
                          )}
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={personalSocialHistory}
                          onChange={(e) =>
                            setPersonalSocialHistory(e.target.value)
                          }
                          className="w-full h-10 px-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80"
                          placeholder={t(
                            "consultation_modal.personal_history_placeholder",
                            "e.g. Smoking, Alcohol...",
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical History */}
                  <div>
                    <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest mb-3 block border-b border-gray-100 pb-2">
                      {t(
                        "consultation_modal.medical_history",
                        "Medical History",
                      )}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.history_present_illness",
                            "History of Present Illness",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={historyPresentIllness}
                          onChange={(e) =>
                            setHistoryPresentIllness(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.present_illness_placeholder",
                            "Details of current illness...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.history_past_illness",
                            "History of Past Illness",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={historyPastIllness}
                          onChange={(e) =>
                            setHistoryPastIllness(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.past_illness_placeholder",
                            "Details of past illnesses...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.family_history",
                            "Family History",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={familyHistory}
                          onChange={(e) => setFamilyHistory(e.target.value)}
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.family_history_placeholder",
                            "Relevant family diseases...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.allergies_history",
                            "Allergies History",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={allergiesHistory}
                          onChange={(e) => setAllergiesHistory(e.target.value)}
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.allergies_history_placeholder",
                            "Known allergies...",
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specialty & Mind */}
                  <div>
                    <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest mb-3 block border-b border-gray-100 pb-2">
                      {t(
                        "consultation_modal.specialty_mind",
                        "Specialty & Mind",
                      )}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.gynecological_history",
                            "Gynecological History",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={gynecologicalHistory}
                          onChange={(e) =>
                            setGynecologicalHistory(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.gynecological_placeholder",
                            "Gynecological details (if applicable)...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.mental_mind_status",
                            "Mental / Mind Status",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={mentalMindStatus}
                          onChange={(e) => setMentalMindStatus(e.target.value)}
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.mental_mind_placeholder",
                            "Psychological assessment...",
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Examination */}
                  <div>
                    <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest mb-3 block border-b border-gray-100 pb-2">
                      {t("consultation_modal.examinations", "Examinations")}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.general_examination",
                            "General Examination",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={generalExamination}
                          onChange={(e) =>
                            setGeneralExamination(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.general_exam_placeholder",
                            "General physical exam findings...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.systematic_examination",
                            "Systematic Examination",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={systematicExamination}
                          onChange={(e) =>
                            setSystematicExamination(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.systematic_exam_placeholder",
                            "System-specific exam findings...",
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis & Outcome */}
                  <div>
                    <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest mb-3 block border-b border-gray-100 pb-2">
                      {t(
                        "consultation_modal.diagnosis_follow_up",
                        "Diagnosis & Follow Up",
                      )}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t("consultation_modal.disease", "Disease")}
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={disease}
                          onChange={(e) => setDisease(e.target.value)}
                          className="w-full h-10 px-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80"
                          placeholder={t(
                            "consultation_modal.disease_placeholder",
                            "Identified disease...",
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.follow_up_advice",
                            "Follow Up Advice",
                          )}
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly || followUpChainClosed}
                          value={followUp}
                          onChange={(e) => setFollowUp(e.target.value)}
                          className="w-full h-10 px-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80"
                          placeholder={t(
                            "consultation_modal.follow_up_placeholder",
                            "Next visit instructions...",
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5 block">
                          {t(
                            "consultation_modal.differential_diagnosis",
                            "Differential Diagnosis",
                          )}
                        </label>
                        <textarea
                          disabled={isReadOnly}
                          value={differentialDiagnosis}
                          onChange={(e) =>
                            setDifferentialDiagnosis(e.target.value)
                          }
                          rows={2}
                          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none transition-all text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                          placeholder={t(
                            "consultation_modal.differential_diagnosis_placeholder",
                            "Possible alternative diagnoses...",
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white border border-[#549E9E]/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
              <FileText size={14} /> {t("consultation_modal.vitals", "Vitals")}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-end h-[18px]">
                {t("consultation_modal.o2_value", "O2 Value")}
              </label>
              <div className="relative flex items-center w-full h-[46px] px-4 bg-gray-50/70 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10 transition-all">
                <input
                  type="text"
                  id="vitals-o2-input"
                  disabled={isReadOnly}
                  placeholder={t(
                    "consultation_modal.o2_placeholder",
                    "e.g. 98",
                  )}
                  value={o2Value}
                  onChange={(e) =>
                    setO2Value(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                />
                <span className="text-gray-400 font-black text-xs ml-2">%</span>
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-end h-[18px]">
                {t("consultation_modal.bp_value", "BP Value")}
              </label>
              <div className="flex items-center w-full h-[46px] px-4 bg-gray-50/70 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10 transition-all">
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder="120"
                  value={bpValue.split("/")[0] || ""}
                  onChange={(e) => {
                    const sys = e.target.value.replace(/[^0-9]/g, "");
                    const dia = bpValue.split("/")[1] || "";
                    setBpValue(sys || dia ? `${sys}/${dia}` : "");
                  }}
                  className="w-full bg-transparent outline-none text-right text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                />
                <span className="text-gray-400 font-black mx-2 text-xs">/</span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder="80"
                  value={bpValue.split("/")[1] || ""}
                  onChange={(e) => {
                    const dia = e.target.value.replace(/[^0-9]/g, "");
                    const sys = bpValue.split("/")[0] || "";
                    setBpValue(sys || dia ? `${sys}/${dia}` : "");
                  }}
                  className="w-full bg-transparent outline-none text-left text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-end justify-between h-[18px]">
                <span>{t("consultation_modal.height", "Height")}</span>
                {!isReadOnly && (
                  <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => {
                        setHeightUnit("cm");
                        setHeightValue("");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] transition-colors cursor-pointer ${heightUnit === "cm" ? "bg-white shadow text-[#549E9E]" : "text-gray-400"}`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHeightUnit("ft");
                        setHeightValue("");
                      }}
                      className={`px-1.5 py-0.5 rounded text-[8px] transition-colors cursor-pointer ${heightUnit === "ft" ? "bg-white shadow text-[#549E9E]" : "text-gray-400"}`}
                    >
                      ft
                    </button>
                  </div>
                )}
              </label>
              {heightUnit === "cm" ? (
                <div className="relative flex items-center w-full h-[46px] px-4 bg-gray-50/70 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10 transition-all">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder={t(
                      "consultation_modal.height_cm_placeholder",
                      "e.g. 170",
                    )}
                    value={heightValue}
                    onChange={(e) =>
                      setHeightValue(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                  />
                  <span className="text-gray-400 font-black text-xs ml-2">
                    cm
                  </span>
                </div>
              ) : (
                <div className="flex items-center w-full h-[46px] px-4 bg-gray-50/70 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10 transition-all">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="5"
                    value={heightValue.split("'")[0] || ""}
                    onChange={(e) => {
                      const ft = e.target.value.replace(/[^0-9]/g, "");
                      const inch = heightValue.includes("'")
                        ? heightValue.split("'")[1].replace('"', "")
                        : "";
                      setHeightValue(ft || inch ? `${ft}'${inch}"` : "");
                    }}
                    className="w-full bg-transparent outline-none text-right text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                  />
                  <span className="text-gray-400 font-black mx-1 text-xs">
                    '
                  </span>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="7"
                    value={
                      heightValue.includes("'")
                        ? heightValue.split("'")[1].replace('"', "")
                        : ""
                    }
                    onChange={(e) => {
                      const inch = e.target.value.replace(/[^0-9]/g, "");
                      const ft = heightValue.split("'")[0] || "";
                      setHeightValue(ft || inch ? `${ft}'${inch}"` : "");
                    }}
                    className="w-full bg-transparent outline-none text-left text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                  />
                  <span className="text-gray-400 font-black ml-1 text-xs">
                    "
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-end h-[18px]">
                {t("consultation_modal.weight", "Weight")}
              </label>
              <div className="relative flex items-center w-full h-[46px] px-4 bg-gray-50/70 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-4 focus-within:ring-[#549E9E]/10 transition-all">
                <input
                  type="text"
                  disabled={isReadOnly}
                  placeholder={t(
                    "consultation_modal.weight_placeholder",
                    "e.g. 65",
                  )}
                  value={weightValue}
                  onChange={(e) =>
                    setWeightValue(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="w-full bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80 disabled:text-gray-500"
                />
                <span className="text-gray-400 font-black text-xs ml-2">
                  kg
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-3 bg-white border border-[#549E9E]/10 rounded-2xl p-5 shadow-sm">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
                <FileText size={14} />{" "}
                {t("consultation_modal.clinical_findings", "Clinical Findings")}
              </label>
              <textarea
                rows={3}
                id="chief-complaints-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.chief_complaints_placeholder",
                  "Chief Complaints / Symptoms...",
                )}
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-sm disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <textarea
                rows={3}
                id="diagnosis-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.diagnosis_placeholder",
                  "Diagnosis / Observation...",
                )}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-sm disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 bg-white border border-[#549E9E]/10 rounded-2xl p-5 shadow-sm">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
                <FileText size={14} />{" "}
                {t("consultation_modal.treatment_advice", "Treatment Advice")}{" "}
                <span className="text-[9px] text-gray-400 normal-case tracking-normal">
                  {t("common.optional", "Optional")}
                </span>
              </label>
              {!isReadOnly && (
                <label className="inline-flex items-start gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasNoAdvice}
                    onChange={(e) => setHasNoAdvice(e.target.checked)}
                    className="w-4 h-4 accent-[#549E9E]"
                  />
                  <span className="flex flex-col gap-1">
                    <span>
                      {t(
                        "consultation_modal.no_prescription_mode",
                        "No Prescription Mode",
                      )}
                    </span>
                    <span className="text-[9px] font-semibold normal-case tracking-normal text-gray-400">
                      {t(
                        "consultation_modal.no_prescription_mode_help",
                        "Medicine and tests become optional, but at least one clinical detail is still required.",
                      )}
                    </span>
                  </span>
                </label>
              )}
              <textarea
                rows={5}
                id="treatment-advice-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.treatment_advice_placeholder",
                  "Detailed patient advice and observations...",
                )}
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-sm disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white border border-[#549E9E]/15 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
                <WandSparkles size={14} /> Quick Numeric Entry
              </label>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Enter multiple medicines (e.g.{" "}
                <span className="text-[#549E9E] font-bold">
                  30, 200/2, 3q/5, 21 23 34/7
                </span>
                ). Automatically applied after typing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  Duration:
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1 bg-gray-50 p-1 border border-gray-150 rounded-xl">
                    {["7 Days", "15 Days", "30 Days"].map((day) => (
                      <button
                        key={day}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          const days = day.split(" ")[0] as "7" | "15" | "30";
                          setGlobalDuration(day);
                          setFollowUpPreset(days);
                          setCustomFollowUpDays("");
                        }}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg cursor-pointer ${
                          globalDuration === day
                            ? "bg-[#549E9E] text-white shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                        } disabled:opacity-70 disabled:cursor-default`}
                      >
                        {day.split(" ")[0]} {/* 7, 15, 30 */}
                      </button>
                    ))}
                  </div>
                  {globalDuration.startsWith("30") && !isReadOnly && (
                    <div className="flex gap-3 bg-gray-50/80 p-2 rounded-xl border border-[#549E9E]/20 mt-1 shadow-inner">
                      <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 cursor-pointer hover:text-[#549E9E] transition-colors">
                        <input
                          type="radio"
                          checked={thirtyDaysDoseFrequency === "3"}
                          onChange={() => setThirtyDaysDoseFrequency("3")}
                          className="accent-[#549E9E] w-3 h-3"
                        />
                        3 times a day
                      </label>
                      <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 cursor-pointer hover:text-[#549E9E] transition-colors">
                        <input
                          type="radio"
                          checked={thirtyDaysDoseFrequency === "2"}
                          onChange={() => setThirtyDaysDoseFrequency("2")}
                          className="accent-[#549E9E] w-3 h-3"
                        />
                        2 times a day
                      </label>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  max={365}
                  disabled={isReadOnly || followUpChainClosed}
                  value={customFollowUpDays}
                  onChange={(event) => {
                    setCustomFollowUpDays(event.target.value);
                    setFollowUpPreset(
                      event.target.value
                        ? "custom"
                        : (globalDuration.split(" ")[0] as "7" | "15" | "30"),
                    );
                  }}
                  placeholder="Custom days"
                  title="Custom follow-up days"
                  className="h-8 w-24 rounded-lg border border-gray-200 bg-white px-2 text-[10px] font-black text-gray-700 outline-none focus:border-[#549E9E] disabled:bg-gray-100 disabled:opacity-60"
                />
              </div>

              {!isReadOnly && (
                <label className="flex items-center gap-2 cursor-pointer bg-red-50/50 border border-red-100/50 px-2.5 py-1.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={followUpChainClosed}
                    onChange={(e) => setFollowUpChainClosed(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#549E9E]"
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-500">
                    Close Case
                  </span>
                </label>
              )}

              <button
                type="button"
                disabled={isReadOnly || isFormulaLoading}
                onClick={() => {
                  void applyQuickNumericFormula();
                }}
                className="px-4 py-2 rounded-xl bg-[#549E9E] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isFormulaLoading ? (
                  <RefreshCcw size={14} className="animate-spin" />
                ) : (
                  <WandSparkles size={14} />
                )}
                Parse & Apply
              </button>
            </div>
          </div>

          <textarea
            rows={2}
            disabled={isReadOnly}
            value={quickNumericInput}
            onChange={(e) => setQuickNumericInput(e.target.value)}
            placeholder="30, 200/2, 84/20, 10/BD"
            className="w-full p-4 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-sm disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
          />

          {quickNumericInput.trim() &&
            lastAppliedQuickFormulaVersion !== null &&
            formulaSnapshot?.version_no &&
            lastAppliedQuickFormulaVersion !== formulaSnapshot.version_no &&
            !isReadOnly && (
              <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle
                  size={16}
                  className="text-amber-600 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                    Formula rules updated
                  </p>
                  <p className="text-sm font-bold text-amber-700 mt-1">
                    Current draft was parsed with version{" "}
                    {lastAppliedQuickFormulaVersion}, but active session version
                    is {formulaSnapshot.version_no}. Re-apply if you want latest
                    rules.
                  </p>
                </div>
              </div>
            )}

          {quickNumericInput.trim() && (
            <div className="grid lg:grid-cols-2 gap-4">
              {quickFormulaPreview.entries.length > 0 && (
                <div
                  className={`border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 transition-all ${
                    quickFormulaPreview.errors.length === 0 &&
                    quickFormulaPreview.warnings.length === 0
                      ? "lg:col-span-2"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setIsQuickPreviewOpen(!isQuickPreviewOpen)}
                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600 cursor-pointer outline-none select-none"
                  >
                    <span className="flex items-center gap-2">
                      Quick Parse Preview
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px]">
                        {quickFormulaPreview.entries.length}
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isQuickPreviewOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isQuickPreviewOpen && (
                    <div className="space-y-2 mt-3">
                      {quickFormulaPreviewWithDuration.map((entry) => (
                        <div
                          key={entry.raw_token}
                          className="bg-white border border-emerald-100 rounded-lg p-3"
                        >
                          <p className="text-sm font-black text-gray-800">
                            {entry.raw_token} → {entry.name}
                          </p>
                          <p className="text-xs font-bold text-gray-500 mt-1">
                            ₹ {entry.amount} base • ₹ {entry.finalAmount} final
                            • M/A/N {entry.doses.morning}/
                            {entry.doses.afternoon}/{entry.doses.night}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(quickFormulaPreview.errors.length > 0 ||
                quickFormulaPreview.warnings.length > 0) && (
                <div
                  className={`border border-red-100 bg-red-50/50 rounded-xl p-4 ${
                    quickFormulaPreview.entries.length === 0
                      ? "lg:col-span-2"
                      : ""
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">
                    Parser Issues
                  </p>
                  <div className="space-y-2">
                    {quickFormulaPreview.errors.map((item, index) => (
                      <div
                        key={`quick-error-${index}`}
                        className="bg-white border border-red-100 rounded-lg p-3 text-sm font-bold text-red-600"
                      >
                        {item.raw_token}: {item.message}
                      </div>
                    ))}
                    {quickFormulaPreview.warnings.map((item, index) => (
                      <div
                        key={`quick-warning-${index}`}
                        className="bg-white border border-amber-100 rounded-lg p-3 text-sm font-bold text-amber-600"
                      >
                        {item.raw_token}: {item.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-2 bg-[#549E9E]/5 border-2 border-[#549E9E] rounded-2xl p-5 shadow-md">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <button
              type="button"
              onClick={() => setIsPrescriptionOpen(!isPrescriptionOpen)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E] cursor-pointer outline-none select-none"
            >
              <Pill size={14} />
              <span>
                {t("consultation_modal.prescription", "Prescription")}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#549E9E]/10 text-[#549E9E] text-[8px]">
                {medications.length}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isPrescriptionOpen ? "rotate-180" : ""}`}
              />
            </button>
            {!isReadOnly && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isFollowUpVisit && (
                  <button
                    type="button"
                    onClick={() => {
                      void loadRepeatTreatmentDraft();
                    }}
                    disabled={isLoadingRepeatDraft}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw
                      size={14}
                      className={isLoadingRepeatDraft ? "animate-spin" : ""}
                    />
                    Repeat Previous Treatment
                  </button>
                )}
                <button
                  tabIndex={-1}
                  onClick={addMedication}
                  className="flex items-center gap-2 px-4 py-2 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                >
                  <Plus size={14} />{" "}
                  {t("consultation_modal.add_medicine", "Add Medicine")}{" "}
                  <kbd className="ml-2 px-2.5 py-1 bg-[#549E9E] text-white rounded-lg text-xs font-black font-mono shadow-sm normal-case tracking-normal">
                    Alt + M
                  </kbd>
                </button>
              </div>
            )}
          </div>

          {isPrescriptionOpen && (
            <>
              <div className="hidden lg:grid lg:grid-cols-[minmax(220px,1.4fr)_110px_110px_110px_130px_90px] gap-3 px-2">
                {[
                  t("consultation_modal.medicine", "Medicine"),
                  t("consultation_modal.morning", "Morning"),
                  t("consultation_modal.afternoon", "Afternoon"),
                  t("consultation_modal.night", "Night"),
                  t("consultation_modal.amount", "Amount"),
                  "",
                ].map((label, idx) => (
                  <div
                    key={`${label}-${idx}`}
                    className="text-[9px] font-black text-gray-500 uppercase tracking-widest"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1.4fr)_110px_110px_110px_130px_90px] gap-3 items-center bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#549E9E]/20 transition-all"
                    onKeyDown={(e) => {
                      if (
                        e.altKey &&
                        (e.key === "Backspace" || e.key === "Delete")
                      ) {
                        e.preventDefault();
                        handleRemoveMedication(idx);
                      }
                    }}
                  >
                    <div className="relative">
                      <Pill
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                      />
                      <NumberDropdown
                        id={`med-trigger-${idx}`}
                        disabled={
                          isReadOnly ||
                          (getAvailableNumericMedicineOptions(idx).length ===
                            0 &&
                            !med.name)
                        }
                        options={getAvailableNumericMedicineOptions(idx)}
                        value={med.name}
                        onChange={(val) => updateMedication(idx, "name", val)}
                        placeholder={
                          getAvailableNumericMedicineOptions(idx).length > 0
                            ? t(
                                "consultation_modal.select_potency",
                                "Select Potency / Remedy No.",
                              )
                            : t(
                                "consultation_modal.no_remedies_remaining",
                                "No Remedies Remaining",
                              )
                        }
                      />
                    </div>

                    {[
                      {
                        label: t("consultation_modal.morning", "Morning"),
                        key: "morning",
                      },
                      {
                        label: t("consultation_modal.afternoon", "Afternoon"),
                        key: "afternoon",
                      },
                      {
                        label: t("consultation_modal.night", "Night"),
                        key: "night",
                      },
                    ].map((time) => {
                      const val =
                        med.doses[
                          time.key as "morning" | "afternoon" | "night"
                        ];
                      const isActive = val > 0;
                      return (
                        <div
                          key={time.key}
                          className={`rounded-xl p-2 border transition-all ${isActive ? "bg-[#549E9E]/[0.04] border-[#549E9E]/30 shadow-sm" : "bg-gray-50/80 border-gray-200 opacity-80"}`}
                        >
                          <button
                            disabled={isReadOnly}
                            onClick={() =>
                              updateDose(
                                idx,
                                time.key as "morning" | "afternoon" | "night",
                                isActive ? 0 : 4,
                              )
                            }
                            onKeyDown={(e) => {
                              if (isReadOnly) return;
                              if (e.key === "ArrowUp" || e.key === "+") {
                                e.preventDefault();
                                updateDose(
                                  idx,
                                  time.key as "morning" | "afternoon" | "night",
                                  isActive ? val + 1 : 4,
                                );
                              } else if (
                                e.key === "ArrowDown" ||
                                e.key === "-"
                              ) {
                                e.preventDefault();
                                if (isActive) {
                                  updateDose(
                                    idx,
                                    time.key as
                                      | "morning"
                                      | "afternoon"
                                      | "night",
                                    Math.max(0, val - 1),
                                  );
                                }
                              }
                            }}
                            className={`w-full flex items-center justify-center gap-1.5 mb-2 disabled:cursor-default ${isReadOnly ? "" : "cursor-pointer hover:opacity-80 transition-opacity"}`}
                            title={
                              isReadOnly
                                ? ""
                                : isActive
                                  ? "Click/Space to disable dose (Arrow Up/Down to adjust)"
                                  : "Click/Space to enable dose"
                            }
                          >
                            {isActive ? (
                              <CheckCircle2
                                size={14}
                                className="text-[#549E9E]"
                              />
                            ) : (
                              <div className="w-[14px] h-[14px] rounded-full border-[1.5px] border-gray-300" />
                            )}
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "text-[#549E9E]" : "text-gray-400"}`}
                            >
                              {time.label}
                            </span>
                          </button>
                          <div
                            className={`flex items-center justify-between rounded-lg p-1 ${isActive ? "bg-gray-50" : "bg-transparent pointer-events-none"}`}
                          >
                            <button
                              tabIndex={-1}
                              disabled={isReadOnly}
                              onClick={() =>
                                updateDose(
                                  idx,
                                  time.key as "morning" | "afternoon" | "night",
                                  Math.max(1, val - 1),
                                )
                              }
                              className={`w-7 h-7 rounded-md flex items-center justify-center ${isActive ? "text-gray-500 hover:text-[#549E9E] bg-white shadow-sm" : "text-transparent"} disabled:cursor-default cursor-pointer`}
                            >
                              {isActive && <Minus size={14} />}
                            </button>
                            <span
                              className={`text-sm font-black ${isActive ? "text-[#549E9E]" : "text-transparent"}`}
                            >
                              {isActive ? val : "-"}
                            </span>
                            <button
                              tabIndex={-1}
                              disabled={isReadOnly}
                              onClick={() =>
                                updateDose(
                                  idx,
                                  time.key as "morning" | "afternoon" | "night",
                                  val + 1,
                                )
                              }
                              className={`w-7 h-7 rounded-md flex items-center justify-center ${isActive ? "text-gray-500 hover:text-[#549E9E] bg-white shadow-sm" : "text-transparent"} disabled:cursor-default cursor-pointer`}
                            >
                              {isActive && <Plus size={14} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div>
                      <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                        {t("consultation_modal.amount", "Amount")}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={isReadOnly}
                        placeholder="0.00"
                        value={med.amount}
                        onChange={(e) =>
                          updateMedication(idx, "amount", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (e.shiftKey) {
                              if (idx > 0) {
                                document
                                  .getElementById(`med-trigger-${idx - 1}`)
                                  ?.focus();
                              }
                            } else {
                              if (idx === medications.length - 1) {
                                addMedication();
                              } else {
                                document
                                  .getElementById(`med-trigger-${idx + 1}`)
                                  ?.focus();
                              }
                            }
                          }
                        }}
                        className="w-full px-4 py-3 bg-[#549E9E]/[0.03] border border-[#549E9E]/15 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      {medications.length > 1 && !isReadOnly && (
                        <button
                          tabIndex={-1}
                          onClick={() => handleRemoveMedication(idx)}
                          title="Delete Row (Alt + Delete / Alt + Backspace)"
                          className="flex items-center gap-1.5 px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} className="shrink-0" />
                          <kbd className="px-1.5 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] font-black font-mono shadow-sm normal-case tracking-normal shrink-0">
                            Alt+Del
                          </kbd>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 pt-2 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
              <FileText size={14} />{" "}
              {t(
                "consultation_modal.other_medications",
                "Other Medications (Custom / Syrups)",
              )}
            </label>
            {!isReadOnly && (
              <button
                tabIndex={-1}
                id="add-other-med-btn"
                onClick={addOtherMedication}
                className="flex items-center gap-2 px-4 py-2 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
              >
                <Plus size={14} />{" "}
                {t("consultation_modal.add_other_med", "Add Other Med")}{" "}
                <kbd className="ml-2 px-2.5 py-1 bg-[#549E9E] text-white rounded-lg text-xs font-black font-mono shadow-sm normal-case tracking-normal">
                  Alt + O
                </kbd>
              </button>
            )}
          </div>

          {otherMedications.length === 0 && (
            <p className="text-xs text-gray-500 italic py-2">
              No other medications added. Click "+ Add Other Med" to add syrups,
              custom medicines, etc.
            </p>
          )}

          <div className="space-y-3">
            {otherMedications.map((om, idx) => {
              const selectedMedicine = textMedicines.find(
                (m) => m.medicine_value === om.name,
              );
              const availableOtherMedicineOptions =
                getAvailableOtherMedicineOptions(idx);

              const variantOptions =
                selectedMedicine && selectedMedicine.medical_products?.length
                  ? selectedMedicine.medical_products
                      .map((p) => {
                        if (p.source_type === "REGULAR_PRODUCT") {
                          return {
                            label: p.packing || "N/A",
                            price: p.mrp_rate || "0",
                            type: "product",
                          };
                        }
                        if (p.source_type === "RADIENT_PHARMA") {
                          return {
                            label:
                              p.size_or_weight || p.net_weight_or_size || "N/A",
                            price: p.mrp_rate || "0",
                            type: "radient",
                          };
                        }
                        return {
                          label: "N/A",
                          price: p.price_max || p.price_min || "0",
                          type: "medical_product_price",
                        };
                      })
                      .filter((v) => v.label)
                  : selectedMedicine
                    ? [
                        ...(selectedMedicine.products || []).map((p) => ({
                          label: p.packing || "N/A",
                          price: p.mrp_rate || "0",
                          type: "product",
                        })),
                        ...(selectedMedicine.radient_pharma_products || []).map(
                          (p) => ({
                            label: p.net_weight_or_size || "N/A",
                            price: p.mrp_rate || "0",
                            type: "radient",
                          }),
                        ),
                        ...(
                          selectedMedicine.handwritten_product_prices || []
                        ).map((p) => ({
                          label: p.product_name || p.category || "N/A",
                          price: p.price_max || p.price_min || "0",
                          type: "handwritten",
                        })),
                      ].filter((v) => v.label)
                    : [];

              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(200px,1.2fr)_minmax(150px,0.8fr)_minmax(200px,1.2fr)_100px_90px] gap-3 items-start bg-gray-50/70 border border-gray-200 rounded-xl p-4 hover:border-[#549E9E]/15 transition-all"
                  onKeyDown={(e) => {
                    if (
                      e.altKey &&
                      (e.key === "Backspace" || e.key === "Delete")
                    ) {
                      e.preventDefault();
                      handleRemoveOtherMedication(idx);
                    }
                  }}
                >
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t(
                        "consultation_modal.medicine_syrup_name",
                        "Medicine / Syrup Name",
                      )}
                    </label>
                    <SearchableDropdown
                      id={`other-trigger-${idx}`}
                      disabled={
                        isReadOnly ||
                        (availableOtherMedicineOptions.length === 0 && !om.name)
                      }
                      options={availableOtherMedicineOptions}
                      value={om.name}
                      onChange={(val) => {
                        const updated = [...otherMedications];
                        updated[idx] = {
                          ...updated[idx],
                          name: val,
                          selectedVariant: null,
                          amount: "",
                        };
                        setOtherMedications(updated);
                      }}
                      placeholder={
                        availableOtherMedicineOptions.length > 0
                          ? t(
                              "consultation_modal.search_medicine",
                              "Search Medicine...",
                            )
                          : t(
                              "consultation_modal.no_medicines_remaining",
                              "No Medicines Remaining",
                            )
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t(
                        "consultation_modal.quantity_variant",
                        "Quantity / Variant",
                      )}
                    </label>
                    <SearchableDropdown
                      disabled={isReadOnly || variantOptions.length === 0}
                      options={variantOptions.map((v) => ({
                        label: v.label,
                        value: v.label,
                      }))}
                      value={om.selectedVariant?.label || ""}
                      onChange={(val) => {
                        const variant = variantOptions.find(
                          (v) => v.label === val,
                        );
                        const updated = [...otherMedications];
                        updated[idx] = {
                          ...updated[idx],
                          selectedVariant: variant || null,
                          amount:
                            variant && variant.price
                              ? String(variant.price)
                              : updated[idx].amount,
                        };
                        setOtherMedications(updated);
                      }}
                      placeholder={
                        variantOptions.length > 0
                          ? t(
                              "consultation_modal.select_variant",
                              "Select Variant...",
                            )
                          : t("consultation_modal.no_variants", "No Variants")
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t(
                        "consultation_modal.remark_instructions",
                        "Remark / Instructions",
                      )}
                    </label>
                    <SearchableDropdown
                      id={`remark-trigger-${idx}`}
                      disabled={isReadOnly}
                      allowCustom={true}
                      options={
                        om.name?.toLowerCase().includes("syrup") ||
                        om.name?.toLowerCase().includes("syr")
                          ? [
                              { label: "2 spoon", value: "2 spoon" },
                              { label: "3 spoon", value: "3 spoon" },
                            ]
                          : [
                              {
                                label: "20 drop for 3 times in a day",
                                value: "20 drop for 3 times in a day",
                              },
                              {
                                label: "30 drop for 2 times in a day",
                                value: "30 drop for 2 times in a day",
                              },
                            ]
                      }
                      value={om.remark}
                      onChange={(val) => {
                        const updated = [...otherMedications];
                        updated[idx] = { ...updated[idx], remark: val };
                        setOtherMedications(updated);
                      }}
                      placeholder={t(
                        "consultation_modal.remark_placeholder",
                        "e.g. Take after meals, Apply twice daily...",
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t("consultation_modal.amount", "Amount")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="0.00"
                      value={om.amount}
                      onChange={(e) => {
                        const updated = [...otherMedications];
                        updated[idx] = {
                          ...updated[idx],
                          amount: e.target.value,
                        };
                        setOtherMedications(updated);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            if (idx > 0) {
                              document
                                .getElementById(`other-trigger-${idx - 1}`)
                                ?.focus();
                            }
                          } else {
                            if (idx === otherMedications.length - 1) {
                              addOtherMedication();
                            } else {
                              document
                                .getElementById(`other-trigger-${idx + 1}`)
                                ?.focus();
                            }
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-[#549E9E]/[0.03] border border-[#549E9E]/15 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                  <div className="flex justify-end pt-5">
                    {!isReadOnly && (
                      <button
                        tabIndex={-1}
                        onClick={() => handleRemoveOtherMedication(idx)}
                        title="Delete Row (Alt + Delete / Alt + Backspace)"
                        className="flex items-center gap-1.5 px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} className="shrink-0" />
                        <kbd className="px-1.5 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] font-black font-mono shadow-sm normal-case tracking-normal shrink-0">
                          Alt+Del
                        </kbd>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-2 bg-purple-50/60 border border-purple-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
              <FileText size={14} /> {t("consultation_modal.tests", "Tests")}
            </label>
            {!isReadOnly && (
              <button
                tabIndex={-1}
                id="add-test-btn"
                onClick={addTest}
                className="flex items-center gap-2 px-4 py-2 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
              >
                <Plus size={14} />{" "}
                {t("consultation_modal.add_test", "Add Test")}{" "}
                <kbd className="ml-2 px-2.5 py-1 bg-[#549E9E] text-white rounded-lg text-xs font-black font-mono shadow-sm normal-case tracking-normal">
                  Alt + T
                </kbd>
              </button>
            )}
          </div>

          {tests.length === 0 && (
            <p className="text-xs text-gray-500 italic py-2">
              No tests added. Click "+ Add Test" to add recommended tests.
            </p>
          )}

          <div className="space-y-3">
            {tests.map((test, idx) => {
              const availableLabTestOptions = getAvailableLabTestOptions(idx);

              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1.5fr)_130px_90px] gap-3 items-center bg-gray-50/70 border border-gray-200 rounded-xl p-4 hover:border-[#549E9E]/15 transition-all"
                  onKeyDown={(e) => {
                    if (
                      e.altKey &&
                      (e.key === "Backspace" || e.key === "Delete")
                    ) {
                      e.preventDefault();
                      handleRemoveTest(idx);
                    }
                  }}
                >
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t("consultation_modal.test_name", "Test Name")}
                    </label>
                    {labTestOptions.length > 0 ? (
                      <SearchableDropdown
                        id={`test-trigger-${idx}`}
                        disabled={
                          isReadOnly ||
                          (availableLabTestOptions.length === 0 &&
                            !test.master_test_id)
                        }
                        options={availableLabTestOptions}
                        value={
                          test.master_test_id
                            ? String(test.master_test_id)
                            : test.test_name
                        }
                        onChange={(selectedValue) => {
                          const selectedLabTest = labTests.find(
                            (item) => String(item.id) === selectedValue,
                          );
                          const updated = [...tests];
                          updated[idx] = {
                            ...updated[idx],
                            master_test_id: selectedLabTest?.id ?? null,
                            test_name: selectedLabTest?.test_name || "",
                            amount: selectedLabTest
                              ? selectedLabTest.amount !== null &&
                                selectedLabTest.amount !== undefined &&
                                selectedLabTest.amount !== ""
                                ? String(selectedLabTest.amount)
                                : ""
                              : updated[idx].amount,
                          };
                          setTests(updated);
                        }}
                        placeholder={
                          availableLabTestOptions.length > 0
                            ? t(
                                "consultation_modal.search_test",
                                "Search Test...",
                              )
                            : t(
                                "consultation_modal.no_tests_remaining",
                                "No Tests Remaining",
                              )
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        id={`test-trigger-${idx}`}
                        disabled={isReadOnly}
                        placeholder={t(
                          "consultation_modal.test_placeholder",
                          "e.g. CBC, Thyroid Profile...",
                        )}
                        value={test.test_name}
                        onChange={(e) => {
                          const updated = [...tests];
                          updated[idx] = {
                            ...updated[idx],
                            master_test_id: null,
                            test_name: e.target.value,
                          };
                          setTests(updated);
                        }}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {t("consultation_modal.amount", "Amount")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="0.00"
                      value={test.amount}
                      onChange={(e) => {
                        const updated = [...tests];
                        updated[idx] = {
                          ...updated[idx],
                          amount: e.target.value,
                        };
                        setTests(updated);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            if (idx > 0) {
                              document
                                .getElementById(`test-trigger-${idx - 1}`)
                                ?.focus();
                            }
                          } else {
                            if (idx === tests.length - 1) {
                              addTest();
                            } else {
                              document
                                .getElementById(`test-trigger-${idx + 1}`)
                                ?.focus();
                            }
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-[#549E9E]/[0.03] border border-[#549E9E]/15 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 text-sm font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    {!isReadOnly && (
                      <button
                        tabIndex={-1}
                        onClick={() => handleRemoveTest(idx)}
                        title="Delete Row (Alt + Delete / Alt + Backspace)"
                        className="flex items-center gap-1.5 px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} className="shrink-0" />
                        <kbd className="px-1.5 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] font-black font-mono shadow-sm normal-case tracking-normal shrink-0">
                          Alt+Del
                        </kbd>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#549E9E]/7 border border-[#549E9E]/15 rounded-2xl p-5 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] block mb-2">
            {t("consultation_modal.amount", "Amount")}
          </label>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-gray-600">
              {t(
                "consultation_modal.auto_calculated_amount",
                "Auto-calculated from Prescription, Other Medications and Tests",
              )}
            </p>
            <div className="min-w-[160px] px-4 py-3 bg-white border border-[#549E9E]/20 rounded-lg text-right text-lg font-black text-[#549E9E] shadow-sm">
              ₹ {totalAmount}
            </div>
          </div>
        </div>

        {!isReadOnly && (
          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={handleCompleteConsultation}
              disabled={isSubmitting || !isAppointmentContextReady}
              className="w-full bg-[#549E9E] text-white py-5 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#549E9E]/20 hover:bg-[#438787] hover:shadow-xl transition-all text-sm flex items-center justify-center gap-3.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCcw className="animate-spin" size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
              <span>
                {isSubmitting
                  ? t("consultation_modal.submitting", "Submitting...")
                  : t(
                      "consultation_modal.confirm_complete",
                      "Confirm & Complete Consultation",
                    )}
              </span>
              {!isSubmitting && (
                <kbd className="ml-3 px-3 py-1.5 bg-white text-[#549E9E] rounded-xl text-sm font-black font-mono shadow-md normal-case tracking-normal">
                  Ctrl + Enter
                </kbd>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
