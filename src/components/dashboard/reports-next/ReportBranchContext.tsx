import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { fetchReportModule as fetchModule } from './lib';

type ReportBranchValue = {
  branchId: number | undefined;
  branchName: string;
  setBranchId: (value: number | undefined) => void;
  fetchReportModule: typeof fetchModule;
  reportUrl: (path: string) => string;
  isCurrent: () => boolean;
};

const Context = createContext<ReportBranchValue | null>(null);

// Mounted separately for each submenu. This selection never calls selectBranch
// or reads the working branch as its default.
export function ReportBranchProvider({ children }: { children: React.ReactNode }) {
  const { branchScope } = useAuth();
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState<number>();
  const current = useRef({ branchId, generation: 0 });
  if (current.current.branchId !== branchId) current.current = { branchId, generation: current.current.generation + 1 };
  const generation = current.current.generation;
  const isCurrent = useCallback(() => current.current.generation === generation, [generation]);
  const branchName = branchId
    ? branchScope?.available_branches.find(branch => Number(branch.id) === branchId)?.branch_name || String(branchId)
    : t('reports_next.branch_filter.all');
  const fetchReportModule: typeof fetchModule = useCallback(async (token, module, from, to, options) => {
    const data = await fetchModule(token, module, from, to, { ...options, reportScope: 'independent', branchId });
    if (!isCurrent()) throw new DOMException('Report branch changed', 'AbortError');
    return data;
  }, [branchId, isCurrent]);
  const reportUrl = useCallback((path: string) => {
    const [url, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('report_scope', 'independent');
    params.set('branch_id', branchId ? String(branchId) : 'all');
    return `${url}?${params}`;
  }, [branchId]);

  return <Context.Provider value={{ branchId, branchName, setBranchId, fetchReportModule, reportUrl, isCurrent }}>{children}</Context.Provider>;
}

export function useReportBranch() {
  const value = useContext(Context);
  if (!value) throw new Error('useReportBranch must be used within Reports Next');
  return value;
}

export function useReportBranchPagination(setParams: SetURLSearchParams) {
  const { branchId } = useReportBranch();
  const previous = useRef(branchId);
  useEffect(() => {
    // React Router changes setParams when the query changes. Reset only for
    // an actual branch change, so clicking Next does not reset itself to page 1.
    if (previous.current === branchId) return;
    previous.current = branchId;
    setParams(params => {
      const next = new URLSearchParams(params);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [branchId, setParams]);
}
