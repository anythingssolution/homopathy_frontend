import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings, 
  Save, 
  RotateCcw, 
  Info,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ExtraSlotTokenManager from './ExtraSlotTokenManager';

interface TokenItem {
  token_number: number;
  visit_type_code: string;
  duration_minutes?: number | null;
}

interface TokenRule {
  count: number;
  total_duration_minutes: number;
  label: string;
  short_label: string;
  color_code: string;
}

interface ExtraTokenItem {
  sequence_number: number;
  treatment_code: string;
}

interface TokenLayoutManagerProps {
  token: string;
  addToast: (message: string, type: 'success' | 'error') => void;
  branchId: number | null;
}

const VISIT_TYPE_DETAILS: Record<string, { label: string; short: string; color: string; bg: string; border: string; text: string }> = {
  ACUTE_TREATMENT: {
    label: 'Acute Treatment',
    short: 'Acute',
    color: '#F97316',
    bg: 'bg-orange-50 hover:bg-orange-100/70',
    border: 'border-orange-200 hover:border-orange-300',
    text: 'text-orange-700',
  },
  FIRST_CONSULTATION: {
    label: 'First Consultation',
    short: 'First',
    color: '#2563EB',
    bg: 'bg-blue-50 hover:bg-blue-100/70',
    border: 'border-blue-200 hover:border-blue-300',
    text: 'text-blue-700',
  },
  CHRONIC_CASE_DISCUSSION: {
    label: 'Chronic Case Discussion',
    short: 'Chronic',
    color: '#7C3AED',
    bg: 'bg-purple-50 hover:bg-purple-100/70',
    border: 'border-purple-200 hover:border-purple-300',
    text: 'text-purple-700',
  },
  FOLLOW_UP_VISIT: {
    label: 'Follow-up Visit',
    short: 'Follow-up',
    color: '#16A34A',
    bg: 'bg-emerald-50 hover:bg-emerald-100/70',
    border: 'border-emerald-200 hover:border-emerald-300',
    text: 'text-emerald-700',
  },
};

const TOKEN_RULES = {
  ACUTE_TREATMENT: { count: 5, minutes: 10 },
  FIRST_CONSULTATION: { count: 6, minutes: 60 },
  CHRONIC_CASE_DISCUSSION: { count: 1, minutes: 14 },
  FOLLOW_UP_VISIT: { count: 28, minutes: 126 },
};

const VISIT_TYPE_ORDER = [
  'ACUTE_TREATMENT',
  'FIRST_CONSULTATION',
  'CHRONIC_CASE_DISCUSSION',
  'FOLLOW_UP_VISIT',
];

export default function TokenLayoutManager({ token, addToast, branchId }: TokenLayoutManagerProps) {
  const [layout, setLayout] = useState<TokenItem[]>([]);
  const [branchName, setBranchName] = useState('');
  const [tokenCount, setTokenCount] = useState(40);
  const [tokenRules, setTokenRules] = useState<Record<string, TokenRule> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [extraLayout, setExtraLayout] = useState<ExtraTokenItem[]>([]);
  const [extraSaving, setExtraSaving] = useState(false);
  const [extraDraggedIndex, setExtraDraggedIndex] = useState<number | null>(null);
  const [extraDragOverIndex, setExtraDragOverIndex] = useState<number | null>(null);

  const fetchLayout = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/receptionist/token-layout?branch_id=${branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLayout(data.data.layout || []);
        setBranchName(data.data.branch_name || '');
        setTokenCount(data.data.token_count || 40);
        setTokenRules(data.data.token_rules || null);
      } else {
        addToast(data.message || 'Failed to fetch layout', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error fetching layout', 'error');
    } finally {
      setLoading(false);
    }

    try {
      const res = await fetch(`/api/v1/receptionist/extra-token-layout?branch_id=${branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setExtraLayout(data.data.layout || []);
    } catch (err) {
      console.error(err);
      addToast('Error fetching extra-hour layout', 'error');
    }
  };

  useEffect(() => {
    fetchLayout();
  }, [branchId, token]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...layout];
    const temp = updated[draggedIndex];
    updated[draggedIndex] = {
      ...updated[index],
      token_number: temp.token_number,
    };
    updated[index] = {
      ...temp,
      token_number: updated[index].token_number,
    };

    setLayout(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getCounts = () => {
    const counts: Record<string, number> = {
      ACUTE_TREATMENT: 0,
      FIRST_CONSULTATION: 0,
      CHRONIC_CASE_DISCUSSION: 0,
      FOLLOW_UP_VISIT: 0,
    };
    layout.forEach(item => {
      if (counts[item.visit_type_code] !== undefined) {
        counts[item.visit_type_code]++;
      }
    });
    return counts;
  };

  const counts = getCounts();
  const allocatedMinutesByCode = layout.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.visit_type_code] = (accumulator[item.visit_type_code] || 0) + Number(item.duration_minutes || 0);
    return accumulator;
  }, {});
  const activeTokenRules: Record<string, TokenRule> = tokenRules || Object.fromEntries(
    Object.entries(TOKEN_RULES).map(([code, rule]) => [
      code,
      {
        count: rule.count,
        total_duration_minutes: rule.minutes,
        label: VISIT_TYPE_DETAILS[code].label,
        short_label: VISIT_TYPE_DETAILS[code].short,
        color_code: VISIT_TYPE_DETAILS[code].color,
      },
    ])
  );
  const layoutDurationTotal = Object.values(allocatedMinutesByCode).reduce((total, minutes) => total + minutes, 0);
  const totalRuleMinutes = layoutDurationTotal || Object.values(activeTokenRules).reduce(
    (total, rule) => total + Number(rule.total_duration_minutes || 0),
    0
  );
  const summaryParts = VISIT_TYPE_ORDER
    .filter((code) => Number(activeTokenRules[code]?.count || 0) > 0)
    .map((code) => `${VISIT_TYPE_DETAILS[code].short} ${activeTokenRules[code].count}`);

  const handleSave = async () => {
    if (!branchId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/receptionist/token-layout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          layout: layout.map(item => ({
            visit_type_code: item.visit_type_code,
            duration_minutes: item.duration_minutes ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Token layout saved successfully', 'success');
        fetchLayout();
      } else {
        addToast(data.message || 'Failed to save layout', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error saving layout', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset this branch to the default template?')) {
      // Re-create default uncustomized/seeded layout sequence
      const base: string[] = [];
      VISIT_TYPE_ORDER.forEach((code) => {
        const count = Number(activeTokenRules[code]?.count || 0);
        for (let i = 0; i < count; i++) base.push(code);
      });

      // Shuffle deterministically based on branchId logic on client side to match seeded fallback
      let state = branchId || 1;
      const random = () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), state | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      const shuffled = [...base];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const rIndex = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[rIndex]] = [shuffled[rIndex], shuffled[i]];
      }

      setLayout(shuffled.map((code, idx) => ({
        token_number: idx + 1,
        visit_type_code: code,
        duration_minutes: null,
      })));

      addToast('Layout reset to default. Click Save to persist.', 'success');
    }
  };

  const handleExtraDrop = (index: number) => {
    if (extraDraggedIndex === null || extraDraggedIndex === index) {
      setExtraDraggedIndex(null);
      setExtraDragOverIndex(null);
      return;
    }
    const updated = [...extraLayout];
    const temp = updated[extraDraggedIndex].treatment_code;
    updated[extraDraggedIndex].treatment_code = updated[index].treatment_code;
    updated[index].treatment_code = temp;
    setExtraLayout(updated);
    setExtraDraggedIndex(null);
    setExtraDragOverIndex(null);
  };

  const handleExtraSave = async () => {
    if (!branchId) return;
    setExtraSaving(true);
    try {
      const res = await fetch('/api/v1/receptionist/extra-token-layout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          layout: extraLayout.map((item) => item.treatment_code),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      addToast(data.message || 'Extra-hour alignment saved', 'success');
      fetchLayout();
    } catch (error: any) {
      addToast(error?.message || 'Failed to save extra-hour alignment', 'error');
    } finally {
      setExtraSaving(false);
    }
  };

  const handleExtraReset = () => {
    const codes = [
      'ACUTE_TREATMENT', 'ACUTE_TREATMENT',
      'FIRST_CONSULTATION', 'FIRST_CONSULTATION',
      ...Array(8).fill('FOLLOW_UP_VISIT'),
    ];
    setExtraLayout(codes.map((code, index) => ({
      sequence_number: index + 1,
      treatment_code: code,
    })));
    addToast('Extra-hour template reset. Click Save Extra Layout to persist.', 'success');
  };

  if (!branchId) {
    return (
      <div className="bg-white rounded-[40px] p-8 border border-gray-200 text-center text-gray-400">
        Please select a branch to configure token layouts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <div className="bg-white rounded-[40px] border border-gray-200 shadow-sm p-6 lg:p-8 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h4 className="text-lg font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="text-[#549E9E]" size={20} />
            Token Alignment Configuration
          </h4>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Configure default token positions for <span className="text-primary-teal">{branchName || `Branch #${branchId}`}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={loading || saving}
            className="flex items-center gap-2 bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
          >
            <RotateCcw size={14} />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || layout.length !== tokenCount}
            className="flex items-center gap-2 bg-[#549E9E] hover:bg-[#468686] text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-[#549E9E]/10"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Layout
          </button>
        </div>
      </div>

      {/* Rules & Counts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-[24px] border border-gray-100">
        {Object.entries(VISIT_TYPE_DETAILS).map(([code, details]) => {
          const currentCount = counts[code] || 0;
          const rule = activeTokenRules[code] || {
            count: 0,
            total_duration_minutes: 0,
          };
          const allocatedMinutes = allocatedMinutesByCode[code] || rule.total_duration_minutes;
          const isValid = currentCount === rule.count;

          return (
            <div key={code} className={`p-4 rounded-2xl bg-white border border-gray-150 flex flex-col justify-between shadow-sm`}>
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {details.short}
                </span>
                {isValid ? (
                  <CheckCircle2 className="text-emerald-500" size={14} />
                ) : (
                  <AlertCircle className="text-red-500" size={14} />
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-800">{currentCount}</span>
                <span className="text-xs font-bold text-gray-400">/ {rule.count}</span>
              </div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                {allocatedMinutes} Minutes Allocated
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#549E9E]/15 bg-[#549E9E]/5 px-5 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#468686]">
          {summaryParts.join(' + ')} = {tokenCount} Tokens
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#468686]">
          {totalRuleMinutes} Minutes
        </p>
      </div>

      {/* Helper Alert */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-700">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div className="text-xs font-medium leading-relaxed">
          <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Drag and Drop to Reorder</p>
          Drag any token card and drop it onto another to swap their positions. This allows you to align specific visit types at precise slot token positions branch-wise.
        </div>
      </div>

      {/* Tokens Workspace Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">
          Loading layout configuration...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
          {layout.map((item, index) => {
            const details = VISIT_TYPE_DETAILS[item.visit_type_code] || {
              label: item.visit_type_code,
              short: 'Token',
              bg: 'bg-gray-50',
              border: 'border-gray-200',
              text: 'text-gray-700',
            };
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;

            return (
              <div
                key={item.token_number}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`
                  relative cursor-grab active:cursor-grabbing select-none p-3.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center text-center h-24
                  ${details.bg} ${details.border} ${details.text}
                  ${isDragging ? 'opacity-30 scale-95 border-dashed border-gray-400' : 'opacity-100 scale-100'}
                  ${isOver ? 'ring-2 ring-[#549E9E] scale-105 z-10 shadow-lg' : 'shadow-sm'}
                `}
              >
                {/* Token Number Badge */}
                <div className="absolute top-2 left-2 bg-black/5 rounded-md px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase">
                  #{item.token_number}
                </div>

                <div className="text-xs font-black uppercase tracking-widest mt-2">
                  {details.short}
                </div>
                <div className="text-[8px] font-bold opacity-60 uppercase mt-1 tracking-wider">
                  Slot Position
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-100 pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h5 className="text-sm font-black uppercase tracking-widest text-gray-800">
              Extra Hour Alignment Template
            </h5>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
              This 12-token order is reused for every extra block from block 1 to block 4.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExtraReset}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600"
            >
              <RotateCcw size={13} /> Reset Extra
            </button>
            <button
              type="button"
              onClick={handleExtraSave}
              disabled={extraSaving || extraLayout.length !== 12}
              className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              <Save size={13} /> Save Extra Layout
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700">
          Acute 2 + First 2 + Follow-up 8 = 12 tokens · Duration remains master-controlled
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
          {extraLayout.map((item, index) => {
            const details = VISIT_TYPE_DETAILS[item.treatment_code];
            const isDragging = extraDraggedIndex === index;
            const isOver = extraDragOverIndex === index;
            return (
              <div
                key={item.sequence_number}
                draggable
                onDragStart={() => setExtraDraggedIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setExtraDragOverIndex(index);
                }}
                onDrop={() => handleExtraDrop(index)}
                onDragEnd={() => {
                  setExtraDraggedIndex(null);
                  setExtraDragOverIndex(null);
                }}
                className={`relative h-24 cursor-grab select-none rounded-2xl border p-2 text-center flex flex-col items-center justify-center transition-all
                  ${details?.bg || 'bg-gray-50'} ${details?.border || 'border-gray-200'} ${details?.text || 'text-gray-700'}
                  ${isDragging ? 'opacity-30 scale-95' : ''}
                  ${isOver ? 'ring-2 ring-amber-400 scale-105 shadow-lg' : 'shadow-sm'}`}
              >
                <span className="absolute left-2 top-2 rounded bg-black/5 px-1.5 py-0.5 text-[8px] font-black">
                  +{index + 1}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {details?.short || item.treatment_code}
                </span>
                <span className="mt-1 text-[8px] font-bold uppercase opacity-60">
                  Extra Position
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <ExtraSlotTokenManager token={token} addToast={addToast} branchId={branchId} />
    </div>
  );
}
