import PatientAddressExtraFields from '../PatientAddressExtraFields';
import { profileAreaValue } from '../../utils/profileAddress';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Calendar, Mail, Shield, Edit2, X, Save, MapPin, Lock, Eye, EyeOff, KeyRound, Camera, ImageUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../context/NotificationContext';
import { calculateAgeYearsFromDob } from '../../utils/ageDisplay';

export default function Profile() {
  const { user, refreshProfile, isLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isPatient = user?.role_code?.toUpperCase() === 'PAT' || user?.role === 'patient' || user?.role === 'PAT';
  const addressLabel = (en: string, hi: string) => i18n.language.startsWith('hi') ? hi : en;
  const apiFetch = useApi();
  const { addToast } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    date_of_birth: '',
    gender: '',
    address: '',
    area_name: '',
    ward_no: '',
    vidhan_sabha: '',
   state_name: '',
    city: '',
    pincode: ''
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

  const resetProfileForm = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        age: user.age?.toString() || '',
        date_of_birth: user.date_of_birth ? String(user.date_of_birth).slice(0, 10) : '',
        gender: user.gender || '',
        address: user.address || '',
        area_name: profileAreaValue(user),
        ward_no: user.ward_no || '',
        vidhan_sabha: user.vidhan_sabha || '',
       state_name: user.state_name || '',
        city: user.city || '',
        pincode: user.pincode || ''
      });
    }
  };

  useEffect(() => { resetProfileForm(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPatient && !formData.city.trim()) { addToast(addressLabel('City is required.', 'शहर आवश्यक है।'), 'error'); return; }
    if (isPatient && formData.pincode && !/^\d{6}$/.test(formData.pincode)) { addToast(addressLabel('Pincode must contain 6 digits.', 'पिनकोड 6 अंकों का होना चाहिए।'), 'error'); return; }
    setIsSubmitting(true);
    
    try {
      const result = await apiFetch('/api/v1/auth/me', {
        method: 'PATCH',
        body: {
          full_name: formData.name,
          email: formData.email,
          age: formData.date_of_birth ? calculateAgeYearsFromDob(formData.date_of_birth) : parseInt(formData.age),
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender.toLowerCase(),
          ...(isPatient ? { area_name: formData.area_name.trim(), ward_no: formData.ward_no.trim(), vidhan_sabha: formData.vidhan_sabha.trim(), state_name: formData.state_name.trim(), city: formData.city.trim(), pincode: formData.pincode || null } : { address: formData.address })
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

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingImage(true);
    try {
      const result = await apiFetch('/api/v1/auth/me/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (result?.success) {
        addToast(t('profile.image_update_success', 'Profile image updated successfully!'), 'success');
        await refreshProfile();
      } else {
        addToast(result?.message || 'Failed to update profile image', 'error');
      }
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      addToast(error?.message || 'A network error occurred. Please try again.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!user?.profile_image_url) return;

    setIsUploadingImage(true);
    try {
      const result = await apiFetch('/api/v1/auth/me/profile-image', {
        method: 'DELETE',
      });

      if (result?.success) {
        addToast(t('profile.image_remove_success', 'Profile image removed successfully!'), 'success');
        await refreshProfile();
      } else {
        addToast(result?.message || 'Failed to remove profile image', 'error');
      }
    } catch (error: any) {
      console.error('Error removing profile image:', error);
      addToast(error?.message || 'A network error occurred. Please try again.', 'error');
    } finally {
      setIsUploadingImage(false);
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
  const isDoctor = user?.role_code === 'DOC' || String(user?.role || '').toLowerCase() === 'doctor' || String(user?.role || '').toLowerCase() === 'doc';

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
            <div className="relative shrink-0">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary-teal shadow-md border-2 border-white/50 overflow-hidden">
                {user?.profile_image_url ? (
                  <img
                    src={user.profile_image_url}
                    alt={user?.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={26} strokeWidth={1.5} />
                )}
              </div>
              {isDoctor && isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-[#549E9E] border border-white/70 shadow-md flex items-center justify-center hover:bg-[#eefafa] transition-all disabled:opacity-60 cursor-pointer"
                    title={t('profile.change_photo', 'Change photo')}
                  >
                    {isUploadingImage ? (
                      <ImageUp size={13} className="animate-pulse" />
                    ) : (
                      <Camera size={13} />
                    )}
                  </button>
                  {user?.profile_image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      disabled={isUploadingImage}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white border border-white/80 shadow-md flex items-center justify-center hover:bg-red-600 transition-all disabled:opacity-60 cursor-pointer"
                      title={t('profile.remove_photo', 'Remove photo')}
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  )}
                </>
              )}
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.full_name')} <span className="text-red-500">*</span></label>
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.age_years')} {!formData.date_of_birth && <span className="text-red-500">*</span>}</label>
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Date of Birth</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        disabled={!isEditing}
                        max={new Date().toISOString().slice(0, 10)}
                        value={formData.date_of_birth}
                        onChange={(e) => {
                          const calculated = calculateAgeYearsFromDob(e.target.value);
                          setFormData({
                            ...formData,
                            date_of_birth: e.target.value,
                            age: calculated === null ? formData.age : String(calculated),
                          });
                        }}
                        className={inputClass(isEditing)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{t('profile.gender')} <span className="text-red-500">*</span></label>
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

                  {isPatient ? <>
                    <div className="sm:col-span-2">
                      <label htmlFor="profile-area" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{addressLabel('Area / Mohalla / Colony (Optional)', 'क्षेत्र / मोहल्ला / कॉलोनी (वैकल्पिक)')}</label>
                      <div className="relative"><MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input id="profile-area" type="text" disabled={!isEditing || isSubmitting} value={formData.area_name} maxLength={150}
                          onChange={event => setFormData(current => ({ ...current, area_name: event.target.value }))} className={inputClass(isEditing)} placeholder={addressLabel('Area, street, landmark or house number', 'क्षेत्र, गली, लैंडमार्क या मकान नंबर')} />
                      </div>
                      {isEditing && !user?.area_name && user?.address && <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{addressLabel('Your saved address is retained here. Check the area and enter city / pincode separately.', 'पुराना पता यहाँ रखा है। क्षेत्र जाँचें और शहर / पिनकोड अलग भरें।')}</p>}
                    </div>
                    <PatientAddressExtraFields values={formData} disabled={!isEditing || isSubmitting}
                      onChange={(field, value) => setFormData(current => ({ ...current, [field]: value }))}
                      labelClassName="block text-[10px] font-bold text-gray-500 uppercase tracking-widest"
                      inputClassName={inputClass(isEditing)} />
                    <div>
                      <label htmlFor="profile-city" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{addressLabel('City', 'शहर')} <span className="text-red-500">*</span></label>
                      <div className="relative"><MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input id="profile-city" type="text" required={isEditing} disabled={!isEditing || isSubmitting} value={formData.city} maxLength={100}
                          onChange={event => setFormData(current => ({ ...current, city: event.target.value }))} className={inputClass(isEditing)} placeholder={addressLabel('Enter city', 'शहर भरें')} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="profile-pincode" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{addressLabel('Pincode (Optional)', 'पिनकोड (वैकल्पिक)')}</label>
                      <div className="relative"><MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input id="profile-pincode" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} disabled={!isEditing || isSubmitting} value={formData.pincode}
                          onChange={event => setFormData(current => ({ ...current, pincode: event.target.value.replace(/\D/g, '') }))} className={inputClass(isEditing)} placeholder={addressLabel('6 digit pincode', '6 अंकों का पिनकोड')} />
                      </div>
                    </div>
                    {!isEditing && user?.address && <p className="sm:col-span-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600"><span className="font-semibold">{addressLabel('Full Address: ', 'पूरा पता: ')}</span>{user.address}</p>}
                  </> : (
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
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { resetProfileForm(); setIsEditing(false); }}
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
