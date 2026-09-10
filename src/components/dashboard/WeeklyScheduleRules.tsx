import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dedupedFetch } from '../../utils/dedupedFetch';
import { formatTimeTo12Hour } from '../../utils/dateUtils';

export type WeeklyScheduleRule = {
  id: number;
  branch_id: number;
  slot_id: number | null;
  applies_to_first_slot: boolean;
  slot_name: string | null;
  slot_default_start_time: string | null;
  slot_default_end_time: string | null;
  day_of_week: number;
  day_label: string | null;
  start_time: string;
  end_time: string | null;
  description: string | null;
  is_active: boolean;
};

type BranchSlot = {
  slot_id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
};

type RuleFormState = {
  slot_id: string; // '' => first slot of the day
  day_of_week: string;
  start_time: string; // HH:mm
  description: string;
};

type Props = {
  branchId: number | null;
  token: string | null;
  getSlotLabel?: (name: string | null | undefined) => string;
  /** Called after any rule change so the parent can refresh timings / appointments. */
  onChanged?: () => void | Promise<void>;
};

const DAYS: Array<{ value: number; key: string; label: string }> = [
  { value: 2, key: 'monday', label: 'Monday' },
  { value: 3, key: 'tuesday', label: 'Tuesday' },
  { value: 4, key: 'wednesday', label: 'Wednesday' },
  { value: 5, key: 'thursday', label: 'Thursday' },
  { value: 6, key: 'friday', label: 'Friday' },
  { value: 7, key: 'saturday', label: 'Saturday' },
  { value: 1, key: 'sunday', label: 'Sunday' },
];

const EMPTY_FORM: RuleFormState = { slot_id: '', day_of_week: '6', start_time: '', description: '' };

const toTimeInput = (value?: string | null) => String(value || '').slice(0, 5);

const toMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

const computeEndTime = (slot: BranchSlot | undefined, startTime: string) => {
  if (!slot || !/^\d{2}:\d{2}$/.test(startTime)) return '';
  const duration = toMinutes(slot.end_time) - toMinutes(slot.start_time);
  const shiftedEnd = toMinutes(startTime) + duration;
  if (duration <= 0 || shiftedEnd >= 24 * 60) return '';
  return `${String(Math.floor(shiftedEnd / 60)).padStart(2, '0')}:${String(shiftedEnd % 60).padStart(2, '0')}`;
};

const fieldClass =
  'w-full bg-white border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10 rounded-xl transition-all shadow-sm disabled:opacity-60';
const labelClass = 'text-[10px] font-black text-gray-400 uppercase tracking-widest';

const WeeklyScheduleRules: React.FC<Props> = ({ branchId, token, getSlotLabel, onChanged }) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<WeeklyScheduleRule[]>([]);
  const [slots, setSlots] = useState<BranchSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const slotLabel = useCallback(
    (name: string | null | undefined) => (getSlotLabel ? getSlotLabel(name) : String(name || '')),
    [getSlotLabel],
  );
  const dayLabel = useCallback(
    (dayOfWeek: number) => {
      const day = DAYS.find((entry) => entry.value === dayOfWeek);
      return day ? t(`doctor_portal.days.${day.key}`, day.label) : '';
    },
    [t],
  );

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  const fetchRules = useCallback(async () => {
    if (!branchId || !token) {
      setRules([]);
      setSlots([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await dedupedFetch(`/api/v1/doctors/schedule-rules?branch_id=${branchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) {
        setMessage({ type: 'error', text: result.message || 'Unable to load weekly rules' });
        return;
      }
      setRules((result.data || []) as WeeklyScheduleRule[]);
      setSlots((result.meta?.slots || []) as BranchSlot[]);
    } catch {
      setMessage({ type: 'error', text: 'Unable to load weekly rules' });
    } finally {
      setIsLoading(false);
    }
  }, [branchId, token]);

  useEffect(() => {
    setEditingId(null);
    setConfirmRemoveId(null);
    setMessage(null);
    fetchRules();
  }, [fetchRules]);

  const targetSlot = form.slot_id
    ? slots.find((slot) => slot.slot_id === Number(form.slot_id))
    : slots[0];
  const previewEnd = computeEndTime(targetSlot, form.start_time);
  const canSave = Boolean(form.day_of_week && form.start_time && previewEnd && !isSaving);

  const startNew = () => {
    setForm({ ...EMPTY_FORM, start_time: toTimeInput(slots[0]?.start_time) });
    setEditingId('new');
    setConfirmRemoveId(null);
    setMessage(null);
  };

  const startEdit = (rule: WeeklyScheduleRule) => {
    setForm({
      slot_id: rule.slot_id ? String(rule.slot_id) : '',
      day_of_week: String(rule.day_of_week),
      start_time: toTimeInput(rule.start_time),
      description: rule.description || '',
    });
    setEditingId(rule.id);
    setConfirmRemoveId(null);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const saveRule = async () => {
    if (!branchId || !canSave) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const isNew = editingId === 'new';
      const response = await fetch(
        isNew ? '/api/v1/doctors/schedule-rules' : `/api/v1/doctors/schedule-rules/${editingId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            branch_id: branchId,
            slot_id: form.slot_id ? Number(form.slot_id) : null,
            day_of_week: Number(form.day_of_week),
            start_time: form.start_time,
            description: form.description.trim() || null,
          }),
        },
      );
      const result = await response.json();
      if (!result.success) {
        setMessage({ type: 'error', text: result.message || 'Unable to save weekly rule' });
        return;
      }
      setMessage({ type: 'success', text: result.message || 'Weekly rule saved' });
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchRules();
      await onChanged?.();
    } catch {
      setMessage({ type: 'error', text: 'Unable to save weekly rule' });
    } finally {
      setIsSaving(false);
    }
  };

  const removeRule = async (ruleId: number) => {
    if (!branchId) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/doctors/schedule-rules/${ruleId}?branch_id=${branchId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const result = await response.json();
      if (!result.success) {
        setMessage({ type: 'error', text: result.message || 'Unable to remove weekly rule' });
        return;
      }
      setMessage({ type: 'success', text: result.message || 'Weekly rule removed' });
      setConfirmRemoveId(null);
      await fetchRules();
      await onChanged?.();
    } catch {
      setMessage({ type: 'error', text: 'Unable to remove weekly rule' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderForm = () => (
    <div className="rounded-xl border border-[#549E9E]/30 bg-white p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <label className="space-y-1.5">
          <span className={labelClass}>{t('doctor_portal.weekly_rules.day', 'Day')}</span>
          <select
            value={form.day_of_week}
            onChange={(event) => setForm((current) => ({ ...current, day_of_week: event.target.value }))}
            className={fieldClass}
          >
            {DAYS.map((day) => (
              <option key={day.value} value={day.value}>{dayLabel(day.value)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>{t('doctor_portal.slot_label', 'Slot')}</span>
          <select
            value={form.slot_id}
            onChange={(event) => setForm((current) => ({ ...current, slot_id: event.target.value }))}
            className={fieldClass}
          >
            <option value="">{t('doctor_portal.weekly_rules.first_slot', 'First slot of the day')}</option>
            {slots.map((slot) => (
              <option key={slot.slot_id} value={slot.slot_id}>
                {slotLabel(slot.slot_name)} ({toTimeInput(slot.start_time)} - {toTimeInput(slot.end_time)})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>{t('doctor_portal.weekly_rules.opens_at', 'Opens At')}</span>
          <input
            type="time"
            value={form.start_time}
            onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
            className={fieldClass}
          />
        </label>
        <div className="space-y-1.5">
          <span className={labelClass}>{t('doctor_portal.auto_end_time', 'Auto End Time')}</span>
          <div className={`px-3 py-2.5 text-xs font-black rounded-xl border shadow-sm ${previewEnd ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
            {previewEnd || t('doctor_portal.invalid_end_time', 'Invalid end time')}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={form.description}
          maxLength={255}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder={t('doctor_portal.weekly_rules.note_placeholder', 'Note shown to patients (optional)')}
          className={`${fieldClass} flex-1`}
        />
        <button
          onClick={saveRule}
          disabled={!canSave}
          className="px-5 py-2.5 bg-[#549E9E] text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-[#458585] transition-colors shadow-md shadow-[#549E9E]/20"
        >
          {isSaving
            ? t('doctor_portal.updating', 'Updating...')
            : editingId === 'new'
              ? t('doctor_portal.weekly_rules.add_rule', 'Add Rule')
              : t('doctor_portal.weekly_rules.save_rule', 'Save Rule')}
        </button>
        <button
          onClick={cancelEdit}
          disabled={isSaving}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
        >
          {t('common.cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-md bg-violet-50 border border-violet-100 text-violet-600 mt-0.5">
            <CalendarClock size={14} />
          </div>
          <div>
            <p className="text-[10px] font-black text-violet-700 uppercase tracking-[0.2em]">
              {t('doctor_portal.weekly_rules.title', 'Weekly Schedule Rules')}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 mt-0.5">
              {t('doctor_portal.weekly_rules.subtitle', 'Repeats every week for this branch. A date-wise shift above always wins for that date.')}
            </p>
          </div>
        </div>
        {editingId === null && (
          <button
            onClick={startNew}
            disabled={!branchId || slots.length === 0 || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-violet-200 text-violet-700 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-violet-50 transition-colors shadow-sm"
          >
            <Plus size={12} />
            {t('doctor_portal.weekly_rules.add_rule', 'Add Rule')}
          </button>
        )}
      </div>

      {editingId === 'new' && renderForm()}

      {isLoading && rules.length === 0 ? (
        <div className="flex items-center justify-center p-4 bg-white border border-gray-100 rounded-xl">
          <p className="text-xs font-bold text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      ) : rules.length === 0 && editingId !== 'new' ? (
        <div className="flex items-center justify-center p-4 bg-white border border-dashed border-gray-200 rounded-xl">
          <p className="text-xs font-bold text-gray-400">
            {t('doctor_portal.weekly_rules.empty', 'No weekly rules for this branch. Slots follow their default timing every day.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                renderForm()
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-violet-50 text-violet-700 border border-violet-100 min-w-[86px] text-center">
                    {dayLabel(rule.day_of_week)}
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-xs font-black text-gray-700">
                      {slotLabel(rule.slot_name)}
                      {rule.applies_to_first_slot && (
                        <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                          ({t('doctor_portal.weekly_rules.first_slot_short', 'first slot')})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                      {t('doctor_portal.weekly_rules.opens_at', 'Opens At')}{' '}
                      <span className="text-gray-800 font-black">{formatTimeTo12Hour(rule.start_time)}</span>
                      {rule.end_time && <> – {formatTimeTo12Hour(rule.end_time)}</>}
                      {rule.slot_default_start_time && (
                        <span className="text-gray-400">
                          {' '}· {t('doctor_portal.default_time', 'Default Time')} {formatTimeTo12Hour(rule.slot_default_start_time)}
                        </span>
                      )}
                    </p>
                    {rule.description && (
                      <p className="text-[11px] font-semibold text-gray-400 mt-0.5 truncate">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {confirmRemoveId === rule.id ? (
                      <>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                          {t('doctor_portal.weekly_rules.remove_confirm', 'Remove?')}
                        </span>
                        <button
                          onClick={() => removeRule(rule.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-red-700 transition-colors"
                        >
                          {t('common.yes', 'Yes')}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                          aria-label={t('common.cancel', 'Cancel')}
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(rule)}
                          disabled={isSaving || editingId !== null}
                          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#549E9E] hover:border-[#549E9E]/40 hover:bg-[#549E9E]/5 disabled:opacity-40 transition-colors"
                          aria-label={t('common.edit', 'Edit')}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(rule.id)}
                          disabled={isSaving || editingId !== null}
                          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          aria-label={t('common.remove', 'Remove')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <AlertCircle size={14} />
          <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleRules;
