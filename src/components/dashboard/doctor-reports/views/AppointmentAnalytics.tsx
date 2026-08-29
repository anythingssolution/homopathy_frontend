import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, Calendar, CalendarCheck, CheckCircle2, ShieldPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { FilterDropdown } from '../components/FilterDropdown';
import { SummaryMetricCard } from '../components/SummaryMetricCard';
import ChartInfoButton from '../components/ChartInfoButton';
import { useReportData } from '../hooks/useReportData';
import CustomDatePicker from '../../../CustomDatePicker';
import { useTranslation } from 'react-i18next';

interface AppointmentAnalyticsProps {
  token: string | null;
}

export const AppointmentAnalytics: React.FC<AppointmentAnalyticsProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'appointments');
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';

  const num = (value: unknown) => Number(value || 0);

  const dailyRows = data?.date_wise_appointments || [];

  const last7 = dailyRows.slice(-7);
  const prev7 = dailyRows.slice(-14, -7);
  const rateOf = (rows: any[]) => {
    const total = rows.reduce((sum, row) => sum + num(row.total_appointments), 0);
    const completed = rows.reduce((sum, row) => sum + num(row.completed_appointments), 0);
    return total > 0 ? (completed / total) * 100 : 0;
  };
  const weekDelta = prev7.length > 0 ? Math.round(rateOf(last7) - rateOf(prev7)) : 0;

  const pendingSpark = dailyRows.map((row: any) => num(row.pending_appointments));
  const completedSpark = dailyRows.map((row: any) => num(row.completed_appointments));
  const totalSpark = dailyRows.map((row: any) => num(row.total_appointments));

  const chartData = (data?.date_wise_appointments || []).map((row: any) => ({
    date: new Date(row.appointment_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
    total: row.total_appointments,
    completed: row.completed_appointments,
  }));

  const statusCount = (name: string) =>
    Number(
      (data?.status_appointments || []).find(
        (row: any) => String(row.status || '').toLowerCase() === name
      )?.total_appointments || 0
    );

  const completedCount = statusCount('completed');
  const pendingCount = statusCount('pending');
  const cancelledCount = statusCount('cancelled');
  const confirmedCount = statusCount('confirmed');
  const statusTotal = completedCount + pendingCount + cancelledCount + confirmedCount;
  const completedPct = statusTotal > 0 ? Math.round((completedCount / statusTotal) * 100) : 0;

  const statusChartData = [
    { id: 'completed', name: t('reports.completed'), value: completedCount, color: '#10B981' },
    { id: 'pending', name: t('reports.pending'), value: pendingCount, color: '#F59E0B' },
    { id: 'cancelled', name: t('reports.cancelled'), value: cancelledCount, color: '#EF4444' },
    ...(confirmedCount > 0 ? [{ id: 'confirmed', name: t('reports.confirmed'), value: confirmedCount, color: '#549E9E' }] : []),
  ];
  const pieData = statusChartData.filter((item) => item.value > 0);
  const [activeSlice, setActiveSlice] = useState<{ name: string; value: number } | null>(null);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Overview / Booked vs Consulted tabs removed — they are in Reports Menu */}
      {/* Filters Header */}
      <div className="bg-[#549E9E]/5 px-4 py-2 rounded-xl border border-[#549E9E]/20 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-1">{t('reports.filter_by_date')}</label>
            {[
              { id: 'today', label: t('reports.today') },
              { id: '1_week', label: t('reports.one_week') },
              { id: '1_month', label: t('reports.one_month') },
              { id: 'custom', label: t('reports.custom') },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setDateFilter(option.id)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${dateFilter === option.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#549E9E]/30'
                  }`}
              >
                {option.label}
              </button>
            ))}
            <div className="min-w-[140px]">
                <FilterDropdown
                  hideLabel={true}
                  compact={true}
                  label={t('reports.more_options')}
                  value={dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year' || dateFilter === 'custom' ? dateFilter : ''}
                  onChange={setDateFilter}
                  icon={Calendar}
                  options={[
                    { id: '2_months', label: t('reports.two_months') },
                    { id: '3_months', label: t('reports.three_months') },
                    { id: '6_months', label: t('reports.six_months') },
                    { id: '1_year', label: t('reports.one_year') },
                    { id: '2_years', label: t('reports.two_years') },
                    { id: '3_years', label: t('reports.three_years') }
                  ]}
                />
            </div>
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center">
                <CustomDatePicker 
                  label=""
                  value={customDateRange.from}
                  onChange={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                  allowClear={false}
                />
                <span className="text-gray-400 text-xs font-bold">{t('reports.to')}</span>
                <CustomDatePicker 
                  label=""
                  value={customDateRange.to}
                  onChange={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                  allowClear={false}
                  minDate={customDateRange.from}
                />
              </div>
            )}
        </div>
        
        <button
          onClick={fetchReports}
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border border-[#549E9E]/10 self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> {t('reports.refresh')}
        </button>
      </div>

      {isLoading ? (
         <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !data ? (
         <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
           <CalendarCheck className="text-[#549E9E]/40 mb-4" size={48} />
           <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">{t('reports.no_data')}</h4>
         </div>
      ) : (
         <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryMetricCard
                title={t('reports.pending')}
                value={pendingCount}
                icon={Calendar}
                theme="rose"
                sparkline={pendingSpark}
                delay={0}
              />
              <SummaryMetricCard
                title={t('reports.completed')}
                value={completedCount}
                icon={CheckCircle2}
                theme="green"
                sparkline={completedSpark}
                delay={0.08}
              />
              <SummaryMetricCard
                title={t('reports.total_appointments')}
                value={statusTotal}
                icon={Calendar}
                theme="blue"
                sparkline={totalSpark}
                delay={0.16}
              />
              <SummaryMetricCard
                title={t('reports.consultation_rate')}
                value={`${completedPct}%`}
                icon={ShieldPlus}
                theme="teal"
                trend={{
                  direction: weekDelta > 0 ? 'up' : weekDelta < 0 ? 'down' : 'neutral',
                  tone: weekDelta >= 0 ? 'good' : 'bad',
                  label: prev7.length > 0 ? t('reports.this_week', { pct: Math.abs(weekDelta) }) : t('reports.selected_period'),
                }}
                progress={completedPct}
                delay={0.24}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.trend_title')}</h4>
                      <ChartInfoButton infoKey="appointments_trend" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.trend_subtitle')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-2 text-[11px] font-black text-gray-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#549E9E]" />
                      {t('reports.total_appointments')}
                    </span>
                    <span className="inline-flex items-center gap-2 text-[11px] font-black text-gray-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                      {t('reports.completed')}
                    </span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#549E9E" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#549E9E" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dx={-10} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="total" stroke="#549E9E" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name={t('reports.total_appointments')} />
                        <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" name={t('reports.completed')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      {t('reports.no_trend_data')}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.status_title')}</h4>
                    <ChartInfoButton infoKey="appointment_status" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.status_subtitle')}</p>
                </div>
                {pieData.length > 0 ? (
                  <div className="flex-1 flex flex-col sm:flex-row xl:flex-col items-center gap-4">
                    <div className="relative h-[220px] w-full max-w-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={62}
                            outerRadius={88}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(entry) => setActiveSlice({ name: entry.name, value: Number(entry.value || 0) })}
                            onMouseLeave={() => setActiveSlice(null)}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.id} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                        {activeSlice ? (
                          <>
                            <span className="text-2xl font-black text-gray-800 leading-none">{activeSlice.value}</span>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                              {activeSlice.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black text-gray-800 leading-none">{completedPct}%</span>
                            <span className="mt-1 text-[11px] font-bold text-gray-600">
                              {t('reports.completed_count', { count: completedCount })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-full space-y-3">
                      {statusChartData.map((item) => {
                        const pct = statusTotal > 0 ? Math.round((item.value / statusTotal) * 100) : 0;
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-xs font-bold text-gray-600">{item.name}</span>
                            </div>
                            <span className="text-xs font-black text-gray-800 whitespace-nowrap">
                              {item.value} <span className="text-gray-400 font-bold">({pct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm font-bold text-gray-400 min-h-[220px]">
                    {t('reports.no_status_data')}
                  </div>
                )}
              </div>
            </div>
         </div>
      )}
    </div>
  );
};
