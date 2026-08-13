import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Beaker, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, HelpCircle, Info, Plus, RefreshCcw, Save, Settings2, SlidersHorizontal, Trash2, WandSparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '../../hooks/useApi';
import { useDoctorFormulaMaster } from '../../context/DoctorFormulaMasterContext';
import { useNotifications } from '../../context/NotificationContext';
import { parseDoctorFormulaInput, type DoctorFormulaSnapshot } from '../../utils/doctorFormulaParser';

type FormulaTemplateRow = {
  dose_label: string;
  sort_order: number;
  times_per_day: number;
  balls_per_dose: number;
  instructions: string;
};

type FormulaTemplate = {
  id?: number;
  template_code: string;
  template_name: string;
  is_default?: boolean;
  is_active?: boolean;
  rows: FormulaTemplateRow[];
};

type FormulaAlphaCode = {
  id?: number;
  code: string;
  description: string | null;
  fixed_amount: number | null | string;
  template_code: string;
  duration_override_days: number | null | string;
  is_active?: boolean;
};

type FormulaRule = {
  amount_strategy: 'FIXED' | 'MULTIPLY_SUFFIX' | 'SUFFIX_AS_PRICE';
  fixed_amount: number | null | string;
  multiplier_value: number | null | string;
  template_code: string;
  is_active?: boolean;
};

type FormulaSetDraft = {
  id?: number;
  set_name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  is_published: boolean;
  version_no?: number;
  templates: FormulaTemplate[];
  rules: {
    plain_number: FormulaRule;
    slash_single_numeric: FormulaRule;
    slash_double_numeric: FormulaRule;
    slash_price_numeric: FormulaRule;
  };
  alpha_codes: FormulaAlphaCode[];
};

const makeDefaultDraft = (): FormulaSetDraft => ({
  set_name: 'Default Quick Formula',
  description: 'Default numeric consultation quick-entry rules',
  is_default: true,
  is_active: true,
  is_published: true,
  templates: [
    {
      template_code: 'DEFAULT_444',
      template_name: 'Default 4-4-4',
      is_default: true,
      is_active: true,
      rows: [
        { dose_label: 'MORNING', sort_order: 1, times_per_day: 1, balls_per_dose: 4, instructions: '' },
        { dose_label: 'AFTERNOON', sort_order: 2, times_per_day: 1, balls_per_dose: 4, instructions: '' },
        { dose_label: 'NIGHT', sort_order: 3, times_per_day: 1, balls_per_dose: 4, instructions: '' },
      ],
    },
    {
      template_code: 'BD',
      template_name: 'Twice Daily',
      is_active: true,
      rows: [
        { dose_label: 'MORNING', sort_order: 1, times_per_day: 1, balls_per_dose: 4, instructions: '' },
        { dose_label: 'NIGHT', sort_order: 2, times_per_day: 1, balls_per_dose: 4, instructions: '' },
      ],
    },
  ],
  rules: {
    plain_number: { amount_strategy: 'FIXED', fixed_amount: 80, multiplier_value: null, template_code: 'DEFAULT_444', is_active: true },
    slash_single_numeric: { amount_strategy: 'MULTIPLY_SUFFIX', fixed_amount: null, multiplier_value: 100, template_code: 'DEFAULT_444', is_active: true },
    slash_double_numeric: { amount_strategy: 'MULTIPLY_SUFFIX', fixed_amount: null, multiplier_value: 10, template_code: 'DEFAULT_444', is_active: true },
    slash_price_numeric: { amount_strategy: 'SUFFIX_AS_PRICE', fixed_amount: null, multiplier_value: null, template_code: 'DEFAULT_444', is_active: true },
  },
  alpha_codes: [
    { code: 'BD', description: 'Twice daily', fixed_amount: 80, template_code: 'BD', duration_override_days: null, is_active: true },
  ],
});

const cloneDraft = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

type SelectOption = {
  id: string;
  label: string;
};

function CustomSelect({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white hover:border-gray-300 border rounded-xl h-9 px-3 text-xs font-bold text-gray-700 flex items-center justify-between transition-all outline-none text-left select-none cursor-pointer ${
          isOpen ? 'border-[#549E9E] ring-2 ring-[#549E9E]/10' : 'border-gray-200'
        }`}
      >
        <span className="truncate">{selected?.label || 'Select option'}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 text-gray-400 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[#549E9E]' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-lenis-prevent
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl z-[110] max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-light"
          >
            {options.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-lg px-3.5 py-2.5 transition-all flex items-center justify-between text-xs font-bold ${
                    isSelected
                      ? 'bg-[#549E9E]/10 text-[#549E9E]'
                      : 'text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} className="text-[#549E9E] shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const normalizeDraftFromApi = (detail: any): FormulaSetDraft => ({
  id: detail?.id,
  set_name: detail?.set_name || '',
  description: detail?.description || '',
  is_default: Boolean(detail?.is_default),
  is_active: Boolean(detail?.is_active),
  is_published: Boolean(detail?.is_published),
  version_no: Number(detail?.version_no || 1),
  templates: Array.isArray(detail?.templates) ? detail.templates.map((template: any) => ({
    id: template?.id,
    template_code: template?.template_code || '',
    template_name: template?.template_name || '',
    is_default: Boolean(template?.is_default),
    is_active: template?.is_active !== 0,
    rows: Array.isArray(template?.rows) ? template.rows.map((row: any) => ({
      dose_label: row?.dose_label || 'MORNING',
      sort_order: Number(row?.sort_order || 1),
      times_per_day: Number(row?.times_per_day || 1),
      balls_per_dose: Number(row?.balls_per_dose || 4),
      instructions: row?.instructions || '',
    })) : [],
  })) : [],
  rules: {
    plain_number: {
      amount_strategy: detail?.rules?.plain_number?.amount_strategy || 'FIXED',
      fixed_amount: detail?.rules?.plain_number?.fixed_amount,
      multiplier_value: detail?.rules?.plain_number?.multiplier_value,
      template_code: detail?.rules?.plain_number?.template_code || '',
      is_active: detail?.rules?.plain_number?.is_active !== 0,
    },
    slash_single_numeric: {
      amount_strategy: detail?.rules?.slash_single_numeric?.amount_strategy || 'MULTIPLY_SUFFIX',
      fixed_amount: detail?.rules?.slash_single_numeric?.fixed_amount,
      multiplier_value: detail?.rules?.slash_single_numeric?.multiplier_value,
      template_code: detail?.rules?.slash_single_numeric?.template_code || '',
      is_active: detail?.rules?.slash_single_numeric?.is_active !== 0,
    },
    slash_double_numeric: {
      amount_strategy: detail?.rules?.slash_double_numeric?.amount_strategy || 'MULTIPLY_SUFFIX',
      fixed_amount: detail?.rules?.slash_double_numeric?.fixed_amount,
      multiplier_value: detail?.rules?.slash_double_numeric?.multiplier_value,
      template_code: detail?.rules?.slash_double_numeric?.template_code || '',
      is_active: detail?.rules?.slash_double_numeric?.is_active !== 0,
    },
    slash_price_numeric: {
      amount_strategy: detail?.rules?.slash_price_numeric?.amount_strategy || 'SUFFIX_AS_PRICE',
      fixed_amount: detail?.rules?.slash_price_numeric?.fixed_amount,
      multiplier_value: detail?.rules?.slash_price_numeric?.multiplier_value,
      template_code: detail?.rules?.slash_price_numeric?.template_code || detail?.rules?.plain_number?.template_code || 'DEFAULT_444',
      is_active: detail?.rules?.slash_price_numeric?.is_active !== 0,
    },
  },
  alpha_codes: Array.isArray(detail?.alpha_codes) ? detail.alpha_codes.map((code: any) => ({
    id: code?.id,
    code: code?.code || '',
    description: code?.description || '',
    fixed_amount: code?.fixed_amount,
    template_code: code?.template_code || '',
    duration_override_days: code?.duration_override_days,
    is_active: code?.is_active !== 0,
  })) : [],
});

const buildSnapshotFromDraft = (draft: FormulaSetDraft | null): DoctorFormulaSnapshot | null => {
  if (!draft) return null;
  const templates = draft.templates.map((template) => ({
    template_code: String(template.template_code || '').toUpperCase(),
    template_name: template.template_name,
    rows: (template.rows || []).map((row) => ({
      dose_label: String(row.dose_label || '').toUpperCase(),
      sort_order: Number(row.sort_order) || 1,
      times_per_day: Number(row.times_per_day) || 1,
      balls_per_dose: Number(row.balls_per_dose) || 0,
      instructions: row.instructions || '',
    })),
  }));

  const templateMap = new Map(templates.map((template) => [template.template_code, template]));
  const makeRule = (rule: FormulaRule) => ({
    amount_strategy: rule.amount_strategy,
    fixed_amount: rule.fixed_amount === '' || rule.fixed_amount === null ? null : Number(rule.fixed_amount),
    multiplier_value: rule.multiplier_value === '' || rule.multiplier_value === null ? null : Number(rule.multiplier_value),
    template_code: String(rule.template_code || '').toUpperCase(),
    doses: cloneDraft(templateMap.get(String(rule.template_code || '').toUpperCase())?.rows || []),
  });

  const alphaCodes = draft.alpha_codes.reduce<Record<string, any>>((acc, code) => {
    const normalizedCode = String(code.code || '').toUpperCase().trim();
    if (!normalizedCode) return acc;
    acc[normalizedCode] = {
      code: normalizedCode,
      description: code.description || null,
      fixed_amount: code.fixed_amount === '' || code.fixed_amount === null ? null : Number(code.fixed_amount),
      template_code: String(code.template_code || '').toUpperCase(),
      duration_override_days: code.duration_override_days === '' || code.duration_override_days === null ? null : Number(code.duration_override_days),
      doses: cloneDraft(templateMap.get(String(code.template_code || '').toUpperCase())?.rows || []),
    };
    return acc;
  }, {});

  return {
    set_id: Number(draft.id || 0),
    set_name: draft.set_name,
    version_no: Number(draft.version_no || 1),
    updated_at: new Date().toISOString(),
    rules: {
      plain_number: makeRule(draft.rules.plain_number),
      slash_single_numeric: makeRule(draft.rules.slash_single_numeric),
      slash_double_numeric: makeRule(draft.rules.slash_double_numeric),
      slash_price_numeric: makeRule(draft.rules.slash_price_numeric),
    },
    alpha_codes: alphaCodes,
    templates,
  };
};

export default function DoctorFormulaMasterPage() {
  const { t } = useTranslation();
  const apiFetch = useApi();
  const { addToast } = useNotifications();
  const { snapshot, refreshFormulaMaster, applyFormulaSnapshot } = useDoctorFormulaMaster();
  const [sets, setSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FormulaSetDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewInput, setPreviewInput] = useState('30, 200/2, 84/20, 10/BD');
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [helpModalKey, setHelpModalKey] = useState<'basics' | 'numeric' | 'templates' | 'alpha' | null>(null);

  const helpData = {
    basics: {
      title: t('formula_master.help_basics_title', 'Set Basics — Explanation'),
      description: t('formula_master.help_basics_desc', 'Formula sets define the master rules for parsing doctor notes and quick entries during patient consultations.'),
      items: [
        {
          title: t('formula_master.help_basics_name_title', 'Set Name & Description'),
          detail: t('formula_master.help_basics_name_detail', 'Name your formula set (e.g. "Default Quick Formula") to organize different pricing or dosage rules for your clinic.'),
        },
        {
          title: t('formula_master.help_basics_active_title', 'Active Status'),
          detail: t('formula_master.help_basics_active_detail', 'Enables this formula set for active consultation note parsing.'),
        },
        {
          title: t('formula_master.help_basics_default_title', 'Default Set'),
          detail: t('formula_master.help_basics_default_detail', 'Marks this formula set as the primary fallback ruleset for all doctor consultations.'),
        },
        {
          title: t('formula_master.help_basics_published_title', 'Published'),
          detail: t('formula_master.help_basics_published_detail', 'Publishes the formula set so it is available live during patient visits.'),
        },
      ],
    },
    numeric: {
      title: t('formula_master.help_numeric_title', 'Core Numeric Rules — Explanation'),
      description: t('formula_master.help_numeric_desc', 'These rules control how numbers typed in the doctor\'s consultation form (e.g., 30, 200/2, 84/20) are automatically converted into medicine charges and dosage schedules.'),
      items: [
        {
          title: t('formula_master.help_numeric_plain_title', '1. Plain Number (e.g. "30")'),
          detail: t('formula_master.help_numeric_plain_detail', 'Used when a doctor types a single standalone number (like "30"). The system recognizes it as Medicine Code 30, sets a flat price (e.g. ₹80), and attaches the default 4-4-4 dosage schedule.'),
        },
        {
          title: t('formula_master.help_numeric_single_title', '2. / + Single Digit (e.g. "200/2")'),
          detail: t('formula_master.help_numeric_single_detail', 'Used when typing a number with a 1-digit slash suffix (like "200/2"). Here, "200" is the medicine code and "2" is the duration multiplier (e.g., 2 weeks). Total Price = Suffix (2) × Multiplier (₹100) = ₹200.'),
        },
        {
          title: t('formula_master.help_numeric_double_title', '3. / + Two Digits (e.g. "84/20")'),
          detail: t('formula_master.help_numeric_double_detail', 'Used when typing a number with a 2-digit slash suffix (like "84/20"). "84" is the medicine code and "20" is the quantity. Total Price = Suffix (20) × Multiplier (₹10) = ₹200.'),
        },
        {
          title: t('formula_master.help_numeric_price_title', '4. / + Three or More Digits (e.g. "5, 4, 6, /789")'),
          detail: t('formula_master.help_numeric_price_detail', 'Used when the slash suffix has 3 or more digits. The suffix is treated as the total prescription price in rupees and split equally across all medicines before the slash. Example: 5, 4, 6, /789 → total ₹789, split across 3 medicines.'),
        },
      ],
    },
    templates: {
      title: t('formula_master.help_templates_title', 'Dosage Templates — Explanation'),
      description: t('formula_master.help_templates_desc', 'Dosage templates define how medicine doses are distributed throughout the day (Morning, Afternoon, Night) and what instructions to give the patient.'),
      items: [
        {
          title: t('formula_master.help_templates_code_title', 'Template Code (e.g. DEFAULT_444, BD)'),
          detail: t('formula_master.help_templates_code_detail', 'A short unique code used by rules and alpha codes to apply this exact dosage schedule.'),
        },
        {
          title: t('formula_master.help_templates_dose_title', 'Dose Label (MORNING / AFTERNOON / NIGHT)'),
          detail: t('formula_master.help_templates_dose_detail', 'Defines the time of day the patient should take the medication.'),
        },
        {
          title: t('formula_master.help_templates_balls_title', 'Balls / Dose'),
          detail: t('formula_master.help_templates_balls_detail', 'The number of homeopathic pills or globules to take in each single dose (e.g., 4 balls).'),
        },
        {
          title: t('formula_master.help_templates_instructions_title', 'Instructions'),
          detail: t('formula_master.help_templates_instructions_detail', 'Optional directions printed on the prescription (e.g., "Empty stomach" or "After meals").'),
        },
      ],
    },
    alpha: {
      title: t('formula_master.help_alpha_title', 'Alpha Shortcodes — Explanation'),
      description: t('formula_master.help_alpha_desc', 'Alpha shortcodes are medical abbreviations (like BD, TDS, QID) typed in the consultation form to quickly set pricing, duration, and dosage.'),
      items: [
        {
          title: t('formula_master.help_alpha_code_title', 'Code (e.g. BD, TDS)'),
          detail: t('formula_master.help_alpha_code_detail', 'The quick text abbreviation typed by the doctor during consultation (e.g., "10/BD").'),
        },
        {
          title: t('formula_master.help_alpha_price_title', 'Price (₹)'),
          detail: t('formula_master.help_alpha_price_detail', 'Fixed price automatically applied to the prescription when this alpha code is typed.'),
        },
        {
          title: t('formula_master.help_alpha_template_title', 'Dosage Template'),
          detail: t('formula_master.help_alpha_template_detail', 'Maps the alpha code directly to its timing template (e.g. BD → Morning & Night).'),
        },
        {
          title: t('formula_master.help_alpha_days_title', 'Days Override'),
          detail: t('formula_master.help_alpha_days_detail', 'Customizes or overrides the total prescription duration in days when this code is used.'),
        },
      ],
    },
  };

  const loadSetDetail = async (setId: number) => {
    const result = await apiFetch(`/api/v1/doctors/formula-master/${setId}`);
    if (!result?.success) {
      addToast(result?.message || 'Failed to load formula set', 'error');
      return;
    }
    setDraft(normalizeDraftFromApi(result.data));
    setSelectedSetId(setId);
  };

  const loadSets = async () => {
    setIsLoading(true);
    const result = await apiFetch('/api/v1/doctors/formula-master');
    if (!result?.success) {
      addToast(result?.message || 'Failed to load formula master list', 'error');
      setIsLoading(false);
      return;
    }

    const nextSets = Array.isArray(result.data?.sets) ? result.data.sets : [];
    setSets(nextSets);
    const activeSetId = result.data?.active_set_id || nextSets[0]?.id || null;
    if (activeSetId) {
      await loadSetDetail(Number(activeSetId));
    } else {
      setDraft(makeDefaultDraft());
      setSelectedSetId(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadSets();
  }, []);

  const previewResult = useMemo(() => parseDoctorFormulaInput(previewInput, buildSnapshotFromDraft(draft)), [draft, previewInput]);

  const templateOptions = useMemo(() => (draft?.templates || []).map((template) => ({
    label: `${template.template_code} • ${template.template_name}`,
    value: template.template_code,
  })), [draft?.templates]);

  const updateRule = (ruleKey: keyof FormulaSetDraft['rules'], field: keyof FormulaRule, value: any) => {
    setDraft((prev) => prev ? ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleKey]: {
          ...prev.rules[ruleKey],
          [field]: value,
        },
      },
    }) : prev);
  };

  const updateTemplate = (index: number, field: keyof FormulaTemplate, value: any) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const templates = [...prev.templates];
      templates[index] = { ...templates[index], [field]: value };
      return { ...prev, templates };
    });
  };

  const updateTemplateRow = (templateIndex: number, rowIndex: number, field: keyof FormulaTemplateRow, value: any) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const templates = [...prev.templates];
      const rows = [...templates[templateIndex].rows];
      rows[rowIndex] = { ...rows[rowIndex], [field]: value };
      templates[templateIndex] = { ...templates[templateIndex], rows };
      return { ...prev, templates };
    });
  };

  const addTemplate = () => {
    setDraft((prev) => prev ? ({
      ...prev,
      templates: [
        ...prev.templates,
        {
          template_code: `NEW_${prev.templates.length + 1}`,
          template_name: 'New Template',
          is_active: true,
          rows: [{ dose_label: 'MORNING', sort_order: 1, times_per_day: 1, balls_per_dose: 4, instructions: '' }],
        },
      ],
    }) : prev);
  };

  const addTemplateRow = (templateIndex: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const templates = [...prev.templates];
      const nextRows = [
        ...templates[templateIndex].rows,
        { dose_label: 'MORNING', sort_order: templates[templateIndex].rows.length + 1, times_per_day: 1, balls_per_dose: 4, instructions: '' },
      ];
      templates[templateIndex] = { ...templates[templateIndex], rows: nextRows };
      return { ...prev, templates };
    });
  };

  const removeTemplateRow = (templateIndex: number, rowIndex: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const templates = [...prev.templates];
      const targetRows = templates[templateIndex].rows;
      if (targetRows.length <= 1) return prev;
      const nextRows = targetRows.filter((_, idx) => idx !== rowIndex);
      templates[templateIndex] = { ...templates[templateIndex], rows: nextRows };
      return { ...prev, templates };
    });
  };

  const removeTemplate = (templateIndex: number) => {
    setDraft((prev) => {
      if (!prev || prev.templates.length <= 1) return prev;
      const templateCode = prev.templates[templateIndex].template_code;
      const templates = prev.templates.filter((_, idx) => idx !== templateIndex);
      const alphaCodes = prev.alpha_codes.filter((code) => code.template_code !== templateCode);
      const nextDraft = { ...prev, templates, alpha_codes: alphaCodes };

      (['plain_number', 'slash_single_numeric', 'slash_double_numeric', 'slash_price_numeric'] as Array<keyof FormulaSetDraft['rules']>).forEach((ruleKey) => {
        if (nextDraft.rules[ruleKey].template_code === templateCode) {
          nextDraft.rules[ruleKey].template_code = templates[0]?.template_code || '';
        }
      });

      return nextDraft;
    });
  };

  const addAlphaCode = () => {
    setDraft((prev) => prev ? ({
      ...prev,
      alpha_codes: [
        ...prev.alpha_codes,
        {
          code: '',
          description: '',
          fixed_amount: 80,
          template_code: prev.templates[0]?.template_code || '',
          duration_override_days: null,
          is_active: true,
        },
      ],
    }) : prev);
  };

  const updateAlphaCode = (index: number, field: keyof FormulaAlphaCode, value: any) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const alphaCodes = [...prev.alpha_codes];
      alphaCodes[index] = { ...alphaCodes[index], [field]: value };
      return { ...prev, alpha_codes: alphaCodes };
    });
  };

  const removeAlphaCode = (index: number) => {
    setDraft((prev) => prev ? ({
      ...prev,
      alpha_codes: prev.alpha_codes.filter((_, idx) => idx !== index),
    }) : prev);
  };

  const handleCreateNew = () => {
    setSelectedSetId(null);
    setDraft(makeDefaultDraft());
  };

  const handleDuplicate = () => {
    if (!draft) return;
    const cloned = cloneDraft(draft);
    delete cloned.id;
    cloned.version_no = 1;
    cloned.set_name = `${cloned.set_name} Copy`;
    cloned.is_active = false;
    setSelectedSetId(null);
    setDraft(cloned);
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    const endpoint = draft.id ? `/api/v1/doctors/formula-master/${draft.id}` : '/api/v1/doctors/formula-master';
    const method = draft.id ? 'PUT' : 'POST';
    const result = await apiFetch(endpoint, { method, body: draft });
    setIsSaving(false);

    if (!result?.success) {
      addToast(result?.message || 'Failed to save formula set', 'error');
      return;
    }

    const nextSnapshot = result.data?.snapshot || null;
    if (nextSnapshot) {
      applyFormulaSnapshot(nextSnapshot);
    }
    await refreshFormulaMaster();
    await loadSets();
    addToast(draft.id ? 'Formula set updated successfully' : 'Formula set created successfully', 'success');
  };

  const handleActivate = async () => {
    if (!draft?.id) return;
    const result = await apiFetch(`/api/v1/doctors/formula-master/${draft.id}/activate`, { method: 'POST' });
    if (!result?.success) {
      addToast(result?.message || 'Failed to activate formula set', 'error');
      return;
    }
    if (result.data?.snapshot) {
      applyFormulaSnapshot(result.data.snapshot);
    }
    await refreshFormulaMaster();
    await loadSets();
    addToast('Formula set activated', 'success');
  };

  const handleDelete = async () => {
    if (!draft?.id) return;
    const confirmed = window.confirm(`Delete formula set "${draft.set_name}"?`);
    if (!confirmed) return;

    const result = await apiFetch(`/api/v1/doctors/formula-master/${draft.id}`, { method: 'DELETE' });
    if (!result?.success) {
      addToast(result?.message || 'Failed to delete formula set', 'error');
      return;
    }

    await refreshFormulaMaster();
    await loadSets();
    addToast('Formula set deleted', 'success');
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex items-center justify-center gap-3 text-[#549E9E]">
        <RefreshCcw className="animate-spin" size={18} />
        <span className="font-black uppercase tracking-widest text-sm">{t('formula_master.loading', 'Loading Formula Master...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#549E9E]/15 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#549E9E]">{t('formula_master.doctor_menu', 'Doctor Menu')}</p>
          <h2 className="text-2xl font-black text-gray-800 mt-2">{t('formula_master.title', 'Quick Prescription Formula Master')}</h2>
          <p className="text-sm text-gray-500 mt-2">{t('formula_master.subtitle', 'Login session me loaded formula rules yahin manage honge. Save/activate ke baad current session bhi turant update ho jayega.')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleCreateNew} className="px-4 py-3 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <Plus size={14} /> {t('formula_master.new_set', 'New Set')}
          </button>
          <button onClick={handleDuplicate} disabled={!draft} className="px-4 py-3 rounded-xl bg-amber-50 text-amber-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            <Copy size={14} /> {t('formula_master.duplicate', 'Duplicate')}
          </button>
          <button onClick={() => void loadSets()} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <RefreshCcw size={14} /> {t('formula_master.reload', 'Reload')}
          </button>
        </div>
      </div>

      {/* Top Combined Bar: Available Sets & Session Snapshot (Single Line) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Available Sets */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200 shrink-0">
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">{t('formula_master.available_sets', 'Available Sets')}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#549E9E]/10 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">{sets.length} {t('formula_master.total', 'total')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sets.map((set) => (
              <button
                key={set.id}
                type="button"
                onClick={() => void loadSetDetail(Number(set.id))}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${Number(selectedSetId) === Number(set.id) ? 'border-[#549E9E] bg-[#549E9E]/10 text-[#549E9E]' : 'border-gray-200 hover:border-[#549E9E]/30 bg-gray-50 text-gray-700'}`}
              >
                <span>{set.set_name}</span>
                <span className="text-[9px] font-black uppercase text-gray-400">v{set.version_no || 1}</span>
                {Number(set.is_active) === 1 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase">{t('formula_master.active', 'Active')}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Session Snapshot */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs bg-gray-50/80 px-3.5 py-2 rounded-xl border border-gray-200/80 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('formula_master.current_session_snapshot', 'Snapshot')}:</span>
          <span className="font-black text-gray-800">{snapshot?.set_name || '—'}</span>
          <span className="text-gray-300">•</span>
          <span className="font-bold text-gray-600">v{snapshot?.version_no || '—'}</span>
          <span className="text-gray-300">•</span>
          <span className="text-[10px] text-gray-500 font-medium">{snapshot?.updated_at ? new Date(snapshot.updated_at).toLocaleString() : '—'}</span>
        </div>
      </div>

      <div className="space-y-6">
          {draft && (
            <>
              {/* Set Basics Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#549E9E]">
                      {t('formula_master.set_basics', 'Set Basics')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHelpModalKey('basics')}
                      className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={t('formula_master.help_tooltip', 'Click for explanation')}
                    >
                      <Info size={12} />
                    </button>
                    <span className="text-gray-300">•</span>
                    <h3 className="text-sm font-black text-gray-800">
                      {draft.id ? t('formula_master.edit_formula_set', 'Edit Formula Set') : t('formula_master.create_formula_set', 'Create Formula Set')}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    {/* Set Name Input */}
                    <input
                      value={draft.set_name}
                      onChange={(e) => setDraft({ ...draft, set_name: e.target.value })}
                      className="h-10 px-3 min-w-[200px] flex-1 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-700 outline-none focus:border-[#549E9E]"
                      placeholder={t('formula_master.set_name_placeholder', 'Set Name')}
                    />

                    {/* Description Input */}
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="h-10 px-3 min-w-[240px] flex-[1.5] bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-700 outline-none focus:border-[#549E9E]"
                      placeholder={t('formula_master.description_placeholder', 'Description')}
                    />

                    {/* Checkboxes Inline */}
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider text-gray-600 px-2 border-l border-gray-200 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="accent-[#549E9E]" />
                        <span>{t('formula_master.active', 'Active')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} className="accent-[#549E9E]" />
                        <span>{t('formula_master.default', 'Default')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} className="accent-[#549E9E]" />
                        <span>{t('formula_master.published', 'Published')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {draft.id && (
                      <button onClick={handleActivate} className="h-10 px-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                        <CheckCircle2 size={14} /> {t('formula_master.activate', 'Activate')}
                      </button>
                    )}
                    {draft.id && (
                      <button onClick={handleDelete} className="h-10 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                        <Trash2 size={14} /> {t('formula_master.delete', 'Delete')}
                      </button>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="h-10 px-4 rounded-xl bg-[#549E9E] text-white text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
                      {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} {t('formula_master.save', 'Save')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Core Numeric Rules (3 Cards in 1 Row) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[#549E9E]">
                  <Settings2 size={16} />
                  <p className="text-xs font-black uppercase tracking-widest">{t('formula_master.core_numeric_rules', 'Core Numeric Rules')}</p>
                  <button
                    type="button"
                    onClick={() => setHelpModalKey('numeric')}
                    className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={t('formula_master.help_tooltip', 'Click for explanation')}
                  >
                    <Info size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  {([
                    { key: 'plain_number', label: t('formula_master.plain_number', 'Plain Number'), hint: t('formula_master.plain_number_hint', 'Example: 30') },
                    { key: 'slash_single_numeric', label: t('formula_master.slash_single_numeric', '/ + Single Digit'), hint: t('formula_master.slash_single_numeric_hint', 'Example: 200/2') },
                    { key: 'slash_double_numeric', label: t('formula_master.slash_double_numeric', '/ + Two Digits'), hint: t('formula_master.slash_double_numeric_hint', 'Example: 84/20') },
                    { key: 'slash_price_numeric', label: t('formula_master.slash_price_numeric', '/ + 3+ Digits (Price)'), hint: t('formula_master.slash_price_numeric_hint', 'Example: 5, 4, 6, /789') },
                  ] as const).map((ruleEntry) => {
                    const rule = draft.rules[ruleEntry.key];
                    const isFixed = rule.amount_strategy === 'FIXED';
                    const isSuffixAsPrice = rule.amount_strategy === 'SUFFIX_AS_PRICE';

                    return (
                      <div key={ruleEntry.key} className="border border-gray-200/80 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3">
                        {/* Header: Title & Hint */}
                        <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                          <p className="text-sm font-black text-gray-800">{ruleEntry.label}</p>
                          <span className="px-2 py-0.5 rounded-md bg-[#549E9E]/10 text-[9px] font-black uppercase tracking-wider text-[#549E9E]">
                            {ruleEntry.hint}
                          </span>
                        </div>

                        {isSuffixAsPrice ? (
                          <div className="rounded-xl border border-[#549E9E]/20 bg-[#549E9E]/5 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-[#2d8789]">
                            {t(
                              'formula_master.suffix_as_price_help',
                              'Digits after / are used as the total prescription price and split equally across all medicines before the slash.',
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Strategy Selector */}
                            <CustomSelect
                              label={t('formula_master.strategy', 'Strategy')}
                              options={[
                                { id: 'FIXED', label: t('formula_master.strategy_fixed', 'Flat Price (FIXED)') },
                                { id: 'MULTIPLY_SUFFIX', label: t('formula_master.strategy_multiply_suffix', 'Multiply Suffix (×)') },
                              ]}
                              value={rule.amount_strategy}
                              onChange={(val) => updateRule(ruleEntry.key, 'amount_strategy', val)}
                              className="w-full"
                            />

                            {/* Amount or Multiplier */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {isFixed ? t('formula_master.flat_amount', 'Flat Amount') : t('formula_master.multiplier', 'Multiplier')}
                              </label>
                              {isFixed ? (
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                  <input
                                    type="number"
                                    value={rule.fixed_amount ?? ''}
                                    onChange={(e) => updateRule(ruleEntry.key, 'fixed_amount', e.target.value)}
                                    className="w-full h-9 pl-7 pr-3 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                                    placeholder="80.00"
                                  />
                                </div>
                              ) : (
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">×</span>
                                  <input
                                    type="number"
                                    value={rule.multiplier_value ?? ''}
                                    onChange={(e) => updateRule(ruleEntry.key, 'multiplier_value', e.target.value)}
                                    className="w-full h-9 pl-7 pr-3 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                                    placeholder="100.00"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* Template Selector */}
                        <CustomSelect
                          label={t('formula_master.dosage_template', 'Dosage Template')}
                          options={templateOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
                          value={rule.template_code}
                          onChange={(val) => updateRule(ruleEntry.key, 'template_code', val)}
                          className="w-full"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dosage Templates Card (Responsive Multi-Card Grid Row) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-[#549E9E]">
                    <Beaker size={16} />
                    <p className="text-xs font-black uppercase tracking-widest">{t('formula_master.dosage_templates', 'Dosage Templates')}</p>
                    <button
                      type="button"
                      onClick={() => setHelpModalKey('templates')}
                      className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={t('formula_master.help_tooltip', 'Click for explanation')}
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <button onClick={addTemplate} className="h-9 px-3 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer hover:bg-[#549E9E]/20">
                    <Plus size={14} /> {t('formula_master.add_template', 'Add Template')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {draft.templates.map((template, templateIndex) => (
                    <div key={`${template.template_code}-${templateIndex}`} className="border border-gray-200/80 rounded-xl p-3.5 bg-gray-50/40 flex flex-col justify-between gap-3">
                      <div className="space-y-3">
                        {/* Card Header: Code, Name, Remove */}
                        <div className="flex items-center gap-2 border-b border-gray-200/60 pb-2">
                          <input
                            value={template.template_code}
                            onChange={(e) => updateTemplate(templateIndex, 'template_code', e.target.value.toUpperCase())}
                            className="h-9 px-2.5 w-28 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                            placeholder={t('formula_master.template_code', 'Code')}
                          />
                          <input
                            value={template.template_name}
                            onChange={(e) => updateTemplate(templateIndex, 'template_name', e.target.value)}
                            className="h-9 px-2.5 flex-1 min-w-0 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                            placeholder={t('formula_master.template_name', 'Template Name')}
                          />
                          <button
                            onClick={() => removeTemplate(templateIndex)}
                            className="h-9 w-9 shrink-0 rounded-xl bg-red-50 text-red-600 flex items-center justify-center cursor-pointer hover:bg-red-100"
                            title={t('formula_master.remove', 'Remove')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Dose Rows */}
                        <div className="space-y-2">
                          {template.rows.map((row, rowIndex) => (
                            <div key={`${template.template_code}-row-${rowIndex}`} className="flex items-center gap-1.5">
                              <input
                                value={row.dose_label}
                                onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'dose_label', e.target.value.toUpperCase())}
                                className="h-8 px-2 w-24 shrink-0 bg-white border border-gray-200 rounded-lg font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                                placeholder={t('formula_master.dose_label', 'Dose Label')}
                              />
                              <input
                                type="number"
                                value={row.balls_per_dose}
                                onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'balls_per_dose', e.target.value)}
                                className="h-8 px-2 w-14 shrink-0 bg-white border border-gray-200 rounded-lg font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                                placeholder={t('formula_master.balls_per_dose', 'Balls')}
                              />
                              <input
                                value={row.instructions}
                                onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'instructions', e.target.value)}
                                className="h-8 px-2 flex-1 min-w-0 bg-white border border-gray-200 rounded-lg font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                                placeholder={t('formula_master.instructions', 'Instructions')}
                              />
                              {template.rows.length > 1 && (
                                <button
                                  onClick={() => removeTemplateRow(templateIndex, rowIndex)}
                                  className="h-8 w-8 shrink-0 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center cursor-pointer"
                                  title={t('formula_master.delete_dose_row', 'Delete Dose Row')}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add Dose Row Button */}
                      <button onClick={() => addTemplateRow(templateIndex)} className="h-8 px-3 w-full rounded-lg bg-white border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 mt-1">
                        <Plus size={13} /> {t('formula_master.add_dose_row', 'Add Dose Row')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alpha Codes Card (Responsive 3-Column Grid Row) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-[#549E9E]">
                    <WandSparkles size={16} />
                    <p className="text-xs font-black uppercase tracking-widest">{t('formula_master.alpha_codes', 'Alpha Codes')}</p>
                    <button
                      type="button"
                      onClick={() => setHelpModalKey('alpha')}
                      className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={t('formula_master.help_tooltip', 'Click for explanation')}
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <button onClick={addAlphaCode} className="h-9 px-3 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer hover:bg-[#549E9E]/20">
                    <Plus size={14} /> {t('formula_master.add_code', 'Add Code')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {draft.alpha_codes.map((code, index) => (
                    <div key={`${code.code || 'new'}-${index}`} className="border border-gray-200/80 rounded-xl p-3.5 bg-gray-50/40 flex flex-col gap-3">
                      {/* Card Header: Code & Description & Remove */}
                      <div className="flex items-center gap-2 border-b border-gray-200/60 pb-2">
                        <input
                          value={code.code}
                          onChange={(e) => updateAlphaCode(index, 'code', e.target.value.toUpperCase())}
                          className="h-9 px-2.5 w-24 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                          placeholder={t('formula_master.code', 'Code')}
                        />
                        <input
                          value={code.description || ''}
                          onChange={(e) => updateAlphaCode(index, 'description', e.target.value)}
                          className="h-9 px-2.5 flex-1 min-w-0 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                          placeholder={t('formula_master.description', 'Description')}
                        />
                        <button
                          onClick={() => removeAlphaCode(index)}
                          className="h-9 w-9 shrink-0 rounded-xl bg-red-50 text-red-600 flex items-center justify-center cursor-pointer hover:bg-red-100"
                          title={t('formula_master.remove_code', 'Remove Code')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Card Inputs Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Fixed Price */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {t('formula_master.price_label', 'Price (₹)')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              value={code.fixed_amount ?? ''}
                              onChange={(e) => updateAlphaCode(index, 'fixed_amount', e.target.value)}
                              className="w-full h-8 pl-6 pr-2 bg-white border border-gray-200 rounded-lg font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                              placeholder={t('formula_master.price_placeholder', 'Price')}
                            />
                          </div>
                        </div>

                        {/* Duration Override */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {t('formula_master.days_override', 'Days Override')}
                          </label>
                          <input
                            type="number"
                            value={code.duration_override_days ?? ''}
                            onChange={(e) => updateAlphaCode(index, 'duration_override_days', e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-gray-200 rounded-lg font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E]"
                            placeholder={t('formula_master.days_placeholder', 'Days')}
                          />
                        </div>
                      </div>

                      {/* Template Selector */}
                      <CustomSelect
                        label={t('formula_master.dosage_template', 'Dosage Template')}
                        options={templateOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
                        value={code.template_code}
                        onChange={(val) => updateAlphaCode(index, 'template_code', val)}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}
        </div>

      {/* Floating Preview Sandbox Drawer Widget */}
      {draft && (
        <div className="fixed bottom-6 right-6 z-40">
          {!isSandboxOpen ? (
            /* Collapsed Floating Pill Button */
            <button
              onClick={() => setIsSandboxOpen(true)}
              className="h-12 px-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#549E9E]/30 shadow-2xl text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all duration-200 flex items-center gap-2.5 font-black text-xs uppercase tracking-wider cursor-pointer group hover:scale-105 active:scale-95"
              title={t('formula_master.preview_sandbox', 'Preview Sandbox')}
            >
              <Beaker size={18} className="group-hover:rotate-12 transition-transform" />
              <span>{t('formula_master.preview_sandbox', 'Preview Sandbox')}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#549E9E]/10 group-hover:bg-white/20 text-[10px] font-bold">
                {previewResult.entries.length} {t('formula_master.parsed', 'Parsed')}
              </span>
            </button>
          ) : (
            /* Expanded Floating Inspector Card */
            <div className="w-96 md:w-[440px] max-h-[85vh] bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 shadow-2xl p-4 flex flex-col gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2 text-[#549E9E]">
                  <Beaker size={18} />
                  <p className="text-xs font-black uppercase tracking-widest">{t('formula_master.preview_sandbox', 'Preview Sandbox')}</p>
                  <span className="px-2 py-0.5 rounded-full bg-[#549E9E]/10 text-[10px] font-bold text-[#549E9E]">
                    {previewResult.entries.length} {t('formula_master.parsed', 'Parsed')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsSandboxOpen(false)}
                    className="w-7 h-7 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                    title="Minimize"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              {/* Input Box & Quick Samples */}
              <div className="space-y-2">
                <textarea
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:border-[#549E9E] resize-none"
                  placeholder="Test inputs e.g.: 30, 200/2, 84/20, 5, 4, 6, /789"
                />

                {/* Quick Sample Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                  <span className="text-gray-400 shrink-0 uppercase tracking-wider">Test:</span>
                  {[
                    { label: '30', val: '30' },
                    { label: '200/2', val: '200/2' },
                    { label: '84/20', val: '84/20' },
                    { label: '5,4,6,/789', val: '5, 4, 6, /789' },
                    { label: '10/BD', val: '10/BD' },
                    { label: 'All Combo', val: '30, 200/2, 84/20, 10/BD' },
                  ].map((sample) => (
                    <button
                      key={sample.label}
                      onClick={() => setPreviewInput(sample.val)}
                      className="px-2 py-1 rounded-md bg-gray-100 hover:bg-[#549E9E]/10 hover:text-[#549E9E] text-gray-600 shrink-0 cursor-pointer transition-colors"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Container (Scrollable) */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {/* Parsed Entries */}
                <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-2.5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center justify-between">
                    <span>{t('formula_master.parsed_entries', 'Parsed Entries')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 text-[9px]">{previewResult.entries.length}</span>
                  </p>
                  <div className="space-y-1.5">
                    {previewResult.entries.length === 0 && (
                      <p className="text-xs font-bold text-gray-400">{t('formula_master.no_entries', 'No valid entries parsed yet.')}</p>
                    )}
                    {previewResult.entries.map((entry) => (
                      <div key={entry.raw_token} className="bg-white border border-emerald-100 rounded-lg p-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-gray-800">{entry.raw_token} → Medicine {entry.name}</p>
                          <span className="text-xs font-black text-emerald-600">₹{entry.amount}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">Template: {entry.dosage_template_code || '—'} • M/A/N: {entry.doses.morning}/{entry.doses.afternoon}/{entry.doses.night}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings / Errors */}
                <div className="border border-red-100 bg-red-50/40 rounded-xl p-2.5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center justify-between">
                    <span>{t('formula_master.warnings_errors', 'Warnings / Errors')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-200/60 text-red-800 text-[9px]">
                      {previewResult.errors.length + previewResult.warnings.length}
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    {previewResult.errors.length === 0 && previewResult.warnings.length === 0 && (
                      <p className="text-xs font-bold text-gray-400">{t('formula_master.no_issues', 'No parser issues.')}</p>
                    )}
                    {previewResult.errors.map((item, idx) => (
                      <div key={`error-${idx}`} className="bg-white border border-red-100 rounded-lg p-2 text-xs font-bold text-red-600 shadow-2xs">
                        {item.raw_token}: {item.message}
                      </div>
                    ))}
                    {previewResult.warnings.map((item, idx) => (
                      <div key={`warning-${idx}`} className="bg-white border border-amber-100 rounded-lg p-2 text-xs font-bold text-amber-600 shadow-2xs">
                        {item.raw_token}: {item.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explanation Info Modal */}
      {helpModalKey && helpData[helpModalKey] && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-gray-100 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#549E9E]">
                <HelpCircle size={20} />
                <h3 className="text-base font-black text-gray-800">{helpData[helpModalKey].title}</h3>
              </div>
              <button
                onClick={() => setHelpModalKey(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-bold text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              {helpData[helpModalKey].description}
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {helpData[helpModalKey].items.map((item, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-white space-y-1">
                  <p className="text-xs font-black text-[#549E9E]">{item.title}</p>
                  <p className="text-xs font-medium text-gray-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHelpModalKey(null)}
                className="px-4 py-2 rounded-xl bg-[#549E9E] text-white text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-[#438282]"
              >
                {t('formula_master.got_it', 'Got It')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
