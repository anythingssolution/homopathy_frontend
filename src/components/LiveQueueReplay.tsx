import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Clock,
  RefreshCw,
  RotateCcw,
  Search,
  SkipForward,
  Ticket,
  Users,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';

type ReplayEvent = {
  id: number;
  appointment_id: number | null;
  branch_id: number;
  slot_id: number;
  appointment_date: string;
  token_number: number | null;
  display_token_number: number | null;
  event_type: string;
  old_queue_status: string | null;
  new_queue_status: string | null;
  current_queue_status: string | null;
  actor_name: string | null;
  branch_name: string | null;
  slot_name: string | null;
  patient_full_name: string | null;
  planned_start_at: string | null;
  auid: string | null;
  created_at: string;
  meta?: Record<string, unknown> | null;
};

type ReplayResponse = {
  success: boolean;
  data: {
    context: {
      branch_id: number | null;
      slot_id: number | null;
      appointment_date: string | null;
      branch_name?: string | null;
      slot_name?: string | null;
    };
    events: ReplayEvent[];
    totals: Record<string, number>;
  };
};

type TokenState = {
  appointmentId: number;
  tokenNumber: number;
  tokenLabel: string;
  patientName: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED' | 'OTHER';
  lastEvent: string;
  lastAt: string;
  plannedStartAt: string | null;
  checkedInAt: string | null;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  isOnHold?: boolean;
  presentNow?: boolean;
  presentOnTime?: boolean;
};

const eventLabels: Record<string, string> = {
  APPOINTMENT_CREATED: 'Appointment created',
  SESSION_STARTED: 'Session started',
  SESSION_COMPLETED: 'Session completed',
  CHECKED_IN: 'Checked in',
  TOKEN_CALLED: 'Token called',
  TOKEN_CALLED_AUTO_NEXT: 'Auto called',
  CONSULTATION_STARTED: 'Consultation started',
  CONSULTATION_COMPLETED: 'Consultation completed',
  TOKEN_SKIPPED: 'Skipped',
  TOKEN_REASSIGNED: 'Reassigned',
  APPOINTMENT_CANCELLED: 'Cancelled',
};

const queueSpring = {
  type: 'spring',
  stiffness: 230,
  damping: 28,
  mass: 0.9,
} as const;

const toInputDate = (value: string | null | undefined) => value ? value.slice(0, 10) : '';

const formatClock = (value: string | null | undefined) => {
  if (!value) return '--:--';
  const [, time = value] = value.split(' ');
  return time.slice(0, 5);
};

const formatLongClock = (value: string | null | undefined) => {
  if (!value) return '--:--:--';
  const [, time = value] = value.split(' ');
  return time.slice(0, 8);
};

const parseReplayDate = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getReplayTime = (value: string | null | undefined) => parseReplayDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;

const getCheckInDeltaMinutes = (token: TokenState) => {
  const planned = parseReplayDate(token.plannedStartAt);
  const checkedIn = parseReplayDate(token.checkedInAt);

  if (!planned || !checkedIn) return null;
  return Math.round((checkedIn.getTime() - planned.getTime()) / 60000);
};

const getDeltaBadge = (deltaMinutes: number | null) => {
  if (deltaMinutes === null) {
    return {
      label: 'Pending',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }

  if (deltaMinutes > 0) {
    return {
      label: `+${deltaMinutes} min delay`,
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (deltaMinutes < 0) {
    return {
      label: `${Math.abs(deltaMinutes)} min before`,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  return {
    label: 'On time',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
};

const getTokenNumber = (event: ReplayEvent) => Number(event.display_token_number || event.token_number || 0);

const getTokenLabel = (event: ReplayEvent) => {
  const token = getTokenNumber(event);
  return token ? String(token).padStart(2, '0') : '--';
};

const normalizeEventStatus = (event: ReplayEvent): TokenState['status'] => {
  if (event.event_type === 'APPOINTMENT_CANCELLED') return 'CANCELLED';
  if (event.event_type === 'TOKEN_SKIPPED') return 'SKIPPED';
  if (event.event_type === 'TOKEN_CALLED' || event.event_type === 'TOKEN_CALLED_AUTO_NEXT') return 'WAITING';
  if (event.event_type === 'CONSULTATION_STARTED') return 'IN_PROGRESS';
  if (event.event_type === 'CONSULTATION_COMPLETED') return 'COMPLETED';
  if (event.event_type === 'CHECKED_IN') return 'CHECKED_IN';
  if (event.new_queue_status === 'BOOKED' || event.event_type === 'APPOINTMENT_CREATED') return 'BOOKED';

  const status = event.new_queue_status || event.current_queue_status || 'OTHER';
  if (['BOOKED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'].includes(status)) {
    return status as TokenState['status'];
  }

  return 'OTHER';
};

const compareReplayTokenNumber = (left: TokenState, right: TokenState) =>
  left.tokenNumber - right.tokenNumber || left.appointmentId - right.appointmentId;

const compareReplayRuntimeTimeline = (left: TokenState, right: TokenState) => {
  const leftPlannedAt = getReplayTime(left.plannedStartAt);
  const rightPlannedAt = getReplayTime(right.plannedStartAt);

  if (leftPlannedAt !== rightPlannedAt) return leftPlannedAt - rightPlannedAt;
  return compareReplayTokenNumber(left, right);
};

const isReplayTokenPresent = (token: TokenState) => Boolean(token.checkedInAt);

const isReplayTokenPresentOnTime = (token: TokenState) => {
  const plannedAt = getReplayTime(token.plannedStartAt);
  const checkedInAt = getReplayTime(token.checkedInAt);

  if (plannedAt === Number.MAX_SAFE_INTEGER || checkedInAt === Number.MAX_SAFE_INTEGER) {
    return false;
  }

  return checkedInAt <= plannedAt + (15 * 60 * 1000);
};

const compareReplayHoldQueue = (left: TokenState, right: TokenState) => {
  const leftPresent = isReplayTokenPresent(left);
  const rightPresent = isReplayTokenPresent(right);

  if (leftPresent !== rightPresent) return leftPresent ? -1 : 1;

  if (leftPresent && rightPresent) {
    const leftCheckedInAt = getReplayTime(left.checkedInAt);
    const rightCheckedInAt = getReplayTime(right.checkedInAt);

    if (leftCheckedInAt !== rightCheckedInAt) return leftCheckedInAt - rightCheckedInAt;
  }

  return compareReplayRuntimeTimeline(left, right);
};

const buildReplayRuntimeView = (tokens: TokenState[], referenceAt: string | null | undefined) => {
  const referenceTime = getReplayTime(referenceAt);
  const activeTokens = tokens.filter((token) => ['BOOKED', 'CHECKED_IN', 'WAITING', 'IN_PROGRESS'].includes(token.status));
  const activeById = new Map(activeTokens.map((token) => [token.appointmentId, token]));
  const timelineEntries = [...activeTokens]
    .filter((token) => getReplayTime(token.plannedStartAt) !== Number.MAX_SAFE_INTEGER)
    .sort(compareReplayRuntimeTimeline);
  const schedulePointer = [...timelineEntries]
    .reverse()
    .find((token) => getReplayTime(token.plannedStartAt) <= referenceTime)
    || timelineEntries[0]
    || null;
  const schedulePointerOrder = schedulePointer ? getReplayTime(schedulePointer.plannedStartAt) : Number.MAX_SAFE_INTEGER;
  const scheduledDueToken = schedulePointer ? activeById.get(schedulePointer.appointmentId) || null : null;
  const running = [...activeTokens]
    .filter((token) => token.status === 'IN_PROGRESS')
    .sort((left, right) => getReplayTime(left.startedAt || left.lastAt) - getReplayTime(right.startedAt || right.lastAt))[0] || null;
  const called = [...activeTokens]
    .filter((token) => token.status === 'WAITING')
    .sort((left, right) => getReplayTime(left.calledAt || left.lastAt) - getReplayTime(right.calledAt || right.lastAt) || compareReplayTokenNumber(left, right));

  const holdQueue = activeTokens
    .filter((token) => {
      if (token.appointmentId === running?.appointmentId || token.status === 'IN_PROGRESS' || token.status === 'WAITING') {
        return false;
      }

      const plannedAt = getReplayTime(token.plannedStartAt);
      if (!schedulePointer || plannedAt === Number.MAX_SAFE_INTEGER) return false;

      if (plannedAt < schedulePointerOrder) {
        return !isReplayTokenPresentOnTime(token);
      }

      return Boolean(
        scheduledDueToken
        && token.appointmentId === scheduledDueToken.appointmentId
        && schedulePointerOrder <= referenceTime
        && !isReplayTokenPresentOnTime(token),
      );
    })
    .sort(compareReplayHoldQueue)
    .map((token) => ({
      ...token,
      isOnHold: true,
      presentNow: isReplayTokenPresent(token),
      presentOnTime: isReplayTokenPresentOnTime(token),
    }));
  const holdIds = new Set(holdQueue.map((token) => token.appointmentId));
  const serviceableReady = activeTokens
    .filter((token) => token.status === 'CHECKED_IN' && isReplayTokenPresent(token) && !holdIds.has(token.appointmentId))
    .sort(compareReplayRuntimeTimeline);
  const scheduledDuePresentOnTime = scheduledDueToken
    && scheduledDueToken.status === 'CHECKED_IN'
    && !holdIds.has(scheduledDueToken.appointmentId)
    && isReplayTokenPresentOnTime(scheduledDueToken)
    ? scheduledDueToken
    : null;
  const earlierOnTimeReady = serviceableReady.find(
    (token) => getReplayTime(token.plannedStartAt) < schedulePointerOrder,
  ) || null;
  const longestWaitingPresentHold = holdQueue.find((token) => token.presentNow) || null;
  const scheduledDueOrder = scheduledDuePresentOnTime
    ? getReplayTime(scheduledDuePresentOnTime.plannedStartAt)
    : Number.MAX_SAFE_INTEGER;
  const hasBlankHoldSlotBeforeScheduledDue = Boolean(
    longestWaitingPresentHold
    && scheduledDuePresentOnTime
    && holdQueue.some((token) => !token.presentNow && getReplayTime(token.plannedStartAt) < scheduledDueOrder),
  );
  const nextRuntimeCandidate = earlierOnTimeReady
    || (hasBlankHoldSlotBeforeScheduledDue ? longestWaitingPresentHold : null)
    || scheduledDuePresentOnTime
    || longestWaitingPresentHold
    || serviceableReady[0]
    || null;
  const orderedReady: TokenState[] = [];
  const seen = new Set<number>();
  const pushReady = (token: TokenState | null | undefined) => {
    if (!token || seen.has(token.appointmentId)) return;
    seen.add(token.appointmentId);
    orderedReady.push(token);
  };

  pushReady(nextRuntimeCandidate);
  holdQueue.filter((token) => token.presentNow).forEach(pushReady);
  serviceableReady.forEach(pushReady);

  const activeToken = running || called[0] || null;
  const nextInLine = activeToken
    ? [...called.slice(activeToken.status === 'WAITING' ? 1 : 0), ...orderedReady][0] || null
    : nextRuntimeCandidate || called[0] || orderedReady[0] || null;
  const waitingLine = activeToken
    ? [...called, ...orderedReady].filter((token) => token.appointmentId !== activeToken.appointmentId && token.appointmentId !== nextInLine?.appointmentId)
    : orderedReady.filter((token) => token.appointmentId !== nextInLine?.appointmentId);

  return {
    activeToken,
    nextInLine,
    waitingLine,
    ready: orderedReady,
    called,
    notArrived: [...activeTokens]
      .filter((token) => token.status === 'BOOKED')
      .sort(compareReplayRuntimeTimeline),
    completed: tokens
      .filter((token) => token.status === 'COMPLETED')
      .sort(compareReplayRuntimeTimeline),
    skipped: tokens
      .filter((token) => token.status === 'SKIPPED' || token.status === 'CANCELLED')
      .sort(compareReplayRuntimeTimeline),
  };
};

const buildReplayBoard = (events: ReplayEvent[], visibleCount: number) => {
  const tokens = new Map<number, TokenState>();
  const visibleEvents = events.slice(0, visibleCount);

  visibleEvents.forEach((event) => {
    if (!event.appointment_id) return;

    const previous = tokens.get(event.appointment_id);
    const nextStatus = normalizeEventStatus(event);
    const label = eventLabels[event.event_type] || event.event_type.replaceAll('_', ' ');

    tokens.set(event.appointment_id, {
      appointmentId: event.appointment_id,
      tokenNumber: getTokenNumber(event),
      tokenLabel: getTokenLabel(event),
      patientName: event.patient_full_name || event.auid || `Appointment #${event.appointment_id}`,
      status: nextStatus,
      lastEvent: label,
      lastAt: event.created_at,
      plannedStartAt: event.planned_start_at || previous?.plannedStartAt || null,
      checkedInAt: event.event_type === 'CHECKED_IN' ? event.created_at : previous?.checkedInAt || null,
      calledAt: event.event_type === 'TOKEN_CALLED' || event.event_type === 'TOKEN_CALLED_AUTO_NEXT' ? event.created_at : previous?.calledAt || null,
      startedAt: event.event_type === 'CONSULTATION_STARTED' ? event.created_at : previous?.startedAt || null,
      completedAt: event.event_type === 'CONSULTATION_COMPLETED' ? event.created_at : previous?.completedAt || null,
    });
  });

  const allTokens = Array.from(tokens.values());
  const referenceAt = visibleEvents[visibleEvents.length - 1]?.created_at || null;
  const runtimeView = buildReplayRuntimeView(allTokens, referenceAt);

  return {
    visibleEvents,
    ...runtimeView,
    activeCount: allTokens.filter((token) => ['CHECKED_IN', 'WAITING', 'IN_PROGRESS'].includes(token.status)).length,
  };
};

const findFirstQueueMovementIndex = (events: ReplayEvent[]) => {
  const index = events.findIndex((event) => (
    event.event_type === 'CHECKED_IN'
    || event.event_type === 'TOKEN_CALLED'
    || event.event_type === 'TOKEN_CALLED_AUTO_NEXT'
    || event.event_type === 'CONSULTATION_STARTED'
    || event.event_type === 'CONSULTATION_COMPLETED'
  ));

  return index >= 0 ? index + 1 : events.length > 0 ? 1 : 0;
};

const TokenTicket = ({ label, caption = 'Token', compact = false }: { label: string; caption?: string; compact?: boolean }) => (
  <div className={`relative flex shrink-0 flex-col items-center justify-center ${compact ? 'h-14 w-14' : 'h-24 w-24'}`}>
    <Ticket className="absolute h-full w-full text-red-500 drop-shadow-md" fill="currentColor" />
    <span className={`${compact ? 'text-[8px]' : 'text-xs'} z-10 mb-1 font-black uppercase tracking-widest text-white/90`}>{caption}</span>
    <span className={`${compact ? 'text-xl' : 'text-4xl'} z-10 font-black leading-none text-white drop-shadow-sm`}>{label}</span>
  </div>
);

const SmallTokenCard = React.forwardRef<HTMLElement, { token: TokenState; tone?: 'white' | 'green' | 'amber' | 'slate' }>(
  ({ token, tone = 'white' }, ref) => {
  const toneClass = {
    white: 'border-gray-100 bg-white',
    green: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    slate: 'border-slate-200 bg-slate-50',
  }[tone];

  const deltaBadge = getDeltaBadge(getCheckInDeltaMinutes(token));

  return (
    <motion.article
      ref={ref}
      layout
      layoutId={`queue-token-${token.appointmentId}`}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={queueSpring}
      className={`flex min-h-[124px] items-center justify-between gap-4 rounded-[20px] border p-4 shadow-sm ${toneClass}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <TokenTicket label={token.tokenLabel} compact caption={token.status === 'WAITING' ? 'CALL' : 'TKN'} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black tracking-tight text-gray-800">{token.patientName}</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              {token.lastEvent}
            </span>
            <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Planned {formatClock(token.plannedStartAt)}
            </span>
            <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Check-in {formatClock(token.checkedInAt)}
            </span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${deltaBadge.className}`}>
              {deltaBadge.label}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
  },
);

SmallTokenCard.displayName = 'SmallTokenCard';

export default function LiveQueueReplay() {
  const [branchId, setBranchId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [context, setContext] = useState<ReplayResponse['data']['context'] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    if (slotId) params.set('slot_id', slotId);
    if (appointmentDate) params.set('appointment_date', appointmentDate);
    if (fromTime) params.set('from_time', `${appointmentDate || toInputDate(context?.appointment_date)} ${fromTime}:00`);
    params.set('limit', '500');

    try {
      const response = await fetch(`/api/v1/live-queue/replay/events?${params.toString()}`);
      const result = await response.json() as ReplayResponse;

      if (!response.ok || !result.success) {
        throw new Error('Unable to load replay events');
      }

      setEvents(result.data.events);
      setContext(result.data.context);
      setBranchId(String(result.data.context.branch_id || branchId || ''));
      setSlotId(String(result.data.context.slot_id || slotId || ''));
      setAppointmentDate(toInputDate(result.data.context.appointment_date) || appointmentDate);
      setCursor(findFirstQueueMovementIndex(result.data.events));
      setIsPlaying(false);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load replay events');
    } finally {
      setLoading(false);
    }
  }, [appointmentDate, branchId, context?.appointment_date, fromTime, slotId]);

  useEffect(() => {
    void fetchEvents();
  }, []);

  useEffect(() => {
    if (!isPlaying || events.length === 0) return;

    timerRef.current = window.setInterval(() => {
      setCursor((current) => {
        if (current >= events.length) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(120, 900 / speed));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [events.length, isPlaying, speed]);

  const board = useMemo(() => buildReplayBoard(events, cursor), [cursor, events]);
  const activeEvent = board.visibleEvents[board.visibleEvents.length - 1] || null;
  const progress = events.length ? Math.round((cursor / events.length) * 100) : 0;
  const activeLabel = board.activeToken?.status === 'IN_PROGRESS' ? 'Consulting Patient (In Cabin)' : 'Token Called';
  const activeDeltaBadge = getDeltaBadge(board.activeToken ? getCheckInDeltaMinutes(board.activeToken) : null);
  const nextDeltaBadge = getDeltaBadge(board.nextInLine ? getCheckInDeltaMinutes(board.nextInLine) : null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-[#E9F2F9] to-[#F8F9FA] text-gray-800">
      <header className="relative z-10 flex items-center justify-between gap-4 bg-[#549E9E] p-3 text-white shadow-md md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 md:h-12 md:w-12">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-black tracking-wider md:text-2xl">LIVE QUEUE REPLAY</h1>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E] md:text-xs">
                {cursor} / {events.length} Events
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80 md:text-xs">
              {context?.branch_name || 'Latest Branch'} / {context?.slot_name || `Slot ${slotId || '-'}`} / {appointmentDate || 'Latest Date'}
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center md:flex">
          <div className="rounded-full border-2 border-emerald-300 bg-emerald-500 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white shadow-md">
            Replay Mode
          </div>
          <span className="mt-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90">
            {activeEvent ? formatLongClock(activeEvent.created_at) : '--:--:--'}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xl font-black tabular-nums md:text-3xl">{activeEvent ? formatLongClock(activeEvent.created_at) : '--:--:--'}</div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/80 md:text-xs">
            Audit Playback Time
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
        <div className="mx-auto grid max-w-[1920px] gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto]">
          <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#549E9E]" placeholder="Branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} />
          <input className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#549E9E]" placeholder="Slot" value={slotId} onChange={(event) => setSlotId(event.target.value)} />
          <input type="date" className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#549E9E]" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} />
          <input type="time" className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#549E9E]" value={fromTime} onChange={(event) => setFromTime(event.target.value)} />
          <button type="button" onClick={() => void fetchEvents()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-black uppercase tracking-wider text-white">
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
            Load
          </button>
          <select className="h-10 rounded-md border border-slate-200 px-3 text-xs font-black uppercase tracking-wider text-slate-700" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsPlaying((value) => !value)} disabled={events.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#549E9E] px-4 text-xs font-black uppercase tracking-wider text-white disabled:bg-slate-300">
              {isPlaying ? <CirclePause size={16} /> : <CirclePlay size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => setCursor(events.length)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700" title="Jump to end">
              <SkipForward size={16} />
            </button>
            <button type="button" onClick={() => { setCursor(findFirstQueueMovementIndex(events)); setIsPlaying(false); }} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700" title="Reset">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-[1920px]">
          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-[#549E9E] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <input
              type="range"
              min={events.length > 0 ? 1 : 0}
              max={events.length}
              value={cursor}
              disabled={events.length === 0}
              onChange={(event) => {
                setCursor(Number(event.target.value));
              }}
              onInput={(event) => {
                setCursor(Number(event.currentTarget.value));
              }}
              className="absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent accent-[#549E9E] disabled:cursor-not-allowed"
              aria-label="Replay progress"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Drag bar to rewind</span>
            <span>{progress}%</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-500 px-6 py-3 text-center text-sm font-bold uppercase tracking-widest text-white">
          {error}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1920px] flex-col gap-5 p-5 md:p-8">
        <LayoutGroup id="live-queue-replay-board">
          <div className="h-[238px] md:h-[220px]">
            {board.activeToken ? (
              <motion.section
                key={`active-${board.activeToken.appointmentId}-${board.activeToken.status}`}
                layout
                layoutId={`queue-token-${board.activeToken.appointmentId}`}
                initial={{ opacity: 0, y: 22, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.985 }}
                transition={queueSpring}
                className="relative h-full overflow-hidden rounded-[20px] border-4 border-[#549E9E]/20 bg-[#549E9E] p-4 text-white shadow-xl md:p-6"
              >
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10 flex h-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4 md:gap-6">
                    <TokenTicket label={board.activeToken.tokenLabel} />
                    <div className="min-w-0">
                      <span className="inline-block rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#549E9E] shadow-sm">
                        {activeLabel}
                      </span>
                      <h2 className="mt-3 max-w-[calc(100vw-180px)] truncate text-3xl font-black tracking-tight md:max-w-[980px] md:text-5xl">{board.activeToken.patientName}</h2>
                      <p className="mt-2 text-sm font-bold uppercase tracking-widest text-white/80">
                        {board.activeToken.lastEvent} at {formatLongClock(board.activeToken.lastAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                          Planned {formatClock(board.activeToken.plannedStartAt)}
                        </span>
                        <span className="rounded bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                          Check-in {formatClock(board.activeToken.checkedInAt)}
                        </span>
                        <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${activeDeltaBadge.className}`}>
                          {activeDeltaBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-black/5 bg-black/15 p-4 text-right backdrop-blur-sm md:min-w-[180px]">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">Queue Time</span>
                    <span className="mt-1 block text-3xl font-black tabular-nums">{formatClock(board.activeToken.calledAt || board.activeToken.startedAt || board.activeToken.lastAt)}</span>
                    <div className="mt-3 border-t border-white/15 pt-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/80">Status</span>
                      <span className="mt-1 block text-lg font-black uppercase">{board.activeToken.status === 'IN_PROGRESS' ? 'Consulting' : 'Called'}</span>
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="active-empty"
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
                <p className="text-lg font-black uppercase tracking-widest">Replay waiting for queue movement</p>
              </motion.section>
            )}
          </div>

          <div className="h-[116px]">
            {board.nextInLine ? (
              <motion.section
                key={`next-${board.nextInLine.appointmentId}-${board.nextInLine.status}`}
                layout
                layoutId={`queue-token-${board.nextInLine.appointmentId}`}
                initial={{ opacity: 0, y: 14, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={queueSpring}
                className="flex h-full items-center justify-between gap-4 overflow-hidden rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <TokenTicket label={board.nextInLine.tokenLabel} compact caption="Next" />
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span className="rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">Next In Line</span>
                      {board.nextInLine.checkedInAt && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          Checked In {formatClock(board.nextInLine.checkedInAt)}
                        </span>
                      )}
                      <span className="rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Planned {formatClock(board.nextInLine.plannedStartAt)}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${nextDeltaBadge.className}`}>
                        {nextDeltaBadge.label}
                      </span>
                    </div>
                    <h3 className="truncate text-xl font-black tracking-tight text-gray-800 md:text-2xl">{board.nextInLine.patientName}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Waiting Since</span>
                  <span className="block text-lg font-black tabular-nums text-gray-900">{formatClock(board.nextInLine.checkedInAt || board.nextInLine.calledAt || board.nextInLine.lastAt)}</span>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="next-empty"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={queueSpring}
                className="flex h-full items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white/60 text-xs font-black uppercase tracking-[0.2em] text-slate-300"
              >
                Next in line will appear here
              </motion.section>
            )}
          </div>

          <motion.section layout transition={queueSpring} className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#549E9E]">Ready Queue Sequence</h2>
                <span className="rounded-full bg-[#549E9E]/10 px-3 py-1 text-xs font-black text-[#549E9E]">{board.waitingLine.length}</span>
              </div>
              <motion.div layout transition={queueSpring} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {board.waitingLine.map((token) => (
                    <SmallTokenCard key={token.appointmentId} token={token} tone={token.status === 'WAITING' ? 'amber' : 'white'} />
                  ))}
                </AnimatePresence>
                {board.waitingLine.length === 0 && (
                  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={queueSpring} className="rounded-[20px] border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm font-black uppercase tracking-widest text-slate-300 md:col-span-2 xl:col-span-3">
                    No more checked-in tokens in line
                  </motion.div>
                )}
              </motion.div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[#549E9E]" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Replay Counts</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-cyan-50 p-3 text-cyan-700">
                    <p className="text-[10px] font-black uppercase tracking-widest">Checked In</p>
                    <p className="text-3xl font-black">{board.ready.length + board.called.length + (board.activeToken ? 1 : 0)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                    <p className="text-[10px] font-black uppercase tracking-widest">Completed</p>
                    <p className="text-3xl font-black">{board.completed.length}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                    <p className="text-[10px] font-black uppercase tracking-widest">Called</p>
                    <p className="text-3xl font-black">{board.called.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest">Not Arrived</p>
                    <p className="text-3xl font-black">{board.notArrived.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Completed</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{board.completed.length}</span>
                </div>
                <motion.div layout transition={queueSpring} className="flex max-h-[330px] flex-col gap-2 overflow-auto">
                  <AnimatePresence initial={false}>
                    {board.completed.slice().reverse().slice(0, 12).map((token) => (
                      <motion.div
                        layout
                        layoutId={`queue-token-${token.appointmentId}`}
                        key={token.appointmentId}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={queueSpring}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="text-sm font-black text-slate-700">#{token.tokenLabel}</span>
                        <span className="truncate px-3 text-xs font-bold text-slate-500">{token.patientName}</span>
                        <span className="text-xs font-black text-slate-400">{formatClock(token.completedAt)}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {board.completed.length === 0 && <p className="py-5 text-center text-xs font-black uppercase tracking-widest text-slate-300">Empty</p>}
                </motion.div>
              </div>
            </aside>
          </motion.section>
        </LayoutGroup>

        <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Live Sequence Timeline</h2>
          </div>
          <div className="flex max-h-[260px] flex-col overflow-auto">
            {board.visibleEvents.slice().reverse().slice(0, 40).map((event) => (
              <div key={event.id} className="grid gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-[90px_90px_1fr_130px]">
                <span className="text-xs font-black text-slate-500">{formatLongClock(event.created_at)}</span>
                <span className="text-sm font-black text-[#549E9E]">#{getTokenLabel(event)}</span>
                <div>
                  <p className="text-sm font-black text-slate-900">{eventLabels[event.event_type] || event.event_type.replaceAll('_', ' ')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{event.patient_full_name || event.auid || 'Session event'}</p>
                </div>
                <span className="text-xs font-bold text-slate-400">{event.actor_name || 'System'}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
