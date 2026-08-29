import React from 'react';
import { Calendar, Printer, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomDatePicker from '../../CustomDatePicker';
import { FilterDropdown } from '../doctor-reports/components/FilterDropdown';
import type { CustomRange } from './lib';

type DateBarProps = {
  dateFilter: string;
  onDateFilter: (value: string) => void;
  customDateRange: CustomRange;
  onCustomDateRange: React.Dispatch<React.SetStateAction<CustomRange>>;
  onRefresh: () => void;
  loading?: boolean;
  showPrint?: boolean;
  /** Follow-ups: due dates from today forward, plus overdue. */
  mode?: 'history' | 'due';
};

export const DateBar: React.FC<DateBarProps> = ({
  dateFilter,
  onDateFilter,
  customDateRange,
  onCustomDateRange,
  onRefresh,
  loading,
  showPrint,
  mode = 'history',
}) => {
  const { t } = useTranslation();
  const isDue = mode === 'due';

  const presets = isDue
    ? [
        { id: 'overdue', label: t('reports_next.follow_ups.filter_overdue') },
        { id: 'today', label: t('reports_next.follow_ups.filter_today') },
        { id: '1_week', label: t('reports_next.follow_ups.filter_week') },
        { id: '1_month', label: t('reports_next.follow_ups.filter_month') },
        { id: 'custom', label: t('reports_next.custom') },
      ]
    : [
        { id: 'today', label: t('reports_next.today') },
        { id: '1_week', label: t('reports_next.one_week') },
        { id: '1_month', label: t('reports_next.one_month') },
        { id: 'custom', label: t('reports_next.custom') },
      ];

  return (
    <div className="no-print bg-white/80 px-4 py-2 rounded-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2">
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
          {isDue ? t('reports_next.follow_ups.due_window') : t('reports_next.timeframe')}
        </span>
        {presets.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onDateFilter(option.id)}
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              dateFilter === option.id
                ? option.id === 'overdue'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-[#549E9E] border-[#549E9E] text-white'
                : 'bg-white border-gray-200 text-gray-500 hover:border-[#549E9E]/30'
            }`}
          >
            {option.label}
          </button>
        ))}
        <div className="min-w-[140px]">
          <FilterDropdown
            hideLabel
            compact
            label={t('reports_next.more_options')}
            value={
              dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year'
                ? dateFilter
                : ''
            }
            onChange={onDateFilter}
            icon={Calendar}
            options={[
              { id: '2_months', label: t('reports_next.two_months') },
              { id: '3_months', label: t('reports_next.three_months') },
              { id: '6_months', label: t('reports_next.six_months') },
              { id: '1_year', label: t('reports_next.one_year') },
              { id: '2_years', label: t('reports_next.two_years') },
              { id: '3_years', label: t('reports_next.three_years') },
            ]}
          />
        </div>
        {dateFilter === 'custom' && (
          <div className="flex gap-2 items-center">
            <CustomDatePicker
              label=""
              value={customDateRange.from}
              onChange={(date) => onCustomDateRange((prev) => ({ ...prev, from: date }))}
              allowClear={false}
            />
            <span className="text-gray-400 text-xs font-bold">{t('reports_next.to')}</span>
            <CustomDatePicker
              label=""
              value={customDateRange.to}
              onChange={(date) => onCustomDateRange((prev) => ({ ...prev, to: date }))}
              allowClear={false}
              minDate={customDateRange.from}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 self-stretch md:self-auto">
        {showPrint && (
          <button
            type="button"
            onClick={() => window.print()}
            className="cursor-pointer bg-white text-gray-600 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:border-[#549E9E] transition-all flex items-center gap-2 border border-gray-200 justify-center"
          >
            <Printer size={13} /> {t('reports_next.print')}
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border border-[#549E9E]/10 justify-center"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} /> {t('reports_next.refresh')}
        </button>
      </div>
    </div>
  );
};
