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
  Filter
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

interface BookedVsConsultedViewProps {
  token: string | null;
}

const AutoSizedChart: React.FC<{ children: (width: number, height: number) => React.ReactNode; height?: number }> = ({ children, height = 320 }) => {
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
          Rendering chart...
        </div>
      )}
    </div>
  );
};

export const BookedVsConsultedView: React.FC<BookedVsConsultedViewProps> = ({ token }) => {
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
        setError(result.message || 'Failed to fetch drilldown report');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
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
  const formattedMonths = useMemo(() => {
    if (!data || data.level !== 'YEAR_MONTHS' || !Array.isArray(data.months)) return [];
    return data.months;
  }, [data]);

  // Pre-formatted Day items for Level 2 Chart
  const formattedDays = useMemo(() => {
    if (!data || data.level !== 'MONTH_DAYS' || !Array.isArray(data.days)) return [];
    return data.days.map((d: any) => ({
      ...d,
      display_label: `${d.day_number} ${d.day_name}`,
      full_label: `${d.day_number} ${data.month_name || ''} ${data.year || ''} (${d.day_name})`,
    }));
  }, [data]);

  // Computed Slot-wise data for Level 3 Chart (Patient Appointments List View)
  const slotBreakdown = useMemo(() => {
    if (!data || data.level !== 'DAY_PATIENTS' || !Array.isArray(data.patients)) return [];
    const map = new Map<string, { slot_name: string; booked_count: number; consulted_count: number; unconsulted_count: number; rejected_count: number; cancelled_count: number }>();
    data.patients.forEach((p: any) => {
      const slot = p.slot_name || 'General Slot';
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
  }, [data]);

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

  return (
    <div className="flex flex-col h-full space-y-6 pb-8">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-[#549E9E]/12 via-white to-sky-50 p-5 sm:p-6 rounded-2xl border border-[#549E9E]/20 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#549E9E]">
            <button
              onClick={handleResetToYear}
              className="hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Calendar size={14} /> Year {selectedYear}
            </button>

            {selectedMonth && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <button
                  onClick={handleResetToMonth}
                  className={`flex items-center gap-1 cursor-pointer ${selectedDate ? 'hover:underline text-[#549E9E]' : 'text-gray-700 font-extrabold'}`}
                >
                  {data?.month_name || `Month ${selectedMonth}`}
                </button>
              </>
            )}

            {selectedDate && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-700 font-black">
                  {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
            Booked vs Consulted Drilldown Analytics
          </h2>
          <p className="text-[11px] sm:text-xs font-bold text-gray-500">
            Every booked appointment is reconciled into one clear outcome.
          </p>
        </div>

        {/* Year Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-gray-200 rounded-xl shadow-xs">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonth(null);
                setSelectedDate(null);
              }}
              className="text-xs font-black text-[#549E9E] bg-transparent outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchDrilldownReport(selectedYear, selectedMonth, selectedDate)}
            className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
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
          <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">No Data Available</h4>
        </div>
      ) : (
        <div className="space-y-6">

          {/* LEVEL 1: YEAR OVERVIEW (12 MONTHS) */}
          {data.level === 'YEAR_MONTHS' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Total Booked ({selectedYear})</span>
                    <CalendarCheck size={18} className="text-[#549E9E]" />
                  </div>
                  <div className="text-2xl font-black text-gray-800">{data.total_booked_year}</div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Appointments Created</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-emerald-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Total Consulted ({selectedYear})</span>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{data.total_consulted_year}</div>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Patients Examined</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-amber-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Unconsulted / Pending</span>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    {data.total_unconsulted_year}
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">Awaiting Consultation</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-violet-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-violet-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Rejected</span>
                    <AlertCircle size={18} className="text-violet-500" />
                  </div>
                  <div className="text-2xl font-black text-violet-700">{data.total_rejected_year}</div>
                  <span className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mt-1">Rejected by Reception</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-red-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="text-2xl font-black text-red-700">{data.total_cancelled_year}</div>
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Other Cancellations</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-sky-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Consultation Rate</span>
                    <Percent size={18} className="text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-sky-700">{data.overall_consultation_rate}%</div>
                  <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest mt-1">Booked to Consulted Ratio</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Measurable bifurcation</div>
                  <div className="text-sm font-black text-slate-700 mt-1">Every booked appointment is counted exactly once below.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{data.total_booked_year} Booked</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{data.total_consulted_year} Consulted</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-amber-700">{data.total_unconsulted_year} Unconsulted</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-violet-700">{data.total_rejected_year} Rejected</span>
                  <span className="text-slate-300">+</span>
                  <span className="text-red-700">{data.total_cancelled_year} Cancelled</span>
                </div>
              </div>

              {/* Monthly Bar Chart */}
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Month-wise Comparison ({selectedYear})</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Click any bar or month row to drill down day-wise</p>
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
                        <Bar dataKey="booked_count" name="Booked" fill="#549E9E" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="consulted_count" name="Consulted" fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="unconsulted_count" name="Unconsulted" fill="#F59E0B" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="rejected_count" name="Rejected" fill="#8B5CF6" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                        <Bar dataKey="cancelled_count" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => { const m = entry?.payload?.month || entry?.month; if (m) handleSelectMonth(m); }} />
                      </BarChart>
                    )}
                  </AutoSizedChart>
                </div>
              </div>

              {/* Monthly Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Monthly Summary Table ({selectedYear})</h4>
                  <span className="text-[10px] font-extrabold text-[#549E9E] uppercase tracking-wider">Click a month row to drill down</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                        <th className="p-4">Month</th>
                        <th className="p-4 text-center">Booked</th>
                        <th className="p-4 text-center">Consulted</th>
                        <th className="p-4 text-center">Unconsulted</th>
                        <th className="p-4 text-center">Rejected</th>
                        <th className="p-4 text-center">Cancelled</th>
                        <th className="p-4 text-center">Consultation Rate</th>
                        <th className="p-4 text-right">Action</th>
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
                            {m.month_name}
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
                              View Days <ChevronRight size={14} />
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
                  Showing: <span className="text-gray-800">{data.month_name} {selectedYear}</span> ({data.total_days} Days)
                </div>
              </div>

              {/* Month Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Booked in {data.month_name}</span>
                    <CalendarCheck size={18} className="text-[#549E9E]" />
                  </div>
                  <div className="text-2xl font-black text-gray-800">{data.total_booked_month}</div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Month Appointments</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-emerald-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Consulted in {data.month_name}</span>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{data.total_consulted_month}</div>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Completed Consultations</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-amber-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pending / Unconsulted</span>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    {data.total_unconsulted_month}
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">Not Examined</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-violet-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-violet-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Rejected</span>
                    <AlertCircle size={18} className="text-violet-500" />
                  </div>
                  <div className="text-2xl font-black text-violet-700">{data.total_rejected_month}</div>
                  <span className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mt-1">Rejected by Reception</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-red-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="text-2xl font-black text-red-700">{data.total_cancelled_month}</div>
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Other Cancellations</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-sky-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Month Consultation Rate</span>
                    <Percent size={18} className="text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-sky-700">{data.overall_consultation_rate}%</div>
                  <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest mt-1">Success Ratio</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">{data.month_name} reconciliation</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{data.total_booked_month} Booked</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{data.total_consulted_month} Consulted</span>
                  <span className="text-amber-700">+ {data.total_unconsulted_month} Unconsulted</span>
                  <span className="text-violet-700">+ {data.total_rejected_month} Rejected</span>
                  <span className="text-red-700">+ {data.total_cancelled_month} Cancelled</span>
                </div>
              </div>

              {/* Manageable Daily Bar Chart with Pagination / Items per page */}
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetToYear}
                      className="cursor-pointer text-xs font-black text-[#549E9E] hover:bg-[#549E9E]/10 flex items-center gap-1.5 bg-[#549E9E]/5 px-3 py-2 border border-[#549E9E]/20 rounded-xl shadow-xs transition-colors"
                      title="Back to Year Overview"
                    >
                      <ArrowLeft size={16} /> Back to Year Overview
                    </button>
                    <div>
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                        Daily Booked vs Consulted Chart ({data.month_name} {selectedYear})
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Click any day bar or row to view patient-wise list
                      </p>
                    </div>
                  </div>

                  {/* Chart Page Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Days / Chart Page:</span>
                      <select
                        value={daysPerPage}
                        onChange={(e) => {
                          setDaysPerPage(Number(e.target.value));
                          setDayPage(1);
                        }}
                        className="text-xs font-black text-[#549E9E] bg-transparent outline-none cursor-pointer"
                      >
                        <option value={7}>7 Days (1 Wk)</option>
                        <option value={10}>10 Days</option>
                        <option value={15}>15 Days</option>
                        <option value={0}>All Days ({data.total_days})</option>
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
                          Page {dayPage} of {maxDayPages}
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
                          <Bar dataKey="booked_count" name="Booked" fill="#549E9E" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="consulted_count" name="Consulted" fill="#10B981" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="unconsulted_count" name="Unconsulted" fill="#F59E0B" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="rejected_count" name="Rejected" fill="#8B5CF6" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                          <Bar dataKey="cancelled_count" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry: any) => entry?.date && handleSelectDate(entry.date)} />
                        </BarChart>
                      )}
                    </AutoSizedChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      No days data for this view
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Data Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                    Daily Breakdown Table ({data.month_name} {selectedYear})
                  </h4>
                  <span className="text-[10px] font-extrabold text-[#549E9E] uppercase tracking-wider">Click a date row to view patient list</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                        <th className="p-4">Date & Day</th>
                        <th className="p-4 text-center">Booked</th>
                        <th className="p-4 text-center">Consulted</th>
                        <th className="p-4 text-center">Unconsulted</th>
                        <th className="p-4 text-center">Rejected</th>
                        <th className="p-4 text-center">Cancelled</th>
                        <th className="p-4 text-center">Rate (%)</th>
                        <th className="p-4 text-right">Patients</th>
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
                            {new Date(d.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' })}
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
                              View List ({d.booked_count}) <ChevronRight size={14} />
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
                  Date: <span className="text-gray-800">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Day Stat Overview */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-gray-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Total Booked</span>
                    <Users size={18} className="text-[#549E9E]" />
                  </div>
                  <div className="text-2xl font-black text-gray-800">{data.total_booked}</div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Appointments on Date</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-emerald-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Consulted Patients</span>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{data.total_consulted}</div>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Examined by Doctor</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-amber-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Unconsulted / Pending</span>
                    <Clock size={18} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    {data.total_unconsulted}
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">Pending Consultation</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-violet-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-violet-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Rejected</span>
                    <AlertCircle size={18} className="text-violet-500" />
                  </div>
                  <div className="text-2xl font-black text-violet-700">{data.total_rejected}</div>
                  <span className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mt-1">Rejected by Reception</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-red-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="text-2xl font-black text-red-700">{data.total_cancelled}</div>
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Other Cancellations</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-sky-200 shadow-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center text-sky-600 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Daily Success Rate</span>
                    <Percent size={18} className="text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-sky-700">
                    {data.total_booked > 0 ? ((data.total_consulted / data.total_booked) * 100).toFixed(1) : 0}%
                  </div>
                  <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest mt-1">Completed Ratio</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">Daily reconciliation</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-700">{data.total_booked} Booked</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-700">{data.total_consulted} Consulted</span>
                  <span className="text-amber-700">+ {data.total_unconsulted} Unconsulted</span>
                  <span className="text-violet-700">+ {data.total_rejected} Rejected</span>
                  <span className="text-red-700">+ {data.total_cancelled} Cancelled</span>
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
                      <ArrowLeft size={14} /> Back to Month View
                    </button>
                    <div>
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                        Daily Appointments Chart ({new Date(data.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Slot-wise Booked vs Consulted Breakdown
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
                          <Bar dataKey="booked_count" name="Booked" fill="#549E9E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="consulted_count" name="Consulted" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="unconsulted_count" name="Unconsulted" fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="rejected_count" name="Rejected" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <Bar dataKey="cancelled_count" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      )}
                    </AutoSizedChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">
                      No slot breakdown data available for this day
                    </div>
                  )}
                </div>
              </div>

              {/* Patient List Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">
                    Patient Appointments List ({new Date(data.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </h4>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Patients: {data.patients.length}</span>
                </div>
                <div className="overflow-x-auto">
                  {data.patients.length > 0 ? (
                    <table className="w-full min-w-[900px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                          <th className="p-4">Token #</th>
                          <th className="p-4">Patient Name & UUID</th>
                          <th className="p-4">Mobile</th>
                          <th className="p-4">Treatment</th>
                          <th className="p-4">Branch</th>
                          <th className="p-4">Slot</th>
                          <th className="p-4 text-center">Consultation Status</th>
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
                                  <CheckCircle2 size={12} /> Consulted
                                </span>
                              ) : p.is_rejected ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-black uppercase tracking-wider">
                                    Rejected
                                  </span>
                                  {p.reception_rejection_reason && (
                                    <div className="text-[9px] font-bold text-violet-500">{p.reception_rejection_reason}</div>
                                  )}
                                  {p.reception_rejected_at && (
                                    <div className="text-[9px] font-bold text-gray-400">
                                      {new Date(p.reception_rejected_at).toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              ) : p.is_cancelled ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider">
                                  Cancelled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                                  <Clock size={12} /> Booked ({p.status})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                      No appointments recorded for this day
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
