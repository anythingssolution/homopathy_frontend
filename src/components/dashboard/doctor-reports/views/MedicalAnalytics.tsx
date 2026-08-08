import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCcw, AlertCircle, Calendar, Pill, CheckCircle2, 
  ClipboardList, IndianRupee, TrendingUp, Users, ArrowUpRight, 
  Package, Search, Clock, ShieldCheck, User, MapPin, Eye,
  ChevronRight, Activity, DollarSign, ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ComposedChart, Bar, Line, Area
} from 'recharts';

import { StatCard } from '../components/StatCard';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';

interface MedicalAnalyticsProps {
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

export const MedicalAnalytics: React.FC<MedicalAnalyticsProps> = ({ token }) => {
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'medical');
  const { branchScope } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'ready' | 'pricing' | 'medicines'>('overview');
  const [readySearch, setReadySearch] = useState('');
  const [pricingSearch, setPricingSearch] = useState('');

  // Pagination states
  const [readyPage, setReadyPage] = useState(1);
  const [pricingPage, setPricingPage] = useState(1);
  const [medicinesPage, setMedicinesPage] = useState(1);

  // Reset pagination on search change
  useEffect(() => {
    setReadyPage(1);
  }, [readySearch]);

  useEffect(() => {
    setPricingPage(1);
  }, [pricingSearch]);

  // Reset pagination when date filter changes
  useEffect(() => {
    setReadyPage(1);
    setPricingPage(1);
    setMedicinesPage(1);
  }, [dateFilter]);

  // Extract Summary Statistics
  const summaryObj = data?.summary?.[0] || {};
  const readyCount = Number(summaryObj.ready_prescriptions_count || 0);
  const processedCount = Number(summaryObj.processed_prescriptions_count || 0);
  const totalRevenue = Number(summaryObj.total_pricing_amount || 0);
  
  // Calculate average ticket size dynamically
  const totalCount = readyCount + processedCount;
  const avgTicket = totalCount > 0 ? (totalRevenue / totalCount).toFixed(2) : '0.00';

  // Calculate total medicines dispensed from the detailed list
  const totalMedsDispensed = (data?.lab_test_medicine_item || [])
    .reduce((sum: number, item: any) => sum + Number(item.total_items || 0), 0);

  // Parse Trend Data for Composite Chart
  const trendData = (data?.date_wise_summary || []).map((row: any) => ({
    date: new Date(row.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Pending': Number(row.ready_prescriptions_count || 0),
    'Processed': Number(row.processed_prescriptions_count || 0),
    'Revenue (₹)': Number(row.total_pricing_amount || 0),
  }));

  // Filtering list for Ready Prescriptions
  const filteredReady = (data?.ready_prescriptions || []).filter((item: any) => {
    const search = readySearch.toLowerCase();
    return (
      item.patient_full_name?.toLowerCase().includes(search) ||
      item.patient_mobile_no?.toLowerCase().includes(search) ||
      item.doctor_name?.toLowerCase().includes(search) ||
      item.treatment_name?.toLowerCase().includes(search) ||
      item.branch_name?.toLowerCase().includes(search)
    );
  });

  // Filtering list for Medicine Pricing
  const filteredPricing = (data?.medicine_pricing || []).filter((item: any) => {
    const search = pricingSearch.toLowerCase();
    return (
      item.patient_full_name?.toLowerCase().includes(search) ||
      item.patient_mobile_no?.toLowerCase().includes(search) ||
      item.created_by_name?.toLowerCase().includes(search) ||
      item.remark?.toLowerCase().includes(search) ||
      item.branch_name?.toLowerCase().includes(search)
    );
  });

  // Paginated Slices
  const paginatedReady = filteredReady.slice(
    (readyPage - 1) * ITEMS_PER_PAGE,
    readyPage * ITEMS_PER_PAGE
  );
  const totalReadyPages = Math.ceil(filteredReady.length / ITEMS_PER_PAGE) || 1;

  const paginatedPricing = filteredPricing.slice(
    (pricingPage - 1) * ITEMS_PER_PAGE,
    pricingPage * ITEMS_PER_PAGE
  );
  const totalPricingPages = Math.ceil(filteredPricing.length / ITEMS_PER_PAGE) || 1;

  const allMedicines = data?.lab_test_medicine_item || [];
  const paginatedMedicines = allMedicines.slice(
    (medicinesPage - 1) * ITEMS_PER_PAGE,
    medicinesPage * ITEMS_PER_PAGE
  );
  const totalMedicinesPages = Math.ceil(allMedicines.length / ITEMS_PER_PAGE) || 1;

  // Render Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_MEDICAL':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 rounded-lg flex items-center gap-1 w-fit">
            <Clock size={10} /> Pending
          </span>
        );
      case 'PROCESSED':
      case 'DISPENSED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> Dispensed
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-2xl shadow-xl space-y-2">
          <p className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-gray-50 pb-1.5">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6 text-sm">
              <span className="font-bold text-gray-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }}></span>
                {p.name}:
              </span>
              <span className="font-black text-gray-900">
                {p.name.includes('Revenue') ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5 self-stretch md:self-auto justify-center"
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
          <Pill className="text-[#549E9E]/30 mb-4 animate-bounce" size={56} />
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">No Dispensary Data Found</h4>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Try choosing a wider date range or adding prescriptions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Dispensary Revenue" 
              value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
              icon={IndianRupee} 
              colorClass="border-[#549E9E]" 
            />
            <StatCard 
              title="Pending Queue" 
              value={readyCount} 
              icon={Clock} 
              colorClass="border-amber-500" 
            />
            <StatCard 
              title="Processed Queue" 
              value={processedCount} 
              icon={CheckCircle2} 
              colorClass="border-emerald-500" 
            />
            <StatCard 
              title="Avg Presc. Ticket" 
              value={`₹${parseFloat(avgTicket).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
              icon={TrendingUp} 
              colorClass="border-blue-500" 
            />
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-gray-100 gap-6 overflow-x-auto pb-px">
            {[
              { id: 'overview', label: 'Overview Dashboard', icon: Activity },
              { id: 'ready', label: `Pending Queue (${filteredReady.length})`, icon: Clock },
              { id: 'pricing', label: `Pricing History (${filteredPricing.length})`, icon: DollarSign },
              { id: 'medicines', label: `Medicine Demand (${allMedicines.length})`, icon: Package },
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
              {/* Tab 1: Overview Dashboard */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue & Vol trends (2/3 width) */}
                  <div className="lg:col-span-2 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm min-h-[420px] flex flex-col justify-between">
                    <div className="mb-6 flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Revenue & Volume Trends</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Dispensed prescriptions & pricing metrics</p>
                      </div>
                      <div className="flex gap-4 text-[9px] font-black uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#549E9E]"></span> Revenue</div>
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Processed</div>
                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> Pending</div>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full min-h-[280px]">
                      {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 'bold' }} />
                            <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 'bold' }} />
                            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#549E9E', fontWeight: 'bold' }} />
                            <Tooltip content={<CustomTooltip />} />
                            
                            <Bar yAxisId="left" dataKey="Processed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                            <Bar yAxisId="left" dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                            <Area yAxisId="right" type="monotone" dataKey="Revenue (₹)" fill="url(#colorRevenue)" stroke="#549E9E" strokeWidth={2.5}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#549E9E" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#549E9E" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                            </Area>
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          No trend data available for selected period.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Medicines distribution Summary (1/3 width) */}
                  <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                    <div className="mb-6 flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Inventory Demand</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Top dispensation rank</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        {totalMedsDispensed} Items
                      </span>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-1">
                      {allMedicines.slice(0, 5).map((med: any, i: number) => {
                        const pct = totalMedsDispensed > 0 ? Math.round((Number(med.total_items) / totalMedsDispensed) * 100) : 0;
                        const isNumericName = /^\d+$/.test(med.item_name);
                        const displayName = isNumericName ? `Formula ${med.item_name}` : med.item_name;
                        
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-700 truncate w-3/4" title={displayName}>
                                {displayName}
                              </span>
                              <span className="font-black text-gray-900">{med.total_items}x</span>
                            </div>
                            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#549E9E] rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {allMedicines.length === 0 && (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                          No items captured.
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setActiveTab('medicines')}
                      className="mt-6 border border-gray-100 hover:border-gray-200 text-[#549E9E] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all text-center flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      View All Medicines <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Pending Queue */}
              {activeTab === 'ready' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Pending Dispatch Queue</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Prescriptions waiting to be priced/dispensed</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search patient, doc..."
                        value={readySearch}
                        onChange={(e) => setReadySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {paginatedReady.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Token</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned Doctor</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Treatment</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sent At</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Branch</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Workflow</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReady.map((item: any, idx: number) => {
                            const sentDate = new Date(item.sent_to_medical_at);
                            const formattedTime = sentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            const formattedDate = sentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 text-xs font-black text-[#549E9E]">
                                  <div className="w-8 h-8 rounded-full bg-[#549E9E]/10 flex items-center justify-center">
                                    {item.token_number}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">{item.patient_full_name}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-0.5">{item.patient_mobile_no}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                                    <User size={12} className="text-gray-400" />
                                    <span>{item.doctor_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-500 uppercase">{item.treatment_name}</td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col text-[10px] font-bold text-gray-500">
                                    <span>{formattedTime}</span>
                                    <span className="text-gray-400 mt-0.5">{formattedDate}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-500">{item.branch_name}</td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex justify-end">{getStatusBadge(item.workflow_status)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No prescriptions matching search.
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={readyPage}
                    totalPages={totalReadyPages}
                    totalItems={filteredReady.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setReadyPage}
                  />
                </div>
              )}

              {/* Tab 3: Pricing History */}
              {activeTab === 'pricing' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Pricing Ledger</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Dispensed prescriptions transaction register</p>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search pricing..."
                        value={pricingSearch}
                        onChange={(e) => setPricingSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E] focus:ring-2 focus:ring-[#549E9E]/5"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {paginatedPricing.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Receipt ID</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient Details</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Priced By</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Remarks</th>
                            <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</th>
                            <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Receipt Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPricing.map((item: any, idx: number) => {
                            const pricingDate = new Date(item.created_at);
                            return (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 text-xs font-black text-gray-600">
                                  #{item.pricing_id}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">{item.patient_full_name}</span>
                                    <span className="text-[9px] font-bold text-gray-400 mt-0.5">{item.branch_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="px-2.5 py-1 text-[10px] font-black bg-blue-50 text-blue-600 rounded-lg">
                                    {item.total_priced_items} Meds
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-600">
                                  {item.created_by_name}
                                </td>
                                <td className="py-4 px-4 text-xs font-bold text-gray-400 max-w-[150px] truncate" title={item.remark}>
                                  {item.remark || '—'}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col text-[10px] font-bold text-gray-500">
                                    <span>{pricingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-gray-400 mt-0.5">{pricingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right text-xs font-black text-[#549E9E]">
                                  ₹{parseFloat(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No transactions matches search.
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={pricingPage}
                    totalPages={totalPricingPages}
                    totalItems={filteredPricing.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setPricingPage}
                  />
                </div>
              )}

              {/* Tab 4: Medicine Demand */}
              {activeTab === 'medicines' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest">Medicine & Stock Volume Report</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Listing distribution and frequency profile of medicines prescribed by doctors</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Rank list */}
                    <div className="flex flex-col justify-between border border-gray-100 rounded-2xl bg-gray-50/10 overflow-hidden min-h-[460px]">
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex justify-between">
                            <span>Medicine Distribution</span>
                            <span>Quantity Prescribed</span>
                          </h5>
                          <div className="space-y-4">
                            {paginatedMedicines.map((med: any, i: number) => {
                              const rank = (medicinesPage - 1) * ITEMS_PER_PAGE + i + 1;
                              const pct = totalMedsDispensed > 0 ? Math.round((Number(med.total_items) / totalMedsDispensed) * 100) : 0;
                              const isNumericName = /^\d+$/.test(med.item_name);
                              const displayName = isNumericName ? `Formula ${med.item_name}` : med.item_name;
                              return (
                                <div key={i} className="flex justify-between items-center gap-4 text-xs font-bold text-gray-700">
                                  <span className="truncate w-3/4 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-gray-100 text-gray-500 text-[10px] font-black flex items-center justify-center">
                                      {rank}
                                    </span>
                                    {displayName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-[10px]">{pct}%</span>
                                    <span className="font-black text-gray-800 bg-[#549E9E]/10 text-[#549E9E] px-2 py-0.5 rounded-md">
                                      {med.total_items}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {allMedicines.length === 0 && (
                              <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase">
                                No medicine volume recorded.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Pagination
                        currentPage={medicinesPage}
                        totalPages={totalMedicinesPages}
                        totalItems={allMedicines.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setMedicinesPage}
                      />
                    </div>

                    {/* Right Insights card */}
                    <div className="bg-[#549E9E]/5 border border-[#549E9E]/20 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#549E9E] text-white flex items-center justify-center shadow-lg shadow-[#549E9E]/10">
                          <ShieldCheck size={20} />
                        </div>
                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Stock & Prescription Insights</h4>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed">
                          This view ranks the most active formulas and medicines dispensed by the clinic pharmacy. Use these counts to manage inventory reorder points and ensure high-demand homeopathic remedies remain in stock.
                        </p>
                      </div>

                      <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Package size={16} />
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight block">Unique Formulas Prescribed</span>
                            <span className="text-xs font-black text-gray-800">{allMedicines.length} Remedy Classes</span>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-gray-100" />
                        <div>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight block">Total Dispensed</span>
                          <span className="text-xs font-black text-emerald-600">{totalMedsDispensed} Items</span>
                        </div>
                      </div>
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
