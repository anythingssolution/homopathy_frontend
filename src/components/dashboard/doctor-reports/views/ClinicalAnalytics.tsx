import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCcw, AlertCircle, Calendar, FileText, ClipboardList, 
  TrendingUp, Users, Clock, CheckCircle2, ShieldCheck, User, 
  MapPin, Search, ChevronRight, Activity, ShieldAlert, Heart, 
  CalendarCheck, HelpCircle, ChevronLeft, ChevronsLeft, ChevronsRight,
  TrendingDown, BellRing
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

import { StatCard } from '../components/StatCard';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';

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
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/20 text-xs font-bold text-gray-500">
      <div className="uppercase tracking-widest text-[9px] font-black text-gray-400">
        Showing <span className="text-[#549E9E]">{startItem}</span> to{" "}
        <span className="text-[#549E9E]">{endItem}</span> of{" "}
        <span className="text-gray-600">{totalItems}</span> entries
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title="First Page"
        >
          <ChevronsLeft size={12} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title="Previous Page"
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
          title="Next Page"
        >
          <ChevronRight size={12} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="cursor-pointer p-1.5 border border-gray-100 rounded-lg hover:border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          title="Last Page"
        >
          <ChevronsRight size={12} />
        </button>
      </div>
    </div>
  );
};

export const ClinicalAnalytics: React.FC<ClinicalAnalyticsProps> = ({ token }) => {
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
    const name = curr.treatment_name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const treatmentChartData = Object.keys(treatmentCounts).map(name => ({
    name,
    count: treatmentCounts[name]
  })).sort((a, b) => b.count - a.count);

  // Chart: Follow-up Engagement Rates
  const statusCounts = (data?.followup_due || []).reduce((acc: any, curr: any) => {
    const status = curr.status === 'NOTIFIED' ? 'Notified Patients' : 
                   curr.status === 'CONFIRMED_BOOKED' ? 'Booked Appointments' : curr.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.keys(statusCounts).map(name => ({
    name,
    value: statusCounts[name]
  }));

  // Chart: Follow-up Schedule Timeline
  const timelineCounts = (data?.followup_due || []).reduce((acc: any, curr: any) => {
    const rawDate = new Date(curr.due_date);
    const dateStr = rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});
  const timelineChartData = Object.keys(timelineCounts).map(date => ({
    date,
    count: timelineCounts[date],
    timestamp: new Date(date).getTime()
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
    return item.date?.toLowerCase().includes(search);
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
            <Clock size={10} /> Notified
          </span>
        );
      case 'CONFIRMED_BOOKED':
      case 'BOOKED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> Booked
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
            {p.value} Patients ({percentage}%)
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
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timeframe</span>
            <div className="h-1.5 w-1.5 rounded-full bg-[#549E9E]"></div>
            <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-1">
              <MapPin size={10} /> {branchScope?.selected_branch?.branch_name || 'Active Branch'}
            </span>
          </div>
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
                className={`cursor-pointer px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                  dateFilter === t.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white shadow-md shadow-[#549E9E]/10'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="min-w-[150px]">
              <FilterDropdown
                hideLabel={true}
                label="More Options"
                value={dateFilter.endsWith('_months') || dateFilter.endsWith('_years') || dateFilter === '1_year' ? dateFilter : ''}
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
          disabled={isLoading}
          className="cursor-pointer bg-white border border-gray-100 text-gray-600 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center gap-2 shadow-sm self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'Syncing...' : 'Refresh'}
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
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">No Clinical Data Found</h4>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Try choosing a wider date range or refreshing.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Consultations" 
              value={totalConsultations} 
              icon={Activity} 
              colorClass="border-[#549E9E]" 
            />
            <StatCard 
              title="Unique Patients" 
              value={uniquePatients} 
              icon={Users} 
              colorClass="border-blue-500" 
            />
            <StatCard 
              title="Pending Follow-ups" 
              value={dueFollowupsCount} 
              icon={Clock} 
              colorClass="border-amber-500" 
            />
            <StatCard 
              title="Vitals Captures" 
              value={vitalCount} 
              icon={Heart} 
              colorClass="border-emerald-500" 
            />
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-gray-100 gap-6 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: 'Clinical Overview', icon: Activity },
              { id: 'followups', label: `Follow-ups Due (${filteredFollowups.length})`, icon: CalendarCheck },
              { id: 'schedule', label: `Schedule Timeline (${filteredSchedule.length})`, icon: Calendar },
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
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Follow-up Volume by Plan</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pending follow-ups grouped by treatment plan</p>
                    </div>

                    <div className="h-[260px] w-full mt-4">
                      {treatmentChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={treatmentChartData.slice(0, 5)} margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                            <Bar dataKey="count" fill="#549E9E" radius={[0, 4, 4, 0]} barSize={18} name="Follow-ups" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          No pending follow-ups found in this period.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (1/3 width) - Follow-up Status Engagement Rates */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Follow-up Engagement</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Notified vs booked patient response rates</p>
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
                        <div className="text-xs font-bold text-gray-400">No status data recorded.</div>
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
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Active Follow-up Registry</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Listing patient followups due for checkups</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search follow-ups..."
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
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Followup ID</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Treatment Class</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Branch Location</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Parent Appointment</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Checkup Due Date</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Notification status</th>
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
                                  {parentDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="text-xs font-black text-[#549E9E]">
                                    {dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                        No followups due matches search criteria.
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
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Follow-up Timeline Schedule</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Chronological schedule of patient checkups due by date</p>
                    </div>
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search date..."
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
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline Distribution</span>
                      </div>
                      <div className="flex-1 w-full h-[220px]">
                        {timelineChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 'bold' }} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                              <Area type="monotone" dataKey="count" fill="url(#colorTimeline)" stroke="#549E9E" strokeWidth={2} name="Due Follow-ups" />
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
                            No schedule data.
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
                              <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                              <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Patients Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedSchedule.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-3 px-4 text-xs font-bold text-gray-700">
                                  {item.date}
                                </td>
                                <td className="py-3 px-4 text-right text-xs font-black text-[#549E9E]">
                                  {item.count} Patients
                                </td>
                              </tr>
                            ))}
                            {paginatedSchedule.length === 0 && (
                              <tr>
                                <td colSpan={2} className="py-8 text-center text-xs font-bold text-gray-400 uppercase">
                                  No dates found
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
