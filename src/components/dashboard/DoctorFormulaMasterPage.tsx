import React, { useEffect, useMemo, useState } from 'react';
import { Beaker, CheckCircle2, Copy, Plus, RefreshCcw, Save, Settings2, Trash2, WandSparkles } from 'lucide-react';
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
  amount_strategy: 'FIXED' | 'MULTIPLY_SUFFIX';
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
  },
  alpha_codes: [
    { code: 'BD', description: 'Twice daily', fixed_amount: 80, template_code: 'BD', duration_override_days: null, is_active: true },
  ],
});

const cloneDraft = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

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
    },
    alpha_codes: alphaCodes,
    templates,
  };
};

export default function DoctorFormulaMasterPage() {
  const apiFetch = useApi();
  const { addToast } = useNotifications();
  const { snapshot, refreshFormulaMaster, applyFormulaSnapshot } = useDoctorFormulaMaster();
  const [sets, setSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FormulaSetDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewInput, setPreviewInput] = useState('30, 200/2, 84/20, 10/BD');

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

  const removeTemplate = (templateIndex: number) => {
    setDraft((prev) => {
      if (!prev || prev.templates.length <= 1) return prev;
      const templateCode = prev.templates[templateIndex].template_code;
      const templates = prev.templates.filter((_, idx) => idx !== templateIndex);
      const alphaCodes = prev.alpha_codes.filter((code) => code.template_code !== templateCode);
      const nextDraft = { ...prev, templates, alpha_codes: alphaCodes };

      (['plain_number', 'slash_single_numeric', 'slash_double_numeric'] as Array<keyof FormulaSetDraft['rules']>).forEach((ruleKey) => {
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
        <span className="font-black uppercase tracking-widest text-sm">Loading Formula Master...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#549E9E]/15 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#549E9E]">Doctor Menu</p>
          <h2 className="text-2xl font-black text-gray-800 mt-2">Quick Prescription Formula Master</h2>
          <p className="text-sm text-gray-500 mt-2">Login session me loaded formula rules yahin manage honge. Save/activate ke baad current session bhi turant update ho jayega.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleCreateNew} className="px-4 py-3 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <Plus size={14} /> New Set
          </button>
          <button onClick={handleDuplicate} disabled={!draft} className="px-4 py-3 rounded-xl bg-amber-50 text-amber-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => void loadSets()} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <RefreshCcw size={14} /> Reload
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">Available Sets</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">{sets.length} total</span>
            </div>
            <div className="space-y-2">
              {sets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => void loadSetDetail(Number(set.id))}
                  className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${Number(selectedSetId) === Number(set.id) ? 'border-[#549E9E] bg-[#549E9E]/5' : 'border-gray-100 hover:border-[#549E9E]/30 bg-gray-50/60'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-800">{set.set_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">v{set.version_no || 1}</p>
                    </div>
                    {Number(set.is_active) === 1 && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Current Session Snapshot</p>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-black text-gray-800">Set:</span> {snapshot?.set_name || '—'}</p>
              <p><span className="font-black text-gray-800">Version:</span> {snapshot?.version_no || '—'}</p>
              <p><span className="font-black text-gray-800">Updated:</span> {snapshot?.updated_at ? new Date(snapshot.updated_at).toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {draft && (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#549E9E]">Set Basics</p>
                    <h3 className="text-xl font-black text-gray-800 mt-1">{draft.id ? 'Edit Formula Set' : 'Create Formula Set'}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.id && (
                      <button onClick={handleActivate} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        <CheckCircle2 size={14} /> Activate
                      </button>
                    )}
                    {draft.id && (
                      <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-xl bg-[#549E9E] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer disabled:opacity-60">
                      {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <input value={draft.set_name} onChange={(e) => setDraft({ ...draft, set_name: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 outline-none focus:border-[#549E9E]" placeholder="Set Name" />
                  <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 outline-none focus:border-[#549E9E]" placeholder="Description" />
                </div>

                <div className="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest text-gray-600">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} className="accent-[#549E9E]" /> Active</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} className="accent-[#549E9E]" /> Default</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} className="accent-[#549E9E]" /> Published</label>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[#549E9E]">
                  <Settings2 size={16} />
                  <p className="text-xs font-black uppercase tracking-widest">Core Numeric Rules</p>
                </div>
                {([
                  { key: 'plain_number', label: 'Plain Number', hint: 'Example: 30' },
                  { key: 'slash_single_numeric', label: '/ + Single Digit', hint: 'Example: 200/2' },
                  { key: 'slash_double_numeric', label: '/ + Two Digits', hint: 'Example: 84/20' },
                ] as const).map((ruleEntry) => (
                  <div key={ruleEntry.key} className="grid lg:grid-cols-[220px_160px_160px_160px_minmax(0,1fr)] gap-3 items-center border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div>
                      <p className="text-sm font-black text-gray-800">{ruleEntry.label}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{ruleEntry.hint}</p>
                    </div>
                    <select value={draft.rules[ruleEntry.key].amount_strategy} onChange={(e) => updateRule(ruleEntry.key, 'amount_strategy', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700">
                      <option value="FIXED">FIXED</option>
                      <option value="MULTIPLY_SUFFIX">MULTIPLY_SUFFIX</option>
                    </select>
                    <input value={draft.rules[ruleEntry.key].fixed_amount ?? ''} onChange={(e) => updateRule(ruleEntry.key, 'fixed_amount', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Fixed Amount" />
                    <input value={draft.rules[ruleEntry.key].multiplier_value ?? ''} onChange={(e) => updateRule(ruleEntry.key, 'multiplier_value', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Multiplier" />
                    <select value={draft.rules[ruleEntry.key].template_code} onChange={(e) => updateRule(ruleEntry.key, 'template_code', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700">
                      {templateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#549E9E]">
                    <Beaker size={16} />
                    <p className="text-xs font-black uppercase tracking-widest">Dosage Templates</p>
                  </div>
                  <button onClick={addTemplate} className="px-4 py-2 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                    <Plus size={14} /> Add Template
                  </button>
                </div>

                <div className="space-y-4">
                  {draft.templates.map((template, templateIndex) => (
                    <div key={`${template.template_code}-${templateIndex}`} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-4">
                      <div className="grid lg:grid-cols-[160px_minmax(0,1fr)_120px] gap-3 items-center">
                        <input value={template.template_code} onChange={(e) => updateTemplate(templateIndex, 'template_code', e.target.value.toUpperCase())} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Template Code" />
                        <input value={template.template_name} onChange={(e) => updateTemplate(templateIndex, 'template_name', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Template Name" />
                        <button onClick={() => removeTemplate(templateIndex)} className="h-11 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>

                      <div className="space-y-3">
                        {template.rows.map((row, rowIndex) => (
                          <div key={`${template.template_code}-row-${rowIndex}`} className="grid lg:grid-cols-[140px_120px_minmax(0,1fr)] gap-3">
                            <input value={row.dose_label} onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'dose_label', e.target.value.toUpperCase())} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Dose Label" />
                            <input value={row.balls_per_dose} onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'balls_per_dose', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Balls/Dose" />
                            <input value={row.instructions} onChange={(e) => updateTemplateRow(templateIndex, rowIndex, 'instructions', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Instructions" />
                          </div>
                        ))}
                      </div>

                      <button onClick={() => addTemplateRow(templateIndex)} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        <Plus size={14} /> Add Dose Row
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#549E9E]">
                    <WandSparkles size={16} />
                    <p className="text-xs font-black uppercase tracking-widest">Alpha Codes</p>
                  </div>
                  <button onClick={addAlphaCode} className="px-4 py-2 rounded-xl bg-[#549E9E]/10 text-[#549E9E] text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                    <Plus size={14} /> Add Code
                  </button>
                </div>

                <div className="space-y-3">
                  {draft.alpha_codes.map((code, index) => (
                    <div key={`${code.code || 'new'}-${index}`} className="grid lg:grid-cols-[120px_minmax(0,1fr)_120px_180px_160px_100px] gap-3 items-center border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                      <input value={code.code} onChange={(e) => updateAlphaCode(index, 'code', e.target.value.toUpperCase())} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Code" />
                      <input value={code.description || ''} onChange={(e) => updateAlphaCode(index, 'description', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Description" />
                      <input value={code.fixed_amount ?? ''} onChange={(e) => updateAlphaCode(index, 'fixed_amount', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Amount" />
                      <select value={code.template_code} onChange={(e) => updateAlphaCode(index, 'template_code', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700">
                        {templateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <input value={code.duration_override_days ?? ''} onChange={(e) => updateAlphaCode(index, 'duration_override_days', e.target.value)} className="h-11 px-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700" placeholder="Duration Override" />
                      <button onClick={() => removeAlphaCode(index)} className="h-11 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[#549E9E]">
                  <Beaker size={16} />
                  <p className="text-xs font-black uppercase tracking-widest">Preview Sandbox</p>
                </div>
                <textarea value={previewInput} onChange={(e) => setPreviewInput(e.target.value)} rows={3} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 outline-none focus:border-[#549E9E]" placeholder="30, 200/2, 84/20, 10/BD" />
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">Parsed Entries</p>
                    <div className="space-y-2">
                      {previewResult.entries.length === 0 && (
                        <p className="text-sm font-bold text-gray-500">No valid entries parsed yet.</p>
                      )}
                      {previewResult.entries.map((entry) => (
                        <div key={entry.raw_token} className="bg-white border border-emerald-100 rounded-lg p-3">
                          <p className="text-sm font-black text-gray-800">{entry.raw_token} → Medicine {entry.name}</p>
                          <p className="text-xs font-bold text-gray-500 mt-1">Amount ₹{entry.amount} • Template {entry.dosage_template_code || '—'}</p>
                          <p className="text-xs font-bold text-gray-500 mt-1">M/A/N = {entry.doses.morning}/{entry.doses.afternoon}/{entry.doses.night}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-red-100 bg-red-50/50 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">Warnings / Errors</p>
                    <div className="space-y-2">
                      {previewResult.errors.length === 0 && previewResult.warnings.length === 0 && (
                        <p className="text-sm font-bold text-gray-500">No parser issues.</p>
                      )}
                      {previewResult.errors.map((item, idx) => (
                        <div key={`error-${idx}`} className="bg-white border border-red-100 rounded-lg p-3 text-sm font-bold text-red-600">
                          {item.raw_token}: {item.message}
                        </div>
                      ))}
                      {previewResult.warnings.map((item, idx) => (
                        <div key={`warning-${idx}`} className="bg-white border border-amber-100 rounded-lg p-3 text-sm font-bold text-amber-600">
                          {item.raw_token}: {item.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
