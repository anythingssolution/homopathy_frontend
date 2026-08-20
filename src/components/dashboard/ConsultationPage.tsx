import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  Keyboard,
  Activity,
  UserCheck,
  Pencil,
  Copy,
} from "lucide-react";
import PatientDetailsEditModal from "./PatientDetailsEditModal";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { useDoctorFormulaMaster } from "../../context/DoctorFormulaMasterContext";
import { useTranslation } from "react-i18next";
import { dedupedFetch } from "../../utils/dedupedFetch";
import {
  getDosePreview,
  getMedicationPricingAmount,
  getMedicationRoleLabel,
  formatConsultationMedicineText,
  parseConsultationMedicineText,
  formatNumericMedicineWithFormula,
} from "../../utils/prescriptionFormat";
import {
  getNumericMedicineBaseValue,
  getNumericMedicineDropdownOptions,
  looksLikeNumericMedicineValue,
  parseDoctorFormulaInput,
} from "../../utils/doctorFormulaParser";
import { translateRemarkToHindi } from "../../utils/remarkHindiTranslator";
import {
  clearConsultDraft,
  loadConsultDraft,
  saveConsultDraft,
  type ConsultDraftPayload,
} from "../../utils/consultDraftStorage";
import {
  getDurationDaysFromKey,
  getDurationKeyFromDays,
  getDurationMultiplier,
  isThirtyDayDuration,
  MEDICATION_DURATION_DAY_OPTIONS,
  MEDICATION_DURATION_MONTH_OPTIONS,
  isMonthDuration,
  getDurationMonths,
  normalizeDurationKey,
} from "../../utils/medicationDuration";

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
  is_active: number;
  is_doctor_manual?: number | boolean;
  created_at: string;
  updated_at: string;
  remark_suggestions?: any[];
  medical_products?: any[];
  products?: any[];
  radient_pharma_products?: any[];
  handwritten_product_prices?: any[];
};

type VariantInfo = {
  label: string;
  price: string | number;
  type: string;
  remark_suggestions?: any[];
};

type RemarkSuggestion = {
  remark_value: string;
  updated_at?: string;
  created_at?: string;
};

const getLatestRemarkSuggestion = (
  suggestions: RemarkSuggestion[] = [],
): string => {
  return [...suggestions]
    .filter((suggestion) => String(suggestion.remark_value || "").trim())
    .sort((a, b) => {
      const aTimestamp = Date.parse(a.updated_at || a.created_at || "") || 0;
      const bTimestamp = Date.parse(b.updated_at || b.created_at || "") || 0;
      return bTimestamp - aTimestamp;
    })[0]?.remark_value?.trim() || "";
};

const toHindiRemarkOption = (value: string) => {
  const trimmed = String(value || "").trim();
  return {
    label: translateRemarkToHindi(trimmed) || trimmed,
    value: trimmed,
  };
};

const HINDI_REMARK_PLACEHOLDER = "उदा. भोजन के बाद लें, दिन में दो बार लगाएं...";
const DEFAULT_UNIVERSAL_REMARK_OPTIONS = [
  "20 drop for 3 times in a day",
  "30 drop for 2 times in a day",
  "1 spoon",
  "2 spoon",
  "3 spoon",
].map(toHindiRemarkOption);

type OtherMedEntry = {
  name: string;
  selectedVariant?: VariantInfo | null;
  remark: string;
  amount: string;
  quantity?: number | string;
  isManualEntry?: boolean;
};

const buildOtherMedFromSavedValue = (
  medicineValue: string,
  extras: Partial<OtherMedEntry> = {},
): OtherMedEntry => {
  const parsed = parseConsultationMedicineText(medicineValue);
  return {
    name: parsed.name,
    selectedVariant: parsed.variant
      ? {
          label: parsed.variant,
          price: extras.amount || "0",
          type: "manual",
        }
      : extras.selectedVariant || null,
    remark: extras.remark || "",
    amount: extras.amount || "",
    quantity: parsed.quantity || extras.quantity || 1,
    isManualEntry: Boolean(extras.isManualEntry),
  };
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

type SuggestionDosage = {
  dose_label?: string;
  sort_order?: number;
  times_per_day?: number;
  balls_per_dose?: number;
  instructions?: string;
};

type PrescriptionSuggestionItem = {
  medicine_type: string;
  medicine_value: string;
  remark?: string;
  doses?: SuggestionDosage[];
};

type PrescriptionSuggestionSet = PrescriptionSuggestionItem[] | string;

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
  const numbers = options || getNumericMedicineDropdownOptions();

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
  compact,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  id?: string;
  allowCustom?: boolean;
  compact?: boolean;
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

  const filteredOptions = options.filter((opt) => {
    const query = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query)
    );
  });

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
        className={`w-full bg-white border rounded-lg font-bold text-gray-800 transition-all flex justify-between items-center ${
          compact
            ? "h-7 px-2 py-0 text-[9px] uppercase tracking-wider"
            : "px-4 py-3 text-sm"
        } ${disabled
            ? "opacity-80 bg-gray-100 border-gray-200 cursor-default"
            : isOpen || (compact && Boolean(displayValue))
              ? "border-[#549E9E] cursor-text ring-2 ring-[#549E9E]/15"
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
            className={`w-full bg-transparent outline-none font-bold text-gray-800 ${
              compact ? "text-[9px] uppercase tracking-wider" : "text-sm"
            }`}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchTerm(nextValue);
              if (allowCustom) {
                onChange(nextValue);
              }
            }}
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
          className={`absolute z-50 mt-1 w-full min-w-[120px] bg-[#f4f8f7] border border-[#549E9E]/20 rounded-xl shadow-lg overflow-hidden ${
            compact ? "max-h-40" : "max-h-48 overflow-y-auto"
          } overflow-y-auto`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => (
              <div
                key={i}
                onClick={() => handleSelect(opt.value)}
                className={`hover:bg-[#549E9E]/10 hover:text-[#549E9E] cursor-pointer text-gray-700 ${
                  compact
                    ? "px-3 py-2 text-[11px] font-black"
                    : "px-4 py-2 text-sm"
                } ${i === highlightedIndex ? "bg-[#549E9E]/10 text-[#549E9E] font-bold" : ""} ${value === opt.value || value === opt.label ? "bg-[#549E9E]/5 text-[#549E9E] font-bold" : ""}`}
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
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const consultDraftAppliedForRef = useRef<number | null>(null);
  const consultDraftHydratedRef = useRef(false);
  const [consultDraftReadyToken, setConsultDraftReadyToken] = useState(0);
  const latestConsultDraftRef = useRef<{
    doctorId: string | number;
    appointmentId: number;
    payload: ConsultDraftPayload;
  } | null>(null);
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
  const [isFollowUpChainOpen, setIsFollowUpChainOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);

  const [chiefComplaints, setChiefComplaints] = useState(app?.symptoms || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [hasNoAdvice, setHasNoAdvice] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isSame, setIsSame] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState(0);
  const [sameMonths, setSameMonths] = useState(0);
  const [consultationMode, setConsultationMode] = useState<
    "PHYSICAL_PRESENT" | "ON_CALL"
  >("PHYSICAL_PRESENT");
  const [o2Value, setO2Value] = useState("");
  const [bpValue, setBpValue] = useState("");
  const [heightValue, setHeightValue] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightValue, setWeightValue] = useState("");
  const [globalDuration, setGlobalDuration] = useState("15");
  const [thirtyDaysDoseFrequency, setThirtyDaysDoseFrequency] = useState<
    "2" | "3"
  >("3");
  const [followUpPreset, setFollowUpPreset] = useState<
    "7" | "15" | "30" | "45" | "60" | "90" | "180" | "custom"
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
    { name: "", remark: "", amount: "", quantity: 1, isManualEntry: false },
  ]);
  const [tests, setTests] = useState<TestEntry[]>([
    { test_name: "", amount: "" },
  ]);
  const [universalRemark, setUniversalRemark] = useState("");
  const [textMedicines, setTextMedicines] = useState<TextMedicine[]>([]);
  const [labTests, setLabTests] = useState<LabTestMaster[]>([]);
  const [prescriptionSuggestions, setPrescriptionSuggestions] = useState<
    PrescriptionSuggestionSet[]
  >([]);
  const [suggestionBasis, setSuggestionBasis] = useState<
    "PATIENT_HISTORY" | "GLOBAL_HISTORY" | null
  >(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isQuickFormulaDropdownOpen, setIsQuickFormulaDropdownOpen] = useState(false);
  const quickFormulaDropdownRef = useRef<HTMLDivElement>(null);

  type ConfirmationModalState = {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };

  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        quickFormulaDropdownRef.current &&
        !quickFormulaDropdownRef.current.contains(event.target as Node)
      ) {
        setIsQuickFormulaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Extended History Fields
  const [isExtendedHistoryOpen, setIsExtendedHistoryOpen] = useState(false);
  const [occupation, setOccupation] = useState(app?.occupation || "");
  const [historyPresentIllness, setHistoryPresentIllness] = useState(app?.history_present_illness || "");
  const [historyPastIllness, setHistoryPastIllness] = useState(app?.history_past_illness || "");
  const [familyHistory, setFamilyHistory] = useState(app?.family_history || "");
  const [allergiesHistory, setAllergiesHistory] = useState(app?.allergies_history || "");
  const [gynecologicalHistory, setGynecologicalHistory] = useState(app?.gynecological_history || "");
  const [personalSocialHistory, setPersonalSocialHistory] = useState(app?.personal_social_history || "");
  const [generalExamination, setGeneralExamination] = useState(app?.general_examination || "");
  const [systematicExamination, setSystematicExamination] = useState(app?.systematic_examination || "");
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState(app?.differential_diagnosis || "");
  const [followUp, setFollowUp] = useState(app?.follow_up || "");
  const [mentalMindStatus, setMentalMindStatus] = useState(app?.mental_mind_status || "");
  const [disease, setDisease] = useState(app?.disease || "");

  const [isPatientEditOpen, setIsPatientEditOpen] = useState(false);
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
  const followUpAfterDays = getDurationDaysFromKey(globalDuration);
  const durationMonths = getDurationMonths(globalDuration);

  const applyMedicationDuration = (option: { key: string; days: number }) => {
    setGlobalDuration(option.key);
    setFollowUpPreset(
      String(option.days) as "7" | "15" | "30" | "45" | "60" | "90" | "180",
    );
    const months = getDurationMonths(option.key);
    if (months === 0) {
      setRepeatMonths(0);
      setSameMonths(0);
      if (isRepeat && isSame) {
        setIsSame(false);
      }
      return;
    }
    setRepeatMonths(0);
    setSameMonths(0);
    setIsRepeat(false);
    setIsSame(false);
  };

  const adjustMonthSplit = (kind: "repeat" | "same", delta: number) => {
    if (durationMonths <= 0) return;
    let nextRepeat = repeatMonths;
    let nextSame = sameMonths;
    if (kind === "repeat") {
      nextRepeat = Math.max(0, Math.min(durationMonths, repeatMonths + delta));
    } else {
      nextSame = Math.max(0, Math.min(durationMonths, sameMonths + delta));
    }
    if (nextRepeat + nextSame > durationMonths) {
      const overflow = nextRepeat + nextSame - durationMonths;
      if (kind === "repeat") {
        nextSame = Math.max(0, nextSame - overflow);
      } else {
        nextRepeat = Math.max(0, nextRepeat - overflow);
      }
    }
    setRepeatMonths(nextRepeat);
    setSameMonths(nextSame);
    setIsRepeat(nextRepeat > 0);
    setIsSame(nextSame > 0);
  };

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const res = await dedupedFetch("/api/v1/doctors/masters/text-medicines", {
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
            // Keep any in-progress draft / doctor typing ahead of appointment prefill.
            setChiefComplaints((prev) => prev || result.data.symptoms);
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

            if (incomingO2) {
              setO2Value((prev) => (prev.trim() ? prev : incomingO2));
            }
            if (incomingBp) {
              setBpValue((prev) => (prev.trim() ? prev : incomingBp));
            }
            if (incomingHeight) {
              setHeightValue((prev) => {
                if (prev.trim()) return prev;
                if (incomingHeight.includes("cm")) {
                  setHeightUnit("cm");
                  return incomingHeight.replace("cm", "").trim();
                }
                setHeightUnit("ft");
                return incomingHeight;
              });
            }
            if (incomingWeight) {
              setWeightValue((prev) =>
                prev.trim() ? prev : incomingWeight,
              );
            }
            setOccupation((prev) => prev || result.data.occupation || "");
            setHistoryPresentIllness((prev) => prev || result.data.history_present_illness || "");
            setHistoryPastIllness((prev) => prev || result.data.history_past_illness || "");
            setFamilyHistory((prev) => prev || result.data.family_history || "");
            setAllergiesHistory((prev) => prev || result.data.allergies_history || "");
            setGynecologicalHistory((prev) => prev || result.data.gynecological_history || "");
            setPersonalSocialHistory((prev) => prev || result.data.personal_social_history || "");
            setGeneralExamination((prev) => prev || result.data.general_examination || "");
            setSystematicExamination((prev) => prev || result.data.systematic_examination || "");
            setDifferentialDiagnosis((prev) => prev || result.data.differential_diagnosis || "");
            setFollowUp((prev) => prev || result.data.follow_up || "");
            setDisease((prev) => prev || result.data.disease || "");
            setMentalMindStatus((prev) => prev || result.data.mental_mind_status || "");
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
          setIsRepeat(Boolean(Number(c.is_repeat)));
          setIsSame(Boolean(Number(c.is_same)));
          setRepeatMonths(Number(c.repeat_months || 0));
          setSameMonths(Number(c.same_months || 0));

          setGlobalDuration(getDurationKeyFromDays(Number(c.medication_duration_days || 15)));
          const loadedFollowUpDays = Number(
            c.follow_up_after_days || c.medication_duration_days || 15,
          );
          setFollowUpPreset(
            String(loadedFollowUpDays) as "7" | "15" | "30" | "45" | "60" | "90" | "180",
          );
          setCustomFollowUpDays("");
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
          if (c.occupation) setOccupation(c.occupation);
          if (c.history_present_illness) setHistoryPresentIllness(c.history_present_illness);
          if (c.history_past_illness) setHistoryPastIllness(c.history_past_illness);
          if (c.family_history) setFamilyHistory(c.family_history);
          if (c.allergies_history) setAllergiesHistory(c.allergies_history);
          if (c.gynecological_history) setGynecologicalHistory(c.gynecological_history);
          if (c.personal_social_history) setPersonalSocialHistory(c.personal_social_history);
          if (c.general_examination) setGeneralExamination(c.general_examination);
          if (c.systematic_examination) setSystematicExamination(c.systematic_examination);
          if (c.differential_diagnosis) setDifferentialDiagnosis(c.differential_diagnosis);
          if (c.disease) setDisease(c.disease);
          if (c.mental_mind_status) setMentalMindStatus(c.mental_mind_status);
          setQuickNumericInput(c.quick_formula_input || "");
          setUniversalRemark(c.universal_remark || "");
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
                const savedAmount = pricingByMedicationId.has(
                  Number(m.consultation_medication_id),
                )
                  ? String(
                      pricingByMedicationId.get(
                        Number(m.consultation_medication_id),
                      ) ?? "",
                    )
                  : "";

                otherMeds.push(
                  buildOtherMedFromSavedValue(m.medicine_value || "", {
                    remark: m.remark || "",
                    amount: savedAmount,
                    isManualEntry: Boolean(m.is_manual_entry),
                  }),
                );
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

  // Restore per-appointment consultation drafts from localStorage.
  useEffect(() => {
    const draftAppointmentId =
      normalizedRouteAppointmentId || Number(currentApp?.appointment_id || 0);

    if (!user?.id || !draftAppointmentId || draftAppointmentId <= 0) {
      consultDraftHydratedRef.current = false;
      return;
    }

    if (consultDraftAppliedForRef.current === draftAppointmentId) {
      return;
    }

    const isCompleted =
      String(currentApp?.status || "").toLowerCase() === "completed";

    // Wait until appointment context is ready so we know completed vs in-progress.
    if (!isAppointmentContextReady) {
      consultDraftHydratedRef.current = false;
      return;
    }

    consultDraftAppliedForRef.current = draftAppointmentId;

    if (isCompleted || isReadOnly) {
      clearConsultDraft(user.id, draftAppointmentId);
      consultDraftHydratedRef.current = true;
      return;
    }

    const draft = loadConsultDraft(user.id, draftAppointmentId);
    if (draft) {
      setChiefComplaints(draft.chiefComplaints || "");
      setDiagnosis(draft.diagnosis || "");
      setTreatmentNotes(draft.treatmentNotes || "");
      setHasNoAdvice(Boolean(draft.hasNoAdvice));
      setIsRepeat(Boolean(draft.isRepeat));
      setIsSame(Boolean(draft.isSame));
      setRepeatMonths(Number(draft.repeatMonths || 0));
      setSameMonths(Number(draft.sameMonths || 0));
      setConsultationMode(
        draft.consultationMode === "ON_CALL" ? "ON_CALL" : "PHYSICAL_PRESENT",
      );
      setO2Value(draft.o2Value || "");
      setBpValue(draft.bpValue || "");
      setHeightValue(draft.heightValue || "");
      setHeightUnit(draft.heightUnit === "ft" ? "ft" : "cm");
      setWeightValue(draft.weightValue || "");
      setGlobalDuration(normalizeDurationKey(draft.globalDuration || "15"));
      setThirtyDaysDoseFrequency(
        draft.thirtyDaysDoseFrequency === "2" ? "2" : "3",
      );
      if (
        draft.followUpPreset === "7" ||
        draft.followUpPreset === "15" ||
        draft.followUpPreset === "30" ||
        draft.followUpPreset === "45" ||
        draft.followUpPreset === "60" ||
        draft.followUpPreset === "90" ||
        draft.followUpPreset === "180"
      ) {
        setFollowUpPreset(draft.followUpPreset);
      }
      setCustomFollowUpDays("");
      setRepeatedFromConsultationId(
        draft.repeatedFromConsultationId
          ? Number(draft.repeatedFromConsultationId)
          : null,
      );
      setQuickNumericInput(draft.quickNumericInput || "");
      setLastAppliedQuickFormulaVersion(
        draft.lastAppliedQuickFormulaVersion
          ? Number(draft.lastAppliedQuickFormulaVersion)
          : null,
      );
      setLastAppliedQuickFormulaSetId(
        draft.lastAppliedQuickFormulaSetId
          ? Number(draft.lastAppliedQuickFormulaSetId)
          : null,
      );
      setMedications(
        draft.medications?.length
          ? draft.medications
          : [
              {
                name: "",
                doses: { morning: 4, afternoon: 4, night: 4 },
                amount: "",
              },
            ],
      );
      setOtherMedications(
        draft.otherMedications?.length
          ? draft.otherMedications
          : [{ name: "", remark: "", amount: "", quantity: 1, isManualEntry: false }],
      );
      setTests(
        draft.tests?.length
          ? draft.tests
          : [{ test_name: "", amount: "" }],
      );
      setUniversalRemark(draft.universalRemark || "");
      setOccupation(draft.occupation || "");
      setHistoryPresentIllness(draft.historyPresentIllness || "");
      setHistoryPastIllness(draft.historyPastIllness || "");
      setFamilyHistory(draft.familyHistory || "");
      setAllergiesHistory(draft.allergiesHistory || "");
      setGynecologicalHistory(draft.gynecologicalHistory || "");
      setPersonalSocialHistory(draft.personalSocialHistory || "");
      setGeneralExamination(draft.generalExamination || "");
      setSystematicExamination(draft.systematicExamination || "");
      setDifferentialDiagnosis(draft.differentialDiagnosis || "");
      setFollowUp(draft.followUp || "");
      setMentalMindStatus(draft.mentalMindStatus || "");
      setDisease(draft.disease || "");
      setFollowUpChainClosed(Boolean(draft.followUpChainClosed));
    }

    // Enable persistence on the next render so we never save pre-restore values.
    consultDraftHydratedRef.current = true;
    setConsultDraftReadyToken((token) => token + 1);
  }, [
    user?.id,
    normalizedRouteAppointmentId,
    currentApp?.appointment_id,
    currentApp?.status,
    isAppointmentContextReady,
    isReadOnly,
  ]);

  // Persist in-progress consultation drafts per appointment.
  useEffect(() => {
    const draftAppointmentId =
      normalizedRouteAppointmentId || Number(currentApp?.appointment_id || 0);

    if (
      !consultDraftHydratedRef.current ||
      !consultDraftReadyToken ||
      !user?.id ||
      !draftAppointmentId ||
      draftAppointmentId <= 0 ||
      isReadOnly ||
      isSubmitting ||
      String(currentApp?.status || "").toLowerCase() === "completed"
    ) {
      latestConsultDraftRef.current = null;
      return;
    }

    const payload: ConsultDraftPayload = {
      chiefComplaints,
      diagnosis,
      treatmentNotes,
      hasNoAdvice,
      isRepeat,
      isSame,
      repeatMonths,
      sameMonths,
      consultationMode,
      o2Value,
      bpValue,
      heightValue,
      heightUnit,
      weightValue,
      globalDuration,
      thirtyDaysDoseFrequency,
      followUpPreset,
      customFollowUpDays,
      repeatedFromConsultationId,
      quickNumericInput,
      lastAppliedQuickFormulaVersion,
      lastAppliedQuickFormulaSetId,
      medications,
      otherMedications,
      tests,
      universalRemark,
      occupation,
      historyPresentIllness,
      historyPastIllness,
      familyHistory,
      allergiesHistory,
      gynecologicalHistory,
      personalSocialHistory,
      generalExamination,
      systematicExamination,
      differentialDiagnosis,
      followUp,
      mentalMindStatus,
      disease,
      followUpChainClosed,
    };

    latestConsultDraftRef.current = {
      doctorId: user.id,
      appointmentId: draftAppointmentId,
      payload,
    };

    const timer = window.setTimeout(() => {
      saveConsultDraft(user.id, draftAppointmentId, payload);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    consultDraftReadyToken,
    user?.id,
    normalizedRouteAppointmentId,
    currentApp?.appointment_id,
    currentApp?.status,
    isReadOnly,
    isSubmitting,
    chiefComplaints,
    diagnosis,
    treatmentNotes,
    hasNoAdvice,
    isRepeat,
    isSame,
    repeatMonths,
    sameMonths,
    consultationMode,
    o2Value,
    bpValue,
    heightValue,
    heightUnit,
    weightValue,
    globalDuration,
    thirtyDaysDoseFrequency,
    followUpPreset,
    customFollowUpDays,
    repeatedFromConsultationId,
    quickNumericInput,
    lastAppliedQuickFormulaVersion,
    lastAppliedQuickFormulaSetId,
    medications,
    otherMedications,
    tests,
    universalRemark,
    occupation,
    historyPresentIllness,
    historyPastIllness,
    familyHistory,
    allergiesHistory,
    gynecologicalHistory,
    personalSocialHistory,
    generalExamination,
    systematicExamination,
    differentialDiagnosis,
    followUp,
    mentalMindStatus,
    disease,
    followUpChainClosed,
  ]);

  // Flush the latest draft when leaving the consult page or switching appointments.
  useEffect(() => {
    return () => {
      const latest = latestConsultDraftRef.current;
      if (!latest) return;
      saveConsultDraft(
        latest.doctorId,
        latest.appointmentId,
        latest.payload,
      );
    };
  }, [appointmentId]);

  if (!currentApp) return null;

  const [focusTrigger, setFocusTrigger] = useState<{
    type: "med" | "other" | "other-variant" | "test";
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

  useEffect(() => {
    if (isExtendedHistoryOpen || isFollowUpChainOpen || showShortcutsModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow || "";
      };
    }
  }, [isExtendedHistoryOpen, isFollowUpChainOpen, showShortcutsModal]);

  const addOtherMedication = () => {
    if (isReadOnly) return;
    const newIdx = otherMedications.length;
    setOtherMedications([
      ...otherMedications,
      {
        name: "",
        remark: "",
        amount: "",
        quantity: 1,
        isManualEntry: false,
      },
    ]);
    setFocusTrigger({ type: "other", index: newIdx });
  };

  const addOtherMedicationVariant = (sourceIndex: number) => {
    if (isReadOnly) return;
    const source = otherMedications[sourceIndex];
    if (!source?.name.trim()) return;

    const nextRow: OtherMedEntry = {
      name: source.name.trim(),
      selectedVariant: null,
      remark: source.remark || "",
      amount: "",
      quantity: 1,
      isManualEntry: Boolean(source.isManualEntry),
    };
    const updated = [...otherMedications];
    updated.splice(sourceIndex + 1, 0, nextRow);
    setOtherMedications(updated);
    setFocusTrigger({ type: "other-variant", index: sourceIndex + 1 });
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

  const emptyNumericMedication = (): MedicationEntry => ({
    name: "",
    doses: { morning: 4, afternoon: 4, night: 4 },
    amount: "",
  });

  const resetQuickFormulaDerivedMedications = () => {
    lastAutoAppliedQuickFormulaKeyRef.current = "";
    setLastAppliedQuickFormulaVersion(null);
    setLastAppliedQuickFormulaSetId(null);
    setMedications((prev) => {
      const hasFormulaDerived = prev.some((med) => med.isQuickFormulaDerived);
      if (!hasFormulaDerived) {
        return prev;
      }

      const remaining = prev.filter(
        (med) => !med.isQuickFormulaDerived && String(med.name || "").trim(),
      );

      return remaining.length > 0 ? remaining : [emptyNumericMedication()];
    });
  };

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
      resetQuickFormulaDerivedMedications();
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
        if (isThirtyDayDuration(globalDuration)) {
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

    const trimmedInput = quickNumericInput.trim();
    if (!trimmedInput) {
      resetQuickFormulaDerivedMedications();
      return;
    }

    if (!formulaSnapshot) return;
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
        if (isThirtyDayDuration(globalDuration)) {
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
      const id =
        focusTrigger.type === "other-variant"
          ? `other-variant-trigger-${focusTrigger.index}`
          : `${focusTrigger.type}-trigger-${focusTrigger.index}`;
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
    return textMedicines.map((medicine) => ({
      label: Number(medicine.is_doctor_manual)
        ? `${medicine.medicine_value} (Manual)`
        : medicine.medicine_value,
      value: medicine.medicine_value,
    }));
  };

  const getUsedVariantsForMedicine = (
    medicineName: string,
    currentIndex: number,
  ) => {
    const normalizedName = medicineName.trim().toLowerCase();
    if (!normalizedName) return new Set<string>();

    return new Set(
      otherMedications
        .filter(
          (entry, index) =>
            index !== currentIndex &&
            entry.name.trim().toLowerCase() === normalizedName,
        )
        .map((entry) =>
          String(entry.selectedVariant?.label || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
  };

  const resolveTextMedicineVariants = (medicine: (typeof textMedicines)[number] | undefined) => {
    if (!medicine) return [];

    if (medicine.medical_products?.length) {
      return medicine.medical_products
        .map((p: any) => {
          if (p.source_type === "REGULAR_PRODUCT") {
            return {
              label: p.packing || "N/A",
              price: p.mrp_rate || "0",
              type: "product",
              remark_suggestions: p.remark_suggestions || [],
            };
          }
          if (p.source_type === "RADIENT_PHARMA") {
            return {
              label: p.size_or_weight || p.net_weight_or_size || "N/A",
              price: p.mrp_rate || "0",
              type: "radient",
              remark_suggestions: p.remark_suggestions || [],
            };
          }
          if (p.source_type === "DOCTOR_MANUAL") {
            return {
              label: p.packing || p.size_or_weight || p.product_name || "N/A",
              price: p.mrp_rate || "0",
              type: "manual",
              remark_suggestions: p.remark_suggestions || [],
            };
          }
          return {
            label: p.packing || p.size_or_weight || p.product_name || "N/A",
            price: p.mrp_rate || p.price_max || p.price_min || "0",
            type: "medical_product_price",
            remark_suggestions: p.remark_suggestions || [],
          };
        })
        .filter((v: any) => v.label);
    }

    return [
      ...(medicine.products || []).map((p: any) => ({
        label: p.packing || "N/A",
        price: p.mrp_rate || "0",
        type: "product",
        remark_suggestions: p.remark_suggestions || [],
      })),
      ...(medicine.radient_pharma_products || []).map((p: any) => ({
        label: p.net_weight_or_size || "N/A",
        price: p.mrp_rate || "0",
        type: "radient",
        remark_suggestions: p.remark_suggestions || [],
      })),
      ...(medicine.handwritten_product_prices || []).map((p: any) => ({
        label: p.product_name || p.category || "N/A",
        price: p.price_max || p.price_min || "0",
        type: "handwritten",
        remark_suggestions: p.remark_suggestions || [],
      })),
    ].filter((v) => v.label);
  };

  const applyOtherMedicineSelection = (
    current: OtherMedEntry,
    medicineName: string,
    currentIndex: number,
  ): OtherMedEntry => {
    const trimmedName = medicineName.trim();
    const medicine = textMedicines.find(
      (item) => item.medicine_value === trimmedName,
    );
    const isManualEntry =
      Boolean(trimmedName) &&
      (!medicine || Boolean(Number(medicine.is_doctor_manual)));

    if (isManualEntry && !medicine) {
      return {
        ...current,
        name: trimmedName,
        isManualEntry: true,
      };
    }

    const usedVariants = getUsedVariantsForMedicine(trimmedName, currentIndex);
    const computedVariants = resolveTextMedicineVariants(medicine).filter(
      (variant) =>
        !usedVariants.has(String(variant.label || "").trim().toLowerCase()),
    );
    const defaultVariant =
      computedVariants.length === 1 ? computedVariants[0] : null;
    const qtyNum = Math.max(1, parseInt(String(current.quantity || 1)) || 1);
    const unitPrice =
      defaultVariant && defaultVariant.price
        ? Number(defaultVariant.price)
        : 0;
    const nextRemark = getLatestRemarkSuggestion(
      defaultVariant?.remark_suggestions?.length
        ? defaultVariant.remark_suggestions
        : medicine?.remark_suggestions,
    );

    return {
      ...current,
      name: trimmedName,
      isManualEntry,
      selectedVariant: defaultVariant,
      remark: nextRemark,
      amount: unitPrice ? (unitPrice * qtyNum).toFixed(2) : current.amount,
    };
  };

  const applyOtherMedicineRemark = (
    current: OtherMedEntry,
    remark: string,
  ): OtherMedEntry => ({
    ...current,
    remark,
  });

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
          index === currentIndex ? "" : getNumericMedicineBaseValue(entry.name),
        )
        .filter(Boolean),
    );

    return getNumericMedicineDropdownOptions().filter(
      (value) => !selectedMedicineValues.has(value),
    );
  };

  const executeLoadRepeatTreatmentDraft = async () => {
    setIsLoadingRepeatDraft(true);
    try {
      const response = await fetch(
        `/api/v1/doctors/consultations/${currentApp?.appointment_id}/repeat-draft`,
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
          textMedicineDrafts.push(
            buildOtherMedFromSavedValue(String(medicine.medicine_value || ""), {
              remark: String(medicine.remark || ""),
              amount: String(medicine.amount ?? 0),
              isManualEntry: Boolean(medicine.is_manual_entry),
            }),
          );
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
          : [{ name: "", remark: "", amount: "", isManualEntry: false }],
      );
      if (result.data.medication_duration_days) {
        setGlobalDuration(getDurationKeyFromDays(Number(result.data.medication_duration_days)));
      }
      setRepeatedFromConsultationId(Number(result.data.source_consultation_id));
      setUniversalRemark(String(result.data.universal_remark || ""));
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

  const loadRepeatTreatmentDraft = () => {
    if (!currentApp?.appointment_id || !isFollowUpVisit || isReadOnly) return;

    const hasExistingMedicineData =
      medications.some((item) => item.name.trim()) ||
      otherMedications.some((item) => item.name.trim());

    if (hasExistingMedicineData) {
      setConfirmModal({
        isOpen: true,
        title: "Replace Medicine Draft?",
        message:
          "Current medicine draft will be replaced with the previous treatment. Continue?",
        onConfirm: () => {
          void executeLoadRepeatTreatmentDraft();
        },
      });
    } else {
      void executeLoadRepeatTreatmentDraft();
    }
  };

  // Debounced prescription suggestions fetching
  useEffect(() => {
    if (isReadOnly || !currentApp?.appointment_id) {
      setPrescriptionSuggestions([]);
      setSuggestionBasis(null);
      return;
    }

    const trimmedSymptoms = chiefComplaints.trim();
    const trimmedDiagnosis = diagnosis.trim();

    if (!trimmedSymptoms && !trimmedDiagnosis) {
      setPrescriptionSuggestions([]);
      setSuggestionBasis(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const queryParams = new URLSearchParams({
          appointment_id: String(currentApp.appointment_id),
          ...(trimmedSymptoms && { symptoms: trimmedSymptoms }),
          ...(trimmedDiagnosis && { diagnosis: trimmedDiagnosis }),
        }).toString();

        const response = await fetch(
          `/api/v1/doctors/consultations/prescription-suggestions?${queryParams}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setPrescriptionSuggestions(result.data);
          setSuggestionBasis(result.basis || null);
        } else {
          setPrescriptionSuggestions([]);
          setSuggestionBasis(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Failed to fetch prescription suggestions:", err);
        setPrescriptionSuggestions([]);
        setSuggestionBasis(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 750);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    chiefComplaints,
    diagnosis,
    currentApp?.appointment_id,
    isReadOnly,
    token,
  ]);

  const executeApplySuggestionSet = (
    suggestionSet: PrescriptionSuggestionSet,
  ) => {
    if (typeof suggestionSet === "string" || typeof suggestionSet === "number") {
      const formulaStr = String(suggestionSet).trim();

      setQuickNumericInput(formulaStr);

      const parsed = parseDoctorFormulaInput(formulaStr, formulaSnapshot);
      if (parsed.entries.length > 0) {
        setMedications(
          parsed.entries.map((entry) => {
            let targetDoses = { ...entry.doses };
            if (isThirtyDayDuration(globalDuration)) {
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
        setLastAppliedQuickFormulaVersion(formulaSnapshot?.version_no || null);
        setLastAppliedQuickFormulaSetId(formulaSnapshot?.set_id || null);
        addToast(
          `Applied formula "${formulaStr}" (${parsed.entries.length} numeric medicine(s)).`,
          "success",
        );
      } else {
        addToast(
          `Loaded "${formulaStr}" into Quick Numeric Entry field.`,
          "info",
        );
      }
      setIsPrescriptionOpen(true);
      return;
    }

    const numericMedicines: MedicationEntry[] = [];
    const textMedicineDrafts: OtherMedEntry[] = [];

    (suggestionSet as PrescriptionSuggestionItem[]).forEach((item) => {
      const typeLower = String(item.medicine_type || "").toLowerCase();
      const isNumeric =
        typeLower === "numeric" ||
        (looksLikeNumericMedicineValue(String(item.medicine_value || "")) &&
          (!item.remark || !item.remark.trim()));

      if (isNumeric) {
        const doses = { morning: 0, afternoon: 0, night: 0 };
        (item.doses || []).forEach((dose) => {
          const label = String(dose.dose_label || "").toUpperCase();
          if (label === "MORNING")
            doses.morning = Number(dose.balls_per_dose || 0);
          if (label === "AFTERNOON")
            doses.afternoon = Number(dose.balls_per_dose || 0);
          if (label === "NIGHT")
            doses.night = Number(dose.balls_per_dose || 0);
        });
        if (
          doses.morning === 0 &&
          doses.afternoon === 0 &&
          doses.night === 0
        ) {
          doses.morning = 4;
          doses.afternoon = 4;
          doses.night = 4;
        }
        numericMedicines.push({
          name: String(item.medicine_value || ""),
          doses,
          amount: "",
        });
      } else {
        textMedicineDrafts.push(
          buildOtherMedFromSavedValue(String(item.medicine_value || ""), {
            remark: String(item.remark || ""),
            amount: "",
            isManualEntry: false,
          }),
        );
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
        : [{ name: "", remark: "", amount: "", isManualEntry: false }],
    );

    setIsPrescriptionOpen(true);
    addToast(
      "Previous prescription suggestion applied to draft.",
      "success",
    );
  };

  const handleApplySuggestionSet = (
    suggestionSet: PrescriptionSuggestionSet,
  ) => {
    const hasExistingData =
      medications.some((m) => m.name.trim()) ||
      otherMedications.some((m) => m.name.trim());

    if (hasExistingData) {
      setConfirmModal({
        isOpen: true,
        title: "Replace Medicine Draft?",
        message:
          "Applying this prescription suggestion will replace current unsaved medicine entries. Continue?",
        onConfirm: () => executeApplySuggestionSet(suggestionSet),
      });
    } else {
      executeApplySuggestionSet(suggestionSet);
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
      const durationDays = getDurationDaysFromKey(globalDuration);
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

          const finalMedicineValue = formatConsultationMedicineText(
            om.name.trim(),
            om.selectedVariant?.label,
            om.quantity,
          );

          formattedMedications.push({
            medicine_type: "TEXT",
            medicine_value: finalMedicineValue,
            master_medicine_value: om.name.trim(),
            variant_value: om.selectedVariant?.label || null,
            quantity: Math.max(1, parseInt(String(om.quantity || 1), 10) || 1),
            variant_unit_price: om.selectedVariant?.price
              ? Number(om.selectedVariant.price)
              : null,
            remark: om.remark.trim() || null,
            remark_hi: translateRemarkToHindi(om.remark).trim() || null,
            is_manual_entry: Boolean(om.isManualEntry),
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
        formattedTests.length > 0 ||
        universalRemark.trim(),
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
        is_repeat: durationMonths > 0 ? repeatMonths > 0 : isRepeat,
        is_same: durationMonths > 0 ? sameMonths > 0 : isSame,
        repeat_months: durationMonths > 0 ? repeatMonths : 0,
        same_months: durationMonths > 0 ? sameMonths : 0,
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
        universal_remark: universalRemark.trim() || null,
        universal_remark_hi: translateRemarkToHindi(universalRemark).trim() || null,
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
        clearConsultDraft(user?.id, submissionAppointmentId);
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

  const handleUpdatePatientDetails = async (updatedData: {
    full_name: string;
    age: number;
    gender: string;
    mobile_no: string;
  }) => {
    const patientId = currentApp?.fk_patient_id || currentApp?.patient_id;
    if (!patientId) return;
    const payload: any = { ...updatedData };
    if (
      currentApp?.booked_for_type === "FAMILY_MEMBER" &&
      currentApp?.fk_patient_family_member_id
    ) {
      payload.family_member_id = currentApp.fk_patient_family_member_id;
    }
    const response = await fetch(`/api/v1/doctors/patients/${patientId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      setAppointmentDetail((prev: any) =>
        prev
          ? {
              ...prev,
              patient_full_name: updatedData.full_name,
              patient_age: updatedData.age,
              patient_gender: updatedData.gender,
              patient_mobile_no: updatedData.mobile_no,
            }
          : prev,
      );
      setIsPatientEditOpen(false);
      addToast(t("patient_edit.success", "Patient details updated successfully"), "success");
    } else {
      addToast(result.message || t("patient_edit.failed", "Failed to update patient details"), "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-6 pb-12 consultation-form-override">
      {currentApp && (
        <PatientDetailsEditModal
          isOpen={isPatientEditOpen}
          patientData={{
            patient_id: currentApp.fk_patient_id || currentApp.patient_id,
            full_name: currentApp.patient_full_name || "",
            age: currentApp.patient_age || "",
            gender: currentApp.patient_gender || "",
            mobile_no: currentApp.patient_mobile_no || "",
          }}
          onClose={() => setIsPatientEditOpen(false)}
          onSave={handleUpdatePatientDetails}
        />
      )}
      <div className="bg-[#549E9E] p-6 text-white flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            {currentApp.patient_full_name}{" "}
            {t("consultation_modal.consult_form", "Consult Form")}
            {!isReadOnly && (
              <button
                onClick={() => setIsPatientEditOpen(true)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                title={t("patient_edit.title", "Edit Patient Details")}
              >
                <Pencil size={16} />
              </button>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
              {t("consultation_modal.token", "Token")} #
              {currentApp.display_token_display || currentApp.token_number} •{" "}
              {currentApp.treatment_name}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/30 text-amber-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
              <User size={13} className="text-amber-200" />
              {t("consultation_modal.age_gender", "AGE / GENDER")}:{" "}
              {currentApp.patient_age || "—"} /{" "}
              {currentApp.patient_gender || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/25 border border-emerald-300/30 text-emerald-100 text-[11px] font-black tracking-wider backdrop-blur-xs shadow-xs">
              <Phone size={13} className="text-emerald-200" />
              {t("consultation_modal.mobile", "MOBILE")}:{" "}
              {currentApp.patient_mobile_no}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/25 border border-sky-300/30 text-sky-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
              <MapPin size={13} className="text-sky-200" />
              {t("consultation_modal.branch", "BRANCH")}:{" "}
              {currentApp.branch_name}
            </span>
            {currentApp.booked_for_type === "FAMILY_MEMBER" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-400/30 border border-purple-300/30 text-purple-100 text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                {currentApp.family_member_relationship} (Account:{" "}
                {currentApp.primary_patient_full_name})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-white shadow-sm border border-gray-100 relative">
        {/* Sleek Flat Top Control Row (No Box-in-Box Clutter) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-gray-100">
          {/* Left: Consultation Mode Pill Segment */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] shrink-0">
              {t("consultation_modal.consultation_type", "Consultation Mode")}:
            </span>
            <div className="inline-flex p-0.5 bg-gray-100/90 rounded-xl border border-gray-200/80">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setConsultationMode("PHYSICAL_PRESENT")}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${consultationMode === "PHYSICAL_PRESENT"
                    ? "bg-[#549E9E] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <User size={13} />
                {t(
                  "consultation_modal.patient_physical_present",
                  "Patient Physical Present",
                )}
              </button>

              {/* <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setConsultationMode("ON_CALL")}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${consultationMode === "ON_CALL"
                    ? "bg-[#549E9E] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <Phone size={13} />
                {t("consultation_modal.on_call_consultant", "On Call Consultant")}
              </button> */}
            </div>
          </div>

          {/* Right: No Prescription Mode */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${hasNoAdvice
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                } ${isReadOnly ? "opacity-70 cursor-default" : ""}`}
            >
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={hasNoAdvice}
                onChange={(e) => setHasNoAdvice(e.target.checked)}
                className="sr-only"
              />
              <AlertCircle
                size={14}
                className={hasNoAdvice ? "text-white" : "text-amber-500"}
              />
              <span>
                {t(
                  "consultation_modal.no_prescription_mode",
                  "No Prescription Mode",
                )}
              </span>
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasNoAdvice
                    ? "bg-white text-amber-600"
                    : "bg-gray-300 text-gray-600"
                  }`}
              >
                {hasNoAdvice ? "✓" : ""}
              </div>
            </label>
          </div>
        </div>
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <RefreshCcw className="animate-spin text-[#549E9E]" size={32} />
          </div>
        )}

        {/* Unified Bottom-Left Floating Action Stack (Equal Spacing) */}
        <div className="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-start gap-3.5 no-print">
          {/* 1. Keyboard Shortcuts Button (Bottom) */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="flex items-center justify-center bg-[#549E9E] hover:bg-[#438787] text-white h-12 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/20 group px-3.5"
              title={t(
                "consultation_modal.keyboard_active",
                "Keyboard Shortcuts",
              )}
            >
              <Keyboard
                size={20}
                className="transition-transform group-hover:rotate-12 shrink-0"
              />
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 group-hover:ml-2">
                Shortcuts
              </span>
            </button>
          )}

          {/* 2. Follow-up Report Button (Middle) */}
          {followUpChain.length > 0 && (
            <button
              type="button"
              onClick={() => setIsFollowUpChainOpen(true)}
              className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white h-12 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/20 group px-3.5"
              title={`Follow-up Report (${followUpChain.length} visits)`}
            >
              <div className="relative flex items-center justify-center">
                <ClipboardList
                  size={20}
                  className="transition-transform group-hover:rotate-6 shrink-0"
                />
                <span className="absolute -top-2.5 -right-2 bg-white text-red-600 text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-red-500 shadow-xs">
                  {followUpChain.length}
                </span>
              </div>
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 group-hover:ml-3">
                Follow-up Report ({followUpChain.length})
              </span>
            </button>
          )}

          {/* 3. Extended History Button (Top) */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsExtendedHistoryOpen(true)}
              className="flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white h-12 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/20 group px-3.5"
              title="Extended Patient History & Examination"
            >
              <div className="relative flex items-center justify-center">
                <ClipboardList
                  size={20}
                  className="transition-transform group-hover:rotate-6 shrink-0"
                />
                {(occupation ||
                  historyPresentIllness ||
                  historyPastIllness ||
                  familyHistory ||
                  allergiesHistory ||
                  gynecologicalHistory ||
                  mentalMindStatus ||
                  generalExamination ||
                  systematicExamination ||
                  disease ||
                  followUp ||
                  differentialDiagnosis) && (
                    <span className="absolute -top-2.5 -right-2 bg-emerald-400 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-teal-600 shadow-xs">
                      ✓
                    </span>
                  )}
              </div>
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 group-hover:ml-3">
                Extended History
              </span>
            </button>
          )}
        </div>

        {/* Follow-up Report Modal */}
        {isFollowUpChainOpen &&
          createPortal(
            <AnimatePresence>
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 no-print"
                onClick={() => setIsFollowUpChainOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-red-100 flex flex-col max-h-[85vh]"
                >
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                        <ClipboardList size={22} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base uppercase tracking-wider text-white">
                            Follow-up Report
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-xs">
                            {followUpChain.length}{" "}
                            {followUpChain.length === 1 ? "Visit" : "Visits"}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 font-bold">
                          Linked visit chain for this patient case
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsFollowUpChainOpen(false)}
                      className="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-5 space-y-3.5 overflow-y-auto flex-1 bg-red-50/20">
                    {followUpChain.map((item, index) => {
                      const isCurrent =
                        Number(item.appointment_id) ===
                        Number(currentApp?.appointment_id);
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
                          className={`border rounded-xl overflow-hidden shadow-xs transition-all ${isCurrent
                              ? "bg-white border-red-300 ring-2 ring-red-500/10"
                              : "bg-white/90 border-red-100 hover:border-red-200"
                            }`}
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
                            className="w-full text-left p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-red-50/40 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-black uppercase tracking-widest text-gray-800">
                                  {index + 1}. {item.treatment_name}
                                </p>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-xs">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-gray-500 mt-1">
                                {new Date(
                                  item.appointment_date,
                                ).toLocaleDateString()}{" "}
                                • {item.auid}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.medication_duration_days ? (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 text-[9px] font-black uppercase tracking-widest rounded">
                                    {item.medication_duration_days} Days
                                  </span>
                                ) : null}
                                {item.consultation?.medications?.length ? (
                                  <span className="px-2 py-0.5 bg-[#549E9E]/10 text-[#549E9E] border border-[#549E9E]/20 text-[9px] font-black uppercase tracking-widest rounded">
                                    {item.consultation.medications.length}{" "}
                                    Medicines
                                  </span>
                                ) : null}
                                {medicalMeds.length > 0 ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-widest rounded">
                                    {medicalMeds.length} Medical Added
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <ChevronDown
                              size={18}
                              className={`text-red-400 shrink-0 transition-transform duration-300 mt-1 ${isExpanded ? "rotate-180 text-red-600" : ""
                                }`}
                            />
                          </button>

                          {isExpanded && item.consultation && (
                            <div className="border-t border-red-100 bg-white p-4 space-y-3.5">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                    Symptoms / Findings
                                  </p>
                                  <p className="text-xs font-bold text-gray-700 whitespace-pre-wrap">
                                    {item.consultation.symptoms || "—"}
                                  </p>
                                </div>
                                <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
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
                                        className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/50"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                              {formatNumericMedicineWithFormula(
                                                med.medicine_value,
                                                item.consultation?.quick_formula_input,
                                              )}
                                            </p>
                                            {med.remark ? (
                                              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                                                {med.remark}
                                              </p>
                                            ) : null}
                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">
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
                                        className="border border-amber-100 rounded-lg p-2.5 bg-white/90"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-xs font-black text-gray-800 uppercase tracking-wide">
                                                {formatNumericMedicineWithFormula(
                                                  med.medicine_value,
                                                  item.consultation?.quick_formula_input,
                                                )}
                                              </p>
                                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                                                {getMedicationRoleLabel(med) ||
                                                  "Medical Added"}
                                              </span>
                                            </div>
                                            {med.remark ? (
                                              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                                                {med.remark}
                                              </p>
                                            ) : null}
                                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">
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
                                      {item.consultation.tests.map(
                                        (test: any) => (
                                          <span
                                            key={test.consultation_test_id}
                                            className="px-2.5 py-1 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-700 bg-gray-50"
                                          >
                                            {test.test_name}{" "}
                                            {test.amount != null
                                              ? `• ₹${Number(test.amount).toFixed(2)}`
                                              : ""}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {isExpanded && !item.consultation && (
                            <div className="border-t border-red-100 bg-white/80 p-3">
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                Consultation details not available for this
                                visit yet.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Press ESC or click button to close
                    </span>
                    <button
                      onClick={() => setIsFollowUpChainOpen(false)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      Close Report
                    </button>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}

        {/* Fixed Bottom-Right Margin Vitals Inputs (4 Vertical Cards along right edge) */}
        <div className="fixed right-2 bottom-6 z-40 flex flex-col gap-2 w-32 no-print">
          {/* Box 1: O2 Value */}
          <div className="bg-white border border-[#549E9E]/25 rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow backdrop-blur-md">
            <label className="text-[8px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 block">
              {t("consultation_modal.o2_value", "O2 Value")}
            </label>
            <div className="flex items-center w-full h-7 px-1.5 bg-gray-50 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-2 focus-within:ring-[#549E9E]/20 transition-all">
              <input
                type="text"
                id="vitals-o2-input"
                disabled={isReadOnly}
                placeholder={t("consultation_modal.o2_placeholder", "e.g. 98")}
                value={o2Value}
                onChange={(e) =>
                  setO2Value(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full bg-transparent outline-none text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
              />
              <span className="text-gray-400 font-black text-[10px] ml-0.5">
                %
              </span>
            </div>
          </div>

          {/* Box 2: BP Value */}
          <div className="bg-white border border-[#549E9E]/25 rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow backdrop-blur-md">
            <label className="text-[8px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 block">
              {t("consultation_modal.bp_value", "BP Value")}
            </label>
            <div className="flex items-center w-full h-7 px-1 bg-gray-50 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-2 focus-within:ring-[#549E9E]/20 transition-all">
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
                className="w-full bg-transparent outline-none text-right text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
              />
              <span className="text-gray-400 font-black mx-0.5 text-[10px]">
                /
              </span>
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
                className="w-full bg-transparent outline-none text-left text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
              />
            </div>
          </div>

          {/* Box 3: Height */}
          <div className="bg-white border border-[#549E9E]/25 rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow backdrop-blur-md">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[8px] font-black text-[#549E9E] uppercase tracking-wider block">
                {t("consultation_modal.height", "Height")}
              </label>
              {!isReadOnly && (
                <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => {
                      setHeightUnit("cm");
                      setHeightValue("");
                    }}
                    className={`px-1 py-0.2 rounded text-[7px] font-bold transition-colors cursor-pointer ${heightUnit === "cm" ? "bg-white shadow text-[#549E9E]" : "text-gray-400"}`}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeightUnit("ft");
                      setHeightValue("");
                    }}
                    className={`px-1 py-0.2 rounded text-[7px] font-bold transition-colors cursor-pointer ${heightUnit === "ft" ? "bg-white shadow text-[#549E9E]" : "text-gray-400"}`}
                  >
                    ft
                  </button>
                </div>
              )}
            </div>
            {heightUnit === "cm" ? (
              <div className="flex items-center w-full h-7 px-1.5 bg-gray-50 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-2 focus-within:ring-[#549E9E]/20 transition-all">
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
                  className="w-full bg-transparent outline-none text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
                />
                <span className="text-gray-400 font-black text-[10px] ml-0.5">
                  cm
                </span>
              </div>
            ) : (
              <div className="flex items-center w-full h-7 px-1 bg-gray-50 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-2 focus-within:ring-[#549E9E]/20 transition-all">
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
                  className="w-full bg-transparent outline-none text-right text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
                />
                <span className="text-gray-400 font-black mx-0.5 text-[10px]">
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
                  className="w-full bg-transparent outline-none text-left text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
                />
                <span className="text-gray-400 font-black ml-0.5 text-[10px]">
                  "
                </span>
              </div>
            )}
          </div>

          {/* Box 4: Weight */}
          <div className="bg-white border border-[#549E9E]/25 rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow backdrop-blur-md">
            <label className="text-[8px] font-black text-[#549E9E] uppercase tracking-wider mb-0.5 block">
              {t("consultation_modal.weight", "Weight")}
            </label>
            <div className="flex items-center w-full h-7 px-1.5 bg-gray-50 border border-gray-200 rounded-lg focus-within:bg-white focus-within:border-[#549E9E] focus-within:ring-2 focus-within:ring-[#549E9E]/20 transition-all">
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
                className="w-full bg-transparent outline-none text-[11px] font-bold text-gray-800 placeholder:text-gray-400 disabled:opacity-80"
              />
              <span className="text-gray-400 font-black text-[10px] ml-0.5">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmModal.isOpen &&
          createPortal(
            <AnimatePresence>
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 no-print"
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
                >
                  <div className="bg-gradient-to-r from-[#549E9E] to-teal-700 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                        <AlertCircle size={20} className="text-white" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-wider text-white">
                        {confirmModal.title || "Confirm Action"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                      }
                      className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                      {confirmModal.message}
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle
                        size={15}
                        className="text-amber-600 shrink-0 mt-0.5"
                      />
                      <span>
                        Unsaved changes in your current prescription draft will
                        be overwritten.
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                      }
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const action = confirmModal.onConfirm;
                        setConfirmModal((prev) => ({
                          ...prev,
                          isOpen: false,
                        }));
                        action();
                      }}
                      className="px-5 py-2 bg-[#549E9E] hover:bg-[#438787] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={15} />
                      Yes, Replace
                    </button>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}

        {/* Keyboard Shortcuts Modal */}
        {showShortcutsModal &&
          createPortal(
            <AnimatePresence>
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 no-print">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
                >
                  <div className="bg-[#549E9E] p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-white/10 rounded-lg">
                        <Keyboard size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">
                          {t(
                            "consultation_modal.keyboard_active",
                            "Keyboard Shortcuts & Navigation",
                          )}
                        </h4>
                        <p className="text-[10px] text-white/80 font-bold">
                          Quick reference guide for fast form entry
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowShortcutsModal(false)}
                      className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
                    {/* Field Navigation Section */}
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2.5">
                      <p className="font-black text-gray-500 uppercase tracking-widest text-[9.5px]">
                        1. Field & Form Navigation
                      </p>
                      <div className="space-y-2 text-gray-700 font-bold text-[11px]">
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                          <span>Navigate between form fields</span>
                          <div className="gap-1 flex items-center">
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              Tab
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              forward
                            </span>
                            <span className="text-gray-300">/</span>
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              Shift + Tab
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              backward
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                          <span>Advance on Amount field</span>
                          <div className="gap-1 flex items-center">
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              Enter
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              forward
                            </span>
                            <span className="text-gray-300">/</span>
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              Shift + Enter
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              back
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                          <span>Searchable Dropdown Selection</span>
                          <div className="gap-1 flex items-center">
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              ↑ / ↓
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              highlight
                            </span>
                            <span className="text-gray-300">•</span>
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded shadow-xs font-mono text-[10px] text-gray-800 font-black">
                              Enter
                            </kbd>
                            <span className="text-gray-400 text-[10px]">
                              select
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row Management Section */}
                    <div className="bg-[#549E9E]/5 rounded-xl p-3.5 border border-[#549E9E]/10 space-y-2.5">
                      <p className="font-black text-[#549E9E] uppercase tracking-widest text-[9.5px]">
                        2. Prescription & Row Actions
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-gray-700 font-bold">
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                          <span className="text-[10.5px]">
                            {t(
                              "consultation_modal.add_medicine",
                              "Add Medicine",
                            )}
                          </span>
                          <kbd className="px-1.5 py-0.5 bg-[#549E9E]/10 border border-[#549E9E]/20 rounded font-mono text-[10px] font-black text-[#549E9E]">
                            Alt + M
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                          <span className="text-[10.5px]">
                            {t(
                              "consultation_modal.add_other_med",
                              "Add Other Med",
                            )}
                          </span>
                          <kbd className="px-1.5 py-0.5 bg-[#549E9E]/10 border border-[#549E9E]/20 rounded font-mono text-[10px] font-black text-[#549E9E]">
                            Alt + O
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                          <span className="text-[10.5px]">
                            {t("consultation_modal.add_test", "Add Test")}
                          </span>
                          <kbd className="px-1.5 py-0.5 bg-[#549E9E]/10 border border-[#549E9E]/20 rounded font-mono text-[10px] font-black text-[#549E9E]">
                            Alt + T
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                          <span className="text-[10.5px]">
                            {t(
                              "consultation_modal.delete_row",
                              "Delete Active Row",
                            )}
                          </span>
                          <kbd className="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded font-mono text-[10px] font-black text-red-600">
                            Alt + Del
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Submission Section */}
                    <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 space-y-2">
                      <p className="font-black text-emerald-700 uppercase tracking-widest text-[9.5px]">
                        3. Form Submission
                      </p>
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200 shadow-xs">
                        <span className="text-[11px] font-black text-emerald-800">
                          {t(
                            "consultation_modal.save_complete",
                            "Save & Complete Consultation",
                          )}
                        </span>
                        <kbd className="px-2.5 py-1 bg-emerald-600 text-white rounded font-mono text-[10px] font-black shadow-xs">
                          Ctrl + Enter
                        </kbd>
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Press ESC or click button to close
                    </span>
                    <button
                      onClick={() => setShowShortcutsModal(false)}
                      className="px-4 py-2 bg-[#549E9E] hover:bg-[#438787] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      Got It
                    </button>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}

        {/* Extended History Modal */}
        {isExtendedHistoryOpen &&
          createPortal(
            <AnimatePresence>
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 no-print"
                onClick={() => setIsExtendedHistoryOpen(false)}
              >
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
                          Comprehensive EMR medical records, lifestyle,
                          examinations & observations
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExtendedHistoryOpen(false)}
                      className="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div
                    className="p-6 overflow-y-auto space-y-6 flex-1 h-full min-h-0"
                    style={{ overscrollBehavior: "contain" }}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Basic & Lifestyle */}
                    <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
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
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
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
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
                            placeholder={t(
                              "consultation_modal.personal_history_placeholder",
                              "e.g. Smoking, Alcohol...",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Medical History */}
                    <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
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
                            onChange={(e) =>
                              setAllergiesHistory(e.target.value)
                            }
                            rows={2}
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                            placeholder={t(
                              "consultation_modal.allergies_history_placeholder",
                              "Known allergies...",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Specialty & Mind */}
                    <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
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
                            onChange={(e) =>
                              setMentalMindStatus(e.target.value)
                            }
                            rows={2}
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                            placeholder={t(
                              "consultation_modal.mental_mind_placeholder",
                              "Psychological assessment...",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Examinations */}
                    <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                            placeholder={t(
                              "consultation_modal.systematic_exam_placeholder",
                              "System-specific exam findings...",
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Diagnosis & Follow Up */}
                    <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-black text-[#549E9E] uppercase tracking-widest block border-b border-gray-200 pb-2">
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
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
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
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80"
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
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-none"
                            placeholder={t(
                              "consultation_modal.differential_diagnosis_placeholder",
                              "Possible alternative diagnoses...",
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setIsExtendedHistoryOpen(false)}
                      className="px-5 py-2.5 bg-[#549E9E] hover:bg-[#438787] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Save & Close
                    </button>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="space-y-1.5 bg-white border border-[#549E9E]/15 rounded-2xl p-3 shadow-2xs">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-1.5">
                <FileText size={13} />{" "}
                {t("consultation_modal.chief_complaint", "Chief Complaint")}
              </label>
              <textarea
                rows={2}
                id="chief-complaints-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.chief_complaints_placeholder",
                  "Chief Complaints / Symptoms...",
                )}
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-2xs disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div>
            <div className="space-y-1.5 bg-white border border-[#549E9E]/15 rounded-2xl p-3 shadow-2xs">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-1.5">
                <FileText size={13} />{" "}
                {t("consultation_modal.clinical_findings", "Clinical Findings")}{" "}
                <span className="text-[9px] text-gray-400 normal-case tracking-normal">
                  {t("common.optional", "Optional")}
                </span>
              </label>
              <textarea
                rows={2}
                id="clinical-findings-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.clinical_findings_placeholder",
                  "Detailed clinical findings and observations...",
                )}
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-2xs disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div>
            <div className="space-y-1.5 bg-white border border-[#549E9E]/15 rounded-2xl p-3 shadow-2xs">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-1.5">
                <FileText size={13} />{" "}
                {t("consultation_modal.diagnosis", "Diagnosis")}{" "}
                <span className="text-[9px] text-gray-400 normal-case tracking-normal">
                  {t("common.optional", "Optional")}
                </span>
              </label>
              <textarea
                rows={2}
                id="diagnosis-input"
                disabled={isReadOnly}
                placeholder={t(
                  "consultation_modal.diagnosis_placeholder",
                  "Diagnosis / Observations...",
                )}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 resize-none transition-all shadow-2xs disabled:opacity-80 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Numeric Entry Card (Compact Single-Line Inline Bar) */}
        <div className="space-y-2.5 bg-white border border-[#549E9E]/15 rounded-2xl p-3.5 shadow-sm">
          {/* Header title */}
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-1.5">
              <WandSparkles size={14} /> Quick Numeric Entry
            </label>
            {isLoadingSuggestions && !isReadOnly && (
              <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                <RefreshCcw size={11} className="animate-spin text-[#549E9E]" />
                Matching formulas…
              </span>
            )}
          </div>

          {/* Unified Horizontal Controls Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input field with Dropdown */}
            <div className="relative flex-1 min-w-[220px]" ref={quickFormulaDropdownRef}>
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={quickNumericInput}
                  onChange={(e) => {
                    setQuickNumericInput(e.target.value);
                    if (prescriptionSuggestions.length > 0) {
                      setIsQuickFormulaDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (prescriptionSuggestions.length > 0) {
                      setIsQuickFormulaDropdownOpen(true);
                    }
                  }}
                  placeholder=""
                  className="w-full h-9 pl-3 pr-8 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold font-mono text-gray-800 placeholder:font-sans placeholder:text-gray-400 outline-none transition-all shadow-2xs disabled:opacity-80"
                />
                {prescriptionSuggestions.length > 0 && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      setIsQuickFormulaDropdownOpen(!isQuickFormulaDropdownOpen)
                    }
                    className="absolute right-2.5 p-1 text-gray-400 hover:text-[#549E9E] transition-colors cursor-pointer"
                    title="Toggle formula suggestions"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        isQuickFormulaDropdownOpen ? "rotate-180 text-[#549E9E]" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {isQuickFormulaDropdownOpen &&
                prescriptionSuggestions.length > 0 &&
                !isReadOnly && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-[#549E9E] flex items-center gap-1">
                        <WandSparkles size={11} /> Suggested Formula
                        {prescriptionSuggestions.length > 1 ? "s" : ""}
                      </span>
                      {suggestionBasis && (
                        <span className="text-[9px] font-bold text-gray-500">
                          {suggestionBasis === "PATIENT_HISTORY"
                            ? "Patient History"
                            : "Global History"}
                        </span>
                      )}
                    </div>

                    {prescriptionSuggestions.map((sug, sIdx) => {
                      const isString =
                        typeof sug === "string" || typeof sug === "number";
                      const displayLabel = isString
                        ? String(sug)
                        : Array.isArray(sug)
                        ? sug.map((m: any) => m.medicine_value).join(" + ")
                        : `Formula #${sIdx + 1}`;

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            handleApplySuggestionSet(sug);
                            setIsQuickFormulaDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#549E9E]/10 flex items-center justify-between text-xs font-mono font-black text-gray-800 hover:text-[#549E9E] transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-sans font-bold">
                              #{sIdx + 1}
                            </span>
                            <span>{displayLabel}</span>
                          </div>
                          <span className="text-[9.5px] font-sans font-bold text-[#549E9E]">
                            Apply & Parse →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* Parse & Apply Button */}
            <button
              type="button"
              disabled={isReadOnly || isFormulaLoading}
              onClick={() => {
                void applyQuickNumericFormula();
              }}
              className="h-9 px-3.5 bg-[#549E9E] hover:bg-[#438787] text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {isFormulaLoading ? (
                <RefreshCcw size={13} className="animate-spin" />
              ) : (
                <WandSparkles size={13} />
              )}
              Parse & Apply
            </button>



            {/* Duration Pills + Month Dropdown */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-50 p-1 border border-gray-200 rounded-xl min-h-9">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 px-1">
                Duration:
              </span>
              {MEDICATION_DURATION_DAY_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => applyMedicationDuration(option)}
                  className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all rounded-lg cursor-pointer ${globalDuration === option.key
                      ? "bg-[#549E9E] text-white shadow-xs"
                      : "text-gray-400 hover:text-gray-600"
                    } disabled:opacity-70 disabled:cursor-default`}
                >
                  {option.label}
                </button>
              ))}
              <div className="relative w-[108px] shrink-0">
                <SearchableDropdown
                  compact
                  disabled={isReadOnly}
                  options={MEDICATION_DURATION_MONTH_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.key,
                  }))}
                  value={isMonthDuration(globalDuration) ? globalDuration : ""}
                  onChange={(val) => {
                    const option = MEDICATION_DURATION_MONTH_OPTIONS.find(
                      (item) => item.key === val,
                    );
                    if (!option) return;
                    applyMedicationDuration(option);
                  }}
                  placeholder="Month"
                />
              </div>
            </div>

            {/* Close Case Checkbox */}
            {!isReadOnly && (
              <label className="flex items-center gap-1.5 cursor-pointer bg-red-50/70 border border-red-200/60 px-2.5 h-9 rounded-xl text-red-600 select-none">
                <input
                  type="checkbox"
                  checked={followUpChainClosed}
                  onChange={(e) => setFollowUpChainClosed(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#549E9E]"
                />
                <span className="text-[9px] font-black uppercase tracking-wider text-red-600">
                  Close Case
                </span>
              </label>
            )}

            {durationMonths > 0 ? (
              <div className="w-full flex flex-wrap items-center justify-end gap-1.5">
                <div
                  className={`inline-flex items-center gap-2 px-2.5 h-9 rounded-xl border text-[10.5px] font-black uppercase tracking-wider ${
                    repeatMonths > 0
                      ? "bg-blue-500 text-white border-blue-600 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  <RotateCcw
                    size={14}
                    className={repeatMonths > 0 ? "text-white" : "text-blue-500"}
                  />
                  <span>{t("consultation_modal.repeat", "Repeat")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isReadOnly || repeatMonths <= 0}
                      onClick={() => adjustMonthSplit("repeat", -1)}
                      className="w-5 h-5 rounded-md bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="min-w-6 text-center">{repeatMonths}</span>
                    <button
                      type="button"
                      disabled={isReadOnly || repeatMonths >= durationMonths}
                      onClick={() => adjustMonthSplit("repeat", 1)}
                      className="w-5 h-5 rounded-md bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                    <span className="normal-case tracking-normal text-[9px] opacity-80">
                      Mo
                    </span>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-2 px-2.5 h-9 rounded-xl border text-[10.5px] font-black uppercase tracking-wider ${
                    sameMonths > 0
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  <Copy
                    size={14}
                    className={sameMonths > 0 ? "text-white" : "text-emerald-500"}
                  />
                  <span>{t("consultation_modal.same", "Same")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isReadOnly || sameMonths <= 0}
                      onClick={() => adjustMonthSplit("same", -1)}
                      className="w-5 h-5 rounded-md bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="min-w-6 text-center">{sameMonths}</span>
                    <button
                      type="button"
                      disabled={isReadOnly || sameMonths >= durationMonths}
                      onClick={() => adjustMonthSplit("same", 1)}
                      className="w-5 h-5 rounded-md bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                    <span className="normal-case tracking-normal text-[9px] opacity-80">
                      Mo
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {repeatMonths + sameMonths}/{durationMonths} Mo
                </span>
              </div>
            ) : (
              <div className="w-full flex flex-wrap items-center justify-end gap-1.5">
                <label
                  className={`inline-flex items-center gap-2 px-3 h-9 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${isRepeat
                      ? "bg-blue-500 text-white border-blue-600 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    } ${isReadOnly ? "opacity-70 cursor-default" : ""}`}
                >
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={isRepeat}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeat(checked);
                      if (checked) setIsSame(false);
                    }}
                    className="sr-only"
                  />
                  <RotateCcw
                    size={14}
                    className={isRepeat ? "text-white" : "text-blue-500"}
                  />
                  <span>{t("consultation_modal.repeat", "Repeat")}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${isRepeat
                        ? "bg-white text-blue-600"
                        : "bg-gray-300 text-gray-600"
                      }`}
                  >
                    {isRepeat ? "✓" : ""}
                  </div>
                </label>

                <label
                  className={`inline-flex items-center gap-2 px-3 h-9 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${isSame
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    } ${isReadOnly ? "opacity-70 cursor-default" : ""}`}
                >
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={isSame}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsSame(checked);
                      if (checked) setIsRepeat(false);
                    }}
                    className="sr-only"
                  />
                  <Copy
                    size={14}
                    className={isSame ? "text-white" : "text-emerald-500"}
                  />
                  <span>{t("consultation_modal.same", "Same")}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${isSame
                        ? "bg-white text-emerald-600"
                        : "bg-gray-300 text-gray-600"
                      }`}
                  >
                    {isSame ? "✓" : ""}
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* 30 Days Frequency Options (Sub-row if 30 days active) */}
          {isThirtyDayDuration(globalDuration) && !isReadOnly && (
            <div className="flex items-center gap-3 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-[#549E9E]/20 text-[9px] font-black uppercase tracking-wider text-gray-600">
              <span className="text-[#549E9E]">30-Day Frequency:</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#549E9E]">
                <input
                  type="radio"
                  checked={thirtyDaysDoseFrequency === "3"}
                  onChange={() => setThirtyDaysDoseFrequency("3")}
                  className="accent-[#549E9E] w-3 h-3"
                />
                3 times a day
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#549E9E]">
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
                  className={`border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 transition-all ${quickFormulaPreview.errors.length === 0 &&
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
                    className={`border border-red-100 bg-red-50/50 rounded-xl p-4 ${quickFormulaPreview.entries.length === 0
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

        <div className="space-y-3 bg-[#549E9E]/5 border-2 border-[#549E9E] rounded-2xl p-3.5 shadow-md">
          <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all text-[9.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw
                      size={13}
                      className={isLoadingRepeatDraft ? "animate-spin" : ""}
                    />
                    Repeat Previous Treatment
                  </button>
                )}
                <button
                  tabIndex={-1}
                  onClick={addMedication}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[9.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  <Plus size={13} />{" "}
                  {t("consultation_modal.add_medicine", "Add Medicine")}{" "}
                  <kbd className="ml-1 px-2 py-0.5 bg-[#549E9E] text-white rounded text-[10px] font-black font-mono shadow-xs normal-case tracking-normal">
                    Alt + M
                  </kbd>
                </button>
              </div>
            )}
          </div>

          {isPrescriptionOpen && (
            <>
              <div className="hidden lg:grid lg:grid-cols-[minmax(260px,1.8fr)_100px_100px_100px_100px_40px] gap-3 px-3">
                {[
                  {
                    label: t("consultation_modal.medicine", "Medicine"),
                    align: "text-left",
                  },
                  {
                    label: t("consultation_modal.morning", "Morning"),
                    align: "text-center",
                  },
                  {
                    label: t("consultation_modal.afternoon", "Afternoon"),
                    align: "text-center",
                  },
                  {
                    label: t("consultation_modal.night", "Night"),
                    align: "text-center",
                  },
                  {
                    label: t("consultation_modal.amount", "Amount"),
                    align: "text-center",
                  },
                  { label: "", align: "text-center" },
                ].map((col, idx) => (
                  <div
                    key={`${col.label}-${idx}`}
                    className={`text-[9px] font-black text-gray-500 uppercase tracking-widest ${col.align}`}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1.8fr)_100px_100px_100px_100px_40px] gap-3 items-center bg-white border border-gray-200 rounded-xl p-2 px-3 shadow-2xs hover:shadow-sm hover:border-[#549E9E]/30 transition-all"
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
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10"
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
                        value={formatNumericMedicineWithFormula(
                          med.name,
                          quickNumericInput,
                        )}
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
                        fullLabel: t("consultation_modal.morning", "Morning"),
                        key: "morning",
                      },
                      {
                        fullLabel: t(
                          "consultation_modal.afternoon",
                          "Afternoon",
                        ),
                        key: "afternoon",
                      },
                      {
                        fullLabel: t("consultation_modal.night", "Night"),
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
                          className={`rounded-lg px-2 py-1 border flex items-center justify-between transition-all h-8.5 ${isActive
                              ? "bg-[#549E9E]/[0.06] border-[#549E9E]/30 shadow-2xs"
                              : "bg-gray-50/80 border-gray-200 opacity-75"
                            }`}
                        >
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() =>
                              updateDose(
                                idx,
                                time.key as "morning" | "afternoon" | "night",
                                isActive ? 0 : 4,
                              )
                            }
                            className="flex items-center justify-center cursor-pointer select-none outline-none disabled:cursor-default"
                            title={
                              isReadOnly
                                ? ""
                                : isActive
                                  ? `Disable ${time.fullLabel} dose`
                                  : `Enable ${time.fullLabel} dose`
                            }
                          >
                            {isActive ? (
                              <CheckCircle2
                                size={15}
                                className="text-[#549E9E] shrink-0"
                              />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-300 shrink-0" />
                            )}
                          </button>

                          {isActive ? (
                            <div className="flex items-center gap-1">
                              <button
                                tabIndex={-1}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() =>
                                  updateDose(
                                    idx,
                                    time.key as
                                    | "morning"
                                    | "afternoon"
                                    | "night",
                                    Math.max(1, val - 1),
                                  )
                                }
                                className="w-4.5 h-4.5 rounded bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-2xs transition-colors cursor-pointer disabled:cursor-default"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="w-4 text-center text-xs font-black text-[#549E9E]">
                                {val}
                              </span>
                              <button
                                tabIndex={-1}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() =>
                                  updateDose(
                                    idx,
                                    time.key as
                                    | "morning"
                                    | "afternoon"
                                    | "night",
                                    val + 1,
                                  )
                                }
                                className="w-4.5 h-4.5 rounded bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-2xs transition-colors cursor-pointer disabled:cursor-default"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                              Off
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <div>
                      <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
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
                        className="w-full h-8.5 px-2 bg-[#549E9E]/[0.03] border border-[#549E9E]/20 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none text-center disabled:opacity-80 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex justify-center">
                      {medications.length > 1 && !isReadOnly && (
                        <button
                          tabIndex={-1}
                          onClick={() => handleRemoveMedication(idx)}
                          title="Delete Row (Alt + Delete / Alt + Backspace)"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-2.5 pt-2 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-emerald-200/50">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[9.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                <Plus size={13} />{" "}
                {t("consultation_modal.add_other_med", "Add Other Med")}{" "}
                <kbd className="ml-1 px-2 py-0.5 bg-[#549E9E] text-white rounded text-[10px] font-black font-mono shadow-xs normal-case tracking-normal">
                  Alt + O
                </kbd>
              </button>
            )}
          </div>

          {!isReadOnly && (
            <p className="text-[10px] font-bold text-emerald-700/80 px-1 -mt-1">
              {t(
                "consultation_modal.add_variant_hint",
                "Same syrup, two sizes? Use + on the row to add another variant (e.g. 2ml and 10ml).",
              )}
            </p>
          )}

          {otherMedications.length === 0 && (
            <p className="text-xs text-gray-500 italic py-1 px-1">
              No other medications added. Click "+ Add Other Med" to add syrups,
              custom medicines, etc.
            </p>
          )}

          {otherMedications.length > 0 && (
            <div className="hidden lg:grid lg:grid-cols-[minmax(190px,1.3fr)_minmax(120px,0.8fr)_70px_minmax(180px,1.1fr)_90px_72px] gap-3 px-3">
              {[
                {
                  label: t(
                    "consultation_modal.medicine_syrup_name",
                    "Medicine / Syrup Name",
                  ),
                  align: "text-left",
                },
                {
                  label: t(
                    "consultation_modal.quantity_variant",
                    "Quantity / Variant",
                  ),
                  align: "text-left",
                },
                {
                  label: t("consultation_modal.qty", "Qty"),
                  align: "text-center",
                },
                {
                  label: t(
                    "consultation_modal.remark_instructions",
                    "Remark / Instructions",
                  ),
                  align: "text-left",
                },
                {
                  label: t("consultation_modal.amount", "Amount"),
                  align: "text-center",
                },
                { label: "", align: "text-center" },
              ].map((col, idx) => (
                <div
                  key={`${col.label}-${idx}`}
                  className={`text-[9px] font-black text-gray-500 uppercase tracking-widest ${col.align}`}
                >
                  {col.label}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {otherMedications.map((om, idx) => {
              const selectedMedicine = textMedicines.find(
                (m) => m.medicine_value === om.name,
              );
              const availableOtherMedicineOptions =
                getAvailableOtherMedicineOptions(idx);

              const usedVariants = getUsedVariantsForMedicine(om.name, idx);
              const resolvedVariants = resolveTextMedicineVariants(selectedMedicine);
              const variantOptions = [
                ...resolvedVariants,
                ...(om.selectedVariant?.label &&
                om.selectedVariant.label !== "N/A" &&
                !resolvedVariants.some(
                  (option) => option.label === om.selectedVariant?.label,
                )
                  ? [om.selectedVariant]
                  : []),
              ].filter((option) => {
                const label = String(option.label || "").trim();
                if (!label || label === "N/A") return false;
                const normalized = label.toLowerCase();
                const currentLabel = String(om.selectedVariant?.label || "")
                  .trim()
                  .toLowerCase();
                return normalized === currentLabel || !usedVariants.has(normalized);
              });
              const isContinuationVariant =
                idx > 0 &&
                Boolean(om.name.trim()) &&
                otherMedications[idx - 1].name.trim().toLowerCase() ===
                  om.name.trim().toLowerCase();
              const defaultRemarkOptions =
                om.name?.toLowerCase().includes("syrup") ||
                  om.name?.toLowerCase().includes("syr")
                  ? ["2 spoon", "3 spoon"].map(toHindiRemarkOption)
                  : [
                      "20 drop for 3 times in a day",
                      "30 drop for 2 times in a day",
                    ].map(toHindiRemarkOption);
              const savedRemarkSuggestions = om.selectedVariant
                ? om.selectedVariant.remark_suggestions || []
                : selectedMedicine?.remark_suggestions || [];
              const savedVariantRemarkOptions = savedRemarkSuggestions
                .map((remark) => String(remark.remark_value || "").trim())
                .filter(Boolean)
                .map(toHindiRemarkOption);
              const remarkOptions = Array.from(
                new Map(
                  [
                    ...defaultRemarkOptions,
                    ...savedVariantRemarkOptions,
                  ].map((option) => [option.value.toLowerCase(), option]),
                ).values(),
              );

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-1 lg:grid-cols-[minmax(190px,1.3fr)_minmax(120px,0.8fr)_70px_minmax(180px,1.1fr)_90px_72px] gap-3 items-start bg-white border rounded-xl p-2 px-3 shadow-2xs hover:shadow-sm transition-all ${
                    isContinuationVariant
                      ? "border-emerald-200/80 ml-0 lg:ml-3 bg-emerald-50/40"
                      : "border-emerald-100 hover:border-[#549E9E]/30"
                  }`}
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
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                      {t(
                        "consultation_modal.medicine_syrup_name",
                        "Medicine / Syrup Name",
                      )}
                    </label>
                    {isContinuationVariant ? (
                      <div className="h-[42px] px-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/80 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 shrink-0">
                          {t("consultation_modal.same_medicine_variant", "Same")}
                        </span>
                        <span className="text-sm font-bold text-gray-800 truncate">
                          {om.name}
                        </span>
                      </div>
                    ) : (
                      <SearchableDropdown
                        id={`other-trigger-${idx}`}
                        disabled={isReadOnly}
                        allowCustom={true}
                        options={availableOtherMedicineOptions}
                        value={om.name}
                        onChange={(val) => {
                          const updated = [...otherMedications];
                          updated[idx] = applyOtherMedicineSelection(
                            updated[idx],
                            val,
                            idx,
                          );
                          setOtherMedications(updated);
                        }}
                        placeholder={t(
                          "consultation_modal.search_medicine",
                          "Search or type medicine...",
                        )}
                      />
                    )}
                    {om.isManualEntry && (
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-600">
                        {t(
                          "consultation_modal.manual_medicine_badge",
                          "Manual doctor entry",
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                      {t(
                        "consultation_modal.quantity_variant",
                        "Quantity / Variant",
                      )}
                    </label>
                    <SearchableDropdown
                      id={`other-variant-trigger-${idx}`}
                      disabled={isReadOnly}
                      allowCustom={true}
                      options={variantOptions.map((v) => ({
                        label: v.label,
                        value: v.label,
                      }))}
                      value={
                        om.selectedVariant?.label === "N/A"
                          ? ""
                          : (om.selectedVariant?.label || "")
                      }
                      onChange={(val) => {
                        const trimmedVal = val.trim();
                        if (
                          trimmedVal &&
                          usedVariants.has(trimmedVal.toLowerCase())
                        ) {
                          addToast(
                            "This variant is already added for the same medicine.",
                            "error",
                          );
                          return;
                        }
                        const variant = variantOptions.find(
                          (v) => v.label === trimmedVal,
                        ) || (trimmedVal
                          ? {
                              label: trimmedVal,
                              price: om.selectedVariant?.price || "0",
                              type: "manual",
                              remark_suggestions: [],
                            }
                          : null);
                        const qtyNum = Math.max(1, parseInt(String(om.quantity || 1)) || 1);
                        const unitPrice = variant && variant.price ? Number(variant.price) : 0;

                        const nextRemark = getLatestRemarkSuggestion(
                          variant?.remark_suggestions?.length
                            ? variant.remark_suggestions
                            : selectedMedicine?.remark_suggestions,
                        );

                        const updated = [...otherMedications];
                        updated[idx] = {
                          ...updated[idx],
                          selectedVariant: variant,
                          remark: nextRemark || updated[idx].remark,
                          amount:
                            unitPrice
                              ? (unitPrice * qtyNum).toFixed(2)
                              : updated[idx].amount,
                        };
                        setOtherMedications(updated);
                      }}
                      placeholder={t(
                        "consultation_modal.select_or_type_variant",
                        "Select or type variant...",
                      )}
                    />
                  </div>
                  <div>
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                      {t("consultation_modal.qty", "Qty")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={isReadOnly}
                      placeholder="1"
                      value={om.quantity ?? 1}
                      onChange={(e) => {
                        const val = e.target.value;
                        const qtyNum = Math.max(1, parseInt(val) || 1);
                        const updated = [...otherMedications];
                        const unitPrice = om.selectedVariant?.price ? Number(om.selectedVariant.price) : 0;
                        updated[idx] = {
                          ...updated[idx],
                          quantity: val,
                          amount: unitPrice ? (unitPrice * qtyNum).toFixed(2) : updated[idx].amount,
                        };
                        setOtherMedications(updated);
                      }}
                      className="w-full h-8.5 px-2 bg-[#549E9E]/[0.03] border border-[#549E9E]/20 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none text-center disabled:opacity-80 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
                      {t(
                        "consultation_modal.remark_instructions",
                        "Remark / Instructions",
                      )}
                    </label>
                    <SearchableDropdown
                      id={`remark-trigger-${idx}`}
                      disabled={isReadOnly}
                      allowCustom={true}
                      options={remarkOptions}
                      value={om.remark}
                      onChange={(val) => {
                        const updated = [...otherMedications];
                        updated[idx] = applyOtherMedicineRemark(updated[idx], val);
                        setOtherMedications(updated);
                      }}
                      placeholder={HINDI_REMARK_PLACEHOLDER}
                    />
                    {translateRemarkToHindi(om.remark) && (
                      <p className="mt-1 text-[10px] font-bold text-[#549E9E] leading-snug">
                        {t("consultation_modal.remark_hi_preview", "Hindi")}:{" "}
                        {translateRemarkToHindi(om.remark)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
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
                      className="w-full h-8.5 px-2 bg-[#549E9E]/[0.03] border border-[#549E9E]/20 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none text-center disabled:opacity-80 disabled:bg-gray-100"
                    />
                  </div>

                  <div className="flex justify-center h-8.5 items-center gap-1">
                    {!isReadOnly && om.name.trim() && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => addOtherMedicationVariant(idx)}
                        title={t(
                          "consultation_modal.add_variant",
                          "Add another variant of this medicine",
                        )}
                        className="p-1.5 text-[#549E9E] hover:text-white hover:bg-[#549E9E] rounded-lg transition-all cursor-pointer"
                      >
                        <Plus size={15} />
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        tabIndex={-1}
                        onClick={() => handleRemoveOtherMedication(idx)}
                        title="Delete Row (Alt + Delete / Alt + Backspace)"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 bg-white border border-[#549E9E]/15 rounded-2xl p-3.5 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
            {t(
              "consultation_modal.remark_instructions",
              "Remark / Instructions",
            )}
          </label>
          <SearchableDropdown
            id="universal-remark-trigger"
            disabled={isReadOnly}
            allowCustom={true}
            options={DEFAULT_UNIVERSAL_REMARK_OPTIONS}
            value={universalRemark}
            onChange={setUniversalRemark}
            placeholder={HINDI_REMARK_PLACEHOLDER}
          />
          {translateRemarkToHindi(universalRemark) && (
            <p className="text-[10px] font-bold text-[#549E9E] leading-snug">
              {t("consultation_modal.remark_hi_preview", "Hindi")}:{" "}
              {translateRemarkToHindi(universalRemark)}
            </p>
          )}
        </div>

        <div className="space-y-2.5 pt-2 bg-purple-50/60 border border-purple-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-purple-200/50">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#549E9E] flex items-center gap-2">
              <FileText size={14} /> {t("consultation_modal.tests", "Tests")}
            </label>
            {!isReadOnly && (
              <button
                tabIndex={-1}
                id="add-test-btn"
                onClick={addTest}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#549E9E]/10 text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all text-[9.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                <Plus size={13} />{" "}
                {t("consultation_modal.add_test", "Add Test")}{" "}
                <kbd className="ml-1 px-2 py-0.5 bg-[#549E9E] text-white rounded text-[10px] font-black font-mono shadow-xs normal-case tracking-normal">
                  Alt + T
                </kbd>
              </button>
            )}
          </div>

          {tests.length === 0 && (
            <p className="text-xs text-gray-500 italic py-1 px-1">
              No tests added. Click "+ Add Test" to add recommended tests.
            </p>
          )}

          {tests.length > 0 && (
            <div className="hidden lg:grid lg:grid-cols-[minmax(280px,1.8fr)_120px_40px] gap-3 px-3">
              {[
                {
                  label: t("consultation_modal.test_name", "Test Name"),
                  align: "text-left",
                },
                {
                  label: t("consultation_modal.amount", "Amount"),
                  align: "text-center",
                },
                { label: "", align: "text-center" },
              ].map((col, idx) => (
                <div
                  key={`${col.label}-${idx}`}
                  className={`text-[9px] font-black text-gray-500 uppercase tracking-widest ${col.align}`}
                >
                  {col.label}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {tests.map((test, idx) => {
              const availableLabTestOptions = getAvailableLabTestOptions(idx);

              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1.8fr)_120px_40px] gap-3 items-center bg-white border border-purple-100 rounded-xl p-2 px-3 shadow-2xs hover:shadow-sm hover:border-[#549E9E]/30 transition-all"
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
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
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
                        className="w-full h-8.5 px-3 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:opacity-80 disabled:bg-gray-100"
                      />
                    )}
                  </div>
                  <div>
                    <label className="lg:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5 block">
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
                      className="w-full h-8.5 px-2 bg-[#549E9E]/[0.03] border border-[#549E9E]/20 rounded-lg focus:bg-white focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 text-xs font-bold text-gray-800 placeholder:text-gray-400 transition-all outline-none text-center disabled:opacity-80 disabled:bg-gray-100"
                    />
                  </div>

                  <div className="flex justify-center">
                    {!isReadOnly && (
                      <button
                        tabIndex={-1}
                        onClick={() => handleRemoveTest(idx)}
                        title="Delete Row (Alt + Delete / Alt + Backspace)"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unified Sticky Bottom Footer (Total Amount + Confirm Button) */}
        {!isReadOnly && (
          <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md border border-[#549E9E]/20 shadow-xl rounded-2xl p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#549E9E]/10 text-[#549E9E] rounded-xl font-black text-xs">
                ₹
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                  Total Payable
                </span>
                <span className="text-xl font-black text-[#549E9E]">
                  ₹ {totalAmount}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 text-[10px] font-bold text-gray-400">
                <span>Auto-calculated from Rx & Tests</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteConsultation}
              disabled={isSubmitting || !isAppointmentContextReady}
              className="w-full sm:w-auto px-8 h-12 bg-[#549E9E] hover:bg-[#438787] text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-md shadow-[#549E9E]/20 hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCcw className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={18} />
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
                <kbd className="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-black font-mono shadow-xs normal-case tracking-normal">
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
