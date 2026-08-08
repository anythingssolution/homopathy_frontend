export const getDosePreview = (medication: any, durationDays: number | string) => {
  const doseLabelMap: Record<string, string> = {
    MORNING: 'M',
    AFTERNOON: 'A',
    NIGHT: 'E',
  };

  const normalizedDuration = Number(durationDays) || 0;
  const doses = Array.isArray(medication?.doses) ? medication.doses : [];

  if (doses.length === 0) {
    return normalizedDuration > 0 ? `${normalizedDuration} days` : '';
  }

  return doses
    .map((dose: any) => {
      const shortLabel =
        doseLabelMap[String(dose?.dose_label || '').toUpperCase()] ||
        String(dose?.dose_label || '').charAt(0).toUpperCase();
      const balls = Number(dose?.balls_per_dose) || 0;

      if (!shortLabel || !balls) return null;
      return `${shortLabel} ${balls} balls ${normalizedDuration} days`;
    })
    .filter(Boolean)
    .join(' • ');
};

export const getMedicationPricingAmount = (pricing: any, medication: any) => {
  const pricingItems = Array.isArray(pricing?.medications) ? pricing.medications : [];
  const medicationId = Number(medication?.consultation_medication_id);

  const matchedById = pricingItems.find(
    (item: any) => Number(item?.consultation_medication_id) === medicationId
  );

  if (matchedById) return matchedById.amount || 0;

  const matchedByValue = pricingItems.find(
    (item: any) => String(item?.medicine_value || '').trim() === String(medication?.medicine_value || '').trim()
  );

  return matchedByValue?.amount || 0;
};

export const getMedicationDispensingState = (pricing: any, medication: any) => {
  const directStatus = String(medication?.dispense_status || '').trim().toUpperCase();
  const pricingItems = Array.isArray(pricing?.medications) ? pricing.medications : [];
  const medicationId = Number(medication?.consultation_medication_id);
  const matchedItem = pricingItems.find(
    (item: any) => Number(item?.consultation_medication_id) === medicationId
  ) || pricingItems.find(
    (item: any) => String(item?.medicine_value || '').trim() === String(medication?.medicine_value || '').trim()
  );
  const matchedStatus = String(matchedItem?.dispense_status || '').trim().toUpperCase();
  const hasDirectStatus = directStatus === 'VOID' || directStatus === 'ACTIVE';
  const status = hasDirectStatus
    ? directStatus
    : (matchedStatus === 'VOID' || matchedStatus === 'ACTIVE' ? matchedStatus : null);
  const source = hasDirectStatus ? medication : matchedItem;

  return {
    status,
    reason: status === 'VOID' ? String(source?.void_reason || '').trim() : '',
    voidedAt: status === 'VOID' ? source?.voided_at || null : null,
    voidedBy: status === 'VOID' ? source?.voided_by || null : null,
  };
};

export const getMedicationRoleLabel = (medication: any) =>
  String(medication?.added_by_role || '').toUpperCase() === 'MEDICAL' ? 'Medical Added' : '';
