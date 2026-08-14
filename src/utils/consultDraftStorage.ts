const STORAGE_PREFIX = "consultDraft";
const DRAFT_VERSION = 1 as const;
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type ConsultDraftMedication = {
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

export type ConsultDraftOtherMedication = {
  name: string;
  selectedVariant?: {
    label: string;
    price: string | number;
    type: string;
    remark_suggestions?: unknown[];
  } | null;
  remark: string;
  amount: string;
  quantity?: number | string;
  isManualEntry?: boolean;
};

export type ConsultDraftTest = {
  master_test_id?: number | null;
  test_name: string;
  amount: string;
};

export type ConsultDraft = {
  version: typeof DRAFT_VERSION;
  appointmentId: number;
  updatedAt: number;
  chiefComplaints: string;
  diagnosis: string;
  treatmentNotes: string;
  hasNoAdvice: boolean;
  isRepeat: boolean;
  isSame: boolean;
  repeatMonths: number;
  sameMonths: number;
  consultationMode: "PHYSICAL_PRESENT" | "ON_CALL";
  o2Value: string;
  bpValue: string;
  heightValue: string;
  heightUnit: "cm" | "ft";
  weightValue: string;
  globalDuration: string;
  thirtyDaysDoseFrequency: "2" | "3";
  followUpPreset: "7" | "15" | "30" | "45" | "60" | "90" | "180" | "custom";
  customFollowUpDays: string;
  repeatedFromConsultationId: number | null;
  quickNumericInput: string;
  lastAppliedQuickFormulaVersion: number | null;
  lastAppliedQuickFormulaSetId: number | null;
  medications: ConsultDraftMedication[];
  otherMedications: ConsultDraftOtherMedication[];
  tests: ConsultDraftTest[];
  universalRemark: string;
  occupation: string;
  historyPresentIllness: string;
  historyPastIllness: string;
  familyHistory: string;
  allergiesHistory: string;
  gynecologicalHistory: string;
  personalSocialHistory: string;
  generalExamination: string;
  systematicExamination: string;
  differentialDiagnosis: string;
  followUp: string;
  mentalMindStatus: string;
  disease: string;
  followUpChainClosed: boolean;
};

export type ConsultDraftPayload = Omit<
  ConsultDraft,
  "version" | "appointmentId" | "updatedAt"
>;

export function getConsultDraftStorageKey(
  doctorId: string | number,
  appointmentId: number,
): string {
  return `${STORAGE_PREFIX}:${doctorId}:${appointmentId}`;
}

function isValidDraft(value: unknown, appointmentId: number): value is ConsultDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as ConsultDraft;
  return (
    draft.version === DRAFT_VERSION &&
    Number(draft.appointmentId) === Number(appointmentId) &&
    typeof draft.updatedAt === "number" &&
    Array.isArray(draft.medications) &&
    Array.isArray(draft.otherMedications) &&
    Array.isArray(draft.tests)
  );
}

export function loadConsultDraft(
  doctorId: string | number | null | undefined,
  appointmentId: number | null | undefined,
): ConsultDraft | null {
  if (!doctorId || !appointmentId || appointmentId <= 0) return null;

  try {
    const raw = localStorage.getItem(
      getConsultDraftStorageKey(doctorId, appointmentId),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isValidDraft(parsed, appointmentId)) {
      localStorage.removeItem(getConsultDraftStorageKey(doctorId, appointmentId));
      return null;
    }

    if (Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(getConsultDraftStorageKey(doctorId, appointmentId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveConsultDraft(
  doctorId: string | number | null | undefined,
  appointmentId: number | null | undefined,
  payload: ConsultDraftPayload,
): void {
  if (!doctorId || !appointmentId || appointmentId <= 0) return;

  try {
    const draft: ConsultDraft = {
      version: DRAFT_VERSION,
      appointmentId,
      updatedAt: Date.now(),
      ...payload,
    };
    localStorage.setItem(
      getConsultDraftStorageKey(doctorId, appointmentId),
      JSON.stringify(draft),
    );
  } catch (error) {
    console.warn("Failed to save consultation draft:", error);
  }
}

export function clearConsultDraft(
  doctorId: string | number | null | undefined,
  appointmentId: number | null | undefined,
): void {
  if (!doctorId || !appointmentId || appointmentId <= 0) return;

  try {
    localStorage.removeItem(getConsultDraftStorageKey(doctorId, appointmentId));
  } catch {
    // ignore storage errors
  }
}
