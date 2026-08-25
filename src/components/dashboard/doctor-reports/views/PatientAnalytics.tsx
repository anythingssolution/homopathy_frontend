import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCcw, AlertCircle, Calendar, Users, Clock, CheckCircle2, 
  Search, User, MapPin, Eye, ChevronRight, Activity, TrendingUp, 
  Baby, GraduationCap, Award, UserCheck, ShieldAlert,
  ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { SummaryMetricCard } from '../components/SummaryMetricCard';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';

interface PatientAnalyticsProps {
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

export const PatientAnalytics: React.FC<PatientAnalyticsProps> = ({ token }) => {
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'patients');
  const { branchScope } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'visits'>('overview');
  const [patientSearch, setPatientSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Pagination states
  const [patientPage, setPatientPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Reset pagination on search change
  useEffect(() => {
    setPatientPage(1);
  }, [patientSearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

  // Reset pagination when date filter changes
  useEffect(() => {
    setPatientPage(1);
    setHistoryPage(1);
  }, [dateFilter]);

  // Extract Summary Statistics
  const summaryObj = data?.summary?.[0] || {};
  const totalPatients = Number(summaryObj.active_primary_patients || 0);
  const avgAge = parseFloat(summaryObj.average_patient_age || '0.00').toFixed(1);
  const minorPatients = Number(summaryObj.minor_patients || 0);
  const adultPatients = Number(summaryObj.adult_patients || 0);
  const seniorPatients = Number(summaryObj.senior_patients || 0);
  const withFamily = Number(summaryObj.patients_with_family_members || 0);
  const withoutFamily = Number(summaryObj.patients_without_family_members || 0);

  // Chart 1: Demographics Breakdown
  const ageGroupData = [
    { name: 'Minors (<18)', value: minorPatients },
    { name: 'Adults (18-60)', value: adultPatients },
    { name: 'Seniors (>60)', value: seniorPatients }
  ].filter(d => d.value > 0);

  // Chart 2: Family Membership Breakdown
  const familyData = [
    { name: 'Family Grouped', value: withFamily },
    { name: 'Single Patient', value: withoutFamily }
  ].filter(d => d.value > 0);

  // Chart 3: New vs Repeat Patient type
  const newVsRepeatData = (data?.new_vs_repeat_patient || []).map((row: any) => ({
    name: row.patient_visit_type === 'NEW' ? 'New Patients' : 'Repeat Patients',
    value: Number(row.total_appointments || 0),
    uniqueSubjects: Number(row.unique_booking_subjects || 0)
  })).filter((d: any) => d.value > 0);

  const totalAppointments = newVsRepeatData.reduce((sum: number, d: any) => sum + d.value, 0);

  const COLORS = ['#549E9E', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

  // Filtering list for Patients Directory
  const filteredPatients = (data?.patient_master_list || []).filter((item: any) => {
    const search = patientSearch.toLowerCase();
    const isNumericName = /^\d+$/.test(item.full_name);
    const displayName = isNumericName ? `Patient ID ${item.full_name}` : item.full_name;
    return (
      displayName?.toLowerCase().includes(search) ||
      item.patient_uuid?.toLowerCase().includes(search) ||
      item.mobile_no?.toLowerCase().includes(search) ||
      item.gender?.toLowerCase().includes(search)
    );
  });

  // Filtering list for Visit History
  const filteredHistory = (data?.patient_appointment_history || []).filter((item: any) => {
    const search = historySearch.toLowerCase();
    return (
      item.patient_full_name?.toLowerCase().includes(search) ||
      item.patient_mobile_no?.toLowerCase().includes(search) ||
      item.treatment_name?.toLowerCase().includes(search) ||
      item.branch_name?.toLowerCase().includes(search) ||
      item.status?.toLowerCase().includes(search)
    );
  });

  // Paginated Slices
  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * ITEMS_PER_PAGE,
    patientPage * ITEMS_PER_PAGE
  );
  const totalPatientPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE) || 1;

  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  );
  const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;

  // Render Status Badge for Appointments
  const getAppointmentStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 rounded-lg flex items-center gap-1 w-fit animate-pulse">
            <Clock size={10} /> Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100 rounded-lg flex items-center gap-1 w-fit">
            <ShieldAlert size={10} /> Cancelled
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
  const CustomPieTooltip = ({ active, payload, totalSum, unit = 'Patients' }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const sum = totalSum || Number(data.value);
      const percentage = sum > 0 ? Math.round((Number(data.value) / sum) * 100) : 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-xl space-y-1">
          <p className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || data.payload.fill }}></span>
            {data.name}
          </p>
          <p className="text-sm font-black text-gray-900 ml-4">
            {data.value} {unit} ({percentage}%)
          </p>
          {data.payload.uniqueSubjects !== undefined && (
            <p className="text-[10px] font-bold text-[#549E9E] ml-4 uppercase tracking-wider">
              {data.payload.uniqueSubjects} Unique Patients
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Filters & Header Bar */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Timeframe</span>
          <div className="h-1.5 w-1.5 rounded-full bg-[#549E9E]"></div>
          <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-1 mr-1">
            <MapPin size={10} /> {branchScope?.selected_branch?.branch_name || 'Active Branch'}
          </span>
            {[
              { id: 'today', label: 'Today' },
              { id: '1_week', label: '1 Week' },
              { id: '1_month', label: '1 Month' },
              { id: 'custom', label: 'Custom' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDateFilter(t.id)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  dateFilter === t.id
                    ? 'bg-[#549E9E] border-[#549E9E] text-white'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-[#549E9E]/20 hover:bg-gray-50/50'
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
        
        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="cursor-pointer bg-white border border-gray-100 text-gray-600 px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center gap-2 shadow-sm self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'Syncing...' : 'Refresh'}
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
          <Users className="text-[#549E9E]/30 mb-4 animate-bounce" size={56} />
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">No Patient Data Found</h4>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Try choosing a wider date range or refreshing.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryMetricCard
              title="Active Patients"
              value={totalPatients}
              icon={Users}
              theme="teal"
            />
            <SummaryMetricCard
              title="Average Age"
              value={`${avgAge} Yrs`}
              icon={TrendingUp}
              theme="blue"
            />
            <SummaryMetricCard
              title="Minor Patients"
              value={minorPatients}
              icon={Baby}
              theme="amber"
            />
            <SummaryMetricCard
              title="Adult Patients"
              value={adultPatients + seniorPatients}
              icon={UserCheck}
              theme="green"
            />
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-gray-100 gap-6 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: 'Demographics & Overview', icon: Activity },
              { id: 'directory', label: `Patient Master Directory (${filteredPatients.length})`, icon: Users },
              { id: 'visits', label: `Recent Visit History (${filteredHistory.length})`, icon: Clock },
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
              {/* Tab 1: Overview & Demographics */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Age distribution */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Age Demographics</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Breakdown of patient life stages</p>
                    </div>

                    <div className="h-[220px] w-full mt-4 flex items-center justify-center">
                      {ageGroupData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={ageGroupData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={90} 
                              paddingAngle={4} 
                              dataKey="value"
                            >
                              {ageGroupData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip totalSum={totalPatients} unit="Patients" />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs font-bold text-gray-400">No demographic data recorded.</div>
                      )}
                    </div>
                  </div>

                  {/* New vs Repeat visit distribution */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Patient Visit Types</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">New vs repeat patient appointments ratio</p>
                    </div>

                    <div className="h-[220px] w-full mt-4 flex items-center justify-center">
                      {newVsRepeatData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={newVsRepeatData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={90} 
                              paddingAngle={4} 
                              dataKey="value"
                            >
                              {newVsRepeatData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip totalSum={totalAppointments} unit="Appointments" />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs font-bold text-gray-400">No visit type data recorded.</div>
                      )}
                    </div>
                  </div>

                  {/* Family vs Single */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Family Structuring</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Grouped family members vs single patients</p>
                    </div>

                    <div className="h-[220px] w-full mt-4 flex items-center justify-center">
                      {familyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={familyData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={90} 
                              paddingAngle={4} 
                              dataKey="value"
                            >
                              {familyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip totalSum={totalPatients} unit="Patients" />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs font-bold text-gray-400">No family data recorded.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Patient Directory List */}
              {activeTab === 'directory' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Patient Master Directory</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Listing of primary clinic patient profiles</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search by name, phone..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {paginatedPatients.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Auid / ID</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient Name</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Age / Gender</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact Phone</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Group Members</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Added On</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPatients.map((patient: any, idx: number) => {
                            const isNumericName = /^\d+$/.test(patient.full_name);
                            const displayName = isNumericName ? `Patient ID ${patient.full_name}` : patient.full_name;
                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 text-xs font-black text-gray-600">
                                  {patient.patient_uuid}
                                </td>
                                <td className="py-4 px-4 text-xs font-black text-gray-700 uppercase tracking-wide">
                                  {displayName}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-600 capitalize text-center">
                                  {patient.age} Y / {patient.gender}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-500">
                                  {patient.mobile_no || '—'}
                                </td>
                                <td className="py-4 px-4 text-xs font-black text-[#549E9E] text-center">
                                  {patient.active_family_members > 0 ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">
                                      {patient.active_family_members} Members
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-400">
                                  {new Date(patient.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex justify-end">
                                    {patient.is_active ? (
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-gray-50 text-gray-400 border border-gray-100">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No directory profiles matches search.
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={patientPage}
                    totalPages={totalPatientPages}
                    totalItems={filteredPatients.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setPatientPage}
                  />
                </div>
              )}

              {/* Tab 3: Recent Visit History */}
              {activeTab === 'visits' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Recent Visits Register</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Listing patient appointment logs and workflow tracking</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search visits..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {paginatedHistory.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Appointment ID</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Treatment Class</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Branch Location</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date & Slot</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedHistory.map((item: any, idx: number) => {
                            const apptDate = new Date(item.appointment_date);
                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 text-xs font-black text-gray-600">
                                  {item.auid}
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
                                <td className="py-4 px-4">
                                  <div className="flex flex-col text-[10px] font-bold text-gray-500">
                                    <span>{apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className="text-[#549E9E] mt-0.5 uppercase text-[9px] tracking-wider font-black">{item.slot_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex justify-end">
                                    {getAppointmentStatusBadge(item.status)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No appointments found.
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={historyPage}
                    totalPages={totalHistoryPages}
                    totalItems={filteredHistory.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
