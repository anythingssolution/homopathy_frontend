import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Building2, ChevronDown, ClipboardList, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function StaffBranchSwitcher({ reloadOnChange = true }: { reloadOnChange?: boolean }) {
  const { user, branchScope, selectBranch } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const branches = branchScope?.available_branches || [];
  const selectedBranch = useMemo(() => {
    return branches.find(b => Number(b.id) === Number(branchScope?.selected_branch_id));
  }, [branches, branchScope?.selected_branch_id]);

  const selectedBranchName = selectedBranch?.branch_name || t('branch_switcher.select_branch', 'Select branch');

  const roleValue = String(user?.role_code || user?.role || '').toLowerCase();
  const showPreviousPatientsButton =
    roleValue === 'doc' ||
    roleValue === 'doctor' ||
    roleValue === 'rec' ||
    roleValue === 'receptionist';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!branchScope?.required) {
    return null;
  }

  const handleBranchSelect = async (branchId: number) => {
    if (Number(branchId) === Number(branchScope?.selected_branch_id)) {
      setIsOpen(false);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setIsOpen(false);

    const result = await selectBranch(branchId);
    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.message || 'Failed to update branch');
      return;
    }

    if (reloadOnChange) {
      window.location.reload();
      return;
    }

    setMessage('Branch updated successfully');
  };

  return (
    <div className="mb-6 flex flex-wrap items-stretch justify-end gap-3">
      {showPreviousPatientsButton && (
        <Link
          to="/previous-patients"
          className="inline-flex items-center justify-center gap-2 rounded-[28px] border border-[#549E9E]/25 bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-[#2d8789] shadow-sm transition hover:border-[#549E9E] hover:bg-[#e7f5f4] hover:shadow-md"
        >
          <ClipboardList size={16} />
          {t('previous_patients.nav_button', 'Previous Patients')}
        </Link>
      )}

      <div className="relative inline-block w-full text-left sm:w-auto" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !isSubmitting && branches.length > 0 && setIsOpen(!isOpen)}
          disabled={isSubmitting || branches.length === 0}
          className={`flex w-full items-center justify-between gap-4 rounded-[28px] border bg-white px-5 py-3 text-left shadow-sm outline-none transition-all duration-300 hover:shadow-md focus:outline-none sm:w-auto sm:min-w-[240px] ${
            isOpen ? 'border-[#549E9E] ring-2 ring-[#549E9E]/5' : 'border-gray-100 hover:border-[#549E9E]/20'
          } ${isSubmitting ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
        >
          <div className="flex min-w-0 items-center gap-3 text-[#549E9E]">
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin text-[#549E9E]" />
            ) : (
              <Building2 size={16} className="text-[#549E9E]" />
            )}
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase leading-tight tracking-widest text-[#549E9E]/60">
                {t('branch_switcher.current_branch', 'Current Branch')}
              </div>
              <div className="mt-0.5 truncate text-xs font-black leading-tight text-gray-800">
                {selectedBranchName}
              </div>
            </div>
          </div>

          {branches.length > 0 && !isSubmitting && (
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#549E9E]' : ''}`}
            />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 z-[999] mt-2 w-full min-w-[240px] space-y-1 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-2 shadow-2xl"
            >
              <div className="border-b border-gray-50 px-3 py-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {t('branch_switcher.select_active', 'Select active branch')}
                </span>
              </div>
              <div className="scrollbar-light max-h-[200px] overflow-y-auto">
                {branches.map((branch) => {
                  const isSelected = Number(branch.id) === Number(branchScope?.selected_branch_id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleBranchSelect(Number(branch.id))}
                      className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-3 text-left text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#549E9E]/10 text-[#549E9E]'
                          : 'text-gray-650 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                      }`}
                    >
                      <span className="truncate">{branch.branch_name}</span>
                      {isSelected && <Check size={14} className="shrink-0 text-[#549E9E]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {message && (
          <div className="absolute right-0 top-full mt-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-500 shadow-md">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
