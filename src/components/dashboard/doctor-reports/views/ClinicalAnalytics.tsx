import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCcw, AlertCircle, Calendar, FileText, ClipboardList, 
  TrendingUp, Users, Clock, CheckCircle2, ShieldCheck, User, 
  MapPin, Search, ChevronRight, Activity, ShieldAlert, Heart, 
  CalendarCheck, ChevronLeft, ChevronsLeft, ChevronsRight,
  TrendingDown, BellRing
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

import { SummaryMetricCard } from '../components/SummaryMetricCard';
import ChartInfoButton from '../components/ChartInfoButton';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';
import { useTranslation } from 'react-i18next';

interface ClinicalAnalyticsProps {
  token: string | null;
}

const ITEMS_PER_PAGE = 8;

// Reusable Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/20 text-xs font-bold text-gray-500">
      <div className="uppercase tracking-widest text-[9px] font-black text-gray-400">
        {t('reports.clinical.showing_entries', { start: startItem, end: endItem, total: totalItems })}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title={t('reports.clinical.first_page')}
        >
          <ChevronsLeft size={12} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title={t('reports.clinical.prev_page')}
        >
          <ChevronLeft size={12} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, idx, arr) => {
            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
            return (
              <React.Fragment key={p}>
                {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                <button
                  onClick={() => onPageChange(p)}
                  className={`cursor-pointer w-8 h-8 flex items-center justify-center border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm ${
                    currentPage === p
                      ? "bg-[#549E9E] border-[#549E9E] text-white"
                      : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            );
          })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title={t('reports.clinical.next_page')}
        >
          <ChevronRight size={12} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title={t('reports.clinical.last_page')}
        >
          <ChevronsRight size={12} />
        </button>
      </div>
    </div>
  );
};

export const ClinicalAnalytics: React.FC<ClinicalAnalyticsProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'clinical');
  const { branchScope } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'followups' | 'schedule'>('overview');
  const [followupSearch, setFollowupSearch] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');

  // Pagination states
  const [followupPage, setFollowupPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);

  // Reset page indices on search change
  useEffect(() => {
    setFollowupPage(1);
  }, [followupSearch]);

  useEffect(() => {
    setSchedulePage(1);
  }, [scheduleSearch]);

  // Reset page indices when date filter changes
  useEffect(() => {
    setFollowupPage(1);
    setSchedulePage(1);
  }, [dateFilter]);

  // Extract Summary Statistics
  const summaryObj = data?.summary?.[0] || {};
  const physicalCount = Number(summaryObj.physical_consultations || 0);
  const onCallCount = Number(summaryObj.on_call_consultations || 0);
  const totalConsultations = physicalCount + onCallCount;
  const uniquePatients = Number(summaryObj.unique_primary_patients || 0);
  const vitalCount = Number(summaryObj.consultations_with_vitals || 0);
  const dueFollowupsCount = data?.followup_due?.length || 0;

  // Chart: Follow-up distribution by Treatment Plan (derived from followup_due)
  const treatmentCounts = (data?.followup_due || []).reduce((acc: any, curr: any) => {
    const name = curr.treatment_name || t('reports.clinical.unknown');
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const treatmentChartData = Object.keys(treatmentCounts).map(name => ({
    name,
    count: treatmentCounts[name]
  })).sort((a, b) => b.count - a.count);

  // Chart: Follow-up Engagement Rates
  const engagementLabel = (status: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'NOTIFIED') return t('reports.clinical.notified_patients');
    if (key === 'CONFIRMED_BOOKED' || key === 'BOOKED') return t('reports.clinical.booked_appointments');
    return status;
  };
  const statusCounts = (data?.followup_due || []).reduce((acc: any, curr: any) => {
    const name = engagementLabel(curr.status);
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.keys(statusCounts).map(name => ({
    name,
    value: statusCounts[name]
  }));

  // Chart: Follow-up Schedule Timeline
  const timelineCounts = (data?.followup_due || []).reduce((acc: any, curr: any) => {
    const rawDate = new Date(curr.due_date);
    const iso = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
    acc[iso] = (acc[iso] || 0) + 1;
    return acc;
  }, {});
  const timelineChartData = Object.keys(timelineCounts).map((iso) => ({
    iso,
    date: new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }),
    count: timelineCounts[iso],
    timestamp: new Date(`${iso}T00:00:00`).getTime()
  })).sort((a, b) => a.timestamp - b.timestamp);

  // Filtering list for Followups due
  const filteredFollowups = (data?.followup_due || []).filter((item: any) => {
    const search = followupSearch.toLowerCase();
    return (
      item.patient_full_name?.toLowerCase().includes(search) ||
      item.patient_mobile_no?.toLowerCase().includes(search) ||
      item.treatment_name?.toLowerCase().includes(search) ||
      item.branch_name?.toLowerCase().includes(search) ||
      item.status?.toLowerCase().includes(search)
    );
  });

  // Filtering list for Timeline Schedule
  const filteredSchedule = timelineChartData.filter((item: any) => {
    const search = scheduleSearch.toLowerCase();
    return item.date?.toLowerCase().includes(search) || item.iso?.includes(search);
  });

  // Paginated Slices
  const paginatedFollowups = filteredFollowups.slice(
    (followupPage - 1) * ITEMS_PER_PAGE,
    followupPage * ITEMS_PER_PAGE
  );
  const totalFollowupPages = Math.ceil(filteredFollowups.length / ITEMS_PER_PAGE) || 1;

  const paginatedSchedule = filteredSchedule.slice(
    (schedulePage - 1) * ITEMS_PER_PAGE,
    schedulePage * ITEMS_PER_PAGE
  );
  const totalSchedulePages = Math.ceil(filteredSchedule.length / ITEMS_PER_PAGE) || 1;

  // Renders Followup Status Badge
  const getFollowupStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'NOTIFIED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 rounded-lg flex items-center gap-1 w-fit">
            <Clock size={10} /> {t('reports.clinical.status_notified')}
          </span>
        );
      case 'CONFIRMED_BOOKED':
      case 'BOOKED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> {t('reports.clinical.status_booked')}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100 rounded-lg w-fit">
            {status}
          </span>
        );
    }
  };

  // Custom Chart Tooltip
  const CustomPieTooltip = ({ active, payload, totalSum }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const sum = totalSum || Number(p.value);
      const percentage = sum > 0 ? Math.round((Number(p.value) / sum) * 100) : 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-xl space-y-1">
          <p className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.payload.fill }}></span>
            {p.name}
          </p>
          <p className="text-sm font-black text-gray-900 ml-4">
            {t('reports.clinical.patients_pct', { count: p.value, pct: percentage })}
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#549E9E', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Filters & Header Bar */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">{t('reports.clinical.timeframe')}</span>
          <div className="h-1.5 w-1.5 rounded-full bg-[#549E9E]"></div>
          <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-1 mr-1">
            <MapPin size={10} /> {branchScope?.selected_branch?.branch_name || t('reports.clinical.active_branch')}
          </span>
            {[
              { id: 'today', label: t('reports.today') },
              { id: '1_week', label: t('reports.one_week') },
              { id: '1_month', label: t('reports.one_month') },
              { id: 'custom', label: t('reports.custom') },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setDateFilter(option.id)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  dateFilter === option.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
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
        
        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="cursor-pointer bg-white border border-gray-100 text-gray-600 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center gap-2 shadow-sm self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? t('reports.clinical.syncing') : t('reports.refresh')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center min-h-[400px]">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCcw className="text-[#549E9E] w-12 h-12" />
          </motion.div>
        </div>
      ) : error ? (
        <div className="bg-red-50/80 border border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm">
          <AlertCircle size={18} /> {error}
        </div>
      ) : !data ? (
        <div className="flex-1 border border-gray-100 rounded-2xl p-16 flex flex-col items-center justify-center bg-gray-50/20 shadow-inner">
          <FileText className="text-[#549E9E]/30 mb-4 animate-bounce" size={56} />
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">{t('reports.clinical.no_data')}</h4>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('reports.clinical.no_data_hint')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryMetricCard
              title={t('reports.clinical.total_consultations')}
              value={totalConsultations}
              icon={Activity}
              theme="teal"
            />
            <SummaryMetricCard
              title={t('reports.clinical.unique_patients')}
              value={uniquePatients}
              icon={Users}
              theme="blue"
            />
            <SummaryMetricCard
              title={t('reports.clinical.pending_followups')}
              value={dueFollowupsCount}
              icon={Clock}
              theme="amber"
            />
            <SummaryMetricCard
              title={t('reports.clinical.vitals_captures')}
              value={vitalCount}
              icon={Heart}
              theme="green"
            />
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-gray-100 gap-6 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: t('reports.clinical.tab_overview'), icon: Activity },
              { id: 'followups', label: t('reports.clinical.tab_followups', { count: filteredFollowups.length }), icon: CalendarCheck },
              { id: 'schedule', label: t('reports.clinical.tab_schedule', { count: filteredSchedule.length }), icon: Calendar },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`cursor-pointer pb-4 px-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                    isActive
                      ? 'border-[#549E9E] text-[#549E9E]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <TabIcon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Views Render */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tab 1: Clinical Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2/3 width) - Follow-up distribution by Treatment Plan */}
                  <div className="lg:col-span-2 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">{t('reports.clinical.volume_title')}</h4>
                        <ChartInfoButton infoKey="followup_volume_by_plan" />
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.clinical.volume_subtitle')}</p>
                    </div>

                    <div className="h-[260px] w-full mt-4">
                      {treatmentChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={treatmentChartData.slice(0, 5)} margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                            <Bar dataKey="count" fill="#549E9E" radius={[0, 4, 4, 0]} barSize={18} name={t('reports.clinical.followups_bar')} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          {t('reports.clinical.no_pending_followups')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (1/3 width) - Follow-up Status Engagement Rates */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">{t('reports.clinical.engagement_title')}</h4>
                        <ChartInfoButton infoKey="followup_engagement" />
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.clinical.engagement_subtitle')}</p>
                    </div>

                    <div className="h-[220px] w-full mt-4 flex items-center justify-center">
                      {statusChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={statusChartData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={85} 
                              paddingAngle={4} 
                              dataKey="value"
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip totalSum={dueFollowupsCount} />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs font-bold text-gray-400">{t('reports.clinical.no_status_recorded')}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Follow-ups Due */}
              {activeTab === 'followups' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">{t('reports.clinical.registry_title')}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.clinical.registry_subtitle')}</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder={t('reports.clinical.search_followups')}
                        value={followupSearch}
                        onChange={(e) => setFollowupSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {paginatedFollowups.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_followup_id')}</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_patient_details')}</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_treatment')}</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_branch')}</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_parent_appt')}</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_due_date')}</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.clinical.col_notif_status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedFollowups.map((item: any, idx: number) => {
                            const dueDate = new Date(item.due_date);
                            const parentDate = new Date(item.parent_appointment_date);
                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 text-xs font-black text-gray-600">
                                  #{item.followup_id}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">{item.patient_full_name}</span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-0.5">{item.patient_mobile_no}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-500 uppercase">
                                  {item.treatment_name}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-600">
                                  {item.branch_name}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-400">
                                  {parentDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="text-xs font-black text-[#549E9E]">
                                    {dueDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex justify-end">
                                    {getFollowupStatusBadge(item.status)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {t('reports.clinical.no_followup_match')}
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={followupPage}
                    totalPages={totalFollowupPages}
                    totalItems={filteredFollowups.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setFollowupPage}
                  />
                </div>
              )}

              {/* Tab 3: Detailed Follow-up Timeline */}
              {activeTab === 'schedule' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">{t('reports.clinical.schedule_title')}</h4>
                        <ChartInfoButton infoKey="schedule_timeline" />
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.clinical.schedule_subtitle')}</p>
                    </div>
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder={t('reports.clinical.search_date')}
                        value={scheduleSearch}
                        onChange={(e) => setScheduleSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart schedule (2/3 width) */}
                    <div className="lg:col-span-2 border border-gray-100 p-5 rounded-2xl bg-gray-50/10 min-h-[320px] flex flex-col justify-between">
                      <div className="mb-4">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.timeline_distribution')}</span>
                      </div>
                      <div className="flex-1 w-full h-[220px]">
                        {timelineChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 'bold' }} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                              <Area type="monotone" dataKey="count" fill="url(#colorTimeline)" stroke="#549E9E" strokeWidth={2} name={t('reports.clinical.due_followups')} />
                              <defs>
                                <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#549E9E" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#549E9E" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {t('reports.clinical.no_schedule')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Table schedule (1/3 width) */}
                    <div className="border border-gray-100 rounded-2xl overflow-hidden flex flex-col justify-between min-h-[320px]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                              <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reports.clinical.col_date')}</th>
                              <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.clinical.col_patients_due')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedSchedule.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-3 px-4 text-xs font-bold text-gray-700">
                                  {item.date}
                                </td>
                                <td className="py-3 px-4 text-right text-xs font-black text-[#549E9E]">
                                  {t('reports.clinical.patients_n', { count: item.count })}
                                </td>
                              </tr>
                            ))}
                            {paginatedSchedule.length === 0 && (
                              <tr>
                                <td colSpan={2} className="py-8 text-center text-xs font-bold text-gray-400 uppercase">
                                  {t('reports.clinical.no_dates')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        currentPage={schedulePage}
                        totalPages={totalSchedulePages}
                        totalItems={filteredSchedule.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setSchedulePage}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
