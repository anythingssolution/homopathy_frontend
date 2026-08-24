import React from 'react';
import { Ticket } from 'lucide-react';

type AppointmentTokenBadgeProps = {
  tokenDisplay?: string | number | null;
  tokenNumber?: string | number | null;
  position?: string | number | null;
  compact?: boolean;
};

const toPositiveInt = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export default function AppointmentTokenBadge({
  tokenDisplay,
  tokenNumber,
  position,
  compact = false,
}: AppointmentTokenBadgeProps) {
  const token = tokenDisplay || tokenNumber || null;
  const queuePosition = toPositiveInt(position);

  if (!token && queuePosition == null) {
    return <span className="text-[10px] font-bold text-gray-300">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      {queuePosition != null && (
        <span className="text-[8px] font-black text-gray-900 bg-yellow-300 border border-yellow-400 px-1.5 py-0.5 rounded text-center shadow-sm">
          Pos #{queuePosition}
        </span>
      )}
      {token ? (
        <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} flex items-center justify-center text-gray-800 relative`}>
          <Ticket
            size={compact ? 32 : 40}
            className="absolute text-red-500/20 -rotate-12"
            fill="currentColor"
          />
          <span className={`relative z-10 font-black tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
            {token}
          </span>
        </div>
      ) : null}
    </div>
  );
}
