export type BookingDateAvailability = {
  appointment_date: string;
  branches: { branch_id: number; booking_enabled: boolean; reason: string | null;
    slots: { slot_id: number; slot_name: string; booking_enabled: boolean; reason: string | null; available_days: string[] }[] }[];
};
export function bookingBranchStatus(data: BookingDateAvailability | null, date: string, branchId: unknown) {
  return data?.appointment_date === date ? data.branches.find(branch => Number(branch.branch_id) === Number(branchId)) : undefined;
}
