export type LastCourierDelivery = {
  courier_address: string;
  received_by?: string | null;
  last_used_at?: string | null;
};

export async function fetchLastCourierDelivery(
  token: string,
  patientId: number | string,
): Promise<LastCourierDelivery | null> {
  const response = await fetch(`/api/v1/medical/patients/${patientId}/last-courier-delivery`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Saved courier address could not be loaded');
  }
  return result.data || null;
}
