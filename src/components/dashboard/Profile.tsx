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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden relative">

        {/* Profile Header */}
        <div className="bg-gradient-to-br from-[#549E9E] via-[#549E9E] to-[#3D7474] p-6 md:p-10 text-white relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32 blur-2xl" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center text-primary-teal shadow-2xl relative z-10 border-4 border-white/50">
                <User size={56} strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md scale-110" />
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold tracking-tight">{user?.name}</h2>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/10 group self-center md:self-auto"
                  >
                    <Edit2 size={12} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('profile.edit_profile')}</span>
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                  {(user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor') 
                    ? 'Verified Doctor' 
                    : (user?.role_code === 'REC' || user?.role?.toLowerCase() === 'rec' || user?.role?.toLowerCase() === 'receptionist') 
                      ? 'Verified Receptionist' 
                      : (user?.role_code === 'MED' || user?.role?.toLowerCase() === 'med' || user?.role?.toLowerCase() === 'medical') 
                        ? 'Medical Staff' 
                        : t('profile.verified_patient')}
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white/80">
                  {(user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor') 
                    ? 'Doctor' : (user?.role_code === 'REC' || user?.role_code === 'MED') ? 'Staff' : t('profile.patient_id').split(':')[0]} ID: {user?.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 md:p-10">
          <form onSubmit={handleSave} className="space-y-8 md:space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {/* Information Group 1 */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                  <User size={14} /> {t('profile.identity_subtitle')}
                </h3>
                
                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.full_name')}</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        disabled={!isEditing}
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className={`w-full border rounded-xl py-3 pl-11 pr-4 transition-all outline-none text-gray-700 font-medium ${isEditing ? 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20' : 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500'}`}
                      />
                    </div>
                  </div>

                  {/* Mobile - Always Disabled */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.mobile_number_fixed')}</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        disabled
                        value={user?.phone || ''}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 outline-none text-gray-400 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Email - Conditional */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                      {hasEmail ? t('profile.email_fixed') : t('profile.email_required')}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="email"
                        disabled={!isEditing || hasEmail}
                        value={formData.email}
                        placeholder={hasEmail ? '' : t('profile.enter_email')}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`w-full border rounded-xl py-3 pl-11 pr-4 transition-all outline-none font-medium ${(!isEditing || hasEmail) ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-400' : 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20 text-gray-700'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Group 2 */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                  <Shield size={14} /> {t('profile.demographics_subtitle')}
                </h3>
                
                <div className="space-y-5">
                  {/* Age */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.age_years')}</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="number"
                        disabled={!isEditing}
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        className={`w-full border rounded-xl py-3 pl-11 pr-4 transition-all outline-none text-gray-700 font-medium ${isEditing ? 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20' : 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500'}`}
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.gender')}</label>
                    <div className="relative">
                      <select
                        disabled={!isEditing}
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className={`w-full border rounded-xl py-3 px-4 transition-all outline-none text-gray-700 font-medium appearance-none ${isEditing ? 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20' : 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500'}`}
                      >
                        <option value="">{t('profile.select_gender')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                      </select>
                      {isEditing && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Address</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-4 text-gray-400" />
                      <textarea 
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className={`w-full border rounded-xl py-3 pl-11 pr-4 transition-all outline-none text-gray-700 font-medium min-h-[80px] resize-none ${isEditing ? 'border-gray-200 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/20' : 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500'}`}
                        placeholder="Enter your full address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            {isEditing && (
              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <X size={14} /> {t('profile.cancel')}
                  </div>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3 px-6 bg-primary-teal text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary-teal/10 hover:shadow-primary-teal/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
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

          {/* Security & Password Section */}
          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-primary-teal uppercase tracking-[0.2em] flex items-center gap-2">
                <Lock size={14} /> {t('profile.security_subtitle', 'Security & Password')}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Update your account credentials to keep your health records safe.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsChangingPassword(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-teal text-white hover:bg-[#3D7474] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <KeyRound size={14} /> {t('profile.change_password', 'Change Password')}
            </button>
          </div>

          {!isEditing && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
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

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden relative"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#549E9E] via-[#549E9E] to-[#3D7474] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-wide">{t('profile.change_password', 'Change Password')}</h3>
                    <p className="text-xs text-white/80">Enter your current & new password below</p>
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
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                {/* Current Password */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t('profile.current_password', 'Current Password')}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('profile.enter_current_password', 'Enter current password')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-10 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t('profile.new_password', 'New Password')}
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('profile.enter_new_password', 'Enter new password (min 6 chars)')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-10 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t('profile.confirm_new_password', 'Confirm New Password')}
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('profile.reenter_new_password', 'Re-enter new password')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-10 outline-none text-gray-700 font-medium text-sm focus:border-primary-teal focus:bg-white focus:ring-1 focus:ring-primary-teal/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Modal Footer / Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-5 py-3 border border-gray-200 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    {t('profile.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="px-6 py-3 bg-primary-teal text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-[#3D7474] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingPassword ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Save size={14} />
                      </motion.div>
                    ) : (
                      <Save size={14} />
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
