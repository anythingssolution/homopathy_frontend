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

export const getMedicationRoleLabel = (medication: any) =>
  String(medication?.added_by_role || '').toUpperCase() === 'MEDICAL' ? 'Medical Added' : '';
