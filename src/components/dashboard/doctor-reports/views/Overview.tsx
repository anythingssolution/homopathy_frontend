import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, Calendar, CalendarCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { FilterDropdown } from '../components/FilterDropdown';
import { StatCard } from '../components/StatCard';
import CustomDatePicker from '../../../CustomDatePicker';

interface OverviewProps {
  token: string | null;
}

export const Overview: React.FC<OverviewProps> = ({ token }) => {
  const [appointmentReports, setAppointmentReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('1_week');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let toDateObj = new Date();
      let fromDateObj = new Date();

      if (dateFilter === 'custom') {
        if (customDateRange.from) fromDateObj = new Date(customDateRange.from);
        if (customDateRange.to) toDateObj = new Date(customDateRange.to);
      } else if (dateFilter === '1_week') {
        fromDateObj.setDate(toDateObj.getDate() - 7);
      } else if (dateFilter === '1_month') {
        fromDateObj.setMonth(toDateObj.getMonth() - 1);
      } else if (dateFilter.endsWith('_months') || dateFilter.endsWith('_month')) {
        const num = parseInt(dateFilter.split('_')[0], 10);
        if (!isNaN(num)) {
          fromDateObj.setMonth(toDateObj.getMonth() - num);
        }
      } else if (dateFilter.endsWith('_years') || dateFilter.endsWith('_year')) {
        const num = parseInt(dateFilter.split('_')[0], 10);
        if (!isNaN(num)) {
          fromDateObj.setFullYear(toDateObj.getFullYear() - num);
        }
      }

      const params = new URLSearchParams({
        from: fromDateObj.toISOString().slice(0, 10),
        to: toDateObj.toISOString().slice(0, 10)
      });

      const res = await fetch(`/api/v1/reports/appointments?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAppointmentReports(data.data);
      } else {
        setError(data.message || 'Failed to fetch appointment reports');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFilter, customDateRange, token]);

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return CheckCircle2;
      case 'pending': return Clock;
      case 'cancelled': return XCircle;
      default: return CalendarCheck;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'border-emerald-500';
      case 'pending': return 'border-amber-500';
      case 'cancelled': return 'border-red-500';
      default: return 'border-[#549E9E]';
    }
  };

  // Safe chart data mapping
  const chartData = (appointmentReports?.date_wise_appointments || []).map((row: any) => ({
    date: new Date(row.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: row.total_appointments,
    completed: row.completed_appointments,
  }));

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Filters Header */}
      <div className="bg-[#549E9E]/5 p-5 rounded-xl border border-[#549E9E]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Filter by Date</label>
          <div className="flex flex-wrap gap-2 pb-2 md:pb-0 items-center">
            {[
              { id: 'today', label: 'Today' },
              { id: '1_week', label: '1 Week' },
              { id: '1_month', label: '1 Month' },
              { id: 'custom', label: 'Custom' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDateFilter(t.id)}
                className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${dateFilter === t.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#549E9E]/30'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <div className="min-w-[150px]">
                <FilterDropdown
                  hideLabel={true}
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
        </div>
        
        <button
          onClick={fetchReports}
          className="cursor-pointer bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
         <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !appointmentReports ? (
         <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
           <CalendarCheck className="text-[#549E9E]/40 mb-4" size={48} />
           <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">No Data Available</h4>
         </div>
      ) : (
         <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {appointmentReports.status_appointments?.map((status: any, idx: number) => (
                <StatCard 
                  key={idx} 
                  title={status.status} 
                  value={status.total_appointments} 
                  icon={getStatusIcon(status.status)} 
                  colorClass={getStatusColor(status.status)} 
                  delay={idx * 0.1}
                />
              ))}
            </div>

            {/* Trend Chart */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
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
         </div>
      )}
    </div>
  );
};
