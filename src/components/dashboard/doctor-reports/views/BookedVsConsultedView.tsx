import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
  Users,
  Percent,
  TrendingUp,
  RefreshCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { FilterDropdown } from '../components/FilterDropdown';
import { SummaryMetricCard } from '../components/SummaryMetricCard';
import ChartInfoButton from '../components/ChartInfoButton';
import { useTranslation } from 'react-i18next';

interface BookedVsConsultedViewProps {
  token: string | null;
}

const AutoSizedChart: React.FC<{ children: (width: number, height: number) => React.ReactNode; height?: number }> = ({ children, height = 320 }) => {
  const { t } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.offsetWidth || el.getBoundingClientRect().width;
      if (w > 0) {
        setWidth(w);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full relative min-h-[320px]">
      {width > 0 ? (
        children(width, height)
      ) : (
        <div className="w-full h-[320px] flex items-center justify-center text-xs text-gray-400 font-bold">
          {t('reports.bvc.rendering_chart')}
        </div>
      )}
    </div>
  );
};

export const BookedVsConsultedView: React.FC<BookedVsConsultedViewProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Pagination for Day-wise chart (Level 2)
  const [daysPerPage, setDaysPerPage] = useState<number>(10);
  const [dayPage, setDayPage] = useState<number>(1);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrilldownReport = async (year: number, month: number | null, date: string | null) => {
    setIsLoading(true);
    setError(null);
    setData(null); // Clear stale data to prevent showing old level's chart
    try {
      const params = new URLSearchParams();
      params.append('year', String(year));
      if (month) params.append('month', String(month));
      if (date) params.append('date', date);

      const res = await fetch(`/api/v1/reports/booked-vs-consulted?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || t('reports.bvc.fetch_failed', 'Failed to fetch drilldown report'));
      }
    } catch (err: any) {
      setError(err.message || t('reports.bvc.server_error', 'Error connecting to server'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrilldownReport(selectedYear, selectedMonth, selectedDate);
    setDayPage(1);
  }, [selectedYear, selectedMonth, selectedDate, token]);

  // Available Years dropdown options
  const yearOptions = useMemo(() => {
    const currentY = new Date().getFullYear();
    return [currentY, currentY - 1, currentY - 2, currentY - 3];
  }, []);

  // Handlers for navigation
  const handleSelectMonth = (monthNum: number) => {
    setSelectedMonth(monthNum);
    setSelectedDate(null);
    setDayPage(1);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleResetToYear = () => {
    setSelectedMonth(null);
    setSelectedDate(null);
  };

  const handleResetToMonth = () => {
    setSelectedDate(null);
  };

  // Pre-formatted Month items for Level 1 Chart
  const monthLabel = (monthNum: number, style: 'long' | 'short' = 'long') =>
    new Date(selectedYear, monthNum - 1, 1).toLocaleDateString(dateLocale, { month: style });

  const formattedMonths = useMemo(() => {
    if (!data || data.level !== 'YEAR_MONTHS' || !Array.isArray(data.months)) return [];
    return data.months.map((m: any) => ({
      ...m,
      month_name: new Date(selectedYear, m.month - 1, 1).toLocaleDateString(dateLocale, { month: 'short' }),
    }));
  }, [data, dateLocale, selectedYear]);

  // Pre-formatted Day items for Level 2 Chart
  const formattedDays = useMemo(() => {
    if (!data || data.level !== 'MONTH_DAYS' || !Array.isArray(data.days)) return [];
    return data.days.map((d: any) => {
      const weekday = new Date(d.date).toLocaleDateString(dateLocale, { weekday: 'short' });
      const month = new Date(selectedYear, (data.month || selectedMonth || 1) - 1, 1).toLocaleDateString(dateLocale, { month: 'long' });
      return {
        ...d,
        display_label: `${d.day_number} ${weekday}`,
        full_label: `${d.day_number} ${month} ${data.year || selectedYear} (${weekday})`,
      };
    });
  }, [data, dateLocale, selectedMonth, selectedYear]);

  // Computed Slot-wise data for Level 3 Chart (Patient Appointments List View)
  const slotBreakdown = useMemo(() => {
    if (!data || data.level !== 'DAY_PATIENTS' || !Array.isArray(data.patients)) return [];
    const map = new Map<string, { slot_name: string; booked_count: number; consulted_count: number; unconsulted_count: number; rejected_count: number; cancelled_count: number }>();
    data.patients.forEach((p: any) => {
      const slot = p.slot_name || t('reports.bvc.general_slot');
      const existing = map.get(slot) || { slot_name: slot, booked_count: 0, consulted_count: 0, unconsulted_count: 0, rejected_count: 0, cancelled_count: 0 };
      existing.booked_count += 1;
      if (p.is_consulted) {
        existing.consulted_count += 1;
      } else if (p.is_rejected) {
        existing.rejected_count += 1;
      } else if (p.is_cancelled) {
        existing.cancelled_count += 1;
      } else {
        existing.unconsulted_count += 1;
      }
      map.set(slot, existing);
    });
    return Array.from(map.values());
  }, [data, t]);

  const paginatedDays = useMemo(() => {
    if (formattedDays.length === 0) return [];
    if (daysPerPage === 0) return formattedDays; // 0 means 'All Days'

    const startIndex = (dayPage - 1) * daysPerPage;
    return formattedDays.slice(startIndex, startIndex + daysPerPage);
  }, [formattedDays, daysPerPage, dayPage]);

  const maxDayPages = useMemo(() => {
    if (formattedDays.length === 0 || daysPerPage === 0) return 1;
    return Math.ceil(formattedDays.length / daysPerPage);
  }, [formattedDays, daysPerPage]);

  const barBooked = t('reports.bvc.booked');
  const barConsulted = t('reports.bvc.consulted');
  const barUnconsulted = t('reports.bvc.unconsulted');
  const barRejected = t('reports.bvc.rejected');
  const barCancelled = t('reports.cancelled');
  const currentMonthName = selectedMonth ? monthLabel(selectedMonth) : '';

  return (
    <div className="flex flex-col h-full space-y-6 pb-8">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-[#549E9E]/12 via-white to-sky-50 px-4 py-2.5 rounded-xl border border-[#549E9E]/20 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          {(selectedMonth || selectedDate) && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#549E9E]">
              {selectedMonth && (
                <button
                  onClick={handleResetToMonth}
                  className={`flex items-center gap-1 cursor-pointer ${selectedDate ? 'hover:underline text-[#549E9E]' : 'text-gray-700 font-extrabold'}`}
                >
                  {data?.month ? monthLabel(data.month) : currentMonthName || t('reports.bvc.month_n', { n: selectedMonth })}
                </button>
              )}

              {selectedDate && (
                <>
                  <ChevronRight size={12} className="text-gray-400" />
                  <span className="text-gray-700 font-black">
                    {new Date(selectedDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          )}
          <h2 className="text-base sm:text-lg font-black text-gray-800 tracking-tight leading-tight">
            {t('reports.bvc.title')}
          </h2>
          <p className="text-[11px] font-bold text-gray-500">
            {t('reports.bvc.subtitle')}
          </p>
        </div>

        {/* Year Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[140px]">
            <FilterDropdown
              hideLabel={true}
              compact={true}
              label={t('reports.bvc.year')}
              icon={Calendar}
              value={String(selectedYear)}
              onChange={(year) => {
                setSelectedYear(Number(year));
                setSelectedMonth(null);
                setSelectedDate(null);
              }}
              options={yearOptions.map((year) => ({ id: String(year), label: String(year) }))}
            />
          </div>

          <button
            onClick={() => fetchDrilldownReport(selectedYear, selectedMonth, selectedDate)}
            className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border border-[#549E9E]/10"
          >
            <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> {t('reports.refresh')}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center min-h-[350px]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <RefreshCcw className="text-[#549E9E] w-10 h-10" />
          </motion.div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
          <AlertCircle size={18} /> {error}
        </div>
      ) : !data ? (
        <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
          <CalendarCheck className="text-[#549E9E]/40 mb-4" size={48} />
          <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">{t('reports.no_data')}</h4>
        </div>
      ) : (
        <div className="space-y-6">

          {/* LEVEL 1: YEAR OVERVIEW (12 MONTHS) */}
          {data.level === 'YEAR_MONTHS' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-6 gap-3">
                <SummaryMetricCard
                  title={t('reports.bvc.total_booked_year', { year: selectedYear })}
                  value={data.total_booked_year}
                  icon={CalendarCheck}
                  theme="teal"
                  subtitle={t('reports.bvc.appointments_created')}
                  delay={0}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.total_consulted_year', { year: selectedYear })}
                  value={data.total_consulted_year}
                  icon={CheckCircle2}
                  theme="green"
                  subtitle={t('reports.bvc.patients_examined')}
                  delay={0.05}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.unconsulted_pending')}
                  value={data.total_unconsulted_year}
                  icon={Clock}
                  theme="amber"
                  subtitle={t('reports.bvc.awaiting_consultation')}
                  delay={0.1}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.rejected')}
                  value={data.total_rejected_year}
                  icon={AlertCircle}
                  theme="violet"
                  subtitle={t('reports.bvc.rejected_by_reception')}
                  delay={0.15}
                />
                <SummaryMetricCard
                  title={t('reports.cancelled')}
                  value={data.total_cancelled_year}
                  icon={AlertCircle}
                  theme="rose"
                  subtitle={t('reports.bvc.other_cancellations')}
                  delay={0.2}
                />
                <SummaryMetricCard
                  title={t('reports.consultation_rate')}
                  value={`${data.overall_consultation_rate}%`}
                  icon={Percent}
                  theme="blue"
                  subtitle={t('reports.bvc.booked_to_consulted')}
                  delay={0.25}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t('reports.bvc.measurable_bifurcation')}</div>
                  <div className="text-sm font-black text-slate-700 mt-1">{t('reports.bvc.counted_once')}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{t('reports.bvc.booked_n', { count: data.total_booked_year })}</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{t('reports.bvc.consulted_n', { count: data.total_consulted_year })}</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-amber-700">{t('reports.bvc.unconsulted_n', { count: data.total_unconsulted_year })}</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-violet-700">{t('reports.bvc.rejected_n', { count: data.total_rejected_year })}</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-red-700">{t('reports.bvc.cancelled_n', { count: data.total_cancelled_year })}</span>
                </div>
              </div>

              {/* Monthly Bar Chart */}
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">{t('reports.bvc.month_wise_title', { year: selectedYear })}</h4>
                      <ChartInfoButton infoKey="month_wise_comparison" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t('reports.bvc.month_wise_hint')}</p>
                  </div>
                </div>
                <div className="h-[340px] w-full min-h-[340px] relative">
                  <AutoSizedChart height={320}>
                    {(chartWidth, chartHeight) => (
                      <BarChart
                        width={chartWidth}
                        height={chartHeight}
                        data={formattedMonths}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            const monthNum = state.activePayload[0].payload.month;
                            if (monthNum) handleSelectMonth(monthNum);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                          dataKey="month_name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                          dx={-8}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="booked_count" name={barBooked} fill="#549E9E" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="consulted_count" name={barConsulted} fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="unconsulted_count" name={barUnconsulted} fill="#F59E0B" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="rejected_count" name={barRejected} fill="#8B5CF6" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="cancelled_count" name={barCancelled} fill="#EF4444" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                      </BarChart>
                    )}
                  </AutoSizedChart>
                </div>
              </div>

              {/* Monthly Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">{t('reports.bvc.monthly_table', { year: selectedYear })}</h4>
                  <span className="text-[10px] font-extrabold text-[#549E9E] uppercase tracking-wider">{t('reports.bvc.click_month_row')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                        <th className="p-4">{t('reports.bvc.col_month')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.booked')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.consulted')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.unconsulted')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.rejected')}</th>
                        <th className="p-4 text-center">{t('reports.cancelled')}</th>
                        <th className="p-4 text-center">{t('reports.consultation_rate')}</th>
                        <th className="p-4 text-right">{t('reports.bvc.col_action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {data.months.map((m: any) => (
                        <tr
                          key={m.month}
                          onClick={() => handleSelectMonth(m.month)}
                          className="hover:bg-[#549E9E]/5 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 font-black text-gray-800 group-hover:text-[#549E9E] flex items-center gap-2">
                            <Calendar size={14} className="text-[#549E9E]" />
                            {monthLabel(m.month)}
                          </td>
                          <td className="p-4 text-center font-extrabold text-[#549E9E]">{m.booked_count}</td>
                          <td className="p-4 text-center font-extrabold text-emerald-600">{m.consulted_count}</td>
                          <td className="p-4 text-center text-amber-600">{m.unconsulted_count}</td>
                          <td className="p-4 text-center text-violet-600">{m.rejected_count}</td>
                          <td className="p-4 text-center text-red-500">{m.cancelled_count}</td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-black">
                              {m.consultation_rate}%
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-wider group-hover:underline flex items-center justify-end gap-1">
                              {t('reports.bvc.view_days')} <ChevronRight size={14} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 2: MONTH DRILLDOWN (DAY-WISE) */}
          {data.level === 'MONTH_DAYS' && (
            <div className="space-y-6">

              <div className="flex justify-end items-center">
                <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {t('reports.bvc.showing', { month: monthLabel(data.month), year: selectedYear, days: data.total_days })}
                </div>
              </div>

              {/* Month Stat Cards */}
              <div className="grid grid-cols-6 gap-3">
                <SummaryMetricCard
                  title={t('reports.bvc.booked_in', { month: monthLabel(data.month) })}
                  value={data.total_booked_month}
                  icon={CalendarCheck}
                  theme="teal"
                  subtitle={t('reports.bvc.appointments_created')}
                  delay={0}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.consulted_in', { month: monthLabel(data.month) })}
                  value={data.total_consulted_month}
                  icon={CheckCircle2}
                  theme="green"
                  subtitle={t('reports.bvc.patients_examined')}
                  delay={0.05}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.unconsulted_pending')}
                  value={data.total_unconsulted_month}
                  icon={Clock}
                  theme="amber"
                  subtitle={t('reports.bvc.awaiting_consultation')}
                  delay={0.1}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.rejected')}
                  value={data.total_rejected_month}
                  icon={AlertCircle}
                  theme="violet"
                  subtitle={t('reports.bvc.rejected_by_reception')}
                  delay={0.15}
                />
                <SummaryMetricCard
                  title={t('reports.cancelled')}
                  value={data.total_cancelled_month}
                  icon={AlertCircle}
                  theme="rose"
                  subtitle={t('reports.bvc.other_cancellations')}
                  delay={0.2}
                />
                <SummaryMetricCard
                  title={t('reports.consultation_rate')}
                  value={`${data.overall_consultation_rate}%`}
                  icon={Percent}
                  theme="blue"
                  subtitle={t('reports.bvc.booked_to_consulted')}
                  delay={0.25}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">{t('reports.bvc.month_reconciliation', { month: monthLabel(data.month) })}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{t('reports.bvc.booked_n', { count: data.total_booked_month })}</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{t('reports.bvc.consulted_n', { count: data.total_consulted_month })}</span>
                  <span className="text-amber-700">+ {t('reports.bvc.unconsulted_n', { count: data.total_unconsulted_month })}</span>
                  <span className="text-violet-700">+ {t('reports.bvc.rejected_n', { count: data.total_rejected_month })}</span>
                  <span className="text-red-700">+ {t('reports.bvc.cancelled_n', { count: data.total_cancelled_month })}</span>
                </div>
              </div>

              {/* Manageable Daily Bar Chart with Pagination / Items per page */}
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetToYear}
                      className="cursor-pointer text-xs font-black text-[#549E9E] hover:bg-[#549E9E]/10 flex items-center gap-1.5 bg-[#549E9E]/5 px-3 py-2 border border-[#549E9E]/20 rounded-xl shadow-xs transition-colors"
                      title={t('reports.bvc.back_year')}
                    >
                      <ArrowLeft size={16} /> {t('reports.bvc.back_year')}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                          {t('reports.bvc.daily_chart', { month: monthLabel(data.month), year: selectedYear })}
                        </h4>
                        <ChartInfoButton infoKey="daily_booked_vs_consulted" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {t('reports.bvc.click_day')}
                      </p>
                    </div>
                  </div>

                  {/* Chart Page Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{t('reports.bvc.days_per_page')}</span>
                      <select
                        value={daysPerPage}
                        onChange={(e) => {
                          setDaysPerPage(Number(e.target.value));
                          setDayPage(1);
                        }}
                        className="text-xs font-black text-[#549E9E] bg-transparent outline-none cursor-pointer"
                      >
                        <option value={7}>{t('reports.bvc.days_1wk')}</option>
                        <option value={10}>{t('reports.bvc.days_n', { n: 10 })}</option>
                        <option value={15}>{t('reports.bvc.days_n', { n: 15 })}</option>
                        <option value={0}>{t('reports.bvc.all_days', { n: data.total_days })}</option>
                      </select>
                    </div>

                    {daysPerPage > 0 && maxDayPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          disabled={dayPage === 1}
                          onClick={() => setDayPage(p => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-black text-gray-700 px-2">
                          {t('reports.bvc.page_of', { page: dayPage, total: maxDayPages })}
                        </span>
                        <button
                          disabled={dayPage === maxDayPages}
                          onClick={() => setDayPage(p => Math.min(maxDayPages, p + 1))}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-[340px] w-full min-h-[340px] relative">
                  {paginatedDays.length > 0 ? (
                    <AutoSizedChart height={320}>
                      {(chartWidth, chartHeight) => (
                        <BarChart
                          width={chartWidth}
                          height={chartHeight}
                          data={paginatedDays}
                          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                          onClick={(state: any) => {
                            if (state && state.activePayload && state.activePayload.length > 0) {
                              const dateStr = state.activePayload[0].payload.date;
                              handleSelectDate(dateStr);
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis
                            dataKey="display_label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                            dy={8}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                            dx={-8}
                          />
                          <Tooltip
                            labelFormatter={(val, payload) => payload?.[0]?.payload?.full_label || val}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="booked_count" name={barBooked} fill="#549E9E" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="consulted_count" name={barConsulted} fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="unconsulted_count" name={barUnconsulted} fill="#F59E0B" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="rejected_count" name={barRejected} fill="#8B5CF6" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="cancelled_count" name={barCancelled} fill="#EF4444" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                        </BarChart>
                      )}
                    </AutoSizedChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      {t('reports.bvc.no_days')}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Data Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                    {t('reports.bvc.daily_table', { month: monthLabel(data.month), year: selectedYear })}
                  </h4>
                  <span className="text-[10px] font-extrabold text-[#549E9E] uppercase tracking-wider">{t('reports.bvc.click_date_row')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                        <th className="p-4">{t('reports.bvc.col_date_day')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.booked')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.consulted')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.unconsulted')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.rejected')}</th>
                        <th className="p-4 text-center">{t('reports.cancelled')}</th>
                        <th className="p-4 text-center">{t('reports.bvc.col_rate')}</th>
                        <th className="p-4 text-right">{t('reports.bvc.col_patients')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {data.days.map((d: any) => (
                        <tr
                          key={d.date}
                          onClick={() => handleSelectDate(d.date)}
                          className="hover:bg-[#549E9E]/5 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 font-black text-gray-800 group-hover:text-[#549E9E] flex items-center gap-2">
                            <Calendar size={14} className="text-[#549E9E]" />
                            {new Date(d.date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', weekday: 'short' })}
                          </td>
                          <td className="p-4 text-center font-extrabold text-[#549E9E]">{d.booked_count}</td>
                          <td className="p-4 text-center font-extrabold text-emerald-600">{d.consulted_count}</td>
                          <td className="p-4 text-center text-amber-600">{d.unconsulted_count}</td>
                          <td className="p-4 text-center text-violet-600">{d.rejected_count}</td>
                          <td className="p-4 text-center text-red-500">{d.cancelled_count}</td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-black">
                              {d.consultation_rate}%
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-wider group-hover:underline flex items-center justify-end gap-1">
                              {t('reports.bvc.view_list', { count: d.booked_count })} <ChevronRight size={14} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL 3: DAY DRILLDOWN (PATIENT-WISE LIST) */}
          {data.level === 'DAY_PATIENTS' && (
            <div className="space-y-6">
              <div className="flex justify-end items-center">
                <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {t('reports.bvc.date_label', { date: new Date(data.date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })}
                </div>
              </div>

              {/* Day Stat Overview */}
              <div className="grid grid-cols-6 gap-3">
                <SummaryMetricCard
                  title={t('reports.bvc.total_booked')}
                  value={data.total_booked}
                  icon={Users}
                  theme="teal"
                  subtitle={t('reports.bvc.appointments_created')}
                  delay={0}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.consulted_patients')}
                  value={data.total_consulted}
                  icon={CheckCircle2}
                  theme="green"
                  subtitle={t('reports.bvc.patients_examined')}
                  delay={0.05}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.unconsulted_pending')}
                  value={data.total_unconsulted}
                  icon={Clock}
                  theme="amber"
                  subtitle={t('reports.bvc.awaiting_consultation')}
                  delay={0.1}
                />
                <SummaryMetricCard
                  title={t('reports.bvc.rejected')}
                  value={data.total_rejected}
                  icon={AlertCircle}
                  theme="violet"
                  subtitle={t('reports.bvc.rejected_by_reception')}
                  delay={0.15}
                />
                <SummaryMetricCard
                  title={t('reports.cancelled')}
                  value={data.total_cancelled}
                  icon={AlertCircle}
                  theme="rose"
                  subtitle={t('reports.bvc.other_cancellations')}
                  delay={0.2}
                />
                <SummaryMetricCard
                  title={t('reports.consultation_rate')}
                  value={`${data.total_booked > 0 ? ((data.total_consulted / data.total_booked) * 100).toFixed(1) : 0}%`}
                  icon={Percent}
                  theme="blue"
                  subtitle={t('reports.bvc.booked_to_consulted')}
                  delay={0.25}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">{t('reports.bvc.daily_reconciliation')}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{t('reports.bvc.booked_n', { count: data.total_booked })}</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{t('reports.bvc.consulted_n', { count: data.total_consulted })}</span>
                  <span className="text-amber-700">+ {t('reports.bvc.unconsulted_n', { count: data.total_unconsulted })}</span>
                  <span className="text-violet-700">+ {t('reports.bvc.rejected_n', { count: data.total_rejected })}</span>
                  <span className="text-red-700">+ {t('reports.bvc.cancelled_n', { count: data.total_cancelled })}</span>
                </div>
              </div>

              {/* Level 3 Chart: Daily Slot-wise Booked vs Consulted Chart */}
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetToMonth}
                      className="cursor-pointer text-xs font-black text-[#549E9E] uppercase tracking-wider hover:underline flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg shadow-2xs"
                    >
                      <ArrowLeft size={14} /> {t('reports.bvc.back_month')}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                          {t('reports.bvc.daily_appts_chart', { date: new Date(data.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                        </h4>
                        <ChartInfoButton infoKey="daily_slot_appointments" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {t('reports.bvc.slot_wise')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-[340px] w-full min-h-[340px] relative">
                  {slotBreakdown.length > 0 ? (
                    <AutoSizedChart height={320}>
                      {(chartWidth, chartHeight) => (
                        <BarChart
                          width={chartWidth}
                          height={chartHeight}
                          data={slotBreakdown}
                          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis
                            dataKey="slot_name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                            dy={8}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                            dx={-8}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontWeight: 'bold' }} />
                          <Bar dataKey="booked_count" name={barBooked} fill="#549E9E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="consulted_count" name={barConsulted} fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="unconsulted_count" name={barUnconsulted} fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="rejected_count" name={barRejected} fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="cancelled_count" name={barCancelled} fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      )}
                    </AutoSizedChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      {t('reports.bvc.no_slot_data')}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient List Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                    {t('reports.bvc.patient_list', { date: new Date(data.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                  </h4>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{t('reports.bvc.total_patients', { count: data.patients.length })}</span>
                </div>
                <div className="overflow-x-auto">
                  {data.patients.length > 0 ? (
                    <table className="w-full min-w-[900px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                          <th className="p-4">{t('reports.bvc.col_token')}</th>
                          <th className="p-4">{t('reports.bvc.col_patient')}</th>
                          <th className="p-4">{t('reports.bvc.col_mobile')}</th>
                          <th className="p-4">{t('reports.bvc.col_treatment')}</th>
                          <th className="p-4">{t('reports.bvc.col_branch')}</th>
                          <th className="p-4">{t('reports.bvc.col_slot')}</th>
                          <th className="p-4 text-center">{t('reports.bvc.col_status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                        {data.patients.map((p: any) => (
                          <tr key={p.appointment_id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-black text-[#549E9E]">
                              #{p.token_number || p.appointment_id}
                            </td>
                            <td className="p-4">
                              <div className="font-extrabold text-gray-800">{p.patient_name}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">{p.patient_uuid}</div>
                            </td>
                            <td className="p-4 text-gray-600">{p.patient_mobile}</td>
                            <td className="p-4 font-bold text-gray-800">{p.treatment_name}</td>
                            <td className="p-4 text-gray-600">{p.branch_name}</td>
                            <td className="p-4 text-gray-500 text-[11px] font-bold">{p.slot_name}</td>
                            <td className="p-4 text-center">
                              {p.is_consulted ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                                  <CheckCircle2 size={12} /> {t('reports.bvc.status_consulted')}
                                </span>
                              ) : p.is_rejected ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-black uppercase tracking-wider">
                                    {t('reports.bvc.rejected')}
                                  </span>
                                  {p.reception_rejection_reason && (
                                    <div className="text-[9px] font-bold text-violet-500">{p.reception_rejection_reason}</div>
                                  )}
                                  {p.reception_rejected_at && (
                                    <div className="text-[9px] font-bold text-gray-400">
                                      {new Date(p.reception_rejected_at).toLocaleString(dateLocale)}
                                    </div>
                                  )}
                                </div>
                              ) : p.is_cancelled ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider">
                                  {t('reports.cancelled')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                                  <Clock size={12} /> {t('reports.bvc.status_booked', { status: p.status })}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                      {t('reports.bvc.no_appts_day')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
