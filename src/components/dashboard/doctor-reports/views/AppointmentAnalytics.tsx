import React from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, Calendar, CalendarCheck, CheckCircle2, ShieldPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { FilterDropdown } from '../components/FilterDropdown';
import { SummaryMetricCard } from '../components/SummaryMetricCard';
import { useReportData } from '../hooks/useReportData';
import CustomDatePicker from '../../../CustomDatePicker';

interface AppointmentAnalyticsProps {
  token: string | null;
}

export const AppointmentAnalytics: React.FC<AppointmentAnalyticsProps> = ({ token }) => {
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'appointments');

  const dateKey = (value: string) => {
    const raw = String(value || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const num = (value: unknown) => Number(value || 0);
  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const dailyRows = data?.date_wise_appointments || [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const todayRow = dailyRows.find((row: any) => dateKey(row.appointment_date) === localDateKey(today));
  const yesterdayRow = dailyRows.find((row: any) => dateKey(row.appointment_date) === localDateKey(yesterday));
  const previousRow = dailyRows.length >= 2 ? dailyRows[dailyRows.length - 2] : null;
  const latestRow = dailyRows.length >= 1 ? dailyRows[dailyRows.length - 1] : null;
  const compareRow = yesterdayRow || previousRow;
  const vsLabel = yesterdayRow ? 'than yesterday' : previousRow ? 'vs previous day' : 'for this period';

  const pendingDelta = compareRow ? pctChange(num((todayRow || latestRow)?.pending_appointments), num(compareRow.pending_appointments)) : 0;
  const completedDelta = compareRow ? pctChange(num((todayRow || latestRow)?.completed_appointments), num(compareRow.completed_appointments)) : 0;
  const newToday = num(todayRow?.total_appointments);

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
    date: new Date(row.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
    { name: 'Completed', value: completedCount, color: '#10B981' },
    { name: 'Pending', value: pendingCount, color: '#F59E0B' },
    { name: 'Cancelled', value: cancelledCount, color: '#EF4444' },
    ...(confirmedCount > 0 ? [{ name: 'Confirmed', value: confirmedCount, color: '#549E9E' }] : []),
  ];
  const pieData = statusChartData.filter((item) => item.value > 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Overview / Booked vs Consulted tabs removed — they are in Reports Menu */}
      {/* Filters Header */}
      <div className="bg-[#549E9E]/5 px-4 py-2 rounded-xl border border-[#549E9E]/20 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-1">Filter by Date</label>
            {[
              { id: 'today', label: 'Today' },
              { id: '1_week', label: '1 Week' },
              { id: '1_month', label: '1 Month' },
              { id: 'custom', label: 'Custom' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDateFilter(t.id)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${dateFilter === t.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#549E9E]/30'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <div className="min-w-[140px]">
                <FilterDropdown
                  hideLabel={true}
                  compact={true}
                  label="More Options"
                  value={dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year' || dateFilter === 'custom' ? dateFilter : ''}
                  onChange={setDateFilter}
                  icon={Calendar}
                  options={[
                    { id: '2_months', label: '2 Months' },
                    { id: '3_months', label: '3 Months' },
                    { id: '6_months', label: '6 Months' },
                    { id: '1_year', label: '1 Year' },
                    { id: '2_years', label: '2 Years' },
                    { id: '3_years', label: '3 Years' }
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
                <span className="text-gray-400 text-xs font-bold">to</span>
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
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
         <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !data ? (
         <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
           <CalendarCheck className="text-[#549E9E]/40 mb-4" size={48} />
           <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">No Data Available</h4>
         </div>
      ) : (
         <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryMetricCard
                title="Pending"
                value={pendingCount}
                icon={Calendar}
                theme="rose"
                trend={{
                  direction: pendingDelta < 0 ? 'down' : pendingDelta > 0 ? 'up' : 'neutral',
                  tone: pendingDelta <= 0 ? 'good' : 'bad',
                  label: compareRow ? `${Math.abs(pendingDelta)}% ${vsLabel}` : vsLabel,
                }}
                sparkline={pendingSpark}
                delay={0}
              />
              <SummaryMetricCard
                title="Completed"
                value={completedCount}
                icon={CheckCircle2}
                theme="green"
                trend={{
                  direction: completedDelta > 0 ? 'up' : completedDelta < 0 ? 'down' : 'neutral',
                  tone: completedDelta >= 0 ? 'good' : 'bad',
                  label: compareRow ? `${Math.abs(completedDelta)}% ${vsLabel}` : vsLabel,
                }}
                sparkline={completedSpark}
                delay={0.08}
              />
              <SummaryMetricCard
                title="Total Appointments"
                value={statusTotal}
                icon={Calendar}
                theme="blue"
                trend={{
                  direction: 'neutral',
                  tone: 'info',
                  label: `+ ${newToday} new today`,
                }}
                sparkline={totalSpark}
                delay={0.16}
              />
              <SummaryMetricCard
                title="Consultation Rate"
                value={`${completedPct}%`}
                icon={ShieldPlus}
                theme="teal"
                trend={{
                  direction: weekDelta > 0 ? 'up' : weekDelta < 0 ? 'down' : 'neutral',
                  tone: weekDelta >= 0 ? 'good' : 'bad',
                  label: prev7.length > 0 ? `${Math.abs(weekDelta)}% this week` : 'for selected period',
                }}
                progress={completedPct}
                delay={0.24}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Appointments Trend</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total vs Completed over time</p>
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
                        <Area type="monotone" dataKey="total" stroke="#549E9E" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="Total Appts" />
                        <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      Not enough data for trend chart
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex flex-col">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Appointment Status</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Based on selected date filter</p>
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
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [value, name]}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-gray-800 leading-none">{completedPct}%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Completed</span>
                      </div>
                    </div>
                    <div className="w-full space-y-3">
                      {statusChartData.map((item) => {
                        const pct = statusTotal > 0 ? Math.round((item.value / statusTotal) * 100) : 0;
                        return (
                          <div key={item.name} className="flex items-center justify-between gap-3">
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
                    No status data for this filter
                  </div>
                )}
              </div>
            </div>
         </div>
      )}
    </div>
  );
};
