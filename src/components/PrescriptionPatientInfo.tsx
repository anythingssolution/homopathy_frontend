import React from 'react';

interface PrescriptionPatientInfoProps {
  patientId?: string | null;
  name?: string | null;
  age?: string | number | null;
  gender?: string | null;
  date: string;
  contactNumber?: string | null;
  isHi?: boolean;
}

export default function PrescriptionPatientInfo({
  patientId,
  name,
  age,
  gender,
  date,
  contactNumber,
  isHi = false,
}: PrescriptionPatientInfoProps) {
  return (
    <div className="w-full mb-4 px-1 mt-1 font-bold text-gray-800 text-[10px]">
      <div className="flex items-center justify-center gap-1.5 text-[10px]">
        <span className="font-black uppercase tracking-wider text-gray-500">
          {isHi ? 'रजिस्ट्रेशन नं. :' : 'Reg. No. :'}
        </span>
        <span className="font-mono text-[11px] font-black tracking-wide text-[#1a2b4c]">
          {patientId || 'N/A'}
        </span>
      </div>

      <div className="mt-2 w-1/2 pr-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-gray-500">{isHi ? 'नाम :' : 'Name :'}</span>
            <span className="font-black uppercase tracking-wide text-[#1a2b4c]">{name || 'N/A'}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span>
              <span className="text-gray-500">{isHi ? 'उम्र :' : 'Age :'}</span>{' '}
              <span className="text-[#1a2b4c]">{age || 'N/A'}{age ? (isHi ? ' वर्ष' : ' Y') : ''}</span>
            </span>
            <span>
              <span className="text-gray-500">{isHi ? 'लिंग :' : 'Gender :'}</span>{' '}
              <span className="capitalize text-[#1a2b4c]">{gender || 'N/A'}</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-gray-500">{isHi ? 'दिनांक :' : 'Date :'}</span>
            <span className="text-[#1a2b4c]">{date}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-gray-500">{isHi ? 'संपर्क नंबर :' : 'Contact Number :'}</span>
            <span className="font-black tracking-wide text-[#1a2b4c]">{contactNumber || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
