import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export default function CmsSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className={`relative ${open ? 'z-30' : 'z-10'}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`w-full border rounded-lg p-2 text-sm text-left flex items-center justify-between gap-2 transition-all ${
          open
            ? 'border-[#549E9E] ring-1 ring-[#549E9E] bg-white'
            : 'border-gray-300 bg-white hover:border-[#549E9E]/50'
        }`}
      >
        <span className="truncate text-gray-800">{selected?.label || 'Select'}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#549E9E] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#549E9E]/20 shadow-xl shadow-[#549E9E]/10 rounded-lg z-[100] overflow-hidden py-1"
          >
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#549E9E] text-white'
                      : 'text-gray-700 hover:bg-[#549E9E]/10 hover:text-[#549E9E]'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
