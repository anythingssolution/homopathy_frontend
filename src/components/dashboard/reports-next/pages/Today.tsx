import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Banknote, CalendarCheck, ClipboardList, Pill, RefreshCcw, TrendingDown, TrendingUp, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import {
  consultRateFromDaily,
  fetchReportModule,
  isoDate,
  rangeForFilter,
  rangeForFollowUpFilter,
  rupee,
  statusCount,
  weekRanges,
} from '../lib';

type Tile = {
  to: string;
  label: string;
  hint: string;
  value: string;
  icon: React.ElementType;
  tone: string;
};

export default function TodayPage() {
  const { t } = useTranslation();
  const { token, branchScope } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingVisits, setPendingVisits] = useState(0);
  const [followUps, setFollowUps] = useState(0);
  const [firstConsults, setFirstConsults] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unpaidAmount, setUnpaidAmount] = useState(0);
  const [readyRx, setReadyRx] = useState(0);
  const [thisRate, setThisRate] = useState(0);
  const [lastRate, setLastRate] = useState(0);
  const [thisTotal, setThisTotal] = useState(0);

  const load = useCallback(async (force = false) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const today = isoDate(new Date());
    const open = rangeForFilter('3_months', { from: '', to: '' });
    const upcomingFollowUps = rangeForFollowUpFilter('3_months', { from: '', to: '' });
    const weeks = weekRanges();
    try {
      const [todayAppt, clinicalUpcoming, billing, medical, thisWeek, lastWeek] = await Promise.all([
        fetchReportModule(token, 'appointments', today, today, { force }),
        fetchReportModule(token, 'clinical', upcomingFollowUps.from, upcomingFollowUps.to, { force }),
        fetchReportModule(token, 'billing', open.from, today, { force }),
        fetchReportModule(token, 'medical', open.from, today, { force }),
        fetchReportModule(token, 'appointments', weeks.thisWeek.from, weeks.thisWeek.to, { force }),
        fetchReportModule(token, 'appointments', weeks.lastWeek.from, weeks.lastWeek.to, { force }),
      ]);

      const pending = statusCount(todayAppt?.status_appointments, 'pending');
      const confirmed = statusCount(todayAppt?.status_appointments, 'confirmed');
      setPendingVisits(pending + confirmed);
      setFollowUps(Array.isArray(clinicalUpcoming?.followup_due) ? clinicalUpcoming.followup_due.length : 0);
      const firstRows = Array.isArray(todayAppt?.first_consultations) ? todayAppt.first_consultations : [];
      setFirstConsults(
        new Set(
          firstRows
            .filter((row: any) => String(row.status || '').toLowerCase() !== 'cancelled')
            .map((row: any) => String(row.person_key || `${row.fk_patient_id}:${row.fk_patient_family_member_id || 0}`)),
        ).size,
      );
      const dues = Array.isArray(billing?.pending_amount) ? billing.pending_amount : [];
      setUnpaidCount(dues.length);
      setUnpaidAmount(dues.reduce((sum: number, row: any) => sum + Number(row.pending_amount || 0), 0));
      setReadyRx(Number(medical?.summary?.[0]?.ready_prescriptions_count || 0));

      const current = consultRateFromDaily(thisWeek?.date_wise_appointments);
      const previous = consultRateFromDaily(lastWeek?.date_wise_appointments);
      setThisRate(current.rate);
      setLastRate(previous.rate);
      setThisTotal(current.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports_next.fetch_failed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const delta = thisRate - lastRate;
  const tiles: Tile[] = [
    {
      to: '/reports-next/appointments',
      label: t('reports_next.today_page.pending_visits'),
      hint: t('reports_next.today_page.pending_visits_hint'),
      value: String(pendingVisits),
      icon: CalendarCheck,
      tone: 'border-rose-100 bg-rose-50/60',
    },
    {
      to: '/reports-next/follow-ups',
      label: t('reports_next.today_page.follow_ups'),
      hint: t('reports_next.today_page.follow_ups_hint'),
      value: String(followUps),
      icon: ClipboardList,
      tone: 'border-amber-100 bg-amber-50/60',
    },
    {
      to: '/reports-next/first-consults',
      label: t('reports_next.today_page.first_consults'),
      hint: t('reports_next.today_page.first_consults_hint'),
      value: String(firstConsults),
      icon: UserPlus,
      tone: 'border-sky-100 bg-sky-50/60',
    },
    {
      to: '/reports-next/collections',
      label: t('reports_next.today_page.unpaid'),
      hint: t('reports_next.today_page.unpaid_hint', { amount: rupee(unpaidAmount) }),
      value: String(unpaidCount),
      icon: Banknote,
      tone: 'border-red-100 bg-red-50/50',
    },
    {
      to: '/reports-next/dispensary',
      label: t('reports_next.today_page.ready_rx'),
      hint: t('reports_next.today_page.ready_rx_hint'),
      value: String(readyRx),
      icon: Pill,
      tone: 'border-[#549E9E]/20 bg-[#e7f5f4]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#549E9E]">
            {t('reports_next.today_page.eyebrow')}
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">{t('reports_next.today_page.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
            {t('reports_next.today_page.subtitle', {
              branch: branchScope?.selected_branch?.branch_name || t('reports_next.active_branch'),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          className="no-print flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#549E9E]/20 bg-[#549E9E]/10 px-4 text-xs font-black uppercase tracking-wider text-[#2d8789]"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          {t('reports_next.refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCcw className="animate-spin text-[#549E9E]" size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.to}
                  to={tile.to}
                  className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 ${tile.tone}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={18} className="text-[#2d8789]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t('reports_next.today_page.open')}
                    </span>
                  </div>
                  <p className="mt-4 text-4xl font-black text-slate-900">{tile.value}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-700">{tile.label}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{tile.hint}</p>
                </Link>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#d7ebea] bg-white p-6">
            {thisTotal === 0 ? (
              <p className="text-sm font-semibold text-slate-500">{t('reports_next.today_page.empty_week')}</p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {delta >= 0 ? (
                  <TrendingUp className="text-emerald-600 shrink-0" size={22} />
                ) : (
                  <TrendingDown className="text-rose-500 shrink-0" size={22} />
                )}
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                  {t('reports_next.today_page.consult_sentence', {
                    rate: thisRate,
                    last: lastRate,
                    points: Math.abs(delta),
                    direction:
                      delta > 0
                        ? t('reports_next.today_page.above')
                        : delta < 0
                          ? t('reports_next.today_page.below')
                          : t('reports_next.today_page.same'),
                  })}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
