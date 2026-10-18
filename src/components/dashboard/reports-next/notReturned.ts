export type NotReturnedPatient = {
  subject_key: string; fk_patient_id: number; family_member_id?: number | null;
  patient_uuid: string; patient_full_name: string; patient_mobile_no?: string;
  family_member_relationship?: string; consultation_id: number; appointment_id: number;
  last_visit_date: string; days_since_visit: number; bucket: '1_2' | '2_3' | '3_plus';
  due_date?: string | null; overdue_days: number; next_appointment?: string | null;
  last_medicine_date?: string | null; treatment_name?: string; disease?: string; diagnosis?: string;
  workflow_status?: string;
  follow_up_chain_closed?: boolean | number;
};

export const filterNotReturned = (rows: NotReturnedPatient[], bucket: string, search: string, overdue: boolean, unbooked: boolean) => {
  const needle = search.trim().toLowerCase();
  return rows.filter(row => (bucket === 'all' || row.bucket === bucket)
    && (!overdue || row.overdue_days > 0)
    && (!unbooked || !row.next_appointment)
    && (!needle || [row.patient_uuid, row.patient_full_name, row.patient_mobile_no, row.treatment_name, row.disease, row.diagnosis].join(' ').toLowerCase().includes(needle)));
};
