export type AppointmentCardStatus = 'all' | 'completed' | 'pending' | 'cancelled';
export type AppointmentCardRow = {
  appointment_id: number; appointment_date: string; status: string;
  patient_full_name: string; patient_uuid?: string; patient_mobile_no?: string;
  fk_patient_id: number; family_member_id?: number | null;
  display_token_display?: string; queue_position?: number | null;
  treatment_name?: string; slot_name?: string; reception_status?: string;
  reception_rejection_reason?: string; consultation_id?: number | null;
  workflow_status?: string; has_history?: number | boolean;
};

export const filterAppointmentList = (rows: AppointmentCardRow[], search: string) => {
  const needle = search.trim().toLowerCase();
  return rows.filter(row => !needle || [row.patient_full_name, row.patient_uuid, row.patient_mobile_no, row.display_token_display, row.treatment_name, row.slot_name].join(' ').toLowerCase().includes(needle));
};
