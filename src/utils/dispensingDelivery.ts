export type DispensingDelivery = {
  status: 'DISPENSED' | 'NOT_DISPENSED' | 'NOT_RECORDED';
  mode: 'HAND_DELIVERY' | 'COURIER' | null;
  address: string | null;
  trackingNo: string | null;
  remark: string | null;
  dispensedAt: string | null;
};

const parseDetails = (value: any) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const firstValue = (...values: any[]) => values.find((value) => value !== undefined && value !== null && value !== '');

export const resolveDispensingDelivery = (...sources: any[]): DispensingDelivery => {
  for (const original of sources.filter(Boolean)) {
    const source = original?.details || original;
    const dispensing = original?.dispensing || source?.dispensing || {};
    const bill = original?.medication_bill || source?.medication_bill || {};
    const pricing = original?.pricing || original?.prescription?.pricing || source?.pricing || {};
    const hasDispensingRecord = Boolean(
      dispensing?.medication_bill_id || bill?.bill_id || source?.medication_bill_id || source?.is_medicine_purchase,
    );
    if (!hasDispensingRecord) continue;

    const rawMode = String(firstValue(
      dispensing?.delivery_mode,
      bill?.delivery_mode,
      source?.delivery_mode,
      pricing?.delivery_mode,
    ) || '').toUpperCase();
    const mode = rawMode === 'COURIER' || rawMode === 'HAND_DELIVERY' ? rawMode : null;
    const details = parseDetails(firstValue(
      dispensing?.delivery_details,
      dispensing?.delivery_details_json,
      bill?.delivery_details,
      bill?.delivery_details_json,
      source?.delivery_details,
      source?.delivery_details_json,
      pricing?.delivery_details,
      pricing?.delivery_details_json,
    ));

    return {
      status: mode ? 'DISPENSED' : 'NOT_RECORDED',
      mode,
      address: String(details?.courier_address || '').trim() || null,
      trackingNo: String(details?.tracking_no || '').trim() || null,
      remark: String(details?.delivery_remark || '').trim() || null,
      dispensedAt: firstValue(dispensing?.dispensed_at, bill?.dispensed_at, bill?.created_at, source?.dispensed_at) || null,
    };
  }

  return { status: 'NOT_DISPENSED', mode: null, address: null, trackingNo: null, remark: null, dispensedAt: null };
};
