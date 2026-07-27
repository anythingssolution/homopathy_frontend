import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { connectGuestSocket } from "../services/socket";

type QueueBucket = "IN_PROGRESS" | "READY" | "CALLED" | "NOT_ARRIVED";

interface TokenItem {
  appointment_id: number;
  token_number: number;
  patient_full_name?: string;
  patient_name?: string;
  visiting_patient_full_name?: string | null;
  primary_patient_full_name?: string | null;
  queue_status: string;
  queue_bucket?: QueueBucket;
  display_token_display?: string;
  current_token_display?: string;
  current_token_number?: number;
  runtime_priority_rank?: number | null;
  live_queue_position?: number | null;
  active_queue_position?: number | null;
  session_queue_position?: number | null;
  current_queue_position?: number | null;
  ready_queue_position?: number | null;
  completed_before?: number | null;
  position_explanation?: string | null;
  planned_start_at?: string | null;
  checked_in_at?: string | null;
  live_estimated_start_at?: string | null;
  current_queue_start_at?: string | null;
  current_queue_duration_minutes?: number | null;
  actual_called_at?: string | null;
  actual_started_at?: string | null;
  treatment_name?: string | null;
  consult_minutes?: number | null;
  live_delay_minutes?: number | null;
  live_estimated_wait_minutes?: number | null;
  is_on_hold?: boolean;
  hold_rank?: number | null;
  present_now?: boolean;
  branch_id?: number;
  fk_branch_id?: number;
  slot_id?: number;
  fk_slot_id?: number;
}

interface QueueGroup {
  branch_id: number;
  slot_id: number;
  tokens?: TokenItem[];
}

interface LiveQueueSnapshot {
  branch_id?: number;
  branch_name?: string;
  slot_id?: number;
  slot_name?: string;
  appointment_date?: string;
  session?: {
    session_status?: string;
    current_token_display?: string | null;
  };
  current_running_token?: TokenItem | null;
  next_in_line_token?: TokenItem | null;
  next_ready_token?: TokenItem | null;
  ready_queue?: TokenItem[];
  called_queue?: TokenItem[];
  hold_queue?: TokenItem[];
  not_arrived_queue?: TokenItem[];
  active_queue?: TokenItem[];
  tokens?: TokenItem[];
  groups?: QueueGroup[];
  totals?: Record<string, number>;
}

interface CurrentTokensResponse {
  success: boolean;
  data: LiveQueueSnapshot;
}

const todayDateString = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getTokenDisplay = (token: TokenItem) =>
  token.display_token_display ||
  token.current_token_display ||
  String(token.current_token_number ?? token.token_number ?? "-").padStart(2, "0");

const getPatientDisplayName = (token?: TokenItem | null) =>
  token?.patient_full_name ||
  token?.patient_name ||
  token?.visiting_patient_full_name ||
  token?.primary_patient_full_name ||
  "Patient";

const isUsefulValue = (value: unknown) => value !== null && value !== undefined && value !== "";

const mergeTokenDetails = (base: TokenItem, override: TokenItem): TokenItem => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(override).filter(([, value]) => isUsefulValue(value)),
  ),
});

const getSessionPosition = (token: TokenItem) =>
  token.session_queue_position ??
  token.live_queue_position ??
  token.current_queue_position ??
  token.ready_queue_position ??
  null;

const getSequenceRank = (token: TokenItem) =>
  token.runtime_priority_rank ??
  token.live_queue_position ??
  token.current_queue_position ??
  token.ready_queue_position ??
  Number.MAX_SAFE_INTEGER;

const sortRuntimeQueueItems = (items: TokenItem[] = []) =>
  [...items].sort((left, right) => {
    const leftRank = getSequenceRank(left);
    const rightRank = getSequenceRank(right);

    if (leftRank !== rightRank) return leftRank - rightRank;

    return Number(left.current_token_number ?? left.token_number ?? 0) -
      Number(right.current_token_number ?? right.token_number ?? 0);
  });

const isSameToken = (left?: TokenItem | null, right?: TokenItem | null) =>
  Boolean(left?.appointment_id && right?.appointment_id) &&
  Number(left?.appointment_id) === Number(right?.appointment_id);

const timeText = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const dateText = (value?: string | null) => {
  if (!value) return "Today";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

const getQueueTime = (token?: TokenItem | null) =>
  token?.current_queue_start_at ||
  token?.live_estimated_start_at ||
  token?.actual_called_at ||
  token?.actual_started_at ||
  null;

const getDurationText = (token?: TokenItem | null) => {
  const minutes = token?.current_queue_duration_minutes ?? token?.consult_minutes;
  return minutes ? `${minutes} min` : null;
};

const getStageTone = (stage: string) => {
  switch (stage) {
    case "CONSULTING":
      return {
        label: "Consulting now",
        helper: "Doctor ke room me",
        dotClass: "bg-cyan-200",
        badgeClass: "bg-white/15 text-white ring-1 ring-white/25",
        railClass: "border-[#0F766E]/30 bg-[#ECFDF5]",
      };
    case "NEXT":
      return {
        label: "Next",
        helper: "Agla token ready",
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
        railClass: "border-emerald-200 bg-emerald-50",
      };
    case "CALLED":
      return {
        label: "Called",
        helper: "Patient ko bulaya gaya",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
        railClass: "border-amber-200 bg-amber-50",
      };
    case "HOLD":
      return {
        label: "On hold",
        helper: "Temporarily hold",
        dotClass: "bg-red-500",
        badgeClass: "bg-red-100 text-red-700 ring-1 ring-red-200",
        railClass: "border-red-200 bg-red-50",
      };
    case "NOT ARRIVED":
      return {
        label: "Not arrived",
        helper: "Check-in pending",
        dotClass: "bg-slate-400",
        badgeClass: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        railClass: "border-slate-200 bg-slate-50",
      };
    default:
      return {
        label: "Ready",
        helper: "Waiting sequence",
        dotClass: "bg-green-500",
        badgeClass: "bg-green-100 text-green-700 ring-1 ring-green-200",
        railClass: "border-green-200 bg-green-50",
      };
  }
};

const renderTokenPositionBadge = (
  token: TokenItem,
  size: "sm" | "lg" = "sm",
) => {
  const tokenText = getTokenDisplay(token);
  if (!tokenText) return null;

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

export default function LiveQueueFlow() {
  const [searchParams] = useSearchParams();
  const appointmentDate = searchParams.get("appointment_date") || todayDateString();
  const requestedBranchId = Number(searchParams.get("branch_id") || 0) || null;
  const requestedSlotId = Number(searchParams.get("slot_id") || 0) || null;

  const [snapshot, setSnapshot] = useState<LiveQueueSnapshot>({});
  const [currentRunningToken, setCurrentRunningToken] = useState<TokenItem | null>(null);
  const [nextInLineToken, setNextInLineToken] = useState<TokenItem | null>(null);
  const [calledQueue, setCalledQueue] = useState<TokenItem[]>([]);
  const [readyQueue, setReadyQueue] = useState<TokenItem[]>([]);
  const [holdQueue, setHoldQueue] = useState<TokenItem[]>([]);
  const [notArrivedQueue, setNotArrivedQueue] = useState<TokenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastRealtimeSnapshotKeyRef = useRef("");

  const applyQueueSnapshot = (data: LiveQueueSnapshot = {}) => {
    const activeQueueById = new Map(
      (data.active_queue || []).map((token) => [Number(token.appointment_id), token]),
    );
    const enrichToken = (token?: TokenItem | null) => {
      if (!token) return null;
      const activeToken = activeQueueById.get(Number(token.appointment_id));
      return activeToken ? mergeTokenDetails(activeToken, token) : token;
    };
    const current = enrichToken(data.current_running_token || null);
    const next = enrichToken(data.next_in_line_token || data.next_ready_token || null);
    const called = sortRuntimeQueueItems(data.called_queue || []);
    const ready = sortRuntimeQueueItems(data.ready_queue || []);
    const hold = sortRuntimeQueueItems(data.hold_queue || []);
    const notArrived = sortRuntimeQueueItems(data.not_arrived_queue || []);

    const primaryIds = new Set(
      [current, next, ...called, ...ready]
        .map((token) => Number(token?.appointment_id || 0))
        .filter(Boolean),
    );

    setSnapshot(data);
    setCurrentRunningToken(current);
    setNextInLineToken(next && !isSameToken(next, current) ? next : null);
    setCalledQueue(called.filter((token) => !isSameToken(token, current) && !isSameToken(token, next)));
    setReadyQueue(ready.filter((token) => !isSameToken(token, current) && !isSameToken(token, next)));
    setHoldQueue(hold.filter((token) => !primaryIds.has(Number(token.appointment_id))));
    setNotArrivedQueue(notArrived);
    setLastUpdatedAt(new Date());
  };

  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;
    let activeBranchId: number | null = requestedBranchId;
    let activeSlotId: number | null = requestedSlotId;
    let refreshTimer: number | null = null;
    let pollingTimer: number | null = null;

    const clearRefreshTimer = () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const fetchJson = async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch live queue");
      return response.json();
    };

    const fetchSlotSnapshot = async (branchId: number, slotId: number) => {
      const params = new URLSearchParams({
        branch_id: String(branchId),
        appointment_date: appointmentDate,
        _ts: String(Date.now()),
      });
      const json: CurrentTokensResponse = await fetchJson(
        `/api/v1/live-queue/${slotId}?${params.toString()}`,
      );
      const data = json.data || {};
      activeBranchId = Number(data.branch_id || branchId);
      activeSlotId = Number(data.slot_id || slotId);
      if (isMounted) {
        applyQueueSnapshot(data);
        setError("");
      }
      return data;
    };

    const fetchQueueSnapshot = async () => {
      if (requestedBranchId && requestedSlotId) {
        return fetchSlotSnapshot(requestedBranchId, requestedSlotId);
      }

      const params = new URLSearchParams({
        appointment_date: appointmentDate,
        _ts: String(Date.now()),
      });
      if (requestedBranchId) params.set("branch_id", String(requestedBranchId));

      const json: CurrentTokensResponse = await fetchJson(
        `/api/v1/live-queue/current-date-tokens?${params.toString()}`,
      );
      const groups = Array.isArray(json.data?.groups) ? json.data.groups : [];
      const firstGroup =
        groups.find((group) => Number(group.tokens?.length || 0) > 0) || groups[0];

      if (firstGroup?.branch_id && firstGroup?.slot_id) {
        return fetchSlotSnapshot(Number(firstGroup.branch_id), Number(firstGroup.slot_id));
      }

      if (isMounted) {
        applyQueueSnapshot(json.data || {});
        setError("");
      }
      return json.data || {};
    };

    const scheduleRefresh = (delayMs = 120) => {
      if (!isMounted) return;
      clearRefreshTimer();
      refreshTimer = window.setTimeout(() => {
        void fetchQueueSnapshot().catch((err) => {
          console.error("[LiveQueueFlow] refresh failed", err);
          if (isMounted) setError("Unable to refresh live queue");
        });
      }, delayMs);
    };

    const getRealtimeSnapshotFromPayload = (payload?: any) => {
      const candidate = payload?.data || payload;
      if (!candidate || typeof candidate !== "object") return null;

      if (
        candidate.current_running_token !== undefined ||
        candidate.ready_queue ||
        candidate.called_queue ||
        candidate.hold_queue ||
        candidate.not_arrived_queue ||
        Array.isArray(candidate.active_queue)
      ) {
        return candidate as LiveQueueSnapshot;
      }

      return null;
    };

    const handleQueueUpdate = (payload?: any) => {
      const realtimeSnapshot = getRealtimeSnapshotFromPayload(payload);
      if (realtimeSnapshot) {
        const snapshotKey = [
          payload?.event || (realtimeSnapshot as any)?.event || "queue",
          payload?.generated_at || (realtimeSnapshot as any)?.generated_at || "",
          payload?.appointment_id || (realtimeSnapshot as any)?.appointment_id || "",
          (realtimeSnapshot as any)?.queue_revision || (realtimeSnapshot as any)?.session?.queue_revision || "",
        ].join(":");

        if (snapshotKey && snapshotKey === lastRealtimeSnapshotKeyRef.current) {
          return;
        }
        lastRealtimeSnapshotKeyRef.current = snapshotKey;

        const payloadBranchId = Number(realtimeSnapshot.branch_id || 0);
        const payloadSlotId = Number(realtimeSnapshot.slot_id || 0);
        const branchMatches = !activeBranchId || !payloadBranchId || payloadBranchId === activeBranchId;
        const slotMatches = !activeSlotId || !payloadSlotId || payloadSlotId === activeSlotId;

        if (branchMatches && slotMatches && isMounted) {
          applyQueueSnapshot(realtimeSnapshot);
        }

        return;
      }

      scheduleRefresh(100);
    };

    const init = async () => {
      try {
        setIsLoading(true);
        const initialSnapshot = await fetchQueueSnapshot();
        if (!isMounted) return;

        socket = connectGuestSocket();

        const subscribe = () => {
          if (!socket) return;
          const payload = activeBranchId && activeSlotId
            ? {
              branch_id: activeBranchId,
              slot_id: activeSlotId,
              appointment_date: appointmentDate,
            }
            : {
              branch_id: requestedBranchId || undefined,
              appointment_date: appointmentDate,
            };

          socket.emit("live-queue.subscribe", payload, (ack: any) => {
            if (ack?.success) return;

            const groups = Array.isArray(initialSnapshot?.groups)
              ? initialSnapshot.groups
              : [];
            groups.forEach((group) => {
              socket?.emit("live-queue.subscribe", {
                branch_id: group.branch_id,
                slot_id: group.slot_id,
                appointment_date: appointmentDate,
              });
            });
          });
        };

        socket.on("connect", subscribe);
        if (socket.connected) subscribe();

        [
          "queue-updated",
          "doctor.session.current",
          "doctor.session.updated",
          "doctor-session-started",
          "doctor-session-completed",
          "token-called",
          "consultation-started",
          "consultation-completed",
          "appointment-cancelled",
          "token-shifted",
        ].forEach((eventName) => socket?.on(eventName, handleQueueUpdate));

        socket.on("disconnect", () => {
          pollingTimer = window.setInterval(() => scheduleRefresh(0), 60000);
        });
        socket.on("connect", () => {
          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
        });
      } catch (err) {
        console.error("[LiveQueueFlow] initial load failed", err);
        if (isMounted) setError("Unable to load live queue");
        pollingTimer = window.setInterval(() => scheduleRefresh(0), 60000);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void init();

    return () => {
      isMounted = false;
      clearRefreshTimer();
      if (pollingTimer) window.clearInterval(pollingTimer);
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [appointmentDate, requestedBranchId, requestedSlotId]);

  const isPresentHoldToken = (token: TokenItem) =>
    token.is_on_hold &&
    (token.present_now === true || Boolean(token.checked_in_at));

  const mainFlowItems = useMemo(() => {
    const result: Array<{ token: TokenItem; stage: string }> = [];
    const seen = new Set<number>();
    const push = (token: TokenItem | null | undefined, stage: string) => {
      const appointmentId = Number(token?.appointment_id || 0);
      if (!token || !appointmentId || seen.has(appointmentId)) return;
      seen.add(appointmentId);
      result.push({ token, stage });
    };

    push(currentRunningToken, "CONSULTING");
    push(nextInLineToken, "NEXT");
    calledQueue.forEach((token) => push(token, "CALLED"));

    const readyAndPresentHold = sortRuntimeQueueItems([
      ...readyQueue,
      ...holdQueue.filter(isPresentHoldToken)
    ]);

    readyAndPresentHold.forEach((token) => push(token, token.is_on_hold ? "HOLD" : "READY"));
    return result;
  }, [calledQueue, currentRunningToken, nextInLineToken, readyQueue, holdQueue]);

  const upcomingFlowItems = useMemo(
    () => mainFlowItems.filter(({ stage }) => stage !== "CONSULTING"),
    [mainFlowItems],
  );

  const attentionItems = useMemo(() => {
    const result: Array<{ token: TokenItem; stage: string }> = [];
    const seen = new Set<number>();
    const push = (token: TokenItem | null | undefined, stage: string) => {
      const appointmentId = Number(token?.appointment_id || 0);
      if (!token || !appointmentId || seen.has(appointmentId)) return;
      seen.add(appointmentId);
      result.push({ token, stage });
    };

    readyQueue
      .filter((token) => token.is_on_hold)
      .forEach((token) => push(token, "HOLD"));
    holdQueue.forEach((token) => push(token, "HOLD"));
    notArrivedQueue.slice(0, 8).forEach((token) => push(token, "NOT ARRIVED"));
    return result;
  }, [holdQueue, notArrivedQueue, readyQueue]);

  const totals = {
    active: mainFlowItems.length,
    ready: readyQueue.filter((token) => !token.is_on_hold).length + calledQueue.length + (nextInLineToken ? 1 : 0),
    hold: holdQueue.length + readyQueue.filter((token) => token.is_on_hold).length,
    notArrived: notArrivedQueue.length,
  };

  if (isLoading && mainFlowItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEF7F7]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-teal/20 border-t-primary-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#DFF4F3_0,#F7FAFC_38%,#EEF2F7_100%)] text-slate-900">
      <style>{`
        @keyframes flow-arrow-pulse {
          0%, 100% { transform: translateY(0); opacity: .45; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes flow-board-glow {
          0%, 100% { box-shadow: 0 28px 80px rgba(15, 118, 110, .14); }
          50% { box-shadow: 0 28px 90px rgba(15, 118, 110, .24); }
        }
        .flow-arrow-pulse { animation: flow-arrow-pulse 1.15s ease-in-out infinite; }
        .flow-board-glow { animation: flow-board-glow 3s ease-in-out infinite; }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 60s linear infinite;
        }
      `}</style>

      <div className="mx-auto flex min-h-screen w-full max-w-[1780px] flex-col gap-5 px-3 py-4 sm:px-6 lg:px-10">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-600">
            {error}
          </div>
        )}

        <section className="flex flex-col gap-5">
          <CurrentTokenPanel
            token={currentRunningToken}
            lastUpdatedAt={lastUpdatedAt}
          />
        </section>

        <section className="flex flex-1 flex-col gap-5">
          <div className="flow-board-glow rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:p-5">
            <LayoutGroup id="live-queue-flow-board">
              <div className="mx-auto flex w-full flex-col items-stretch gap-3">
                <AnimatePresence mode="popLayout" initial={false}>
                    {upcomingFlowItems.length === 0 ? (
                      <motion.div
                        key="empty-flow"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex min-h-72 w-full items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-white text-center"
                      >
                        <div>
                          <Ticket className="mx-auto mb-3 text-slate-300" size={58} />
                          <p className="text-2xl font-black text-slate-400">Waiting queue empty</p>
                          <p className="mt-1 text-sm font-black text-slate-300">
                            Current ke baad koi ready token nahi hai
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      upcomingFlowItems.map(({ token, stage }, index) => (
                        <React.Fragment key={token.appointment_id}>
                          <motion.div
                            layout
                            layoutId={`flow-token-${token.appointment_id}`}
                            initial={{ opacity: 0, y: 90, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -90, scale: 0.88 }}
                            transition={{ type: "spring", stiffness: 230, damping: 26 }}
                            className="w-full"
                          >
                            <TokenCard
                              token={token}
                              stage={stage}
                              orderLabel={index === 0 ? "Next up" : `Queue ${index + 1}`}
                            />
                          </motion.div>
                        </React.Fragment>
                      ))
                    )}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          </div>
        </section>
      </div>

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

      {/* Information Ticker (Marquee) at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 h-12 md:h-14">
        <div className="whitespace-nowrap animate-marquee h-full inline-flex items-center font-bold tracking-widest text-xs md:text-sm uppercase">
          {[1, 2].map((i) => (
            <React.Fragment key={i}>
              <span className="mx-8 md:mx-16 inline-flex items-center gap-2">
                💧 HEALTH TIP: DRINK PLENTY OF WATER 💧
              </span>
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

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
      {icon}
      {text}
    </span>
  );
}

function StatusStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "teal" | "emerald" | "amber";
}) {
  const className = tone === "teal"
    ? "bg-cyan-50/12 text-cyan-50 ring-cyan-100/20"
    : tone === "emerald"
      ? "bg-emerald-50/12 text-emerald-50 ring-emerald-100/20"
      : "bg-amber-50/12 text-amber-50 ring-amber-100/20";

  return (
    <div className={`rounded-3xl px-4 py-4 text-center ring-1 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-75">{label}</p>
      <p className="mt-1 text-4xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-3xl border px-3 py-4 text-center ${className}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function CurrentTokenPanel({
  token,
  lastUpdatedAt,
}: {
  token: TokenItem | null;
  lastUpdatedAt: Date | null;
}) {
  if (!token) {
    return (
      <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-xl">
        <div className="flex min-h-72 items-center justify-center rounded-[26px] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
          <div>
            <Ticket className="mx-auto mb-3 text-slate-300" size={64} />
            <p className="text-3xl font-black text-slate-400">No current consultation</p>
            <p className="mt-2 text-sm font-black text-slate-300">
              Doctor ke start karte hi current token yahan dikhega
            </p>
          </div>
        </div>
      </div>
    );
  }

  const queueTime = timeText(getQueueTime(token));
  const plannedTime = timeText(token.planned_start_at);
  const checkInTime = timeText(token.checked_in_at);
  const durationText = getDurationText(token);

  return (
    <div className="rounded-[28px] border border-teal-200 bg-[#0F766E] p-4 text-white shadow-2xl shadow-teal-900/20 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-50 ring-1 ring-white/20">
            <Activity size={14} />
            Consulting now
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            {getPatientDisplayName(token)}
          </h2>
          <p className="mt-1 text-sm font-black text-cyan-50/80 sm:text-base">
            {token.treatment_name || "Consultation"} {durationText ? `· ${durationText}` : ""}
          </p>
        </div>

        <div className="relative rounded-[28px] bg-white p-4 text-center text-[#0F766E] shadow-2xl">
          {renderTokenPositionBadge(token, "lg")}
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600/70">SEQ</p>
          <p className="text-5xl font-black leading-none sm:text-6xl">
            #{getSessionPosition(token) || "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TimeBox label="Planned" value={plannedTime} className="border-white/15 bg-white/10 text-white" labelClass="text-white/60" valueClass="text-white" />
        <TimeBox label="Check in" value={checkInTime} className="border-white/15 bg-white/10 text-white" labelClass="text-white/60" valueClass="text-white" />
        <TimeBox label="Queue time" value={queueTime} className="border-white/15 bg-white/10 text-white" labelClass="text-white/60" valueClass="text-white" />
        <DelayBox delayMinutes={token.live_delay_minutes} dark />
      </div>
    </div>
  );
}

function NextTokenPanel({ token }: { token: TokenItem | null }) {
  return (
    <div className="rounded-[30px] border border-emerald-200 bg-white/95 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
            Next up
          </p>
          <h2 className="text-2xl font-black text-slate-950">Agla patient</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <UserRound size={24} />
        </div>
      </div>

      {token ? (
        <TokenCard token={token} stage="NEXT" variant="compact" />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-lg font-black text-slate-400">No next token</p>
          <p className="mt-1 text-xs font-black text-slate-300">Ready queue empty hai</p>
        </div>
      )}
    </div>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-xs font-black text-white/85">
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
        {label}
      </span>
    </div>
  );
}

function TokenCard({
  token,
  stage,
  variant = "normal",
  orderLabel,
}: {
  token: TokenItem;
  stage: string;
  variant?: "normal" | "compact";
  orderLabel?: string;
}) {
  const tone = getStageTone(stage);
  const position = getSessionPosition(token);
  const plannedTime = timeText(token.planned_start_at);
  const checkInTime = timeText(token.checked_in_at);
  const queueTime = timeText(getQueueTime(token));
  const durationText = getDurationText(token);
  const isCompact = variant === "compact";

  return (
    <div className={`relative w-full rounded-[24px] border p-3 shadow-md sm:p-4 ${tone.railClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="relative flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-[18px] bg-slate-950 px-2 text-white shadow-lg sm:h-16 sm:w-20 sm:rounded-[22px]">
            {renderTokenPositionBadge(token)}
            <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/60 sm:text-[9px]">SEQ</span>
            <span className="text-xl font-black leading-none sm:text-2xl">#{position || "-"}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest sm:px-3 sm:py-1 sm:text-[10px] ${tone.badgeClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${tone.dotClass}`} />
                {orderLabel || tone.label}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
                {tone.helper}
              </span>
            </div>
            <h3 className="truncate text-lg font-black text-slate-950 sm:text-2xl">
              {getPatientDisplayName(token)}
            </h3>
            <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-wider text-slate-500 sm:mt-1 sm:text-xs">
              {token.treatment_name || "Consultation"} {durationText ? `· ${durationText}` : ""}
            </p>
          </div>
        </div>

        <div className={`shrink-0 grid gap-2 ${isCompact ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4 lg:w-[400px] xl:w-[420px] 2xl:w-[500px]"}`}>
          <TimeBox label="Planned" value={plannedTime} className="border-white bg-white/80 text-slate-700" labelClass="text-slate-400" valueClass="text-slate-800" />
          {!isCompact && (
            <TimeBox label="Check in" value={checkInTime} className="border-white bg-white/80 text-slate-700" labelClass="text-slate-400" valueClass="text-slate-800" />
          )}
          <TimeBox label="Queue" value={queueTime} className="border-white bg-white/80 text-slate-700" labelClass="text-slate-400" valueClass="text-slate-800" />
          <DelayBox delayMinutes={token.live_delay_minutes} />
        </div>
      </div>
    </div>
  );
}

function TimeBox({
  label,
  value,
  className,
  labelClass,
  valueClass,
}: {
  label: string;
  value: string | null;
  className: string;
  labelClass: string;
  valueClass: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-2 text-left ${className}`}>
      <div className={`truncate text-[8px] font-black uppercase tracking-widest ${labelClass}`}>
        {label}
      </div>
      <div className={`mt-1 flex whitespace-nowrap items-center gap-1 text-sm font-black ${valueClass}`}>
        <Clock size={13} className="shrink-0" />
        <span className="truncate">{value || "--"}</span>
      </div>
    </div>
  );
}

function DelayBox({
  delayMinutes,
  dark = false,
}: {
  delayMinutes?: number | null;
  dark?: boolean;
}) {
  const isDelayed = (delayMinutes || 0) > 0;
  const label = "Delay";
  const value = delayMinutes ? `+${delayMinutes} min` : "No delay";

  let className, labelClass, valueClass;
  if (dark) {
    className = isDelayed ? "border-rose-400/30 bg-rose-500/20 text-rose-50" : "border-emerald-400/30 bg-emerald-500/20 text-emerald-50";
    labelClass = isDelayed ? "text-rose-200/80" : "text-emerald-200/80";
    valueClass = isDelayed ? "text-rose-100" : "text-emerald-100";
  } else {
    className = isDelayed ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100";
    labelClass = isDelayed ? "text-rose-400" : "text-emerald-400";
    valueClass = isDelayed ? "text-rose-600" : "text-emerald-600";
  }

  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-2 text-left ${className}`}>
      <div className={`truncate text-[8px] font-black uppercase tracking-widest ${labelClass}`}>
        {label}
      </div>
      <div className={`mt-1 flex whitespace-nowrap items-center gap-1 text-sm font-black ${valueClass}`}>
        {isDelayed ? <AlertTriangle size={13} className="shrink-0" /> : <Clock size={13} className="shrink-0" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
