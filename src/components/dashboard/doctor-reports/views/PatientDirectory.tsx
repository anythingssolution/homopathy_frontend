import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCcw, AlertCircle, Users, Phone, Calendar, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from '../../../Pagination';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';
import { useAuth } from '../../../../context/AuthContext';

interface PatientDirectoryProps {
  token: string | null;
}

export const PatientDirectory: React.FC<PatientDirectoryProps> = ({ token }) => {
  const { t } = useTranslation();
  const { branchScope } = useAuth();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 8;

  const [dateFilter, setDateFilter] = useState('all_time');
  const [customDateRange, setCustomDateRange] = useState(() => {
    const fromStr = (() => {
      const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    })();
    const toStr = new Date().toISOString().split('T')[0];
    return { from: fromStr, to: toStr };
  });

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Calculate fromDate and toDate based on dateFilter and customDateRange
  useEffect(() => {
    if (dateFilter === 'all_time') {
      setFromDate('');
      setToDate('');
      return;
    }
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

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (filterType !== 'all') params.append('type', filterType);
      if (dateFilter !== 'all_time' && fromDate) params.append('from_date', fromDate);
      if (dateFilter !== 'all_time' && toDate) params.append('to_date', toDate);
      const selectedBranchId = branchScope?.selected_branch_id;
      if (selectedBranchId) params.append('branch_id', String(selectedBranchId));
      params.append('page', String(page));
      params.append('page_size', String(pageSize));

      const res = await fetch(`/api/v1/doctors/patient?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.data || []);
        setTotalPages(Number(data.meta?.total_pages || 1));
      } else {
        setError(data.message || 'Failed to fetch patients');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, filterType, dateFilter, customDateRange]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchPatients(); }, search.trim() ? 500 : 0);
    return () => clearTimeout(timer);
  }, [search, filterType, token, page, fromDate, toDate, dateFilter, branchScope?.selected_branch_id]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Timeframe & Branch Header */}
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
              { id: 'all_time', label: 'All Time' },
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
          onClick={fetchPatients}
          disabled={isLoading}
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border-2 border-[#549E9E]/5 self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Directory Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#549E9E] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search patient name, mobile, UUID..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-2 border-transparent py-3 pl-14 pr-6 text-sm font-bold text-gray-600 rounded-xl outline-none focus:bg-white focus:border-[#549E9E]/20 transition-all placeholder:text-gray-300" 
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'All Patients' }, 
            { id: 'recent', label: 'Recent' }, 
            { id: 'followup_pending', label: 'Follow-up Pending' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setFilterType(t.id)} 
              className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${filterType === t.id ? 'bg-[#549E9E]/10 border-[#549E9E] text-[#549E9E]' : 'bg-transparent border-gray-100 text-gray-400 hover:border-[#549E9E]/30'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : patients.length === 0 ? (
        <div className="flex-1 text-center py-20 border border-gray-100 rounded-xl bg-gray-50/30">
          <Users className="mx-auto text-gray-200 mb-4" size={48} />
          <h3 className="text-lg font-black text-gray-700 uppercase tracking-widest">No Patients Found</h3>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="border border-gray-200 overflow-hidden shadow-sm bg-white rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Patient Name & ID</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Age / Gender</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Info</th>
                  <th className="px-5 py-4 text-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Appointments</span>
                    <div className="flex items-center justify-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Total</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Active</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Comp</span>
                    </div>
                  </th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p, idx) => (
                  <motion.tr
                    key={p.patient_id || p.id || Math.random()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-[#549E9E]/5 transition-colors group relative cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800 uppercase tracking-wider">{p.full_name || p.patient_full_name || p.name || '-'}</span>
                        <span className="text-[10px] font-bold text-[#549E9E] bg-[#549E9E]/10 px-2 py-0.5 rounded-md w-max mt-1">{p.patient_uuid || p.uuid || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">{p.age ? `${p.age} yrs` : '-'}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.gender || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Phone size={10} className="text-gray-400" /> {p.mobile_no || p.patient_mobile_no || '-'}</span>
                        <span className="text-[10px] font-bold text-gray-400">{p.email || p.patient_email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-black" title="Total Appointments">{p.total_appointments || 0}</span>
                        <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black" title="Active Appointments">{p.active_appointments || 0}</span>
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black" title="Completed Appointments">{p.completed_appointments || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end">
                        {p.last_appointment_date || p.last_visit_date ? (
                          <>
                            <span className="text-xs font-bold text-gray-700">{new Date(p.last_appointment_date || p.last_visit_date).toLocaleDateString()}</span>
                            <span className="text-[10px] font-bold text-gray-400">
                              {new Date(p.last_appointment_date || p.last_visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};
