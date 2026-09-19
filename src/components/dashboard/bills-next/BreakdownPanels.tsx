import Pagination from '../../Pagination';
import useListPagination from './useListPagination';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { money, mergeConsultants, mergeMedicines, sessionBundle } from './lib';

type MixBarProps = {
  label: string;
  value: number;
  max: number;
  tone?: 'teal' | 'violet' | 'amber' | 'sky';
};

export const MixBar = ({ label, value, max, tone = 'teal' }: MixBarProps) => {
  const colors = {
    teal: 'bg-[#549E9E]',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
  };
  const width = Number(value || 0) <= 0 ? 0 : Math.max(4, Math.round((Number(value || 0) / Math.max(max, 1)) * 100));
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-black text-slate-800">{money(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-base font-black text-slate-800">{value}</p>
  </div>
);

const ConsultantTable = ({ rows, counts, slot }: { rows: any[]; counts?: any[]; slot?: 'morning' | 'evening' }) => {
  const { t } = useTranslation();
  const list = mergeConsultants(rows, counts, slot);
  const pagination = useListPagination(list);
  if (list.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400">{t('bills_next.no_consultants')}</p>;
  }
  return (
    <div>
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <th className="px-4 py-3">{t('bills_next.col_doctor')}</th>
            <th className="px-4 py-3 text-center">{t('bills_next.col_consults')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.consult')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.medicine')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.tests')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.courier')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.col_gross')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.collected')}</th>
            <th className="px-4 py-3 text-right">{t('bills_next.pending')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pagination.rows.map((row) => (
            <tr key={row.doctor_id || row.doctor_name}>
              <td className="px-4 py-3 text-sm font-black text-slate-800">{row.doctor_name}</td>
              <td className="px-4 py-3 text-center text-sm font-black text-slate-700">{row.total_consultations}</td>
              <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">{money(row.consultation_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-bold text-violet-600">{money(row.medication_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-bold text-amber-600">{money(row.test_lab_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-bold text-sky-600">{money(row.courier_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-black text-[#2d8789]">{money(row.total_gross_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">{money(row.total_paid_revenue)}</td>
              <td className="px-4 py-3 text-right text-sm font-black text-amber-600">{money(row.total_pending_revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Pagination {...pagination.controls} />
    </div>
  );
};

const MedicineList = ({ rows }: { rows: any[] }) => {
  const { t } = useTranslation();
  const list = mergeMedicines(rows);
  const pagination = useListPagination(list);
  if (list.length === 0) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-400">{t('bills_next.no_meds')}</p>;
  }
  return (
    <div className="space-y-2">
      {pagination.rows.map((med) => (
        <div key={med.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{String(med.name || '').toUpperCase()}</p>
            <p className="text-[10px] font-bold text-slate-400">
              {t('bills_next.qty_bills', { qty: med.qty, bills: med.bills })}
            </p>
          </div>
          <p className="text-sm font-black text-emerald-600 shrink-0">{money(med.gross)}</p>
        </div>
      ))}
      <Pagination {...pagination.controls} />
    </div>
  );
};

export function ConsultantsPanel({ consultant }: { consultant: any }) {
  const { t } = useTranslation();
  const bundle = sessionBundle(consultant);
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-black text-slate-800">{t('bills_next.tab_consultants')}</h3>
        <p className="text-[11px] font-semibold text-slate-400">{t('bills_next.consultants_sub')}</p>
      </div>
      <ConsultantTable rows={[...bundle.morning, ...bundle.evening]} counts={consultant?.consultation_counts} />
    </div>
  );
}

export function SessionPanel({
  slot,
  consultant,
  medicine,
}: {
  slot: 'morning' | 'evening';
  consultant: any;
  medicine: any;
}) {
  const { t } = useTranslation();
  const doctors = sessionBundle(consultant)[slot];
  const meds = sessionBundle(medicine)[slot];
  const merged = mergeConsultants(doctors, consultant?.consultation_counts, slot);
  const gross = merged.reduce((sum, row) => sum + Number(row.total_gross_revenue || 0), 0);
  const paid = merged.reduce((sum, row) => sum + Number(row.total_paid_revenue || 0), 0);
  const pending = merged.reduce((sum, row) => sum + Number(row.total_pending_revenue || 0), 0);
  const consults = merged.reduce((sum, row) => sum + Number(row.total_consultations || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label={t('bills_next.col_gross')} value={money(gross)} />
        <Mini label={t('bills_next.collected')} value={money(paid)} />
        <Mini label={t('bills_next.pending')} value={money(pending)} />
        <Mini label={t('bills_next.col_consults')} value={String(consults)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-black text-slate-800">{t('bills_next.tab_consultants')}</h3>
          </div>
          <ConsultantTable rows={doctors} counts={consultant?.consultation_counts} slot={slot} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="text-sm font-black text-slate-800 mb-3">{t('bills_next.top_meds')}</h3>
          <MedicineList rows={meds} />
        </div>
      </div>
    </div>
  );
}
