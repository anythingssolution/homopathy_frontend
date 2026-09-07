import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, Percent, RefreshCcw, XCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { BookedVsConsultedView } from '../../doctor-reports/views/BookedVsConsultedView';
import { SummaryMetricCard } from '../../doctor-reports/components/SummaryMetricCard';
import { DateBar } from '../DateBar';
import {
  consultRateFromDaily,
  fetchReportModule,
  num,
  parseIsoDate,
  rangeForFilter,
  reportWindowLabelKey,
  statusCount,
  type CustomRange,
} from '../lib';
import { useReportWindow } from '../useReportWindow';

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token } = useAuth();
  const [tab, setTab] = useState<'status' | 'came'>('status');
  const { dateFilter, setDateFilter } = useReportWindow('1_week');
  const [customDateRange, setCustomDateRange] = useState<CustomRange>({ from: '', to: '' });
  const [data, setData] = useState<any>(null);
  const [prevData, setPrevData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token || tab !== 'status') return;
    setLoading(true);
    setError('');
    const range = rangeForFilter(dateFilter, customDateRange);
    const days = Math.max(
      1,
      Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000),
    );
    const prevTo = new Date(range.from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevTo.getDate() - days);
    try {
      const [current, previous] = await Promise.all([
        fetchReportModule(token, 'appointments', range.from, range.to, { force }),
        fetchReportModule(token, 'appointments', prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10), { force }),
      ]);
      setData(current);
      setPrevData(previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
    } finally {
      setLoading(false);
    }
  }, [token, dateFilter, customDateRange, tab, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const completed = statusCount(data?.status_appointments, 'completed');
  const pending = statusCount(data?.status_appointments, 'pending');
  const cancelled = statusCount(data?.status_appointments, 'cancelled');
  const confirmed = statusCount(data?.status_appointments, 'confirmed');
  const waiting = pending + confirmed;
  const total = completed + waiting + cancelled;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const prev = consultRateFromDaily(prevData?.date_wise_appointments);
  const delta = rate - prev.rate;

  const chartData = (data?.date_wise_appointments || []).map((row: any) => ({
    date: new Date(row.appointment_date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
    total: num(row.total_appointments),
    completed: num(row.completed_appointments),
  }));

  const windowLabel =
    dateFilter === 'custom' && customDateRange.from && customDateRange.to
      ? `${parseIsoDate(customDateRange.from)?.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' }) || customDateRange.from} – ${parseIsoDate(customDateRange.to)?.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' }) || customDateRange.to}`
      : t(reportWindowLabelKey(dateFilter, 'history'));

  const pie = [
    { name: t('reports_next.completed'), value: completed, color: '#10B981' },
    { name: t('reports_next.pending'), value: waiting, color: '#F59E0B' },
    { name: t('reports_next.cancelled'), value: cancelled, color: '#EF4444' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.appointments.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.appointments.subtitle')}</p>
      </div>

      <div className="no-print flex gap-2">
        {(['status', 'came'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`cursor-pointer px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border ${
              tab === id ? 'bg-[#549E9E] text-white border-[#549E9E]' : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {id === 'status' ? t('reports_next.appointments.tab_status') : t('reports_next.appointments.tab_came')}
          </button>
        ))}
      </div>

      {tab === 'came' ? (
        <BookedVsConsultedView token={token} />
      ) : (
        <>
          <DateBar
            dateFilter={dateFilter}
            onDateFilter={setDateFilter}
            customDateRange={customDateRange}
            onCustomDateRange={setCustomDateRange}
            onRefresh={() => void load(true)}
            loading={loading}
          />
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCcw className="animate-spin text-[#549E9E]" size={28} />
            </div>
          ) : !data ? (
            <p className="text-sm font-semibold text-slate-400 py-12 text-center">{t('reports_next.empty_try_week')}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <SummaryMetricCard
                  title={t('reports_next.total')}
                  value={total}
                  icon={CalendarCheck}
                  theme="teal"
                  subtitle={windowLabel}
                />
                <SummaryMetricCard
                  title={t('reports_next.completed')}
                  value={completed}
                  icon={CheckCircle2}
                  theme="green"
                  subtitle={windowLabel}
                />
                <SummaryMetricCard
                  title={t('reports_next.pending')}
                  value={waiting}
                  icon={Clock}
                  theme="amber"
                  subtitle={windowLabel}
                />
                <SummaryMetricCard
                  title={t('reports_next.cancelled')}
                  value={cancelled}
                  icon={XCircle}
                  theme="rose"
                  subtitle={windowLabel}
                />
                <SummaryMetricCard
                  title={t('reports_next.consultation_rate')}
                  value={`${rate}%`}
                  icon={Percent}
                  theme="blue"
                  subtitle={windowLabel}
                  trend={
                    prev.total > 0
                      ? {
                          direction: delta >= 0 ? 'up' : 'down',
                          tone: delta >= 0 ? 'good' : 'bad',
                          label: t('reports_next.vs_last_period', { points: Math.abs(delta), dir: delta >= 0 ? '+' : '−' }),
                        }
                      : undefined
                  }
                />
              </div>
              {chartData.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400 py-10 text-center">{t('reports_next.empty_try_week')}</p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-5 h-[300px]">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">
                      {t('reports_next.appointments.trend')}
                    </h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="total" stroke="#549E9E" fill="#549E9E33" name={t('reports_next.total')} />
                        <Area type="monotone" dataKey="completed" stroke="#10B981" fill="#10B98133" name={t('reports_next.completed')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 min-h-[300px]">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">
                      {t('reports_next.appointments.status')}
                    </h4>
                    {pie.length === 0 ? (
                      <p className="text-sm text-slate-400 font-semibold">{t('reports_next.no_status')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={pie} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                            {pie.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}