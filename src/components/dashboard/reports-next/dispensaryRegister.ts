export type DispensingRow = {
  consultation_id?: number | null; appointment_id?: number | null; bill_id?: number;
  bill_number?: string; fk_patient_id: number; family_member_id?: number | null;
  patient_full_name: string; patient_uuid?: string; patient_mobile_no?: string;
  doctor_name?: string; treatment_name?: string; appointment_date?: string;
  sent_at?: string; waiting_days?: number; display_token_display?: string;
  queue_position?: number | null; slot_name?: string; bill_date?: string;
  medicine_type?: 'REGULAR' | 'DIRECT' | 'REPEAT'; delivery_mode?: string;
  total_amount?: number | string; paid_amount?: number | string; pending_amount?: number | string;
};
export type DispensaryRegister = {
  as_of: string; pending: DispensingRow[]; bills: DispensingRow[];
  summary: { pending_count: number; dispensed_bills: number; net_billed: number; paid: number; pending: number };
  trend: { date: string; bills: number; net_billed: number }[];
  top_medicines: { medicine_name: string; bill_count: number }[];
};
export const filterDispensingRows = (rows: DispensingRow[], search: string, type = 'all', payment = 'all') => {
  const needle = search.trim().toLowerCase();
  return rows.filter(row => (type === 'all' || row.medicine_type === type)
    && (payment !== 'paid' || Number(row.paid_amount) > 0)
    && (payment !== 'pending' || Number(row.pending_amount) > 0)
    && (!needle || [row.patient_full_name,row.patient_uuid,row.patient_mobile_no,row.doctor_name,row.treatment_name,row.bill_number,row.display_token_display].join(' ').toLowerCase().includes(needle)));
};
