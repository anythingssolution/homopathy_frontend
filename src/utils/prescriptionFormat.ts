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

export const formatPrescriptionMedicineText = (medicineValue: string): string => {
  if (!medicineValue) return '';
  const trimmed = medicineValue.trim();

  // If already formatted like "3 * BT-01" or "3 * Syrup - 100ml"
  if (/^\d+\s*[*xX]\s*/.test(trimmed)) {
    return trimmed;
  }

  // Pattern: "BT-01 * 3" or "Syrup - 100ml * 3" -> convert to "3 * BT-01" / "3 * Syrup - 100ml"
  const suffixMatch = trimmed.match(/^(.*?)\s*[*xX]\s*(\d+)$/);
  if (suffixMatch) {
    const medName = suffixMatch[1].trim();
    const qty = suffixMatch[2].trim();
    return `${qty} * ${medName}`;
  }

  return trimmed;
};

/** Map medicine number → inline alpha from quick formula (e.g. "4,5,7q/3" → { "7": "q" }). */
export const getQuickFormulaInlineAlphaMap = (
  quickFormulaInput?: string | null,
): Record<string, string> => {
  const map: Record<string, string> = {};
  const source = String(quickFormulaInput || '').trim();
  if (!source) return map;

  String(source)
    .split(',')
    .forEach((segment) => {
      const groupPart = String(segment.split('/')[0] || '');
      [...groupPart.matchAll(/(\d{1,3})([A-Za-z]+)/g)].forEach((match) => {
        const medicineNo = String(Number(match[1]));
        if (!map[medicineNo]) {
          map[medicineNo] = match[2];
        }
      });
    });

  return map;
};

export const formatNumericMedicineWithFormula = (
  medicineValue: string,
  quickFormulaInput?: string | null,
): string => {
  const formatted = formatPrescriptionMedicineText(medicineValue);
  if (!formatted || !/^\d+$/.test(formatted)) {
    return formatted;
  }

  const alpha = getQuickFormulaInlineAlphaMap(quickFormulaInput)[String(Number(formatted))];
  return alpha ? `${formatted}${alpha}` : formatted;
};

export const formatConsultationMedicineText = (
  name: string,
  variant?: string | null,
  quantity?: number | string | null
): string => {
  let base = (name || '').trim();
  const v = (variant || '').trim();
  if (v && v !== 'N/A') {
    if (!base) {
      base = v;
    } else if (base.toLowerCase() !== v.toLowerCase()) {
      base = `${base} - ${v}`;
    }
  }

  const qtyNum = Number(quantity);
  if (qtyNum && qtyNum > 1) {
    return `${base} * ${qtyNum}`;
  }
  return base;
};

export const parseConsultationMedicineText = (
  value: string,
): {
  name: string;
  variant: string;
  quantity: number;
} => {
  let remaining = String(value || "").trim();
  let quantity = 1;

  const suffixMatch = remaining.match(/^(.*?)\s*[*xX]\s*(\d+)$/);
  const prefixMatch = remaining.match(/^(\d+)\s*[*xX]\s*(.*)$/);
  if (suffixMatch) {
    remaining = suffixMatch[1].trim();
    quantity = parseInt(suffixMatch[2], 10) || 1;
  } else if (prefixMatch) {
    remaining = prefixMatch[2].trim();
    quantity = parseInt(prefixMatch[1], 10) || 1;
  }

  const separator = " - ";
  const separatorIndex = remaining.indexOf(separator);
  if (separatorIndex > 0) {
    return {
      name: remaining.slice(0, separatorIndex).trim(),
      variant: remaining.slice(separatorIndex + separator.length).trim(),
      quantity,
    };
  }

  return {
    name: remaining,
    variant: "",
    quantity,
  };
};

export type RepeatSamePrintBlock = {
  key: "same" | "repeat";
  label: string;
  value: string;
};

const formatMonthCount = (months: number, isHi: boolean) => {
  if (isHi) {
    return months === 1 ? "1 माह" : `${months} माह`;
  }
  return months === 1 ? "1 month" : `${months} months`;
};

const formatDayCount = (days: number, isHi: boolean) => {
  const safeDays = Number(days) || 0;
  if (safeDays <= 0) return isHi ? "हाँ" : "Yes";
  if (isHi) {
    return safeDays === 1 ? "1 दिन" : `${safeDays} दिन`;
  }
  return safeDays === 1 ? "1 day" : `${safeDays} days`;
};

export const getRepeatSamePrintBlocks = ({
  isRepeat,
  isSame,
  repeatMonths = 0,
  sameMonths = 0,
  durationDays,
  isHi = false,
}: {
  isRepeat?: boolean;
  isSame?: boolean;
  repeatMonths?: number | string | null;
  sameMonths?: number | string | null;
  durationDays?: number | string | null;
  isHi?: boolean;
}): RepeatSamePrintBlock[] => {
  const repeatCount = Number(repeatMonths || 0);
  const sameCount = Number(sameMonths || 0);
  const showRepeat = Boolean(isRepeat) || repeatCount > 0;
  const showSame = Boolean(isSame) || sameCount > 0;
  const blocks: RepeatSamePrintBlock[] = [];

  if (showSame) {
    blocks.push({
      key: "same",
      label: isHi ? "समान" : "SAME",
      value:
        sameCount > 0
          ? formatMonthCount(sameCount, Boolean(isHi))
          : formatDayCount(Number(durationDays || 0), Boolean(isHi)),
    });
  }

  if (showRepeat) {
    blocks.push({
      key: "repeat",
      label: isHi ? "दोहराएँ" : "REPEAT",
      value:
        repeatCount > 0
          ? formatMonthCount(repeatCount, Boolean(isHi))
          : formatDayCount(Number(durationDays || 0), Boolean(isHi)),
    });
  }

  return blocks;
};

export const getPrintedUniversalRemark = (
  source: any,
  isHi = false,
): string => {
  const english = String(
    source?.universal_remark
    || source?.prescription?.universal_remark
    || source?.details?.universal_remark
    || '',
  ).trim();
  const hindi = String(
    source?.universal_remark_hi
    || source?.prescription?.universal_remark_hi
    || source?.details?.universal_remark_hi
    || '',
  ).trim();

  if (isHi) return hindi || english;
  return english || hindi;
};


