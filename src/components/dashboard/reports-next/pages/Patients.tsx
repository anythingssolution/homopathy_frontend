import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { useReviewDate } from '../ReviewDateContext';
import { fetchReportModule, num } from '../lib';

const COLORS = ['#549E9E', '#10B981', '#F59E0B', '#3B82F6'];

export default function PatientsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { dateFilter, setDateFilter, customDateRange, setCustomDateRange, range } = useReviewDate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(await fetchReportModule(token, 'patients', range.from, range.to, { force }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, range.from, range.to, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const summary = data?.summary?.[0] || {};
  const age = [
    { name: t('reports_next.patients.minors'), value: num(summary.minor_patients) },
    { name: t('reports_next.patients.adults'), value: num(summary.adult_patients) },
    { name: t('reports_next.patients.seniors'), value: num(summary.senior_patients) },
  ].filter((d) => d.value > 0);

  const visit = (data?.new_vs_repeat_patient || [])
    .map((row: any) => ({
      name: row.patient_visit_type === 'NEW' ? t('reports_next.patients.new') : t('reports_next.patients.repeat'),
      value: num(row.total_appointments),
    }))
    .filter((d: any) => d.value > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.patients.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.patients.subtitle')}</p>
      </div>
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
        <p className="py-16 text-center text-sm font-semibold text-slate-400">{t('reports_next.empty_try_week')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Mini label={t('reports_next.patients.active')} value={num(summary.active_primary_patients)} />
            <Mini label={t('reports_next.patients.avg_age')} value={Number(summary.average_patient_age || 0).toFixed(1)} />
            <Mini label={t('reports_next.patients.with_family')} value={num(summary.patients_with_family_members)} />
            <Mini label={t('reports_next.patients.without_family')} value={num(summary.patients_without_family_members)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title={t('reports_next.patients.age_title')} data={age} empty={t('reports_next.patients.no_demo')} />
            <ChartCard title={t('reports_next.patients.visit_title')} data={visit} empty={t('reports_next.patients.no_visit')} />
          </div>
        </>
      )}
    </div>
  );
}

const Mini = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4">
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);

const ChartCard = ({ title, data, empty }: { title: string; data: { name: string; value: number }[]; empty: string }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 min-h-[300px]">
    <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2">{title}</h4>
    {data.length === 0 ? (
      <p className="text-sm font-semibold text-slate-400 py-16 text-center">{empty}</p>
    ) : (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);
