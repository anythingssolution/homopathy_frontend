import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, IndianRupee, CreditCard, Banknote, Clock, MapPin, Calendar, UserCheck, Pill } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { StatCard } from '../components/StatCard';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';

interface BillingAnalyticsProps {
  token: string | null;
}

export const BillingAnalytics: React.FC<BillingAnalyticsProps> = ({ token }) => {
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'billing');
  const { branchScope } = useAuth();
  
  const rev = data?.total_revenue?.[0] || {};
  
  const paymentStatusData = data?.payment_status ? [
    { name: 'Paid', value: Number(data.payment_status.find((r: any) => r.payment_status === 'PAID')?.total_bills || 0) },
    { name: 'Unpaid', value: Number(data.payment_status.find((r: any) => r.payment_status === 'UNPAID')?.total_bills || 0) },
    { name: 'Partial', value: Number(data.payment_status.find((r: any) => r.payment_status === 'PARTIAL')?.total_bills || 0) }
  ].filter(d => d.value > 0) : [];

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

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
         <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !data ? (
         <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
           <IndianRupee className="text-[#549E9E]/40 mb-4" size={48} />
           <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">No Billing Data</h4>
         </div>
      ) : (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Bills" value={rev.total_bills || 0} icon={Banknote} colorClass="border-[#549E9E]" />
              <StatCard title="Total Amount" value={`₹${rev.total_amount || 0}`} icon={IndianRupee} colorClass="border-blue-500" />
              <StatCard title="Paid Amount" value={`₹${rev.paid_amount || 0}`} icon={CreditCard} colorClass="border-emerald-500" />
              <StatCard title="Pending" value={`₹${rev.pending_amount || 0}`} icon={Clock} colorClass="border-amber-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm min-h-[400px]">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Payment Status</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Breakdown of bills</p>
                </div>
                <div className="h-[300px] w-full">
                  {paymentStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={paymentStatusData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={100} 
                          paddingAngle={5} 
                          dataKey="value"
                        >
                          {paymentStatusData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">Not enough data</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm min-h-[400px]">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Collection by Mode</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Revenue by payment methods</p>
                </div>
                <div className="overflow-x-auto">
                   {data?.payment_mode_collection && data.payment_mode_collection.length > 0 ? (
                     <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment For</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Count</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.payment_mode_collection.map((m: any, i: number) => (
                             <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                               <td className="py-3 px-4 text-xs font-bold text-gray-700">{m.payment_mode}</td>
                               <td className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase">{m.payment_for}</td>
                               <td className="py-3 px-4 text-xs font-bold text-gray-600 text-right">{m.total_payments}</td>
                               <td className="py-3 px-4 text-xs font-black text-[#549E9E] text-right">₹{m.collected_amount}</td>
                             </tr>
                          ))}
                        </tbody>
                     </table>
                   ) : (
                     <div className="h-[250px] flex items-center justify-center text-sm font-bold text-gray-400">Not enough data</div>
                   )}
                </div>
              </div>
            </div>

            {/* Revenue by Consultant Section */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck size={18} className="text-[#549E9E]" /> Revenue by Consultant
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    Doctor-wise consultation fee & prescribed medicine revenue breakdown
                  </p>
                </div>
                {data?.revenue_by_consultant && data.revenue_by_consultant.length > 0 && (
                  <span className="text-[10px] font-black text-[#549E9E] bg-[#549E9E]/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    {data.revenue_by_consultant.length} Doctors
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                {data?.revenue_by_consultant && data.revenue_by_consultant.length > 0 ? (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Doctor / Consultant</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Consultations</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Consultation Revenue</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Medication Revenue</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Gross Revenue</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Paid Revenue</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                      {data.revenue_by_consultant.map((doc: any) => (
                        <tr key={doc.doctor_id} className="hover:bg-[#549E9E]/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-gray-800">{doc.doctor_name}</div>
                            {doc.doctor_uuid && (
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{doc.doctor_uuid}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-gray-700">{doc.total_consultations}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-700">₹ {Number(doc.consultation_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-violet-600">₹ {Number(doc.medication_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-black text-[#549E9E] text-sm">₹ {Number(doc.total_gross_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">₹ {Number(doc.total_paid_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-amber-500">₹ {Number(doc.total_pending_revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    No doctor revenue data recorded for this timeframe
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Medicine Section */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <Pill size={18} className="text-emerald-500" /> Revenue by Medicine (Gross Sales Revenue)
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    Total sales revenue generated per medicine without deducting medicine cost price
                  </p>
                </div>
                {data?.revenue_by_medicine && data.revenue_by_medicine.length > 0 && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {data.revenue_by_medicine.length} Medicines Sold
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                {data?.revenue_by_medicine && data.revenue_by_medicine.length > 0 ? (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicine Name</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Bills Count</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total Qty Sold</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Avg Unit Selling Price</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                      {data.revenue_by_medicine.map((med: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-3 px-4 font-black text-gray-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                              #{idx + 1}
                            </span>
                            {med.medicine_name}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-600">{med.total_bills}</td>
                          <td className="py-3 px-4 text-center font-black text-[#549E9E]">{med.total_quantity_sold}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-700">₹ {Number(med.average_unit_price || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">₹ {Number(med.gross_revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    No medicine sales revenue recorded for this timeframe
                  </div>
                )}
              </div>
            </div>

            {data?.branch_wise_revenue && data.branch_wise_revenue.length > 0 && (
               <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Branch Wise Revenue</h4>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Bills</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Amount</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Paid</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.branch_wise_revenue.map((b: any) => (
                             <tr key={b.branch_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                               <td className="py-3 px-4 text-xs font-bold text-gray-700">{b.branch_name}</td>
                               <td className="py-3 px-4 text-xs font-bold text-gray-600 text-right">{b.total_bills}</td>
                               <td className="py-3 px-4 text-xs font-bold text-gray-600 text-right">₹{b.total_amount}</td>
                               <td className="py-3 px-4 text-xs font-bold text-emerald-600 text-right">₹{b.paid_amount}</td>
                               <td className="py-3 px-4 text-xs font-bold text-amber-500 text-right">₹{b.pending_amount}</td>
                             </tr>
                          ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>
      )}
    </div>
  );
};
