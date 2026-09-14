import React, { useEffect, useState } from 'react';
import { Settings, Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CALL_TUNE_CUSTOM_MAX,
  CALL_TUNE_TEMPLATE,
  playCallTune,
  type CallTuneMode,
  type CallTuneSetting,
} from '../../utils/callTune';

type Props = {
  branchId: number | null;
  token: string | null;
  compact?: boolean;
};

const MODES: Array<{ id: CallTuneMode; title: string; hint: string }> = [
  {
    id: 'CHIME',
    title: 'Current chime',
    hint: 'Same ring-ring that plays on the TV today.',
  },
  {
    id: 'TEMPLATE',
    title: 'Cabin call',
    hint: CALL_TUNE_TEMPLATE.replace('{token}', 'M-3'),
  },
  {
    id: 'CUSTOM',
    title: 'Custom',
    hint: 'Type the line. Use {token} for the token number.',
  },
];

const CallTuneSettings: React.FC<Props> = ({ branchId, token, compact = false }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CallTuneMode>('CHIME');
  const [customText, setCustomText] = useState('Token {token}, please come to the cabin.');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !branchId || !token) return;
    let cancelled = false;
    setIsLoading(true);
    setMessage(null);
    fetch(`/api/v1/doctors/call-tune?branch_id=${branchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled || !result?.success) return;
        const setting = result.data as CallTuneSetting;
        setMode(setting.mode || 'CHIME');
        if (setting.custom_text) setCustomText(setting.custom_text);
      })
      .catch(() => {
        if (!cancelled) setMessage('Unable to load call tune');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, branchId, token]);

  const save = async () => {
    if (!branchId || !token) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/doctors/call-tune', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          mode,
          custom_text: customText.trim() || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setMessage(result.message || 'Unable to save call tune');
        return;
      }
      setMessage('Call tune saved for this branch TV');
    } catch {
      setMessage('Unable to save call tune');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? 'flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 active:scale-95 transition-transform'
            : 'cursor-pointer bg-slate-50 text-slate-600 px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 border-2 border-slate-100 rounded-xl'
        }
        title={t('doctor_portal.call_tune.settings', 'Call Tune')}
      >
        <Settings size={compact ? 15 : 16} />
        {t('doctor_portal.call_tune.settings', 'Settings')}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#549E9E]">
                {t('doctor_portal.call_tune.title', 'Call Tune')}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-gray-500">
                {t('doctor_portal.call_tune.subtitle', 'Plays on the live queue TV when the next patient enters the cabin.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              aria-label={t('common.cancel', 'Close')}
            >
              <X size={14} />
            </button>
          </div>

          {!branchId ? (
            <p className="text-xs font-bold text-amber-600">Select a branch first.</p>
          ) : isLoading ? (
            <p className="text-xs font-bold text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-2">
              {MODES.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 ${
                    mode === option.id
                      ? 'border-[#549E9E] bg-[#549E9E]/5'
                      : 'border-gray-100 bg-gray-50/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="call-tune-mode"
                    checked={mode === option.id}
                    onChange={() => setMode(option.id)}
                    className="mt-0.5 accent-[#549E9E]"
                  />
                  <span>
                    <span className="block text-[11px] font-black uppercase tracking-widest text-gray-800">
                      {t(`doctor_portal.call_tune.mode_${option.id.toLowerCase()}`, option.title)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-gray-500">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}

              {mode === 'CUSTOM' && (
                <textarea
                  value={customText}
                  maxLength={CALL_TUNE_CUSTOM_MAX}
                  onChange={(event) => setCustomText(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/10"
                  placeholder="Token {token}, please come to the cabin."
                />
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void playCallTune({ mode, custom_text: customText }, 'M-1')}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
                >
                  <Volume2 size={13} />
                  {t('doctor_portal.call_tune.preview', 'Preview')}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void save()}
                  className="flex-1 rounded-xl bg-[#549E9E] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 hover:bg-[#458585]"
                >
                  {isSaving ? t('doctor_portal.updating', 'Saving...') : t('doctor_portal.call_tune.save', 'Save')}
                </button>
              </div>
              {message && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[#549E9E]">{message}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallTuneSettings;
