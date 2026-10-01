export type PrescriptionTimelineScope = {
  familyMemberId?: number | null;
  subjectScope?: "SELF" | "ALL";
  fromDate?: string | null;
  toDate?: string | null;
};

type LoadPrescriptionTimelineArgs = PrescriptionTimelineScope & {
  token: string;
  patientId: number | string;
};

const eventTime = (item: any) => {
  const value = item?.event_at || item?.event_date || item?.details?.appointment_date || item?.appointment?.appointment_date;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortPrescriptionTimeline = (items: any[] = []) => (
  [...items].sort((a, b) => {
    const timeDifference = eventTime(b) - eventTime(a);
    if (timeDifference !== 0) return timeDifference;
    return Number(b?.source_id || b?.consultation_id || 0) - Number(a?.source_id || a?.consultation_id || 0);
  })
);

export async function loadPrescriptionTimeline({
  token,
  patientId,
  familyMemberId,
  subjectScope = "SELF",
  fromDate,
  toDate,
}: LoadPrescriptionTimelineArgs) {
  const params = new URLSearchParams();
  if (familyMemberId) params.set("family_member_id", String(familyMemberId));
  else params.set("subject_scope", subjectScope);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);

  const response = await fetch(
    `/api/v1/patient-records/patients/${patientId}/prescription-timeline?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load prescription timeline");
  }

  return sortPrescriptionTimeline(Array.isArray(result.data?.items) ? result.data.items : []);
}
