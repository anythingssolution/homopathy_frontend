import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

interface FilterDropdownProps {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
  hideLabel?: boolean;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label, options, value, onChange, icon: Icon, hideLabel
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`${hideLabel ? '' : 'space-y-1.5'} relative`} ref={ref}>
      {!hideLabel && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>}
      <div
        onClick={() => setOpen(!open)}
        className={`w-full bg-white border-2 py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-700 cursor-pointer flex items-center justify-between rounded-xl transition-all ${open ? 'border-[#549E9E] ring-2 ring-[#549E9E]/5' : 'border-gray-100 hover:border-[#549E9E]/30'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon size={14} className={open ? 'text-[#549E9E]' : 'text-gray-400'} />
          <span className="truncate">{selected?.label || label}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 text-gray-400 ${open ? 'rotate-180 text-[#549E9E]' : ''}`} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-xl z-[100] max-h-60 overflow-y-auto overflow-x-hidden"
          >
            {options.map(opt => (
              <div key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-between cursor-pointer ${value === opt.id ? 'bg-[#549E9E] text-white' : 'text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'}`}
              >
                {opt.label}
                {value === opt.id && <CheckCircle2 size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
