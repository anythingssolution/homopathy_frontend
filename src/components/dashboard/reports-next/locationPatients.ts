export type LocationPatient = {
  subject_key: string; patient_id: number; family_member_id?: number | null;
  patient_uuid: string; patient_full_name: string; patient_mobile_no?: string;
  city?: string; vidhan_sabha?: string; area_name?: string; ward_no?: string; pincode?: string;
  can_open_record?: boolean | number;
  registered_date?: string; consultations: number; last_consultation?: string | null; address_inherited: boolean;
};
export const LOCATION_FIELDS = ['city','vidhan_sabha','area_name','ward_no','pincode'] as const;
export type LocationField = typeof LOCATION_FIELDS[number];
export const cleanLocation = (value: unknown) => {
  const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g,' ');
  return /^(null|undefined|-|—)$/i.test(text) ? '' : text;
};
export const groupLocationPatients = (patients: LocationPatient[], field: LocationField) => {
  const groups = new Map<string, { key:string; name:string; city:string; patients:LocationPatient[]; consultations:number; last:string }>();
  for (const patient of patients) {
    const name = cleanLocation(patient[field]);
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
