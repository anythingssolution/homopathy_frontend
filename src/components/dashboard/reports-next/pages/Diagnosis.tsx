import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, RefreshCcw, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import { DateBar } from '../DateBar';
import { useReviewDate } from '../ReviewDateContext';
import { fetchReportModule, parseIsoDate } from '../lib';

const COLORS = ['#549E9E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];

type PatientRow = {
  key: string;
  name: string;
  mobile: string;
  lastVisit: string;
  consults: number;
};

type DiagnosisGroup = {
  key: string;
  diagnosis: string;
  diseases: string[];
  patients: PatientRow[];
  consults: number;
};

const formatDate = (value: unknown, locale: string) => {
  const date = parseIsoDate(value) || (value ? new Date(String(value)) : null);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const buildGroups = (history: any[]): { groups: DiagnosisGroup[]; unlabeled: number } => {
  const groups = new Map<string, DiagnosisGroup>();
  let unlabeled = 0;

  for (const row of history) {
    const diagnosis = String(row.diagnosis || '').trim();
    if (!diagnosis) {
      unlabeled += 1;
      continue;
    }
    const key = diagnosis.toLowerCase().replace(/\s+/g, ' ');
    let group = groups.get(key);
    if (!group) {
      group = { key, diagnosis, diseases: [], patients: [], consults: 0 };
      groups.set(key, group);
    }
    group.consults += 1;
    const disease = String(row.disease || '').trim();
    if (disease && !group.diseases.some((item) => item.toLowerCase() === disease.toLowerCase())) {
      group.diseases.push(disease);
    }

    const personKey = String(row.patient_mobile_no || row.patient_full_name || row.consultation_id);
    let person = group.patients.find((item) => item.key === personKey);
    if (!person) {
      person = {
        key: personKey,
        name: row.patient_full_name || '—',
        mobile: row.patient_mobile_no || '',
        lastVisit: row.appointment_date || '',
        consults: 0,
      };
      group.patients.push(person);
    }
    person.consults += 1;
    if (String(row.appointment_date || '') > String(person.lastVisit || '')) {
      person.lastVisit = row.appointment_date;
    }
  }

  const list = Array.from(groups.values())
    .map((group) => ({
      ...group,
      patients: group.patients.sort((a, b) => String(b.lastVisit).localeCompare(String(a.lastVisit))),
    }))
    .sort((a, b) => b.patients.length - a.patients.length || b.consults - a.consults);

  return { groups: list, unlabeled };
};

export default function DiagnosisPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-GB';
  const { token } = useAuth();
  const { dateFilter, setDateFilter, customDateRange, setCustomDateRange, range } = useReviewDate();
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [openKey, setOpenKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchReportModule(token, 'clinical', range.from, range.to, { force });
      setHistory(Array.isArray(data?.consultation_history) ? data.consultation_history : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token, range.from, range.to, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const { groups, unlabeled } = useMemo(() => buildGroups(history), [history]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((group) =>
      [group.diagnosis, ...group.diseases, ...group.patients.map((person) => `${person.name} ${person.mobile}`)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [groups, search]);

  const labeledConsults = groups.reduce((sum, group) => sum + group.consults, 0);
  const uniquePatients = new Set(
    groups.flatMap((group) => group.patients.map((person) => person.key)),
  ).size;
  const chart = filtered.slice(0, 8).map((group) => ({
    name: group.diagnosis.length > 22 ? `${group.diagnosis.slice(0, 20)}…` : group.diagnosis,
    patients: group.patients.length,
    consults: group.consults,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{t('reports_next.diagnosis.title')}</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">{t('reports_next.diagnosis.subtitle')}</p>
      </div>
      <DateBar
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRange={setCustomDateRange}
        onRefresh={() => void load(true)}
        loading={loading}
        showPrint
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
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Mini label={t('reports_next.diagnosis.diagnoses')} value={groups.length} />
            <Mini label={t('reports_next.diagnosis.patients')} value={uniquePatients} />
            <Mini label={t('reports_next.diagnosis.consults')} value={labeledConsults} />
            <Mini label={t('reports_next.diagnosis.unlabeled')} value={unlabeled} />
          </div>

          {chart.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 min-h-[280px]">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-1">
                {t('reports_next.diagnosis.top')}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 mb-3">{t('reports_next.diagnosis.top_sub')}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="patients" name={t('reports_next.diagnosis.col_patients')} radius={[0, 6, 6, 0]}>
                    {chart.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">
                  {t('reports_next.diagnosis.list')}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{t('reports_next.diagnosis.list_sub')}</p>
              </div>
              <div className="relative max-w-xs w-full no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('reports_next.diagnosis.search')}
                  className="w-full pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-[#549E9E]"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm font-semibold text-slate-400">
                {groups.length === 0 ? t('reports_next.diagnosis.empty') : t('reports_next.diagnosis.no_match')}
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((group) => {
                  const open = openKey === group.key;
                  const share = labeledConsults > 0 ? Math.round((group.consults / labeledConsults) * 100) : 0;
                  return (
                    <div key={group.key}>
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? '' : group.key)}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50/80 flex items-start gap-3"
                      >
                        <ChevronDown
                          size={16}
                          className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-0' : '-rotate-90'}`}
                        />
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="md:col-span-2">
                            <p className="text-sm font-black text-slate-800">{group.diagnosis}</p>
                            {group.diseases.length > 0 && (
                              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                {t('reports_next.diagnosis.disease')}: {group.diseases.join(', ')}
                              </p>
                            )}
                          </div>
                          <p className="text-xs font-black text-[#2d8789]">
                            {t('reports_next.diagnosis.patient_n', { count: group.patients.length })}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            {t('reports_next.diagnosis.consult_n', { count: group.consults })} · {share}%
                          </p>
                        </div>
                      </button>
                      {open && (
                        <div className="px-5 pb-4 pl-12">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-2 pr-3">{t('reports_next.diagnosis.col_patient')}</th>
                                <th className="py-2 pr-3">{t('reports_next.diagnosis.col_last')}</th>
                                <th className="py-2 text-right">{t('reports_next.diagnosis.col_consults')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {group.patients.map((person) => (
                                <tr key={person.key}>
                                  <td className="py-2 pr-3">
                                    <p className="text-sm font-bold text-slate-800">{person.name}</p>
                                    {person.mobile && (
                                      <a href={`tel:${person.mobile}`} className="text-[11px] font-semibold text-[#2d8789] hover:underline">
                                        {person.mobile}
                                      </a>
                                    )}
                                  </td>
                                  <td className="py-2 pr-3 text-xs font-bold text-slate-500">
                                    {formatDate(person.lastVisit, dateLocale)}
                                  </td>
                                  <td className="py-2 text-right text-xs font-black text-slate-700">{person.consults}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
