import React from 'react';
import { Ticket } from 'lucide-react';

type AppointmentTokenBadgeProps = {
  tokenDisplay?: string | number | null;
  tokenNumber?: string | number | null;
  position?: string | number | null;
  compact?: boolean;
  hideEmpty?: boolean;
  variant?: 'default' | 'consultation-header';
  /** Token number color only (ticket fill stays list pink). Use white on teal headers. */
  numberClassName?: string;
};

const toPositiveInt = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/** Same token UI as Doctor Portal list: yellow Pos #, soft red ticket, dark number by default. */
export default function AppointmentTokenBadge({
  tokenDisplay,
  tokenNumber,
  position,
  compact = false,
  hideEmpty = false,
  variant = 'default',
  numberClassName,
}: AppointmentTokenBadgeProps) {
  const rawToken = tokenDisplay || tokenNumber || null;
  const token = hideEmpty && ['-', '—', '–'].includes(String(rawToken).trim()) ? null : rawToken;
  const queuePosition = toPositiveInt(position);

  if (!token && queuePosition == null) {
    return hideEmpty ? null : <span className="text-[10px] font-bold text-gray-300">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      {queuePosition != null && (
        <span className="text-[8px] font-black text-gray-900 bg-yellow-300 border border-yellow-400 px-1.5 py-0.5 rounded text-center shadow-sm">
          Pos #{queuePosition}
        </span>
      )}
      {token ? (
        variant === 'consultation-header' ? (
          <div className="flex h-12 min-w-[92px] items-center justify-center gap-2 rounded-xl border-2 border-rose-200 bg-[#fffaf7] px-3 shadow-[0_4px_0_rgba(91,52,52,0.16)]">
            <Ticket size={20} className="shrink-0 text-rose-400" fill="#ffe4e6" strokeWidth={2.5} />
            <span className="text-xl font-black tracking-tight text-slate-800">
              {token}
            </span>
          </div>
        ) : (
          <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center relative`}>
            <Ticket
              size={compact ? 32 : 40}
              className="absolute text-red-500/20 -rotate-12"
              fill="currentColor"
            />
            <span className={`relative z-10 font-black tracking-tight ${compact ? 'text-sm' : 'text-base'} ${numberClassName || 'text-gray-800'}`}>
              {token}
            </span>
          </div>
        )
      ) : null}
    </div>
  );
}
