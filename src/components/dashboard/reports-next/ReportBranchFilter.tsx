import React from 'react';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useReportBranch } from './ReportBranchContext';

export function ReportBranchFilter() {
  const { t } = useTranslation();
  const { branchScope } = useAuth();
  const { branchId, setBranchId } = useReportBranch();
  return <div className="no-print flex flex-col gap-2 rounded-xl border border-[#549E9E]/20 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
    <label className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
      <span className="inline-flex items-center gap-2"><Building2 size={16} className="text-[#549E9E]" />{t('reports_next.branch_filter.label')}</span>
      <select aria-label={t('reports_next.branch_filter.label')} value={branchId || 'all'} onChange={event => setBranchId(event.target.value === 'all' ? undefined : Number(event.target.value))} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#2d8789] outline-none focus:border-[#549E9E] sm:w-auto sm:min-w-52">
        <option value="all">{t('reports_next.branch_filter.all')}</option>
        {(branchScope?.available_branches || []).map(branch => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
      </select>
    </label>
    <p className="text-xs text-slate-500">{t('reports_next.branch_filter.hint')}</p>
  </div>;
}
