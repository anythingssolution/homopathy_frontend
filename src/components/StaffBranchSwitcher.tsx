import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Building2, ChevronDown, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function StaffBranchSwitcher({ reloadOnChange = true }: { reloadOnChange?: boolean }) {
  const { branchScope, selectBranch } = useAuth();
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
    <div className="mb-6 flex sm:justify-end w-full">
    <div className="relative inline-block text-left w-full sm:w-auto" ref={dropdownRef}>
      {/* Unified Custom Dropdown Button */}
      <button
        type="button"
        onClick={() => !isSubmitting && branches.length > 0 && setIsOpen(!isOpen)}
        disabled={isSubmitting || branches.length === 0}
        className={`flex items-center justify-between gap-4 bg-white border rounded-[28px] px-5 py-3 shadow-sm hover:shadow-md transition-all duration-300 w-full sm:w-auto sm:min-w-[240px] text-left outline-none focus:outline-none ${
          isOpen ? 'border-[#549E9E] ring-2 ring-[#549E9E]/5' : 'border-gray-100 hover:border-[#549E9E]/20'
        } ${isSubmitting ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-3 text-[#549E9E] min-w-0">
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin text-[#549E9E]" />
          ) : (
            <Building2 size={16} className="text-[#549E9E]" />
          )}
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-widest text-[#549E9E]/60 leading-tight">{t('branch_switcher.current_branch', 'Current Branch')}</div>
            <div className="text-xs font-black text-gray-800 truncate leading-tight mt-0.5">{selectedBranchName}</div>
          </div>
        </div>

        {branches.length > 0 && !isSubmitting && (
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180 text-[#549E9E]' : ''}`}
          />
        )}
      </button>

      {/* Floating custom options list with animations */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-full min-w-[240px] bg-white border border-gray-100 rounded-[24px] shadow-2xl z-[999] p-2 space-y-1 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-gray-50">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('branch_switcher.select_active', 'Select active branch')}</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto scrollbar-light">
              {branches.map((branch) => {
                const isSelected = Number(branch.id) === Number(branchScope?.selected_branch_id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleBranchSelect(Number(branch.id))}
                    className={`w-full text-left rounded-[16px] px-3.5 py-3 transition-all flex items-center justify-between text-xs font-bold ${
                      isSelected
                        ? 'bg-[#549E9E]/10 text-[#549E9E]'
                        : 'text-gray-650 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                    }`}
                  >
                    <span className="truncate">{branch.branch_name}</span>
                    {isSelected && <Check size={14} className="text-[#549E9E] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {message && (
        <div className="absolute right-0 top-full mt-1.5 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5 text-[10px] font-bold text-red-500 shadow-md">
          {message}
        </div>
      )}
    </div>
    </div>
  );
}
