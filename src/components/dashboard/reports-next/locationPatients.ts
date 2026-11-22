export type LocationPatient = {
  subject_key: string; patient_id: number; family_member_id?: number | null;
  patient_uuid: string; patient_full_name: string; patient_mobile_no?: string;
  city?: string; state_name?: string; vidhan_sabha?: string; area_name?: string; ward_no?: string; pincode?: string;
  can_open_record?: boolean | number;
  registered_date?: string; consultations: number; last_consultation?: string | null; address_inherited: boolean;
};
export const LOCATION_FIELDS = ['state_name','city','vidhan_sabha','area_name','ward_no','pincode'] as const;
export type LocationField = typeof LOCATION_FIELDS[number];
export const cleanLocation = (value: unknown) => {
  const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g,' ');
  return /^(null|undefined|-|—)$/i.test(text) ? '' : text;
};
// Explicit report aliases only: never guess a patient's state from a city or
// fuzzy-match arbitrary text. Original address values remain available below.
const STATE_ALIASES: Record<string, string> = {};
for (const [name, aliases] of [
  ['Chhattisgarh', ['CHHATTISGARH','CHHATISHGARH','CHATTISGARH','CHHATISGARH','CHHATTISHGARH','CHHATISHGAR','CHHATTISGHARH','CHHATTISGARG','CHHATTISGARH4','CHHATTISGAR','CHAATISHGARH','CHATISGARH','CG','छत्तीसगढ़','छत्तीसगढ़']],
  ['Uttar Pradesh', ['UTTARPRADESH','UTTERPRADESH','UP','उत्तरप्रदेश']],
  ['Maharashtra', ['MAHARASHTRA','MAHARSAHTRA','महाराष्ट्र']],
  ['Uttarakhand', ['UTTARAKHAND','UTTRAKHAND','उत्तराखंड']],
  ['Odisha', ['ODISHA','ORISSA','ओडिशा','उड़ीसा']],
  ['West Bengal', ['WESTBENGAL']],
  ['Assam', ['ASSAM']], ['Punjab', ['PUNJAB']], ['Delhi', ['DELHI']],
] as [string, string[]][]) {
  for (const alias of aliases) STATE_ALIASES[alias] = name;
}
export const normalizeReportState = (value: unknown) => {
  const text = cleanLocation(value);
  const key = text.toUpperCase().replace(/[\s.\-()]/g, '');
  return STATE_ALIASES[key] || text.toUpperCase();
};
export const groupLocationPatients = (patients: LocationPatient[], field: LocationField) => {
  const groups = new Map<string, { key:string; name:string; city:string; patients:LocationPatient[]; consultations:number; last:string }>();
  for (const patient of patients) {
    const name = field === 'state_name' ? normalizeReportState(patient[field]) : cleanLocation(patient[field]);
    const city = name && (field === 'ward_no' || field === 'area_name') ? cleanLocation(patient.city) : '';
    const key = JSON.stringify([name.toLocaleLowerCase(),city.toLocaleLowerCase()]);
    if (!groups.has(key)) groups.set(key,{key,name,city,patients:[],consultations:0,last:''});
    const group = groups.get(key)!;
    group.patients.push(patient); group.consultations += Number(patient.consultations || 0);
    if (String(patient.last_consultation || '') > group.last) group.last = String(patient.last_consultation);
  }
  return [...groups.values()].sort((a,b)=>b.patients.length-a.patients.length || a.name.localeCompare(b.name));
};
export const csvCell = (value: unknown) => {
  const text=String(value ?? '');
  return `"${(/^[\s]*[=+\-@]/.test(text) ? "'" : '') + text.replace(/"/g,'""')}"`;
};
