import { createQuickFormulaMedicineTokenRe } from './doctorFormulaParser';

export const getNumericMedicineAlphaCode = (
  medicineValue: string,
  quickFormulaInput?: string | null,
): string => {
  const formatted = formatPrescriptionMedicineText(medicineValue);
  const parsed = parseNumericMedicineDisplayToken(formatted);
  if (!parsed) {
    return '';
  }

  const annotation = getQuickFormulaMedicineAnnotationMap(quickFormulaInput)[parsed.medicineNo];
  return String(parsed.alpha || annotation?.alpha || '').trim().toUpperCase();
};

export const getPrintedDoseUnitKind = (
  medicineValue: string,
  quickFormulaInput?: string | null,
): 'DROP' | 'WEEKLY_MORNING' | 'BALL' => {
  const alpha = getNumericMedicineAlphaCode(medicineValue, quickFormulaInput);
  if (alpha === 'Q') return 'DROP';
  if (alpha === 'CM' || alpha === 'M') return 'WEEKLY_MORNING';
  return 'BALL';
};

export const getPrintedDoseTimesText = (
  medication: any,
  _isHi = false,
  quickFormulaInput?: string | null,
): string => {
  const kind = getPrintedDoseUnitKind(
    String(medication?.medicine_value || ''),
    quickFormulaInput,
  );

  if (kind === 'WEEKLY_MORNING') {
    return 'सप्ताह में केवल सुबह';
  }

  const doses = Array.isArray(medication?.doses) ? medication.doses : [];
  const validDoses = doses.filter((dose: any) => Number(dose?.balls_per_dose) > 0);

  if (validDoses.length === 0) {
    return 'खुराक दर्ज नहीं';
  }

  const times = validDoses.reduce(
    (sum: number, dose: any) => sum + (Number(dose?.times_per_day) || 1),
    0,
  );
  const ballCounts = validDoses.map((dose: any) => Number(dose.balls_per_dose) || 0);
  const allSameBalls = ballCounts.every((count: number) => count === ballCounts[0]);
  const balls = allSameBalls ? ballCounts[0] : Math.max(...ballCounts);

  const timesLabel = times === 1 ? '1 बार' : `${times} बार`;
  const unitLabel = kind === 'DROP'
    ? (balls === 1 ? '1 बूँद' : `${balls} बूँद`)
    : (balls === 1 ? '1 गोली' : `${balls} गोलियाँ`);
  return `${unitLabel} दिन में ${timesLabel}`;
};

export const getDosePreview = (
  medication: any,
  durationDays: number | string,
  options?: {
    isHi?: boolean;
    quickFormulaInput?: string | null;
    style?: 'short' | 'full';
  },
) => {
  const isHi = Boolean(options?.isHi);
  const style = options?.style || 'short';
  const kind = getPrintedDoseUnitKind(
    String(medication?.medicine_value || ''),
    options?.quickFormulaInput,
  );
  const normalizedDuration = Number(durationDays) || 0;
  const durationLabel = normalizedDuration > 0
    ? (isHi
      ? `${normalizedDuration} दिन`
      : `${normalizedDuration} ${normalizedDuration === 1 ? 'day' : 'days'}`)
    : '';

  if (kind === 'WEEKLY_MORNING') {
    const weeklyLabel = isHi
      ? 'सप्ताह में केवल सुबह'
      : 'Dosage only at morning in a week';
    return [weeklyLabel, durationLabel].filter(Boolean).join(' • ');
  }

  const fullDoseLabelMap: Record<string, string> = isHi
    ? { MORNING: 'सुबह', AFTERNOON: 'दोपहर', NIGHT: 'शाम', EVENING: 'शाम' }
    : { MORNING: 'Morning', AFTERNOON: 'Afternoon', NIGHT: 'Evening', EVENING: 'Evening' };
  const shortDoseLabelMap: Record<string, string> = isHi
    ? { MORNING: 'सुबह', AFTERNOON: 'दोपहर', NIGHT: 'शाम', EVENING: 'शाम' }
    : { MORNING: 'M', AFTERNOON: 'A', NIGHT: 'E', EVENING: 'E' };
  const doseLabelMap = style === 'full' ? fullDoseLabelMap : shortDoseLabelMap;

  const getUnitLabel = (count: number) => {
    if (kind === 'DROP') {
      if (isHi) return `${count} बूँद`;
      return count === 1 ? '1 drop' : `${count} drops`;
    }
    if (isHi) return count === 1 ? '1 गोली' : `${count} गोलियाँ`;
    return count === 1 ? '1 ball' : `${count} balls`;
  };

  const doses = Array.isArray(medication?.doses) ? medication.doses : [];

  if (doses.length === 0) {
    return durationLabel;
  }

  const parts = doses
    .map((dose: any) => {
      const rawLabel = String(dose?.dose_label || '').toUpperCase();
      const label =
        doseLabelMap[rawLabel] ||
        String(dose?.dose_label || '')
          .toLowerCase()
          .replace(/^\w/, (c: string) => c.toUpperCase());
      const balls = Number(dose?.balls_per_dose) || 0;

      if (!label || !balls) return null;
      if (style === 'full') {
        return `${label} ${getUnitLabel(balls)}`;
      }
      return `${label} ${getUnitLabel(balls)}${durationLabel ? ` ${durationLabel}` : ''}`;
    })
    .filter(Boolean);

  if (parts.length === 0) {
    return durationLabel;
  }

  if (style === 'full') {
    return [...parts, durationLabel].filter(Boolean).join(' • ');
  }

  return parts.join(' • ');
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

type QuickFormulaMedicineAnnotation = {
  alpha?: string;
  power?: string;
};

const parseNumericMedicineDisplayToken = (value: string) => {
  const match = String(value || '').trim().match(
    /^(\d{1,3})(?:\[(\d{1,4})\])?([A-Za-z]*)(?:\[(\d{1,4})\])?$/,
  );
  if (!match) return null;

  return {
    medicineNo: String(Number(match[1])),
    power: match[2] || match[4] || '',
    alpha: match[3] || '',
  };
};

/** Map medicine number → inline alpha / [power] from quick formula (e.g. "12[14],7q/8"). */
export const getQuickFormulaMedicineAnnotationMap = (
  quickFormulaInput?: string | null,
): Record<string, QuickFormulaMedicineAnnotation> => {
  const map: Record<string, QuickFormulaMedicineAnnotation> = {};
  const source = String(quickFormulaInput || '').trim();
  if (!source) return map;

  String(source)
    .split(',')
    .forEach((segment) => {
      const groupPart = String(segment.split('/')[0] || '');
      [...groupPart.matchAll(createQuickFormulaMedicineTokenRe())].forEach((match) => {
        const medicineNo = String(Number(match[1]));
        const power = match[2] || match[4] || '';
        const alpha = match[3] || '';
        if (!map[medicineNo]) {
          map[medicineNo] = {};
        }
        if (power && !map[medicineNo].power) {
          map[medicineNo].power = power;
        }
        if (alpha && !map[medicineNo].alpha) {
          map[medicineNo].alpha = alpha;
        }
      });
    });

  return map;
};

/** Map medicine number → inline alpha from quick formula (e.g. "4,5,7q/3" → { "7": "q" }). */
export const getQuickFormulaInlineAlphaMap = (
  quickFormulaInput?: string | null,
): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.entries(getQuickFormulaMedicineAnnotationMap(quickFormulaInput)).forEach(
    ([medicineNo, annotation]) => {
      if (annotation.alpha) {
        map[medicineNo] = annotation.alpha;
      }
    },
  );
  return map;
};

export const formatNumericMedicineWithFormula = (
  medicineValue: string,
  quickFormulaInput?: string | null,
): string => {
  const formatted = formatPrescriptionMedicineText(medicineValue);
  const parsed = parseNumericMedicineDisplayToken(formatted);
  if (!parsed) {
    return formatted;
  }

  const annotation = getQuickFormulaMedicineAnnotationMap(quickFormulaInput)[parsed.medicineNo];
  const power = parsed.power || annotation?.power || '';
  const alpha = parsed.alpha || annotation?.alpha || '';

  return `${parsed.medicineNo}${power ? `[${power}]` : ''}${alpha}`;
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


