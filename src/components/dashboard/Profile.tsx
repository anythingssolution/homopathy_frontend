import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Calendar, Mail, Shield, Edit2, X, Save, CheckCircle2, AlertCircle, MapPin, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../context/NotificationContext';

export default function Profile() {
  const { user, refreshProfile, isLoading } = useAuth();
  const { t } = useTranslation();
  const apiFetch = useApi();
  const { addToast } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    address: ''
  });

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        age: user.age?.toString() || '',
        gender: user.gender || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await apiFetch('/api/v1/auth/me', {
        method: 'PATCH',
        body: {
          full_name: formData.name,
          email: formData.email,
          age: parseInt(formData.age),
          gender: formData.gender.toLowerCase(),
          address: formData.address
        }
      });
      
      if (result && result.success) {
        addToast(t('profile.update_success'), 'success');
        setIsEditing(false);
        refreshProfile(); 
      } else {
        addToast(result?.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('A network error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast(t('profile.current_password_required'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast(t('profile.password_min_length'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast(t('profile.password_mismatch'), 'error');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const result = await apiFetch('/api/v1/auth/password/change', {
        method: 'PUT',
        body: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });

      if (result && result.success) {
        addToast(t('profile.password_change_success'), 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
      } else {
        addToast(result?.message || 'Failed to change password', 'error');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      addToast(error?.message || 'A network error occurred. Please try again.', 'error');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-teal/20 border-t-primary-teal rounded-full animate-spin" />
      </div>
    );
  }

  const hasEmail = !!user?.email;

  const inputClass = (enabled: boolean) =>
    `w-full border rounded-xl h-11 pl-10 pr-3 text-sm transition-all outline-none font-medium ${
      enabled
        ? 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20 text-gray-700 bg-white'
        : 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-[#549E9E] via-[#549E9E] to-[#3D7474] px-5 py-4 md:px-6 md:py-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl" />
          <div className="flex flex-row items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary-teal shadow-md border-2 border-white/50 shrink-0">
              <User size={26} strokeWidth={1.5} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate">{user?.name}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                  {(user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor')
                    ? 'Verified Doctor'
                    : (user?.role_code === 'REC' || user?.role?.toLowerCase() === 'rec' || user?.role?.toLowerCase() === 'receptionist')
                      ? 'Verified Receptionist'
                      : (user?.role_code === 'MED' || user?.role?.toLowerCase() === 'med' || user?.role?.toLowerCase() === 'medical')
                        ? 'Medical Staff'
                        : t('profile.verified_patient')}
                </span>
                <span className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white/80">
                  {(user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor')
                    ? 'Doctor' : (user?.role_code === 'REC' || user?.role_code === 'MED') ? 'Staff' : t('profile.patient_id').split(':')[0]} ID: {user?.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-5 md:p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={14} /> {t('profile.identity_subtitle')}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.full_name')}</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClass(isEditing)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.mobile_number_fixed')}</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        disabled
                        value={user?.phone || ''}
                        className={inputClass(false)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                      {hasEmail ? t('profile.email_fixed') : t('profile.email_required')}
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        disabled={!isEditing || hasEmail}
                        value={formData.email}
                        placeholder={hasEmail ? '' : t('profile.enter_email')}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputClass(isEditing && !hasEmail)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2">
                  <Shield size={14} /> {t('profile.demographics_subtitle')}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.age_years')}</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        disabled={!isEditing}
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className={inputClass(isEditing)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.gender')}</label>
                    <div className="relative">
                      <select
                        disabled={!isEditing}
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className={`${inputClass(isEditing)} appearance-none pr-9`}
                      >
                        <option value="">{t('profile.select_gender')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                      </select>
                      {isEditing && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Address</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={inputClass(isEditing)}
                        placeholder="Enter your full address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-11 px-4 border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <X size={14} /> {t('profile.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] h-11 px-4 bg-primary-teal text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md shadow-primary-teal/10 hover:shadow-primary-teal/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Save size={14} />
                    </motion.div>
                  ) : (
                    <Save size={14} />
                  )}
                  {isSubmitting ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            )}
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2">
                <Lock size={14} /> {t('profile.security_subtitle', 'Security & Password')}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Update your profile details or account password.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-white text-[#549E9E] border-2 border-[#549E9E] hover:bg-[#549E9E] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  <Edit2 size={14} /> {t('profile.edit_profile')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-primary-teal text-white hover:bg-[#3D7474] rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <KeyRound size={14} /> {t('profile.change_password', 'Change Password')}
              </button>
            </div>
          </div>

          {!isEditing && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {t('profile.last_sync')} {new Date().toLocaleTimeString()}
              </p>
              <button
                onClick={() => refreshProfile()}
                className="text-[10px] font-bold text-primary-teal uppercase tracking-widest hover:text-[#3D7474] transition-colors"
              >
                {t('profile.refresh_records')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative"
            >
              <div className="bg-gradient-to-r from-[#549E9E] via-[#549E9E] to-[#3D7474] px-4 py-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">{t('profile.change_password', 'Change Password')}</h3>
                    <p className="text-[10px] text-white/80">Enter your current & new password below</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-4 space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                    {t('profile.current_password', 'Current Password')}
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('profile.enter_current_password', 'Enter current password')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg h-9 pl-9 pr-9 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                    {t('profile.new_password', 'New Password')}
                  </label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('profile.enter_new_password', 'Enter new password (min 6 chars)')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg h-9 pl-9 pr-9 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                    {t('profile.confirm_new_password', 'Confirm New Password')}
                  </label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('profile.reenter_new_password', 'Re-enter new password')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg h-9 pl-9 pr-9 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="h-9 px-4 border border-gray-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    {t('profile.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="h-9 px-4 bg-primary-teal text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-[#3D7474] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingPassword ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Save size={13} />
                      </motion.div>
                    ) : (
                      <Save size={13} />
                    )}
                    {isSubmittingPassword ? t('profile.updating_password', 'Updating...') : t('profile.update_password', 'Update Password')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
