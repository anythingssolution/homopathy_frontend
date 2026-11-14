import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatAgeValue } from '../utils/ageDisplay';

export type FamilyMemberMatch = {
  family_member_id: number;
  full_name: string;
  age: number;
  date_of_birth?: string | null;
  gender: string;
  relationship: string;
  is_active: number;
  last_visit?: { appointment_date: string; branch_name: string } | null;
};
export type FamilyMemberMatchDetails = {
  code: 'FAMILY_MEMBER_MATCH';
  candidates: FamilyMemberMatch[];
  confirmation_token: string;
};

export default function FamilyMemberMatchNotice({ match, busy, onSelect, onDifferent }: {
  match: FamilyMemberMatchDetails;
  busy: boolean;
  onSelect: (member: FamilyMemberMatch) => void;
  onDifferent: () => void;
}) {
  const { i18n } = useTranslation();
  const hi = i18n.language.startsWith('hi');
  return <div role="alert" className="col-span-full space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
    <p className="font-bold text-amber-900">{hi ? 'इस खाते में मिलता-जुलता परिवार का सदस्य पहले से है।' : 'A similar family member already exists in this account.'}</p>
    <p>{hi ? 'पुरानी हिस्ट्री जोड़कर रखने के लिए पहले से मौजूद सदस्य चुनें।' : 'Choose the existing member to keep their previous history connected.'}</p>
    {match.candidates.map(member => <div key={member.family_member_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white p-3">
      <div className="min-w-0">
        <p className="break-words font-bold">{member.full_name}</p>
        <p className="mt-1 text-xs">{hi ? 'उम्र' : 'Age'}: {formatAgeValue(member.age, null, member.date_of_birth, i18n.language)} · {member.gender} · {member.relationship}</p>
        {member.date_of_birth && <p className="mt-1 text-xs">{hi ? 'जन्म तिथि' : 'DOB'}: {String(member.date_of_birth).slice(0, 10)}</p>}
        {member.last_visit && <p className="mt-1 text-xs">{hi ? 'पिछली विज़िट' : 'Last visit'}: {member.last_visit.appointment_date} · {member.last_visit.branch_name}</p>}
        {!Number(member.is_active) && <p className="mt-1 text-xs text-amber-800">{hi ? 'यह सदस्य निष्क्रिय है। पहले इसे सक्रिय करें।' : 'This member is inactive. Reactivate their existing record first.'}</p>}
      </div>
      <button type="button" disabled={busy || !Number(member.is_active)} onClick={() => onSelect(member)}
        className="rounded-xl bg-[#549E9E] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
        {hi ? 'यही सदस्य चुनें' : 'Use existing member'}
      </button>
    </div>)}
    <button type="button" disabled={busy} onClick={onDifferent} className="rounded-xl border border-amber-400 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40">
      {hi ? 'यह अलग व्यक्ति है — नया सदस्य बनाएँ' : 'This is a different person — create new member'}
    </button>
  </div>;
}
