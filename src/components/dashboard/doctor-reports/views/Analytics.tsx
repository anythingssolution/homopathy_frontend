import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, MapPin, Stethoscope, BarChart, Calendar } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import CustomDatePicker from '../../../CustomDatePicker';
import { FilterDropdown } from '../components/FilterDropdown';
import ChartInfoButton from '../components/ChartInfoButton';
import { useTranslation } from 'react-i18next';

interface AnalyticsProps {
  token: string | null;
}

export const Analytics: React.FC<AnalyticsProps> = ({ token }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('branch');
  
  const [dateFilter, setDateFilter] = useState('1_month');
  const [customDateRange, setCustomDateRange] = useState(() => {
    const fromStr = (() => {
      const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    })();
    const toStr = new Date().toISOString().split('T')[0];
    return { from: fromStr, to: toStr };
  });

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Dynamically calculate fromDate and toDate based on dateFilter and customDateRange
  useEffect(() => {
    let toDateObj = new Date();
    let fromDateObj = new Date();

    if (dateFilter === 'custom') {
      if (customDateRange.from) fromDateObj = new Date(customDateRange.from);
      if (customDateRange.to) toDateObj = new Date(customDateRange.to);
    } else if (dateFilter === 'today') {
      // keep today
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

    setFromDate(fromDateObj.toISOString().split('T')[0]);
    setToDate(toDateObj.toISOString().split('T')[0]);
  }, [dateFilter, customDateRange]);

  const fetchReports = async () => {
    if (!fromDate || !toDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: reportType, from: fromDate, to: toDate });
      const res = await fetch(`/api/v1/doctors/reports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      } else {
        setError(data.message || 'Failed to fetch reports');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (fromDate && toDate) {
      fetchReports();
    }
  }, [reportType, fromDate, toDate, token]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-lg">
          <p className="text-xs font-black uppercase text-gray-500 mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const colors = ['#549E9E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Analytics Controls */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Dimension Selector */}
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.custom_reports.dimension')}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('branch')}
                className={`flex-1 md:flex-none cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 flex items-center gap-2 justify-center ${
                  reportType === 'branch'
                    ? 'bg-[#549E9E] border-[#549E9E] text-white shadow-md shadow-[#549E9E]/10'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
                }`}
              >
                <MapPin size={14} /> {t('reports.custom_reports.branch')}
              </button>
              <button
                onClick={() => setReportType('treatment')}
                className={`flex-1 md:flex-none cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 flex items-center gap-2 justify-center ${
                  reportType === 'treatment'
                    ? 'bg-[#549E9E] border-[#549E9E] text-white shadow-md shadow-[#549E9E]/10'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
                }`}
              >
                <Stethoscope size={14} /> {t('reports.custom_reports.treatment')}
              </button>
            </div>
          </div>

          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="cursor-pointer bg-white border border-gray-100 text-gray-600 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center gap-2 shadow-sm self-stretch md:self-auto justify-center"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? t('reports.custom_reports.generating') : t('reports.custom_reports.generate')}
          </button>
        </div>

        {/* Timeframe Selector Row */}
        <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.timeframe')}</span>
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { id: 'today', label: t('reports.today') },
              { id: '1_week', label: t('reports.one_week') },
              { id: '1_month', label: t('reports.one_month') },
              { id: 'custom', label: t('reports.custom') },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setDateFilter(option.id)}
                className={`cursor-pointer px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                  dateFilter === option.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white shadow-md shadow-[#549E9E]/10'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
                }`}
              >
                {option.label}
              </button>
            ))}
            <div className="min-w-[150px]">
              <FilterDropdown
                hideLabel={true}
                label={t('reports.more_options')}
                value={dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year' ? dateFilter : ''}
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !reports || reports.length === 0 ? (
        <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
          <BarChart className="text-[#549E9E]/40 mb-4" size={48} />
          <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">{t('reports.custom_reports.no_data')}</h4>
        </div>
      ) : (
        <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex-1 min-h-[400px] flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{reportType === 'branch' ? t('reports.custom_reports.branch_perf') : t('reports.custom_reports.treatment_pop')}</h4>
              <ChartInfoButton infoKey={reportType === 'branch' ? 'branch_performance' : 'treatment_popularity'} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.custom_reports.count_by_category')}</p>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                layout={reportType === 'treatment' ? 'vertical' : 'horizontal'}
                data={reports}
                margin={{ top: 20, right: 30, left: reportType === 'treatment' ? 100 : 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={reportType === 'treatment'} horizontal={reportType !== 'treatment'} stroke="#f3f4f6" />
                {reportType === 'treatment' ? (
                  <>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                    <YAxis dataKey="treatment_name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="branch_name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4b5563', fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dx={-10} />
                  </>
                )}
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar 
                  dataKey="total_appointments" 
                  name={t('reports.custom_reports.appointments')} 
                  radius={[4, 4, 4, 4]} 
                  barSize={40}
                >
                  {reports.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
