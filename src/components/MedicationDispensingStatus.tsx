import React from 'react';
import { getMedicationDispensingState } from '../utils/prescriptionFormat';

interface MedicationDispensingStatusProps {
  medication: any;
  pricing?: any;
  label?: string;
  reasonLabel?: string;
  compact?: boolean;
}

export default function MedicationDispensingStatus({
  medication,
  pricing,
  label = 'Not dispensed',
  reasonLabel = 'Reason',
  compact = false,
}: MedicationDispensingStatusProps) {
  const state = getMedicationDispensingState(pricing, medication);

  if (state.status !== 'VOID') return null;

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      <span className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-700">
        {label}
      </span>
      {state.reason && (
        <p className="mt-1 text-[10px] font-bold text-red-700">
          {reasonLabel}: {state.reason}
        </p>
      )}
    </div>
  );
}
