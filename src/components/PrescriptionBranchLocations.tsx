import React from 'react';
import { prescriptionFooterStyle } from '../utils/prescriptionPaperStyle';
import { Facebook, Instagram, Twitter, Youtube, Mail } from 'lucide-react';
import branches from '../data/prescriptionBranchLocations.json';

function BranchQr({ branch }: { branch: (typeof branches)[number] }) {
  return (
    <a href={branch.url} target="_blank" rel="noopener noreferrer" title={`${branch.label} — Google listing`} aria-label={`${branch.label} — Google listing`} className="block w-[26mm] shrink-0 text-center print:no-underline">
      <span className="relative block h-[26mm] w-[26mm] border bg-white" style={{ borderColor: branch.qrColor }}>
        <img src={branch.qrImage} alt={`${branch.label} Google listing QR code`} width={256} height={256} className="block h-full w-full" />
        <span className="absolute left-1/2 top-1/2 flex h-[4.2mm] w-[8mm] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1px] bg-white p-[0.3mm]">
          <img src="/logo.png.png" alt="" aria-hidden="true" className="block h-full w-full object-contain" />
        </span>
      </span>
      <span className="mt-0.5 block text-[7.5px] font-bold leading-tight" style={{ color: branch.qrColor }}>{branch.label}</span>
    </a>
  );
}

/** One reference-style footer for individual/all-visits previews and prints. */
export default function PrescriptionBranchLocations() {
  return (
    <div className="w-full border-y border-[#9eafa6] bg-transparent px-2 py-1.5" style={prescriptionFooterStyle}>
      <div className="flex w-full items-center gap-2">
        <BranchQr branch={branches[0]} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <img src="/logo.png.png" alt="Clinic logo" className="h-[7mm] w-[16mm] shrink-0 object-contain mix-blend-multiply" />
            <h2 className="text-center text-[23px] font-black leading-tight text-[#363548]" style={{ WebkitTextStroke: '0.5px white', paintOrder: 'stroke fill' }}>डॉ. त्रिवेदी होम्योपैथिक क्लिनिक</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {branches.map(branch => (
              <div key={branch.id} className="min-w-0 text-center">
                <p className="text-[10px] font-bold leading-tight text-gray-800">{branch.address}</p>
                <p className="mb-1 mt-0.5 text-[10.5px] font-black leading-tight text-gray-800">मो. {branch.phone}</p>
                <div className="bg-[#484263] px-1 py-1 text-[8.5px] font-bold leading-tight text-white">{branch.timing}</div>
              </div>
            ))}
          </div>
        </div>
        <BranchQr branch={branches[1]} />
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-3 text-[8px] font-bold tracking-tight text-gray-600">
        <span className="flex items-center"><Facebook className="mr-1 h-3 w-3 text-[#3b5998]" fill="currentColor" strokeWidth={0} />dr.trivedishomeopathy</span>
        <span className="flex items-center"><Instagram className="mr-1 h-3 w-3 text-[#b95078]" />drtrivedishomeopathy</span>
        <span className="flex items-center"><Twitter className="mr-1 h-3 w-3 text-[#398fa1]" fill="currentColor" strokeWidth={0} />drtrivedishomeo</span>
        <span className="flex items-center"><Youtube className="mr-1 h-3 w-3 text-[#c34e55]" />drtrivedishomeopathy</span>
        <span className="flex items-center"><Mail className="mr-1 h-3 w-3 text-[#bb5d59]" />drtrivedishomeopathy@gmail.com</span>
      </div>
    </div>
  );
}
