import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Loader2, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StaffBranchSelectionGate() {
  const { user, branchScope, selectBranch, logout } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>(() => branchScope?.selected_branch_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    const roleCode = String(user?.role_code || '').toUpperCase();
    if (roleCode === 'DOC') return 'Doctor';
    if (roleCode === 'REC') return 'Receptionist';
    if (roleCode === 'MED') return 'Medical';
    return 'Staff';
  }, [user]);

  const handleSubmit = async () => {
    if (!selectedBranchId) {
      setError('Please select a branch.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await selectBranch(Number(selectedBranchId));
    if (!result.success) {
      setError(result.message || 'Failed to select branch');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFDF7] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-[40px] shadow-xl p-8 md:p-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-teal/10 text-primary-teal text-[10px] font-black uppercase tracking-widest mb-4">
              <Building2 size={14} />
              Branch selection required
            </div>
            <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
              Select your branch
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-3">
              {roleLabel} role ke liye branch select karna mandatory hai. Iske baad sirf usi branch ka data dikhega.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { logout(); }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

        {branchScope?.available_branches?.length ? (
          <div className="space-y-4">
            {branchScope.available_branches.map((branch) => {
              const isSelected = Number(selectedBranchId) === Number(branch.id);
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={`w-full text-left rounded-[28px] border px-5 py-5 transition-all ${
                    isSelected
                      ? 'border-primary-teal bg-primary-teal/5 shadow-md'
                      : 'border-gray-100 hover:border-primary-teal/30 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-gray-800 uppercase tracking-wider">
                        {branch.branch_name}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MapPin size={12} />
                        <span>{branch.address || 'Address not available'}</span>
                      </div>
                      {branch.contact_no && (
                        <div className="mt-1 text-xs text-gray-400 font-bold">
                          Contact: {branch.contact_no}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="text-primary-teal">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-700 font-medium">
            Aapke user ke liye koi branch assigned nahi hai. Please admin se contact karein.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedBranchId || !branchScope?.available_branches?.length}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-primary-teal text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
