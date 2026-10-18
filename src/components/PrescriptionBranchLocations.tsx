import React from 'react';
import branches from '../data/prescriptionBranchLocations.json';

/** Shared by individual and all-visits prescriptions, on screen and on paper. */
export default function PrescriptionBranchLocations() {
  return (
    <div className="mb-1 flex w-full gap-3">
      {branches.map((branch, index) => (
        <div key={branch.id} className={`flex min-w-0 flex-1 items-start gap-2 ${index === 1 ? 'flex-row-reverse' : ''}`}>
          <a href={branch.url} target="_blank" rel="noopener noreferrer" title={`${branch.label} — Google listing`} aria-label={`${branch.label} — Google listing`} className="block w-[24mm] shrink-0 text-center text-[#1a2b4c] print:no-underline">
            <span className="relative block h-[24mm] w-[24mm] border bg-white" style={{ borderColor: branch.qrColor }}>
              <img src={branch.qrImage} alt={`${branch.label} Google listing QR code`} width={256} height={256} className="block h-full w-full" />
              <span className="absolute left-1/2 top-1/2 flex h-[3.7mm] w-[7mm] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1px] bg-white p-[0.3mm]">
                <img src="/logo.png.png" alt="" aria-hidden="true" className="block h-full w-full object-contain" />
              </span>
            </span>
            <span className="mt-0.5 block text-[7.5px] font-bold leading-tight" style={{ color: branch.qrColor }}>{branch.label}</span>
          </a>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-bold leading-tight text-gray-800">{branch.address}</p>
            <p className="mb-1 mt-0.5 text-[10.5px] font-black leading-tight text-gray-800">मो. {branch.phone}</p>
            <div className="bg-[#1a2b4c] px-1 py-1 text-[8.5px] font-bold tracking-wide text-white">{branch.timing}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
