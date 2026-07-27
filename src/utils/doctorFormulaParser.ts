export type FormulaDoseRow = {
  dose_label: string;
  sort_order: number;
  times_per_day: number;
  balls_per_dose: number;
  instructions?: string;
};

export type FormulaRuleSnapshot = {
  amount_strategy: 'FIXED' | 'MULTIPLY_SUFFIX';
  fixed_amount: number | null;
  multiplier_value: number | null;
  template_code: string | null;
  doses: FormulaDoseRow[];
};

export type FormulaAlphaCodeSnapshot = {
  code: string;
  description: string | null;
  fixed_amount: number | null;
  template_code: string | null;
  duration_override_days: number | null;
  doses: FormulaDoseRow[];
};

export type DoctorFormulaSnapshot = {
  set_id: number;
  set_name: string;
  version_no: number;
  updated_at: string;
  rules: {
    plain_number: FormulaRuleSnapshot | null;
    slash_single_numeric: FormulaRuleSnapshot | null;
    slash_double_numeric: FormulaRuleSnapshot | null;
  };
  alpha_codes: Record<string, FormulaAlphaCodeSnapshot>;
  templates: Array<{
    template_code: string;
    template_name: string;
    rows: FormulaDoseRow[];
  }>;
};

export type ParsedQuickFormulaMedication = {
  raw_token: string;
  name: string;
  baseAmount: number;
  amount: string;
  doses: {
    morning: number;
    afternoon: number;
    night: number;
  };
  dosage_template_code: string | null;
  suffix_type: 'NONE' | 'NUMERIC_SINGLE' | 'NUMERIC_DOUBLE' | 'ALPHA';
  suffix_value: string | null;
  duration_override_days: number | null;
  warnings: string[];
};

export type ParsedQuickFormulaResult = {
  input: string;
  tokens: string[];
  entries: ParsedQuickFormulaMedication[];
  warnings: Array<{ raw_token: string; message: string }>;
  errors: Array<{ raw_token: string; message: string }>;
};

const toCurrencyAmount = (value: number | null | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return '0.00';
  }

  return parsed.toFixed(2);
};

const doseRowsToSlotMap = (rows: FormulaDoseRow[]) => {
  const doses = {
    morning: 0,
    afternoon: 0,
    night: 0,
  };
  const warnings: string[] = [];

  rows.forEach((row) => {
    const label = String(row.dose_label || '').trim().toUpperCase();
    const balls = Number(row.balls_per_dose) || 0;

    if (label === 'MORNING') {
      doses.morning = balls;
      return;
    }
    if (label === 'AFTERNOON') {
      doses.afternoon = balls;
      return;
    }
    if (label === 'NIGHT') {
      doses.night = balls;
      return;
    }

    warnings.push(`Unsupported dose label ${label} was ignored in quick-entry preview.`);
  });

  return { doses, warnings };
};

export const parseDoctorFormulaInput = (
  rawInput: string,
  snapshot: DoctorFormulaSnapshot | null | undefined
): ParsedQuickFormulaResult => {
  const source = String(rawInput || '').trim();
  if (!source) {
    return {
      input: '',
      tokens: [],
      entries: [],
      warnings: [],
      errors: [],
    };
  }

  if (!snapshot) {
    return {
      input: source,
      tokens: [],
      entries: [],
      warnings: [],
      errors: [{ raw_token: source, message: 'Formula master is not loaded yet.' }],
    };
  }

  const tokens = source
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  const errors: Array<{ raw_token: string; message: string }> = [];
  const warnings: Array<{ raw_token: string; message: string }> = [];
  const entries: ParsedQuickFormulaMedication[] = [];
  const seenMedicineValues = new Set<string>();

  const resolveAmount = (rule: FormulaRuleSnapshot | null, suffixNumeric?: number | null) => {
    if (!rule) {
      throw new Error('Matching formula rule is not configured.');
    }

    if (rule.amount_strategy === 'FIXED') {
      return Number(rule.fixed_amount ?? 0);
    }

    if (rule.amount_strategy === 'MULTIPLY_SUFFIX') {
      return Number(((suffixNumeric || 0) * Number(rule.multiplier_value || 0)).toFixed(2));
    }

    throw new Error('Unsupported amount strategy.');
  };

  tokens.forEach((token) => {
    const parts = token.split('/');
    if (parts.length > 2) {
      errors.push({ raw_token: token, message: 'Only one slash (/) is allowed per group.' });
      return;
    }

    const groupPart = parts[0].trim();
    const suffix = parts.length === 2 ? parts[1].trim() : null;

    if (!groupPart) {
      errors.push({ raw_token: token, message: 'Missing medicine numbers before slash.' });
      return;
    }

    const medicineMatches = [...groupPart.matchAll(/(\d{1,3})([A-Za-z]*)/g)];

    const validateGroup = groupPart.replace(/(\d{1,3})([A-Za-z]*)/g, '').replace(/[\s\-+]/g, '');
    if (validateGroup !== '') {
      errors.push({
        raw_token: token,
        message: `Invalid characters found in medicine group: ${validateGroup}. Only numbers, letters, spaces, dashes or pluses allowed before the slash.`,
      });
      return;
    }

    if (medicineMatches.length === 0) {
      errors.push({ raw_token: token, message: 'No valid medicines found in token.' });
      return;
    }

    let groupRule = snapshot.rules.plain_number;
    let groupSuffixType: ParsedQuickFormulaMedication['suffix_type'] = 'NONE';
    let groupSuffixValue: string | null = null;
    let groupDurationOverrideDays: number | null = null;
    let baseAmountValue = 0;

    if (suffix) {
      groupSuffixValue = suffix;

      if (/^\d+$/.test(suffix)) {
        const suffixNumber = Number(suffix);
        if (suffix.length === 1) {
          groupRule = snapshot.rules.slash_single_numeric;
          groupSuffixType = 'NUMERIC_SINGLE';
        } else if (suffix.length === 2) {
          groupRule = snapshot.rules.slash_double_numeric;
          groupSuffixType = 'NUMERIC_DOUBLE';
        } else {
          errors.push({
            raw_token: token,
            message: 'Only one-digit or two-digit numeric suffix is supported.',
          });
          return;
        }

        try {
          baseAmountValue = resolveAmount(groupRule, suffixNumber);
        } catch (e: any) {
          errors.push({ raw_token: token, message: e.message });
          return;
        }

      } else if (/^[A-Za-z]+$/.test(suffix)) {
        const alphaCode = suffix.toUpperCase();
        const alphaRule = snapshot.alpha_codes?.[alphaCode];
        if (!alphaRule) {
          errors.push({
            raw_token: token,
            message: `Unknown group alpha suffix: ${alphaCode}`,
          });
          return;
        }

        groupSuffixType = 'ALPHA';
        groupDurationOverrideDays = alphaRule.duration_override_days ?? null;
        baseAmountValue = Number(alphaRule.fixed_amount ?? snapshot.rules.plain_number?.fixed_amount ?? 0);
        groupRule = {
          ...snapshot.rules.plain_number!,
          amount_strategy: 'FIXED',
          fixed_amount: baseAmountValue,
          multiplier_value: null,
          template_code: alphaRule.template_code,
          doses: alphaRule.doses
        };
      } else {
        errors.push({
          raw_token: token,
          message: 'Suffix must contain only numbers or only letters.',
        });
        return;
      }
    } else {
      try {
        baseAmountValue = resolveAmount(groupRule);
      } catch (e: any) {
        errors.push({ raw_token: token, message: e.message });
        return;
      }
    }

    medicineMatches.forEach(match => {
      const medicineNo = Number(match[1]);
      const inlineAlphaCode = match[2] ? match[2].trim().toUpperCase() : null;
      const derivedToken = `${match[0]}${suffix ? `/${suffix}` : ''}`;

      if (!Number.isInteger(medicineNo) || medicineNo < 1 || medicineNo > 999) {
        errors.push({
          raw_token: derivedToken,
          message: `Medicine number ${medicineNo} must be between 1 and 999.`,
        });
        return;
      }

      const medicineValue = String(medicineNo);
      if (seenMedicineValues.has(medicineValue)) {
        errors.push({
          raw_token: derivedToken,
          message: `Duplicate medicine number ${medicineValue} is not allowed.`,
        });
        return;
      }
      seenMedicineValues.add(medicineValue);

      let rows = groupRule?.doses || [];
      let templateCode = groupRule?.template_code || null;
      let durationOverride = groupDurationOverrideDays;

      if (inlineAlphaCode) {
        const inlineRule = snapshot.alpha_codes?.[inlineAlphaCode];
        if (!inlineRule) {
          errors.push({
            raw_token: derivedToken,
            message: `Unknown inline alpha code: ${inlineAlphaCode} for medicine ${medicineNo}`
          });
          return;
        }
        rows = inlineRule.doses || [];
        templateCode = inlineRule.template_code || null;
        if (inlineRule.duration_override_days != null) {
          durationOverride = inlineRule.duration_override_days;
        }
      }

      if (!rows.length) {
        errors.push({
          raw_token: derivedToken,
          message: `Resolved dosage template has no usable rows for medicine ${medicineNo}.`,
        });
        return;
      }

      const mapped = doseRowsToSlotMap(rows);
      mapped.warnings.forEach((message) => {
        warnings.push({ raw_token: derivedToken, message: `Med ${medicineNo}: ${message}` });
      });

      entries.push({
        raw_token: derivedToken,
        name: medicineValue,
        baseAmount: Number(baseAmountValue),
        amount: toCurrencyAmount(baseAmountValue),
        doses: mapped.doses,
        dosage_template_code: templateCode,
        suffix_type: groupSuffixType,
        suffix_value: groupSuffixValue,
        duration_override_days: durationOverride,
        warnings: mapped.warnings,
      });
    });
  });

  return {
    input: source,
    tokens,
    entries,
    warnings,
    errors,
  };
};
