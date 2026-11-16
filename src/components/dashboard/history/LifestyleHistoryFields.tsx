export const lifestyleQuestions = [
  { key: 'sleep_disturbed', label: 'Sleep Disturbed', choices: [['YES', 'Yes'], ['NO', 'No']] },
  { key: 'appetite_disturbed', label: 'Appetite Disturbed', choices: [['YES', 'Yes'], ['NO', 'No']] },
  { key: 'irritable_nature', label: 'Irritable Nature', choices: [['YES', 'Yes'], ['NO', 'No']] },
  { key: 'stress', label: 'Stress', choices: [['YES', 'Yes'], ['NO', 'No']] },
  { key: 'overthinking', label: 'Overthinking', choices: [['YES', 'Yes'], ['NO', 'No']] },
  { key: 'thirst', label: 'Thirst', choices: [['LOW', 'Low'], ['NORMAL', 'Normal'], ['LARGE', 'Large']] },
  { key: 'thermal_sensitivity', label: 'Heat / Cold Sensitivity', choices: [['HEAT', 'Heat'], ['COLD', 'Cold'], ['NEITHER', 'Neither']] },
  { key: 'periods_regular', label: 'Periods Regular', choices: [['YES', 'Yes'], ['NO', 'No'], ['NOT_APPLICABLE', 'Not Applicable']] },
  { key: 'family_history', label: 'Family History', choices: [['YES', 'Yes'], ['NO', 'No']] },
] as const;
export type LifestyleHistory = {
  version: 1;
  sleep_disturbed: 'YES' | 'NO' | null;
  appetite_disturbed: 'YES' | 'NO' | null;
  irritable_nature: 'YES' | 'NO' | null;
  stress: 'YES' | 'NO' | null;
  overthinking: 'YES' | 'NO' | null;
  thirst: 'LOW' | 'NORMAL' | 'LARGE' | null;
  thermal_sensitivity: 'HEAT' | 'COLD' | 'NEITHER' | null;
  periods_regular: 'YES' | 'NO' | 'NOT_APPLICABLE' | null;
  family_history: 'YES' | 'NO' | null;
  father_details: string;
  mother_details: string;
};
export function parseLifestyleHistory(value: unknown): LifestyleHistory {
  const empty: LifestyleHistory = {
    version: 1, sleep_disturbed: null, appetite_disturbed: null, irritable_nature: null,
    stress: null, overthinking: null, thirst: null, thermal_sensitivity: null,
    periods_regular: null, family_history: null, father_details: '', mother_details: '',
  };
  try {
    const raw = typeof value === 'string' ? JSON.parse(value) : value;
    if (!raw || typeof raw !== 'object') return empty;
    for (const question of lifestyleQuestions) {
      if (question.choices.some(choice => choice[0] === raw[question.key])) {
        Object.assign(empty, { [question.key]: raw[question.key] });
      }
    }
    if (empty.family_history === 'YES') {
      empty.father_details = typeof raw.father_details === 'string' ? raw.father_details : '';
      empty.mother_details = typeof raw.mother_details === 'string' ? raw.mother_details : '';
    }
    return empty;
  } catch { return empty; }
}
export function hasLifestyleHistory(value: LifestyleHistory) {
  return lifestyleQuestions.some(question => value[question.key] !== null);
}
const inputClass = 'w-full px-3 py-2 min-h-10 bg-white border border-gray-200 rounded-lg focus:border-[#549E9E] focus:ring-4 focus:ring-[#549E9E]/10 outline-none text-sm font-bold text-gray-800 disabled:opacity-80 resize-y';
export default function LifestyleHistoryFields({ value, onChange, disabled, familyNotes, onFamilyNotesChange }: {
  value: LifestyleHistory;
  onChange: (value: LifestyleHistory) => void;
  disabled: boolean;
  familyNotes: string;
  onFamilyNotesChange: (value: string) => void;
}) {
  return <div className="space-y-2">
    <p className="text-xs text-gray-500 font-medium">Optional · Choose an answer, or click it again to clear.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {lifestyleQuestions.map((question, index) => <fieldset key={question.key} className={`min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2 ${question.key === 'family_history' ? 'md:col-span-2' : ''}`}>
        <legend className="sr-only">{index + 1}. {question.label}</legend>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span aria-hidden="true" className="text-sm font-semibold text-gray-700">{index + 1}. {question.label}</span>
        <div className="flex flex-wrap gap-1.5">
          {question.choices.map(([answer, label]) => {
            const selected = value[question.key] === answer;
            return <button key={answer} type="button" disabled={disabled} aria-pressed={selected}
              onClick={() => onChange({ ...value, [question.key]: selected ? null : answer,
                ...(question.key === 'family_history' && (selected || answer !== 'YES') ? { father_details: '', mother_details: '' } : {}),
              })}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 min-h-8 rounded-md border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#549E9E] disabled:cursor-default ${selected ? 'bg-[#549E9E]/10 border-[#549E9E] text-[#287777]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#549E9E]/60'}`}>
              <span aria-hidden="true" className={`w-3.5 h-3.5 shrink-0 rounded border inline-flex items-center justify-center text-xs ${selected ? 'bg-[#549E9E] border-[#549E9E] text-white' : 'border-gray-300'}`}>{selected ? '✓' : ''}</span>{label}
            </button>;
          })}
        </div>
        </div>
        {question.key === 'family_history' && value.family_history === 'YES' && <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {(['father_details', 'mother_details'] as const).map(key => <label key={key} className="text-xs font-bold text-gray-700 space-y-1.5 block">
            <span>{key === 'father_details' ? "Father’s Medical History" : "Mother’s Medical History"} <span className="text-gray-400 font-normal">(Optional)</span></span>
            <textarea rows={1} maxLength={5000} disabled={disabled} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} className={inputClass} placeholder="Relevant conditions or details…" />
          </label>)}
        </div>}
        {question.key === 'family_history' && (familyNotes || value.family_history === 'YES') && <label className="block mt-2 text-xs font-bold text-gray-700 space-y-1.5">
          <span>Family History Notes <span className="text-gray-400 font-normal">(Existing / additional details)</span></span>
          <textarea rows={1} disabled={disabled} value={familyNotes} onChange={event => onFamilyNotesChange(event.target.value)} className={inputClass} />
        </label>}
      </fieldset>)}
    </div>
  </div>;
}
