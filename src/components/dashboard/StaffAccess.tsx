import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, AlertCircle, CheckCircle, Save, ShieldAlert, Check } from 'lucide-react';

interface StaffPermission {
  role_code: string;
  role_label: string;
  primary_module: string;
  granted_module: string;
  permission_label: string;
  total_users: number;
  has_cross_module_access: number;
}

export default function StaffAccess() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<StaffPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/doctors/staff-access', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPermissions(data.data);
        setInitialPermissions(JSON.parse(JSON.stringify(data.data)));
      } else {
        setError(data.message || t('staff_access.error_message'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPermissions();
    }
  }, [token]);

  const handleToggle = (roleCode: string) => {
    setPermissions(prev =>
      prev.map(p =>
        p.role_code === roleCode
          ? { ...p, has_cross_module_access: p.has_cross_module_access === 1 ? 0 : 1 }
          : p
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        permissions: permissions.map(p => ({
          role_code: p.role_code,
          has_cross_module_access: p.has_cross_module_access
        }))
      };

      const res = await fetch('/api/v1/doctors/staff-access', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPermissions(data.data);
        setInitialPermissions(JSON.parse(JSON.stringify(data.data)));
        addToast(t('staff_access.success_message'), 'success');
      } else {
        addToast(data.message || t('staff_access.error_message'), 'error');
      }
    } catch (err) {
      addToast('Network error while saving permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = JSON.stringify(permissions) !== JSON.stringify(initialPermissions);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCcw className="text-[#549E9E] w-10 h-10" />
        </motion.div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Loading Permissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 text-center max-w-lg mx-auto mt-10 rounded-none">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={40} />
        <h3 className="text-lg font-black text-red-600 uppercase tracking-widest mb-2">Error</h3>
        <p className="text-sm font-medium text-red-500 mb-6">{error}</p>
        <button onClick={fetchPermissions} className="bg-[#549E9E] hover:bg-[#438787] text-white px-8 py-3 font-black text-xs uppercase tracking-widest transition-all rounded-none">Try Again</button>
      </div>
    );
  }

  const recPermission = permissions.find(p => p.role_code === 'REC');
  const medPermission = permissions.find(p => p.role_code === 'MED');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Outer Card with Accent Top Border */}
      <div className="bg-white border-t-4 border-t-[#549E9E] border border-gray-150 p-8 md:p-10 space-y-8 relative rounded-none shadow-md">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-wider uppercase">
              {t('staff_access.title')}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {isDirty ? (
              <motion.div
                key="dirty"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E40AF] px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none whitespace-nowrap"
              >
                {t('staff_access.not_saved_yet')}
              </motion.div>
            ) : (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="bg-[#ECFDF5] border border-[#D1FAE5] text-[#065F46] px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle size={12} className="text-[#059669]" />
                {t('staff_access.all_changes_saved')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Permissions Rows */}
        <div className="space-y-6">
          
          {/* Receptionist Access Card */}
          {recPermission && (
            <motion.div 
              onClick={() => handleToggle('REC')}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
              className={`p-6 border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 rounded-none ${
                recPermission.has_cross_module_access === 1
                  ? 'border-[#549E9E] bg-[#549E9E]/[0.02]' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-2">
                <h3 className="text-sm font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                  {t('staff_access.receptionist')}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`relative flex h-2 w-2 ${recPermission.total_users > 0 ? 'block' : 'hidden'}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {recPermission.total_users} {recPermission.total_users === 1 ? t('staff_access.active_user') : t('staff_access.active_users')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 select-none">
                {/* Custom Checkbox Box */}
                <motion.div 
                  animate={{ 
                    scale: recPermission.has_cross_module_access === 1 ? 1 : 0.98,
                    borderColor: recPermission.has_cross_module_access === 1 ? '#549E9E' : '#D1D5DB',
                    backgroundColor: recPermission.has_cross_module_access === 1 ? '#549E9E' : '#FFFFFF'
                  }}
                  className="w-6 h-6 border-2 flex items-center justify-center rounded-none shrink-0"
                >
                  {recPermission.has_cross_module_access === 1 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4 text-white stroke-[3px]" />
                    </motion.div>
                  )}
                </motion.div>
                <div className="space-y-0.5">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-widest cursor-pointer block">
                    {t('staff_access.allow_medical')}
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    {t('staff_access.rec_desc')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Medical Access Card */}
          {medPermission && (
            <motion.div 
              onClick={() => handleToggle('MED')}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
              className={`p-6 border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 rounded-none ${
                medPermission.has_cross_module_access === 1
                  ? 'border-[#549E9E] bg-[#549E9E]/[0.02]' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-2">
                <h3 className="text-sm font-black text-[#549E9E] uppercase tracking-widest flex items-center gap-2">
                  {t('staff_access.medical')}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`relative flex h-2 w-2 ${medPermission.total_users > 0 ? 'block' : 'hidden'}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {medPermission.total_users} {medPermission.total_users === 1 ? t('staff_access.active_user') : t('staff_access.active_users')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 select-none">
                {/* Custom Checkbox Box */}
                <motion.div 
                  animate={{ 
                    scale: medPermission.has_cross_module_access === 1 ? 1 : 0.98,
                    borderColor: medPermission.has_cross_module_access === 1 ? '#549E9E' : '#D1D5DB',
                    backgroundColor: medPermission.has_cross_module_access === 1 ? '#549E9E' : '#FFFFFF'
                  }}
                  className="w-6 h-6 border-2 flex items-center justify-center rounded-none shrink-0"
                >
                  {medPermission.has_cross_module_access === 1 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4 text-white stroke-[3px]" />
                    </motion.div>
                  )}
                </motion.div>
                <div className="space-y-0.5">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-widest cursor-pointer block">
                    {t('staff_access.allow_reception')}
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    {t('staff_access.med_desc')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`w-full sm:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all rounded-none ${
              !isDirty 
                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' 
                : 'bg-[#549E9E] text-white border-[#549E9E] hover:bg-[#438787] hover:border-[#438787] shadow-lg shadow-[#549E9E]/20 cursor-pointer'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCcw size={14} className="animate-spin" />
                {t('staff_access.saving')}
              </>
            ) : (
              <>
                <Save size={14} />
                {t('staff_access.save_permissions')}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
