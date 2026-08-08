import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getLocalDateString } from '../utils/date';

const CustomDatePicker = ({
  value,
  onChange,
  label,
  readOnly = false,
  minDate,
  allowClear = true,
  placeholder,
}: {
  value: string;
  onChange: (date: string) => void;
  label: string;
  readOnly?: boolean;
  minDate?: string;
  allowClear?: boolean;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const todayStr = getLocalDateString(today);

  const selectedDate = value && value !== 'all' ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    const m = (viewMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const nextDate = `${viewYear}-${m}-${d}`;
    if (minDate && nextDate < minDate) {
      return;
    }
    onChange(nextDate);
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : (placeholder || 'All Dates');

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={`${label ? 'space-y-1.5' : ''} relative w-full md:w-auto ${open ? 'z-30' : 'z-10'}`} ref={ref}>
      {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>}
      <div
        onClick={() => !readOnly && setOpen(!open)}
        className={`w-full min-w-[140px] bg-white border py-2.5 px-4 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-between transition-all ${
          readOnly ? 'bg-gray-50 cursor-not-allowed opacity-80' : 
          open ? 'border-[#549E9E] ring-2 ring-[#549E9E]/10 cursor-pointer' : 'border-gray-200 hover:border-[#549E9E]/50 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} className={open ? 'text-[#549E9E]' : 'text-gray-400'} />
          <span>{displayValue}</span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 mt-1 w-[260px] bg-white border border-gray-200 shadow-2xl z-[100] p-3 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#549E9E]/10 hover:text-[#549E9E] transition-all">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-black text-gray-700 uppercase tracking-wider">{monthName} {viewYear}</span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#549E9E]/10 hover:text-[#549E9E] transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[9px] font-black text-[#549E9E]/50 uppercase tracking-widest py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`blank-${i}`} />;
                const dateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const isSelected = value === dateStr;
                const isToday = dateStr === todayStr;
                const isDisabled = Boolean(minDate && dateStr < minDate);
                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    disabled={isDisabled}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      isDisabled
                        ? 'text-gray-200 cursor-not-allowed bg-gray-50'
                        : isSelected
                        ? 'bg-[#549E9E] text-white shadow-lg shadow-[#549E9E]/30 scale-110'
                        : isToday
                          ? 'bg-[#549E9E]/10 text-[#549E9E] font-black ring-1 ring-[#549E9E]/20'
                          : 'text-gray-600 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              {allowClear ? (
                <button
                  onClick={() => { onChange('all'); setOpen(false); }}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X size={12} /> Clear
                </button>
              ) : (
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  {selectedDate ? 'Selected' : 'Pick a date'}
                </span>
              )}
              <button
                onClick={() => {
                  if (minDate && todayStr < minDate) return;
                  onChange(todayStr);
                  setOpen(false);
                  setViewMonth(today.getMonth());
                  setViewYear(today.getFullYear());
                }}
                disabled={Boolean(minDate && todayStr < minDate)}
                className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest hover:text-[#438787] transition-colors bg-[#549E9E]/10 px-4 py-1.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDatePicker;
