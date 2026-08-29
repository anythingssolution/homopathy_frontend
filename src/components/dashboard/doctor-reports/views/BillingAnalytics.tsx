import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCcw, AlertCircle, IndianRupee, CreditCard, Banknote, Clock, MapPin, Calendar, UserCheck, Pill } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { SummaryMetricCard } from '../components/SummaryMetricCard';
import ChartInfoButton from '../components/ChartInfoButton';
import { useReportData } from '../hooks/useReportData';
import { useAuth } from '../../../../context/AuthContext';
import { FilterDropdown } from '../components/FilterDropdown';
import CustomDatePicker from '../../../CustomDatePicker';
import { useTranslation } from 'react-i18next';

interface BillingAnalyticsProps {
  token: string | null;
}

export const BillingAnalytics: React.FC<BillingAnalyticsProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { data, isLoading, error, dateFilter, setDateFilter, customDateRange, setCustomDateRange, fetchReports } = useReportData(token, 'billing');
  const { branchScope } = useAuth();
  
  const rev = data?.total_revenue?.[0] || {};
  
  const paymentStatusData = data?.payment_status ? [
    { name: t('reports.billing.paid'), value: Number(data.payment_status.find((r: any) => r.payment_status === 'PAID')?.total_bills || 0) },
    { name: t('reports.billing.unpaid'), value: Number(data.payment_status.find((r: any) => r.payment_status === 'UNPAID')?.total_bills || 0) },
    { name: t('reports.billing.partial'), value: Number(data.payment_status.find((r: any) => r.payment_status === 'PARTIAL')?.total_bills || 0) }
  ].filter(d => d.value > 0) : [];

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

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
          className="cursor-pointer bg-[#549E9E]/10 text-[#549E9E] px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-widest hover:bg-[#549E9E] hover:text-white transition-all flex items-center gap-2 border border-[#549E9E]/10 self-stretch md:self-auto justify-center"
        >
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? t('reports.clinical.syncing') : t('reports.refresh')}
        </button>
      </div>

      {isLoading ? (
         <div className="flex-1 flex justify-center items-center min-h-[300px]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCcw className="text-[#549E9E] w-10 h-10" /></motion.div></div>
      ) : error ? (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"><AlertCircle size={18} /> {error}</div>
      ) : !data ? (
         <div className="flex-1 border border-gray-100 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50/30">
           <IndianRupee className="text-[#549E9E]/40 mb-4" size={48} />
           <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest mb-2">{t('reports.billing.no_data')}</h4>
         </div>
      ) : (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryMetricCard title={t('reports.billing.total_bills')} value={rev.total_bills || 0} icon={Banknote} theme="teal" />
              <SummaryMetricCard title={t('reports.billing.total_amount')} value={`₹${rev.total_amount || 0}`} icon={IndianRupee} theme="blue" />
              <SummaryMetricCard title={t('reports.billing.paid_amount')} value={`₹${rev.paid_amount || 0}`} icon={CreditCard} theme="green" />
              <SummaryMetricCard title={t('reports.pending')} value={`₹${rev.pending_amount || 0}`} icon={Clock} theme="amber" />
            </div>

            {Array.isArray(data?.pending_amount) && data.pending_amount.length > 0 && (
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.billing.pending_dues')}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {t('reports.billing.pending_dues_sub')}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_patient')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_date')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_consult_bill')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_type')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_total')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_paid')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.pending')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-bold text-gray-700">
                      {data.pending_amount.map((row: any) => (
                        <tr key={row.bill_id} className="hover:bg-[#549E9E]/[0.02]">
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-gray-800">{row.patient_full_name}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{row.patient_mobile_no}</div>
                          </td>
                          <td className="py-3 px-4">
                            {row.due_date ? new Date(row.due_date).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div>{row.auid || row.bill_number}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                              {row.consultation_id ? t('reports.billing.consult_n', { id: row.consultation_id }) : (row.treatment_name || t('reports.billing.repeat'))}
                              {row.doctor_name ? ` • ${row.doctor_name}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 uppercase tracking-widest text-[10px]">{row.bill_type}</td>
                          <td className="py-3 px-4 text-right">₹ {Number(row.total_amount || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">₹ {Number(row.paid_amount || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-amber-500">₹ {Number(row.pending_amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm min-h-[400px]">
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.billing.payment_status')}</h4>
                    <ChartInfoButton infoKey="payment_status" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.billing.payment_status_sub')}</p>
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
                    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">{t('reports.billing.not_enough')}</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm min-h-[400px]">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.billing.collection_mode')}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('reports.billing.collection_mode_sub')}</p>
                </div>
                <div className="overflow-x-auto">
                   {data?.payment_mode_collection && data.payment_mode_collection.length > 0 ? (
                     <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_mode')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_payment_for')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_count')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_amount')}</th>
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
                     <div className="h-[250px] flex items-center justify-center text-sm font-bold text-gray-400">{t('reports.billing.not_enough')}</div>
                   )}
                </div>
              </div>
            </div>

            {/* Revenue by Consultant Section */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck size={18} className="text-[#549E9E]" /> {t('reports.billing.revenue_consultant')}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {t('reports.billing.revenue_consultant_sub')}
                  </p>
                </div>
                {data?.revenue_by_consultant && data.revenue_by_consultant.length > 0 && (
                  <span className="text-[10px] font-black text-[#549E9E] bg-[#549E9E]/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    {t('reports.billing.doctors_n', { count: data.revenue_by_consultant.length })}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                {data?.revenue_by_consultant && data.revenue_by_consultant.length > 0 ? (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_doctor')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('reports.billing.col_consultations')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_consult_rev')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_counter_med')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_test_lab')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_courier_med')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_courier_charge')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_courier_total')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_gross')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_paid_rev')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.pending')}</th>
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
                          <td className="py-3 px-4 text-right font-bold text-amber-600">₹ {Number(doc.test_lab_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600">₹ {Number(doc.courier_medicine_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-sky-600">₹ {Number(doc.courier_charge_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-black text-cyan-700">₹ {Number(doc.courier_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-black text-[#549E9E] text-sm">₹ {Number(doc.total_gross_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">₹ {Number(doc.total_paid_revenue || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-amber-500">₹ {Number(doc.total_pending_revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {t('reports.billing.no_doctor_rev')}
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Medicine Section */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <Pill size={18} className="text-emerald-500" /> {t('reports.billing.revenue_medicine')}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {t('reports.billing.revenue_medicine_sub')}
                  </p>
                </div>
                {data?.revenue_by_medicine && data.revenue_by_medicine.length > 0 && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {t('reports.billing.medicines_sold', { count: data.revenue_by_medicine.length })}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                {data?.revenue_by_medicine && data.revenue_by_medicine.length > 0 ? (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_medicine')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('reports.billing.col_bills_count')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('reports.billing.col_qty_sold')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_avg_price')}</th>
                        <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_gross_rev')}</th>
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
                    {t('reports.billing.no_med_rev')}
                  </div>
                )}
              </div>
            </div>

            {data?.branch_wise_revenue && data.branch_wise_revenue.length > 0 && (
               <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                  <div className="mb-6">
                    <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">{t('reports.billing.branch_revenue')}</h4>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('reports.billing.col_branch')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_bills')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.total_amount')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.billing.col_paid')}</th>
                            <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('reports.pending')}</th>
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
