import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { connectGuestSocket } from "../services/socket";
import {
  CheckCircle2,
  Users,
  Ticket,
  PhoneCall,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";

interface BranchOption {
  id: number;
  branch_name: string;
}

interface QueueGroup {
  branch_id: number;
  branch_name?: string;
  slot_id: number;
  slot_name?: string;
  tokens?: TokenItem[];
}

const getTreatmentColor = (treatmentName?: string) => {
  if (!treatmentName) return "bg-gray-100 text-gray-700 border-gray-200";
  const name = treatmentName.toLowerCase();
  if (name.includes("acute"))
    return "bg-rose-100 text-rose-700 border-rose-200";
  if (name.includes("chronic"))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (name.includes("first"))
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (name.includes("follow"))
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

interface TokenItem {
  appointment_id: number;
  token_number: number;
  patient_full_name: string;
  patient_name?: string;
  queue_status: string;
  planned_start_at: string | null;
  actual_started_at: string | null;
  branch_id?: number;
  branch_name?: string;
  fk_branch_id?: number;
  slot_id?: number;
  // New backend fields (Phase 1)
  display_token_number?: number;
  display_token_display?: string;
  queue_bucket?: "IN_PROGRESS" | "READY" | "CALLED" | "NOT_ARRIVED";
  runtime_priority_rank?: number | null;
  live_queue_position?: number;
  ready_queue_position?: number;
  active_queue_position?: number | null;
  completed_before?: number;
  session_queue_position?: number | null;
  queue_position_basis?: string | null;
  position_explanation?: string | null;
  live_estimated_wait_minutes?: number;
  live_estimated_start_at?: string | null;
  live_delay_minutes?: number;
  checked_in_at?: string | null;
  arrival_sequence?: number;
  current_token_number?: number;
  current_token_display?: string;
  booked_for_type?: string;
  fk_patient_family_member_id?: number | null;
  family_member_relationship?: string | null;
  family_member_full_name?: string | null;
  family_member_age?: number | null;
  family_member_gender?: string | null;
  family_member_description?: string | null;
  primary_patient_full_name?: string | null;
  treatment_name?: string;
  actual_called_at?: string | null;
  is_on_hold?: boolean;
  hold_rank?: number | null;
  hold_state?: "PRESENT" | "ABSENT" | null;
  present_now?: boolean;
  present_on_time?: boolean;
  scheduled_due?: boolean;
  next_runtime_assignment_mode?: string | null;
  current_queue_position?: number | null;
  current_queue_duration_minutes?: number | null;
  current_queue_start_at?: string | null;
  current_queue_end_at?: string | null;
  current_queue_time_basis?: string | null;
  current_queue_time_generated_at?: string | null;
}

interface CurrentTokensResponse {
  success: boolean;
  message: string;
  data: {
    branch_id?: number;
    branch_name?: string;
    slot_id?: number;
    slot_name?: string;
    tokens?: TokenItem[];
    active_queue?: TokenItem[];
    groups?: QueueGroup[];
    // New grouped queue containers from backend
    current_running_token?: TokenItem | null;
    ready_queue?: TokenItem[];
    called_queue?: TokenItem[];
    hold_queue?: TokenItem[];
    not_arrived_queue?: TokenItem[];
    service_pipeline?: TokenItem[];
    next_ready_token?: TokenItem | null;
    next_in_line_token?: TokenItem | null;
  };
}

const extractBranchOptionsFromSnapshot = (
  data: CurrentTokensResponse["data"] | undefined,
): BranchOption[] => {
  if (!data) return [];

  const branchMap = new Map<number, BranchOption>();
  const addBranch = (branchIdValue: unknown, branchNameValue: unknown) => {
    const branchId = Number(branchIdValue);
    if (!Number.isInteger(branchId) || branchId <= 0) return;

    const branchName =
      String(branchNameValue || "").trim() || `Branch ${branchId}`;
    branchMap.set(branchId, { id: branchId, branch_name: branchName });
  };

  (data.groups || []).forEach((group) =>
    addBranch(group.branch_id, group.branch_name),
  );
  addBranch(data.branch_id, data.branch_name);
  (data.tokens || []).forEach((token) =>
    addBranch(token.branch_id ?? token.fk_branch_id, token.branch_name),
  );
  (data.active_queue || []).forEach((token) =>
    addBranch(token.branch_id ?? token.fk_branch_id, token.branch_name),
  );

  [
    data.current_running_token,
    data.next_in_line_token,
    data.next_ready_token,
    ...(data.ready_queue || []),
    ...(data.called_queue || []),
    ...(data.hold_queue || []),
    ...(data.not_arrived_queue || []),
  ].forEach((token) => {
    if (!token) return;
    addBranch(token.branch_id ?? token.fk_branch_id, token.branch_name);
  });

  return Array.from(branchMap.values()).sort((left, right) =>
    left.branch_name.localeCompare(right.branch_name, undefined, {
      sensitivity: "base",
    }),
  );
};

const mergeBranchOptions = (
  existing: BranchOption[],
  incoming: BranchOption[],
) => {
  const branchMap = new Map<number, BranchOption>();

  [...existing, ...incoming].forEach((branch) => {
    const branchId = Number(branch?.id);
    if (!Number.isInteger(branchId) || branchId <= 0) return;

    const branchName =
      String(branch?.branch_name || "").trim() || `Branch ${branchId}`;
    const existingBranch = branchMap.get(branchId);

    if (!existingBranch || existingBranch.branch_name.startsWith("Branch ")) {
      branchMap.set(branchId, { id: branchId, branch_name: branchName });
    }
  });

  return Array.from(branchMap.values()).sort((left, right) =>
    left.branch_name.localeCompare(right.branch_name, undefined, {
      sensitivity: "base",
    }),
  );
};

const formatQueueClockTime = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const queueSpring = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.85,
} as const;

export default function LiveQueue() {
  const [searchParams] = useSearchParams();
  const appointment_date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const requestedBranchId = (() => {
    const rawValue =
      searchParams.get("branch_id") || searchParams.get("branchId");
    const parsed = rawValue ? Number(rawValue) : null;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  })();
  const requestedSlotId = (() => {
    const rawValue = searchParams.get("slot_id") || searchParams.get("slotId");
    const parsed = rawValue ? Number(rawValue) : null;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  })();

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // New grouped queue state (Phase 1)
  const [currentRunningToken, setCurrentRunningToken] =
    useState<TokenItem | null>(null);
  const [readyQueue, setReadyQueue] = useState<TokenItem[]>([]);
  const [calledQueue, setCalledQueue] = useState<TokenItem[]>([]);
  const [holdQueue, setHoldQueue] = useState<TokenItem[]>([]);
  const [notArrivedQueue, setNotArrivedQueue] = useState<TokenItem[]>([]);
  const [backendNextInLineToken, setBackendNextInLineToken] =
    useState<TokenItem | null>(null);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);

  // Track top token for audio chime
  const [currentTopTokenId, setCurrentTopTokenId] = useState<number | null>(
    null,
  );

  // Doctor Status
  const [isDoctorAvailable, setIsDoctorAvailable] = useState<boolean | null>(
    null,
  );
  const [doctorActiveSince, setDoctorActiveSince] = useState<string | null>(
    null,
  );

  const isPresentHoldToken = (appointment: TokenItem) =>
    appointment.is_on_hold &&
    (appointment.present_now === true || Boolean(appointment.checked_in_at));

  const getBackendSequenceRank = (appointment: TokenItem) =>
    appointment.runtime_priority_rank ??
    appointment.live_queue_position ??
    appointment.current_queue_position ??
    appointment.ready_queue_position ??
    Number.MAX_SAFE_INTEGER;

  const getSessionQueuePosition = (appointment: TokenItem) =>
    appointment.session_queue_position ??
    appointment.live_queue_position ??
    appointment.current_queue_position ??
    appointment.ready_queue_position ??
    null;

  const getActiveQueuePosition = (appointment: TokenItem) =>
    appointment.active_queue_position ??
    appointment.live_queue_position ??
    appointment.current_queue_position ??
    appointment.ready_queue_position ??
    null;

  const renderTokenPositionBadge = (
    appointment: TokenItem,
    size: "sm" | "lg" = "sm",
  ) => {
    const tokenText = appointment.display_token_display || String(appointment.token_number).padStart(2, "0");

    if (!tokenText) {
      return null;
    }

    const sizeClass =
      size === "lg"
        ? "min-w-10 h-8 px-2 text-xs sm:min-w-12 sm:h-10 sm:text-sm sm:px-2.5 -top-3 sm:-top-3.5 -left-4 sm:-left-5"
        : "min-w-8 h-6 px-1.5 text-[9px] -top-2 -left-3.5";

    return (
      <span
        title={`Token ${tokenText}`}
        className={`absolute z-30 ${sizeClass} rounded-full bg-yellow-400 text-gray-900 border-2 border-white shadow-lg flex items-center justify-center font-black leading-none tabular-nums whitespace-nowrap`}
      >
        {tokenText}
      </span>
    );
  };

  const sortRuntimeQueueItems = (items: TokenItem[]) =>
    [...items].sort((left, right) => {
      const leftPosition = getBackendSequenceRank(left);
      const rightPosition = getBackendSequenceRank(right);

      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }

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

  const nextInLineToken = useMemo(() => {
    if (!backendNextInLineToken) {
      return null;
    }

    const backendNextAppointmentId = Number(backendNextInLineToken.appointment_id);
    const currentAppointmentId = currentRunningToken?.appointment_id
      ? Number(currentRunningToken.appointment_id)
      : null;

    if (
      backendNextAppointmentId &&
      (!currentAppointmentId || backendNextAppointmentId !== currentAppointmentId)
    ) {
      return backendNextInLineToken;
    }

    return null;
  }, [backendNextInLineToken, currentRunningToken]);

  const listedReadyQueue = useMemo(() => {
    if (!nextInLineToken) {
      return readyQueue;
    }

    return readyQueue.filter(
      (appointment) =>
        Number(appointment.appointment_id) !==
        Number(nextInLineToken.appointment_id),
    );
  }, [readyQueue, nextInLineToken]);

  const listedHoldQueue = useMemo(() => {
    if (!nextInLineToken) {
      return holdQueue;
    }

    return holdQueue.filter(
      (appointment) =>
        Number(appointment.appointment_id) !==
        Number(nextInLineToken.appointment_id),
    );
  }, [holdQueue, nextInLineToken]);

  const listedRuntimeQueue = useMemo(
    () =>
      sortRuntimeQueueItems([
        ...listedReadyQueue,
        ...listedHoldQueue.filter(isPresentHoldToken),
      ]),
    [listedReadyQueue, listedHoldQueue],
  );

  const listedStandaloneHoldQueue = useMemo(
    () => listedHoldQueue.filter((appointment) => !isPresentHoldToken(appointment)),
    [listedHoldQueue],
  );

  const visibleQueueProjection = useMemo(() => {
    const orderedItems = [
      ...(currentRunningToken ? [currentRunningToken] : []),
      ...(nextInLineToken ? [nextInLineToken] : []),
      ...listedRuntimeQueue,
    ];
    const projection = new Map<
      number,
      {
        position: number;
        durationMinutes: number;
        startAt: Date | null;
        endAt: Date | null;
      }
    >();
    const seenAppointmentIds = new Set<number>();
    let cursor = isDoctorAvailable === true ? new Date(currentTime) : null;
    let position = 0;

    orderedItems.forEach((appointment) => {
      const appointmentId = Number(appointment.appointment_id);
      if (!appointmentId || seenAppointmentIds.has(appointmentId)) return;

      seenAppointmentIds.add(appointmentId);
      position += 1;

      const durationMinutes = Math.max(
        1,
        Number(appointment.current_queue_duration_minutes) || 15,
      );
      const isRunning =
        appointment.queue_status === "IN_PROGRESS" ||
        appointment.queue_bucket === "IN_PROGRESS";
      const consumesQueueTime =
        isRunning ||
        appointment.queue_bucket === "CALLED" ||
        Boolean(appointment.checked_in_at);
      let startAt: Date | null = null;
      let endAt: Date | null = null;

      if (!consumesQueueTime) {
        projection.set(appointmentId, {
          position,
          durationMinutes,
          startAt,
          endAt,
        });
        return;
      }

      if (isRunning) {
        const actualStart = appointment.actual_started_at
          ? new Date(appointment.actual_started_at)
          : null;
        startAt =
          actualStart && !Number.isNaN(actualStart.getTime())
            ? actualStart
            : new Date(currentTime);
        const expectedEnd = new Date(
          startAt.getTime() + durationMinutes * 60 * 1000,
        );
        endAt =
          expectedEnd.getTime() > currentTime.getTime()
            ? expectedEnd
            : new Date(currentTime);
        cursor = endAt;
      } else if (cursor) {
        startAt = new Date(cursor);
        endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
        cursor = endAt;
      } else if (appointment.current_queue_start_at) {
        const backendStart = new Date(appointment.current_queue_start_at);
        const backendEnd = appointment.current_queue_end_at
          ? new Date(appointment.current_queue_end_at)
          : null;

        if (!Number.isNaN(backendStart.getTime())) {
          startAt = backendStart;
          endAt =
            backendEnd && !Number.isNaN(backendEnd.getTime())
              ? backendEnd
              : new Date(backendStart.getTime() + durationMinutes * 60 * 1000);
          cursor = endAt;
        }
      }

      projection.set(appointmentId, {
        position,
        durationMinutes,
        startAt,
        endAt,
      });
    });

    return projection;
  }, [
    currentRunningToken,
    nextInLineToken,
    listedRuntimeQueue,
    isDoctorAvailable,
    currentTime,
  ]);

  const renderCurrentQueueTime = (
    appointment: TokenItem,
    variant: "light" | "dark" | "compact" = "light",
  ) => {
    const isPresent =
      appointment.queue_bucket === "IN_PROGRESS" ||
      appointment.queue_bucket === "CALLED" ||
      Boolean(appointment.checked_in_at);

    if (!isPresent) return null;

    const boardProjection = visibleQueueProjection.get(
      Number(appointment.appointment_id),
    );
    const startTime = formatQueueClockTime(
      boardProjection?.startAt || appointment.current_queue_start_at,
    );
    const isWaitingForSession = !startTime;
    if (!startTime && !isWaitingForSession) return null;

    if (variant === "compact") {
      return (
        <span className="text-[8px] font-black text-primary-teal uppercase tracking-wider truncate">
          Queue: {isWaitingForSession ? "Waiting" : startTime}
        </span>
      );
    }

    const labelClass =
      variant === "dark"
        ? "text-[8px] sm:text-[10px] font-bold text-cyan-100/90 uppercase tracking-widest"
        : "text-[9px] font-black text-primary-teal uppercase tracking-widest";
    const valueClass =
      variant === "dark"
        ? "text-sm sm:text-base font-black tabular-nums tracking-tight text-white"
        : "text-sm font-black text-gray-900 tabular-nums tracking-tight";
    const boxClass =
      variant === "dark"
        ? "mt-2 flex flex-col items-end w-full pt-2 border-t border-white/15"
        : "mt-2 flex flex-col items-end w-full pt-2 border-t border-gray-100";

    return (
      <div className={boxClass}>
        <span className={labelClass}>Current Queue Time</span>
        <span className={valueClass}>
          {isWaitingForSession ? "Waiting" : startTime}
        </span>
      </div>
    );
  };

  const renderTimeBadge = (
    label: string,
    value: string | Date | null | undefined,
    className: string,
  ) => {
    const time = formatQueueClockTime(value);
    if (!time) return null;

    return (
      <span className={className}>
        {label}: {time}
      </span>
    );
  };

  const resetDoctorStatus = () => {
    setIsDoctorAvailable(null);
    setDoctorActiveSince(null);
  };

  const applyDoctorStatusPayload = (statusData: any) => {
    if (!statusData || statusData.is_doctor_available === undefined) return;

    setIsDoctorAvailable(Boolean(statusData.is_doctor_available));
    if (statusData.time && statusData.is_doctor_available) {
      const d = new Date(statusData.time);
      setDoctorActiveSince(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    } else {
      setDoctorActiveSince(null);
    }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio Chime Logic
  useEffect(() => {
    if (currentRunningToken) {
      const isInProgress =
        currentRunningToken.queue_status === "IN_PROGRESS" ||
        currentRunningToken.queue_bucket === "IN_PROGRESS";
      if (
        isInProgress &&
        currentRunningToken.appointment_id !== currentTopTokenId
      ) {
        // Play gentle chime
        try {
          const audio = new Audio(
            "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
          );
          audio.volume = 0.5;
          audio
            .play()
            .catch((e) =>
              console.warn("Audio autoplay blocked by browser:", e),
            );
        } catch (e) {
          console.error("Audio play error:", e);
        }
        setCurrentTopTokenId(currentRunningToken.appointment_id);
      }
    }
  }, [currentRunningToken, currentTopTokenId]);

  useEffect(() => {
    let socket: Socket | null = null;
    let subscribedDateRoom = false;
    let subscribedRooms: Array<{ branch_id: number; slot_id: number }> = [];
    let activeDoctorStatusBranchId: number | null = requestedBranchId;
    let activeQueueBranchId: number | null = requestedBranchId;
    let activeQueueSlotId: number | null = requestedSlotId;
    let refreshInterval: number | null = null;
    let refreshDebounceTimeout: number | null = null;
    let reconcileTimeout: number | null = null;
    let refreshInFlight = false;
    let refreshPending = false;
    let isMounted = true;

    // Helper: start polling fallback (only if not already running)
    const startPollingFallback = () => {
      if (refreshInterval || !isMounted) return;
      console.log("[LiveQueue] Starting polling fallback (60s)");
      refreshInterval = window.setInterval(() => requestQueueRefresh(0), 60000);
    };

    // Helper: stop polling fallback
    const stopPollingFallback = () => {
      if (refreshInterval) {
        console.log("[LiveQueue] Stopping polling fallback");
        window.clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };

    const clearReconcileTimeout = () => {
      if (reconcileTimeout) {
        window.clearTimeout(reconcileTimeout);
        reconcileTimeout = null;
      }
    };

    const clearRefreshDebounceTimeout = () => {
      if (refreshDebounceTimeout) {
        window.clearTimeout(refreshDebounceTimeout);
        refreshDebounceTimeout = null;
      }
    };

    const fetchJson = async (url: string) => {
      const res = await fetch(url, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch queue data");
      }

      return res.json();
    };

    const resolvePrimarySlotContext = (data: any) => {
      const currentRunningSlotId = Number(
        data?.current_running_token?.slot_id ??
        data?.current_running_token?.fk_slot_id,
      );
      const currentRunningBranchId = Number(
        data?.current_running_token?.branch_id ??
        data?.current_running_token?.fk_branch_id,
      );

      if (
        Number.isInteger(currentRunningSlotId) &&
        currentRunningSlotId > 0 &&
        Number.isInteger(currentRunningBranchId) &&
        currentRunningBranchId > 0
      ) {
        return {
          branchId: currentRunningBranchId,
          slotId: currentRunningSlotId,
        };
      }

      const groups = Array.isArray(data?.groups) ? data.groups : [];
      const firstGroupWithTokens =
        groups.find((group: QueueGroup) => Number(group.tokens?.length || 0) > 0) ||
        groups[0];

      const branchId = Number(firstGroupWithTokens?.branch_id || requestedBranchId);
      const slotId = Number(firstGroupWithTokens?.slot_id);

      if (
        Number.isInteger(branchId) &&
        branchId > 0 &&
        Number.isInteger(slotId) &&
        slotId > 0
      ) {
        return { branchId, slotId };
      }

      return null;
    };

    const fetchSlotSnapshot = async (branchId: number, slotId: number) => {
      const params = new URLSearchParams({
        appointment_date,
        _ts: String(Date.now()),
      });

      params.set("branch_id", String(branchId));

      const json = await fetchJson(`/api/v1/live-queue/${slotId}?${params.toString()}`);
      const snapshotData = json.data || {};

      activeQueueBranchId = Number(snapshotData.branch_id || branchId);
      activeQueueSlotId = Number(snapshotData.slot_id || slotId);

      setBranchOptions((previous) =>
        mergeBranchOptions(
          previous,
          extractBranchOptionsFromSnapshot(snapshotData),
        ),
      );
      applyQueueSnapshot(snapshotData);
      setError("");
      return { ...json, data: snapshotData };
    };

    const fetchQueueSnapshot = async () => {
      if (requestedSlotId && requestedBranchId) {
        return fetchSlotSnapshot(requestedBranchId, requestedSlotId);
      }

      const params = new URLSearchParams({
        appointment_date,
        _ts: String(Date.now()),
      });

      if (requestedBranchId) {
        params.set("branch_id", String(requestedBranchId));
      }

      const json: CurrentTokensResponse = await fetchJson(
        `/api/v1/live-queue/current-date-tokens?${params.toString()}`,
      );

      setBranchOptions((previous) =>
        mergeBranchOptions(
          previous,
          extractBranchOptionsFromSnapshot(json.data),
        ),
      );

      const slotContext = resolvePrimarySlotContext(json.data);
      if (slotContext) {
        return fetchSlotSnapshot(slotContext.branchId, slotContext.slotId);
      }

      applyQueueSnapshot(json.data);
      setError("");
      return json;
    };

    const fetchAvailableBranches = async () => {
      const params = new URLSearchParams({
        appointment_date,
        _ts: String(Date.now()),
      });

      const res = await fetch(
        `/api/v1/live-queue/current-date-tokens?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        return;
      }

      const json: CurrentTokensResponse = await res.json();
      setBranchOptions((previous) =>
        mergeBranchOptions(
          previous,
          extractBranchOptionsFromSnapshot(json.data),
        ),
      );
    };

    const resolveDoctorStatusBranchId = (data: any): number | null => {
      if (requestedBranchId) {
        return requestedBranchId;
      }

      const topLevelBranchId = Number(data?.branch_id);
      if (Number.isInteger(topLevelBranchId) && topLevelBranchId > 0) {
        return topLevelBranchId;
      }

      const branchIdsFromGroups = Array.isArray(data?.groups)
        ? ([
          ...new Set(
            data.groups
              .map((group: { branch_id?: number }) =>
                Number(group?.branch_id),
              )
              .filter(
                (branchId: number) =>
                  Number.isInteger(branchId) && branchId > 0,
              ),
          ),
        ] as number[])
        : [];

      if (branchIdsFromGroups.length === 1) {
        return branchIdsFromGroups[0];
      }

      const branchIdsFromTokens = Array.isArray(data?.tokens)
        ? ([
          ...new Set(
            data.tokens
              .map((token: TokenItem) =>
                Number(token?.branch_id ?? token?.fk_branch_id),
              )
              .filter(
                (branchId: number) =>
                  Number.isInteger(branchId) && branchId > 0,
              ),
          ),
        ] as number[])
        : [];

      if (branchIdsFromTokens.length === 1) {
        return branchIdsFromTokens[0];
      }

      return null;
    };

    const fetchDoctorStatus = async () => {
      if (!activeDoctorStatusBranchId) {
        resetDoctorStatus();
        return;
      }

      const statusParams = new URLSearchParams({
        _ts: String(Date.now()),
      });

      if (activeDoctorStatusBranchId) {
        statusParams.set("branch_id", String(activeDoctorStatusBranchId));
      }

      const statusRes = await fetch(
        `/api/v1/public/doctor-status?${statusParams.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!statusRes.ok) {
        return;
      }

      const statusData = await statusRes.json();
      if (
        statusData?.data &&
        statusData.data.is_doctor_available !== undefined
      ) {
        applyDoctorStatusPayload(statusData.data);
      }
    };

    // Fetch both queue data and doctor status
    const fetchQueueAndDoctorStatus = async () => {
      if (!isMounted) return;
      try {
        await fetchQueueSnapshot();
        await fetchDoctorStatus();
      } catch (err) {
        console.error("[LiveQueue] Background fetch error:", err);
      }
    };

    const runQueueRefresh = async () => {
      if (!isMounted) return;

      if (refreshInFlight) {
        refreshPending = true;
        return;
      }

      refreshInFlight = true;

      try {
        await fetchQueueAndDoctorStatus();
      } finally {
        refreshInFlight = false;

        if (refreshPending && isMounted) {
          refreshPending = false;
          requestQueueRefresh(80);
        }
      }
    };

    const requestQueueRefresh = (delayMs = 120) => {
      if (!isMounted) return;

      clearRefreshDebounceTimeout();
      refreshDebounceTimeout = window.setTimeout(() => {
        refreshDebounceTimeout = null;
        void runQueueRefresh();
      }, delayMs);
    };

    // Centralized snapshot applier — handles both new grouped and old flat formats
    const applyQueueSnapshot = (data: any) => {
      if (!data || !isMounted) return;

      activeDoctorStatusBranchId = resolveDoctorStatusBranchId(data);
      if (!activeDoctorStatusBranchId) {
        resetDoctorStatus();
      }

      // New grouped queue structure (preferred)
      if (data.ready_queue || data.current_running_token !== undefined) {
        const sortedCalledQueue = sortRuntimeQueueItems(data.called_queue || []);
        const sortedReadyQueue = sortRuntimeQueueItems(data.ready_queue || []);
        const sortedHoldQueue = sortRuntimeQueueItems(data.hold_queue || []);
        const sortedNotArrivedQueue = sortRuntimeQueueItems(
          data.not_arrived_queue || [],
        );
        const nextInLine = data.next_in_line_token || data.next_ready_token || null;
        const primaryQueueIds = new Set(
          [
            data.current_running_token,
            ...sortedCalledQueue,
            ...sortedReadyQueue,
          ]
            .map((appointment) => Number(appointment?.appointment_id))
            .filter(Boolean),
        );
        const displayHoldQueue = sortedHoldQueue.filter(
          (appointment) =>
            !primaryQueueIds.has(Number(appointment.appointment_id)),
        );

        setCurrentRunningToken(data.current_running_token || null);
        setBackendNextInLineToken(nextInLine);
        setReadyQueue(sortedReadyQueue);
        setCalledQueue(sortedCalledQueue);
        setHoldQueue(displayHoldQueue);
        setNotArrivedQueue(sortedNotArrivedQueue);

        // Build compatible flat tokens list for header count & fallback
        const allTokens: TokenItem[] = [];
        if (data.current_running_token)
          allTokens.push(data.current_running_token);
        allTokens.push(...sortedCalledQueue);
        allTokens.push(...sortedReadyQueue);
        allTokens.push(...displayHoldQueue);
        allTokens.push(...sortedNotArrivedQueue);
        if (allTokens.length === 0 && Array.isArray(data.active_queue)) {
          allTokens.push(...data.active_queue);
        }
        setTokens(allTokens);
      } else {
        // Legacy flat format fallback
        const flatTokens = data.tokens || [];
        setTokens(flatTokens);
        const running =
          flatTokens.find(
            (t: TokenItem) =>
              t.queue_bucket === "IN_PROGRESS" ||
              t.queue_status === "IN_PROGRESS",
          ) || null;
        const hold = sortRuntimeQueueItems(
          flatTokens.filter((t: TokenItem) => t.is_on_hold),
        );
        const called = sortRuntimeQueueItems(
          flatTokens.filter(
            (t: TokenItem) =>
              t.queue_bucket === "CALLED" ||
              (!t.queue_bucket &&
                t.queue_status === "WAITING" &&
                t.actual_called_at),
          ),
        );
        const notArrived = sortRuntimeQueueItems(
          flatTokens.filter(
            (t: TokenItem) =>
              !t.is_on_hold &&
              (t.queue_bucket === "NOT_ARRIVED" ||
                (!t.queue_bucket &&
                  t.queue_status === "BOOKED" &&
                  !t.checked_in_at)),
          ),
        );
        const ready = sortRuntimeQueueItems(
          flatTokens.filter(
            (t: TokenItem) =>
              !t.is_on_hold &&
              (t.queue_bucket === "READY" ||
                t.queue_bucket === "CALLED" ||
                t.queue_status === "CHECKED_IN" ||
                (t.queue_status === "WAITING" && t.checked_in_at)) &&
              (!running || t.appointment_id !== running.appointment_id),
          ),
        );
        setCurrentRunningToken(running);
        setBackendNextInLineToken(null);
        setReadyQueue(ready);
        setCalledQueue(called);
        setHoldQueue(hold);
        setNotArrivedQueue(notArrived);
      }
    };

    const getRealtimeSnapshotFromPayload = (payload?: any) => {
      const snapshot = payload?.data || payload;

      if (!snapshot || typeof snapshot !== "object") {
        return null;
      }

      if (
        snapshot.current_running_token !== undefined ||
        snapshot.ready_queue ||
        snapshot.called_queue ||
        snapshot.hold_queue ||
        snapshot.not_arrived_queue ||
        Array.isArray(snapshot.tokens) ||
        Array.isArray(snapshot.active_queue)
      ) {
        return snapshot;
      }

      return null;
    };

    const isRealtimeSnapshotForActiveBoard = (snapshot: any) => {
      const snapshotBranchId = Number(snapshot?.branch_id);
      const snapshotSlotId = Number(snapshot?.slot_id);
      const boardBranchId = requestedBranchId || activeQueueBranchId;
      const boardSlotId = requestedSlotId || activeQueueSlotId;

      if (
        boardBranchId &&
        Number.isInteger(snapshotBranchId) &&
        snapshotBranchId > 0 &&
        snapshotBranchId !== boardBranchId
      ) {
        return false;
      }

      if (
        boardSlotId &&
        Number.isInteger(snapshotSlotId) &&
        snapshotSlotId > 0 &&
        snapshotSlotId !== boardSlotId
      ) {
        return false;
      }

      return true;
    };

    const applyRealtimeSnapshotPayload = (payload?: any) => {
      const snapshot = getRealtimeSnapshotFromPayload(payload);

      if (!snapshot || !isRealtimeSnapshotForActiveBoard(snapshot)) {
        return false;
      }

      const snapshotBranchId = Number(snapshot.branch_id);
      const snapshotSlotId = Number(snapshot.slot_id);

      if (Number.isInteger(snapshotBranchId) && snapshotBranchId > 0) {
        activeQueueBranchId = snapshotBranchId;
      }

      if (Number.isInteger(snapshotSlotId) && snapshotSlotId > 0) {
        activeQueueSlotId = snapshotSlotId;
      }

      setBranchOptions((previous) =>
        mergeBranchOptions(
          previous,
          extractBranchOptionsFromSnapshot(snapshot),
        ),
      );
      applyQueueSnapshot(snapshot);
      setError("");
      return true;
    };

    // Handle socket queue events by refetching the full board snapshot for the date.
    // Socket bursts can include both a specific event and queue-updated with the
    // same snapshot; apply a matching payload immediately, then coalesce network
    // reconciliation into one trailing refresh.
    const handleQueueUpdate = (payload?: any) => {
      if (!isMounted) return;
      console.log("[LiveQueue] Socket event received", payload?.event || "");
      const appliedSocketSnapshot = applyRealtimeSnapshotPayload(payload);
      requestQueueRefresh(appliedSocketSnapshot ? 250 : 120);
      clearReconcileTimeout();
      reconcileTimeout = window.setTimeout(() => {
        if (!isMounted) return;
        requestQueueRefresh(0);
      }, 700);
    };

    const subscribeToSlotRooms = (
      groups: Array<{ branch_id: number; slot_id: number }> = [],
    ) => {
      if (!socket) return;

      groups.forEach((group) => {
        const alreadySubscribed = subscribedRooms.some(
          (room) =>
            room.branch_id === group.branch_id &&
            room.slot_id === group.slot_id,
        );

        if (alreadySubscribed) return;

        socket!.emit(
          "live-queue.subscribe",
          {
            branch_id: group.branch_id,
            slot_id: group.slot_id,
            appointment_date,
          },
          (ack: any) => console.log("Fallback slot subscribe ack:", ack),
        );

        subscribedRooms.push(group);
      });
    };

    const buildPrimarySubscription = () => {
      if (activeQueueBranchId && activeQueueSlotId) {
        return {
          branch_id: activeQueueBranchId,
          slot_id: activeQueueSlotId,
          appointment_date,
        };
      }

      return {
        appointment_date,
        branch_id: requestedBranchId || undefined,
      };
    };

    const markPrimarySubscription = (payload: {
      branch_id?: number;
      slot_id?: number;
    }) => {
      if (payload.branch_id && payload.slot_id) {
        subscribedDateRoom = false;
        subscribedRooms = [{
          branch_id: payload.branch_id,
          slot_id: payload.slot_id,
        }];
        return;
      }

      subscribedDateRoom = true;
      subscribedRooms = [];
    };

    const init = async () => {
      try {
        setIsLoading(true);

        // === STEP 1: One-time initial fetch ===
        const json = await fetchQueueSnapshot();
        if (requestedBranchId) {
          await fetchAvailableBranches();
        }
        await fetchDoctorStatus();
        if (!isMounted) return;

        // === STEP 2: Set up WebSocket (no extra fetches) ===
        socket = connectGuestSocket();

        if (socket) {
          // Subscribe to queue rooms when socket connects
          socket.on("connect", () => {
            console.log("[LiveQueue] Socket connected");
            stopPollingFallback();

            const subscribePayload = buildPrimarySubscription();

            socket!.emit(
              "live-queue.subscribe",
              subscribePayload,
              (ack: any) => {
                console.log("Subscribe ack:", ack);
                if (ack?.success) {
                  markPrimarySubscription(subscribePayload);
                  return;
                }

                subscribeToSlotRooms(json.data?.groups || []);
              },
            );
          });

          // If already connected (unlikely but possible)
          if (socket.connected) {
            const subscribePayload = buildPrimarySubscription();
            socket.emit(
              "live-queue.subscribe",
              subscribePayload,
              (ack: any) => {
                if (ack?.success) {
                  markPrimarySubscription(subscribePayload);
                  return;
                }

                subscribeToSlotRooms(json.data?.groups || []);
              },
            );
          }

          // Listen for queue update events
          const handleDoctorStatusEvent = (payload: any) => {
            console.log(
              "[LiveQueue] Received doctor.session.updated:",
              payload,
            );
            if (payload) {
              if (
                requestedBranchId &&
                payload.branch_id &&
                Number(payload.branch_id) !== requestedBranchId
              ) {
                return;
              }

              if (!requestedBranchId && !activeDoctorStatusBranchId) {
                resetDoctorStatus();
                return;
              }

              if (
                !requestedBranchId &&
                activeDoctorStatusBranchId &&
                payload.branch_id &&
                Number(payload.branch_id) !== activeDoctorStatusBranchId
              ) {
                return;
              }

              applyDoctorStatusPayload(payload);
            }
            handleQueueUpdate(payload);
          };

          socket.on("queue-updated", handleQueueUpdate);
          socket.on("doctor.session.current", handleDoctorStatusEvent);
          socket.on("doctor.session.updated", handleDoctorStatusEvent);
          socket.on("doctor-session-started", handleQueueUpdate);
          socket.on("doctor-session-completed", handleQueueUpdate);
          socket.on("token-called", handleQueueUpdate);
          socket.on("consultation-started", handleQueueUpdate);
          socket.on("consultation-completed", handleQueueUpdate);
          socket.on("appointment-cancelled", handleQueueUpdate);
          socket.on("token-shifted", handleQueueUpdate);

          // Only start polling fallback when socket fully gives up
          socket.on("connect_error", (err: any) => {
            console.warn("[LiveQueue] Socket error:", err.message);
            startPollingFallback();
          });

          socket.on("disconnect", (reason: string) => {
            console.log("[LiveQueue] Socket disconnected:", reason);
            startPollingFallback();
          });
        } else {
          // No socket available at all — use polling
          startPollingFallback();
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[LiveQueue] Initial fetch error:", err);
        setError("Unable to load queue data. Retrying...");
        // Even if initial fetch fails, start conservative polling
        startPollingFallback();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;

      if (socket) {
        if (subscribedDateRoom) {
          socket!.emit("live-queue.unsubscribe", {
            appointment_date,
            branch_id: requestedBranchId || undefined,
          });
        }
        subscribedRooms.forEach((group) => {
          socket!.emit("live-queue.unsubscribe", {
            branch_id: group.branch_id,
            slot_id: group.slot_id,
            appointment_date,
          });
        });
        socket.removeAllListeners();
        socket.disconnect();
      }

      stopPollingFallback();
      clearRefreshDebounceTimeout();
      clearReconcileTimeout();
    };
  }, [appointment_date, requestedBranchId, requestedSlotId]);

  const doctorStatusLabel =
    isDoctorAvailable === true
      ? "DOCTOR IN"
      : isDoctorAvailable === false
        ? "DOCTOR OUT"
        : "CHECKING STATUS";

  if (isLoading && tokens.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-teal"></div>
      </div>
    );
  }

  // Active or called tokens usually have IN_PROGRESS or are the ones actively checked in and called.
  // We'll just show them as a single clean list as requested: "just an list"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#E9F2F9] to-[#F8F9FA] animate-gradient-x text-gray-800 font-sans flex flex-col relative pb-12">
      {/* Custom Styles for Ambient Animations & Marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 60s linear infinite;
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        @keyframes heart-beat {
          0% { transform: scale(1); }
          14% { transform: scale(1.3); }
          28% { transform: scale(1); }
          42% { transform: scale(1.3); }
          70% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .animate-heart-beat {
          animation: heart-beat 1.5s infinite;
        }
      `}</style>

      <header className="bg-primary-teal text-white p-3 md:p-5 shadow-md flex flex-row justify-between items-center flex-nowrap relative z-10">

        {/* Left Side: Logo & Title */}
        <div className="flex-1 flex items-center justify-start min-w-0 gap-2 md:gap-3 order-1">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm border-2 border-white/20">
            <img src="/logo.png.png" alt="Logo" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="hidden md:flex flex-col items-start min-w-0 pr-4">
            <h1 className="text-2xl font-black tracking-wider whitespace-nowrap truncate max-w-full">
              Dr. Trivedi's Homeopathy Clinic
            </h1>
          </div>
        </div>

        {/* Center: Doctor Status Indicator */}
        <div className="w-auto flex justify-center order-2 shrink-0 z-25">
          <div className="flex flex-col items-center">
            <div
              className={`px-3 md:px-5 py-1 md:py-2 rounded-full font-black uppercase tracking-widest text-[10px] md:text-sm shadow-lg border-2 whitespace-nowrap transition-colors ${isDoctorAvailable === true
                  ? "bg-emerald-500 border-emerald-400 text-white animate-pulse"
                  : isDoctorAvailable === false
                    ? "bg-rose-500 border-rose-400 text-white"
                    : "bg-slate-500 border-slate-400 text-white"
                }`}
            >
              <span className="flex items-center gap-1.5 md:gap-2">
                <div
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 ${isDoctorAvailable === true ? "bg-white" : isDoctorAvailable === false ? "bg-rose-200" : "bg-slate-200"
                    }`}
                ></div>
                {doctorStatusLabel}
              </span>
            </div>
            {isDoctorAvailable === true && doctorActiveSince && (
              <span className="text-[8px] md:text-xs font-bold text-white/90 uppercase tracking-widest mt-1 bg-black/20 px-2 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm">
                Since {doctorActiveSince}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Clock */}
        <div className="flex-1 flex justify-end shrink-0 order-2 md:order-3">
          <div className="text-right whitespace-nowrap">
            <div className="text-sm md:text-3xl font-bold tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString("en-US", { hour12: true })}
            </div>
            <div className="text-white/80 font-medium text-[7px] md:text-xs uppercase tracking-widest mt-0.5">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-bold tracking-widest text-sm uppercase relative z-10">
          {error}
        </div>
      )}

      <main className="flex-1 pt-3 px-6 pb-6 sm:pt-4 sm:px-8 sm:pb-8 md:pt-4 md:px-10 md:pb-10 max-w-[1920px] mx-auto w-full relative z-10">
        {/* Important Patient Advisory Note (Floating in bottom-right corner - Compact version with Hindi prioritized) */}
        <div className="fixed bottom-16 md:bottom-20 right-4 sm:right-6 z-40 max-w-[320px] sm:max-w-[380px] bg-white/95 backdrop-blur-sm border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2 shadow-2xl transition-all hover:scale-[1.02]">
          <div className="bg-red-100 p-1.5 rounded-lg shrink-0">
            <AlertTriangle className="text-red-700 shrink-0" size={16} />
          </div>
          <div className="text-left">
            <h4 className="text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
              सूचना / Notice
            </h4>
            <p className="text-[12px] sm:text-[13px] font-black mt-0.5 text-red-700 leading-normal tracking-wide">
              लाइव कतार का नियोजित समय डॉक्टर के आने के समय के आधार पर भिन्न हो सकता है और रोगी को 40 से 45 मिनट तक प्रतीक्षा करनी पड़ सकती है। आपकी समझ के लिए धन्यवाद।
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium mt-1 text-red-600/90 leading-normal uppercase tracking-wide">
              Live queue planned times can vary based on doctor in-time and check-in sequence. Patients may need to wait for 40 to 45 minutes from their scheduled slot. Thank you for your patience.
            </p>
          </div>
        </div>

        <div className="w-full">
          {!currentRunningToken &&
            readyQueue.length === 0 &&
            calledQueue.length === 0 &&
            holdQueue.length === 0 ? (
            <div className="py-20 md:py-32 flex flex-col items-center justify-center text-gray-400">
              <div className="flex items-center justify-center mb-6">
                <img
                  src="/live_queue_center-removebg-preview.png"
                  alt="Empty Queue"
                  className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-56 lg:h-56 object-contain animate-heart-beat drop-shadow-2xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-6 w-full">
              <LayoutGroup id="live-queue-board">
                <div className="h-[238px] md:h-[220px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {currentRunningToken ? (
                      <motion.div
                        key={`current-${currentRunningToken.appointment_id}-${currentRunningToken.queue_status}`}
                        layout
                        layoutId={`queue-token-${currentRunningToken.appointment_id}`}
                        initial={{ opacity: 0, y: 22, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -18, scale: 0.985 }}
                        transition={queueSpring}
                        className="bg-primary-teal text-white rounded-[20px] p-3 sm:p-6 shadow-xl border-4 border-primary-teal/20 flex flex-col w-full h-full relative overflow-hidden"
                      >
                        {/* Ambient glow inside the prominent card */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex flex-row items-center justify-between gap-2 sm:gap-6 w-full relative z-10">
                          <div className="flex flex-row items-center gap-3 sm:gap-6 min-w-0">
                            <div className="flex flex-col items-center justify-center w-16 h-16 sm:w-24 sm:h-24 shrink-0 relative group/token">
                              {renderTokenPositionBadge(currentRunningToken, "lg")}
                              <Ticket
                                size={100}
                                className="absolute text-red-500 transition-transform group-hover/token:scale-105 pointer-events-none drop-shadow-md w-full h-full"
                                fill="currentColor"
                              />
                              <span className="text-[8px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/90 mb-0.5 z-10 mt-1">
                                TOKEN
                              </span>
                              <span className="text-2xl sm:text-4xl font-black tabular-nums leading-none text-white z-10 drop-shadow-sm">
                                #{getSessionQueuePosition(currentRunningToken) || "-"}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 w-full text-left items-start min-w-0">
                              <div className="w-full flex flex-col items-start gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {(currentRunningToken.queue_status ===
                                    "IN_PROGRESS" ||
                                    currentRunningToken.queue_bucket ===
                                    "IN_PROGRESS") && (
                                      <span className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-white text-primary-teal rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest shadow-sm animate-pulse ring-4 ring-white/30 whitespace-nowrap">
                                        Consulting Patient (In Cabin)
                                      </span>
                                    )}
                                  {currentRunningToken.is_on_hold && (
                                    <span className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-100 text-amber-700 rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest shadow-sm ring-4 ring-white/30 whitespace-nowrap">
                                      Hold
                                    </span>
                                  )}
                                  {renderTimeBadge(
                                    "Planned",
                                    currentRunningToken.planned_start_at,
                                    "inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-white/15 text-white rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest shadow-sm ring-4 ring-white/20 whitespace-nowrap",
                                  )}
                                  {renderTimeBadge(
                                    "Check-in",
                                    currentRunningToken.checked_in_at,
                                    "inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 text-white rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest shadow-sm ring-4 ring-white/30 whitespace-nowrap",
                                  )}
                                </div>
                                <h3 className="text-lg sm:text-3xl font-black tracking-tight leading-tight line-clamp-2 break-words drop-shadow-sm flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span className="truncate">
                                    {currentRunningToken.patient_full_name ||
                                      currentRunningToken.patient_name}
                                  </span>
                                  {currentRunningToken.booked_for_type ===
                                    "FAMILY_MEMBER" && (
                                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest align-middle shrink-0">
                                        {
                                          currentRunningToken.family_member_relationship
                                        }{" "}
                                        (Owner:{" "}
                                        {
                                          currentRunningToken.primary_patient_full_name
                                        }
                                        )
                                      </span>
                                    )}
                                  {currentRunningToken.treatment_name && (
                                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest align-middle shrink-0">
                                      {currentRunningToken.treatment_name}
                                    </span>
                                  )}
                                </h3>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end text-right shrink-0 bg-black/15 backdrop-blur-sm p-2 sm:p-4 rounded-[16px] border border-black/5 ml-auto relative z-10 min-w-[120px]">
                            <span className="text-[9px] sm:text-xs font-bold text-white/80 uppercase tracking-widest mb-0.5 sm:mb-1">
                              Time
                            </span>
                            <span className="text-lg sm:text-3xl font-black tabular-nums tracking-tight drop-shadow-md whitespace-nowrap">
                              {currentTime.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                            {renderCurrentQueueTime(currentRunningToken, "dark")}
                            {/* {(currentRunningToken.live_estimated_start_at ||
                          currentRunningToken.planned_start_at) && (
                          <div className="mt-1 flex flex-col items-end w-full pt-1 sm:pt-2 border-t border-white/10">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[8px] sm:text-[10px] font-bold text-white/70 uppercase tracking-widest">
                                Delay:
                              </span>
                              <span
                                className={`text-[8px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                  (currentRunningToken.live_delay_minutes || 0) > 0
                                    ? "bg-rose-500/30 text-rose-100 border border-rose-500/20 animate-pulse"
                                    : "bg-emerald-500/30 text-emerald-100 border border-emerald-500/20"
                                }`}
                              >
                                {currentRunningToken.live_delay_minutes
                                  ? `+${currentRunningToken.live_delay_minutes} min`
                                  : "No delay"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-end gap-1.5">
                              <span className="text-[8px] sm:text-[10px] font-bold text-white/80 uppercase tracking-widest">
                                ETA
                              </span>
                              <span className="text-sm sm:text-base font-black tabular-nums tracking-tight drop-shadow-md text-white">
                                {currentRunningToken.live_estimated_start_at
                                  ? new Date(
                                      currentRunningToken.live_estimated_start_at,
                                    ).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                  : "--:--"}
                              </span>
                            </div>
                          </div>
                        )} */}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="current-empty"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={queueSpring}
                        className="flex h-full flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-slate-200 bg-white/70 text-gray-400"
                      >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gray-100 bg-gray-50">
                          <CheckCircle2 size={28} className="text-gray-300" />
                        </div>
                        <p className="text-sm sm:text-lg font-black uppercase tracking-widest text-slate-300">
                          Waiting for in-progress token
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-[116px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {nextInLineToken ? (
                      <motion.div
                        key={`next-${nextInLineToken.appointment_id}-${nextInLineToken.queue_status}`}
                        layout
                        layoutId={`queue-token-${nextInLineToken.appointment_id}`}
                        initial={{ opacity: 0, y: 14, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.99 }}
                        transition={queueSpring}
                        className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3 h-full"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col items-center justify-center w-14 h-14 shrink-0 relative">
                            {renderTokenPositionBadge(nextInLineToken)}
                            <Ticket
                              size={62}
                              className="absolute text-red-500 pointer-events-none drop-shadow-sm"
                              fill="currentColor"
                            />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-white/90 mb-0.5 z-10">
                              TOKEN
                            </span>
                            <span className="text-xl font-black text-white tabular-nums leading-none z-10 drop-shadow-sm">
                              #{getSessionQueuePosition(nextInLineToken) || "-"}
                            </span>
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded uppercase tracking-widest">
                                Next In Line
                              </span>
                              {nextInLineToken.is_on_hold && (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-widest">
                                  Hold Queue
                                </span>
                              )}
                              {renderTimeBadge(
                                "Planned",
                                nextInLineToken.planned_start_at,
                                "text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded uppercase tracking-widest",
                              )}
                              {renderTimeBadge(
                                "Check-in",
                                nextInLineToken.checked_in_at,
                                "text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-widest",
                              )}
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight truncate">
                              {nextInLineToken.patient_full_name ||
                                nextInLineToken.patient_name}
                            </h3>
                            {nextInLineToken.treatment_name && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded border bg-white/70 text-[9px] font-black uppercase tracking-widest text-gray-600">
                                {nextInLineToken.treatment_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 min-w-[96px]">
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Queue Time
                          </span>
                          <span className="block text-base font-black text-gray-900 tabular-nums">
                            {formatQueueClockTime(
                              visibleQueueProjection.get(
                                Number(nextInLineToken.appointment_id),
                              )?.startAt || nextInLineToken.current_queue_start_at,
                            ) || "Waiting"}
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="next-empty"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={queueSpring}
                        className="flex h-full items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white/60 text-xs font-black uppercase tracking-[0.2em] text-slate-300"
                      >
                        Next in line will appear here
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {listedRuntimeQueue.length > 0 && (
                  <motion.div layout transition={queueSpring} className="flex flex-col gap-4 w-full">
                    <motion.div layout transition={queueSpring} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {listedRuntimeQueue.map((appointment) => (
                          <motion.div
                            key={appointment.appointment_id}
                            layout
                            layoutId={`queue-token-${appointment.appointment_id}`}
                            initial={{ opacity: 0, y: 18, scale: 0.985 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, scale: 0.985 }}
                            transition={queueSpring}
                            className={`border hover:border-primary-teal/30 transition-all duration-300 rounded-[20px] p-4 sm:p-5 shadow-sm hover:shadow-md flex flex-row items-center justify-between gap-4 w-full group ${isPresentHoldToken(appointment)
                              ? "bg-amber-50 border-amber-200"
                              : appointment.treatment_name
                                ? getTreatmentColor(appointment.treatment_name)
                                : "bg-white border-gray-100"
                              }`}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex flex-col items-center justify-center w-16 h-16 shrink-0 relative group/token">
                                {renderTokenPositionBadge(appointment)}
                                <Ticket
                                  size={70}
                                  className="absolute text-red-500 transition-transform group-hover/token:scale-105 pointer-events-none drop-shadow-sm"
                                  fill="currentColor"
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 mb-0.5 transition-colors z-10">
                                  TOKEN
                                </span>
                                <span className="text-2xl font-black text-white tabular-nums leading-none z-10 drop-shadow-sm">
                                  #{getSessionQueuePosition(appointment) || "-"}
                                </span>
                              </div>
                              <div className="flex flex-col text-left flex-1 min-w-0 pr-2 gap-1 justify-center">
                                <h4 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                                  <span className="truncate max-w-full">
                                    {appointment.patient_full_name}
                                  </span>
                                  {appointment.booked_for_type ===
                                    "FAMILY_MEMBER" && (
                                      <span
                                        className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 text-[9px] font-black uppercase tracking-widest shrink-0"
                                        title={`Relationship: ${appointment.family_member_relationship}`}
                                      >
                                        {appointment.family_member_relationship}
                                      </span>
                                    )}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isPresentHoldToken(appointment) &&
                                    appointment.hold_rank != null && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
                                        Hold #{appointment.hold_rank}
                                      </span>
                                    )}
                                  {appointment.checked_in_at && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
                                      Checked In: {new Date(appointment.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                  {getSessionQueuePosition(appointment) != null && (
                                    <span
                                      title={appointment.position_explanation || undefined}
                                      className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-widest shrink-0"
                                    >
                                      Session Pos #{getSessionQueuePosition(appointment)}
                                    </span>
                                  )}
                                  {getActiveQueuePosition(appointment) != null &&
                                    appointment.completed_before != null &&
                                    appointment.completed_before > 0 && (
                                      <span
                                        title={appointment.position_explanation || undefined}
                                        className="text-[10px] font-bold text-primary-teal bg-primary-teal/10 px-2 py-0.5 rounded uppercase tracking-widest shrink-0"
                                      >
                                        Live #{getActiveQueuePosition(appointment)} · {appointment.completed_before} done
                                      </span>
                                    )}
                                </div>
                                {appointment.treatment_name && (
                                  <div className="flex">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest shrink-0 ${getTreatmentColor(appointment.treatment_name).replace(/bg-\w+-100/, "bg-white/60")}`}
                                    >
                                      {appointment.treatment_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(appointment.live_estimated_start_at ||
                              appointment.planned_start_at ||
                              appointment.current_queue_time_basis) && (
                                <div className="flex flex-col items-end shrink-0 pl-4 border-l border-gray-100 min-w-[110px] justify-center text-right">
                                  {(appointment.live_estimated_start_at ||
                                    appointment.planned_start_at) && (
                                      <>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Planned
                                          </span>
                                          <span className="text-xs font-bold text-gray-600 tabular-nums">
                                            {appointment.planned_start_at
                                              ? new Date(
                                                appointment.planned_start_at,
                                              ).toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true,
                                              })
                                              : "--:--"}
                                          </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-1">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Delay:
                                          </span>
                                          <span
                                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${(appointment.live_delay_minutes || 0) >
                                              0
                                              ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                              }`}
                                          >
                                            {appointment.live_delay_minutes
                                              ? `+${appointment.live_delay_minutes} min`
                                              : "No delay"}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  {renderCurrentQueueTime(appointment)}
                                </div>
                              )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}

              </LayoutGroup>

              {listedStandaloneHoldQueue.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <PhoneCall size={16} className="text-amber-500" />
                    <h2 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em]">
                      Hold Queue
                    </h2>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {listedStandaloneHoldQueue.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
                    {listedStandaloneHoldQueue.map((appointment) => (
                      <div
                        key={appointment.appointment_id}
                        className={`rounded-[20px] p-4 sm:p-5 border shadow-sm flex items-center justify-between gap-4 ${appointment.present_now
                          ? "bg-amber-50 border-amber-200"
                          : "bg-gray-50 border-gray-200 opacity-80"
                          }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex flex-col items-center justify-center w-16 h-16 shrink-0 relative">
                            {renderTokenPositionBadge(appointment)}
                            <Ticket
                              size={70}
                              className="absolute text-red-500 pointer-events-none drop-shadow-sm"
                              fill="currentColor"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 mb-0.5 z-10">
                              TOKEN
                            </span>
                            <span className="text-2xl font-black text-white tabular-nums leading-none z-10 drop-shadow-sm">
                              #{getSessionQueuePosition(appointment) || "-"}
                            </span>
                          </div>
                          <div className="flex flex-col text-left flex-1 min-w-0 pr-2 gap-1 justify-center">
                            <h4 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                              <span className="truncate max-w-full">
                                {appointment.patient_full_name}
                              </span>
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              {appointment.hold_rank != null && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
                                  Hold #{appointment.hold_rank}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${appointment.present_now
                                  ? "text-emerald-700 bg-emerald-100"
                                  : "text-gray-500 bg-gray-200"
                                  }`}
                              >
                                {appointment.present_now ? "Present" : "Absent"}
                              </span>
                              {appointment.scheduled_due && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
                                  Missed Current Slot
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {(appointment.live_estimated_start_at ||
                          appointment.planned_start_at ||
                          appointment.current_queue_time_basis) && (
                            <div className="flex flex-col items-end shrink-0 pl-4 border-l border-black/5 min-w-[110px] justify-center text-right">
                              {(appointment.live_estimated_start_at ||
                                appointment.planned_start_at) && (
                                  <>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        Planned
                                      </span>
                                      <span className="text-xs font-bold text-gray-600 tabular-nums">
                                        {appointment.planned_start_at
                                          ? new Date(
                                            appointment.planned_start_at,
                                          ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })
                                          : "--:--"}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        Delay:
                                      </span>
                                      <span
                                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${(appointment.live_delay_minutes || 0) > 0
                                          ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                          }`}
                                      >
                                        {appointment.live_delay_minutes
                                          ? `+${appointment.live_delay_minutes} min`
                                          : "No delay"}
                                      </span>
                                    </div>
                                  </>
                                )}
                              {renderCurrentQueueTime(appointment)}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not Arrived Queue */}
              {notArrivedQueue.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-gray-400" />
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      Not Arrived
                    </h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {notArrivedQueue.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {notArrivedQueue.map((appointment) => (
                      <div
                        key={appointment.appointment_id}
                        className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center gap-2 opacity-60"
                      >
                        <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0 relative">
                          {renderTokenPositionBadge(appointment)}
                          <div
                            title={appointment.position_explanation || undefined}
                            className="flex flex-col items-center leading-none"
                          >
                            <span className="text-sm font-black text-gray-500 tabular-nums">
                              {appointment.display_token_display ||
                                String(appointment.token_number).padStart(2, "0")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-gray-400 truncate">
                            {appointment.patient_full_name}
                          </span>
                          {appointment.booked_for_type === "FAMILY_MEMBER" && (
                            <span className="text-[7px] font-black text-purple-500 uppercase tracking-widest truncate">
                              {appointment.family_member_relationship}
                            </span>
                          )}
                          {renderCurrentQueueTime(appointment, "compact")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Information Ticker (Marquee) at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 h-12 md:h-14">
        <div className="whitespace-nowrap animate-marquee h-full inline-flex items-center font-bold tracking-widest text-xs md:text-sm uppercase">
          {[1, 2].map((i) => (
            <React.Fragment key={i}>
              <span className="mx-8 md:mx-16 inline-flex items-center gap-2">
                💧 HEALTH TIP: DRINK PLENTY OF WATER 💧
              </span>
              {/* <span className="mx-8 md:mx-16 inline-flex items-center gap-2">
                🕒 CLINIC TIMINGS: 10:00 AM TO 8:00 PM 🕒
              </span> */}
              <span className="mx-8 md:mx-16 inline-flex items-center gap-2 text-amber-400">
                ⚠️ NOTICE: LIVE QUEUE PLANNED TIMES CAN VARY BASED ON DOCTOR IN-TIME. WAIT TIME MAY BE 40 TO 45 MIN. ⚠️
              </span>
              <span className="mx-8 md:mx-16 inline-flex items-center gap-2">
                📵 PLEASE KEEP YOUR MOBILE PHONES ON SILENT 📵
              </span>
              <span className="mx-8 md:mx-16 inline-flex items-center gap-2">
                🤫 PLEASE MAINTAIN SILENCE IN THE CLINIC 🤫
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
