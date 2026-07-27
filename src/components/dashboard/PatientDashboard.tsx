import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, FileText, TrendingUp, ArrowRight, Activity, 
  Bell, Shield, Stethoscope, MapPin, Ticket, Pill, AlertCircle,
  CheckCircle2, XCircle, CalendarPlus, ChevronRight, Eye, RefreshCcw, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface Appointment {
  appointment_id: number;
  auid: string;
  branch_name: string;
  treatment_name: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  token_number: number;
  appointment_date: string;
  symptoms: string | null;
  status: string;
  created_at: string;
  prescription?: any;
  // New backend fields (Phase 1)
  display_token_display?: string;
  scheduled_start_time?: string;
  live_estimated_start_at?: string | null;
  live_delay_minutes?: number;
  template_start_time?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-600', icon: CheckCircle2, label: t('dashboard.status_labels.confirmed') },
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', icon: Clock, label: t('dashboard.status_labels.pending') },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2, label: t('dashboard.status_labels.completed') },
    cancelled: { bg: 'bg-red-50', text: 'text-red-500', icon: XCircle, label: t('dashboard.status_labels.cancelled') },
  };
  const c = config[status.toLowerCase()] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${c.bg} ${c.text} text-[10px] font-black uppercase tracking-widest`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

const extractTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) {
    const parts = dateTimeStr.split(/[ T]/);
    const timePart = parts[1] || '';
    return timePart.slice(0, 5);
  }
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getRelativeDate = (dateStr: string, t: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t('dashboard.date.today');
  if (diff === 1) return t('dashboard.date.tomorrow');
  if (diff === -1) return t('dashboard.date.yesterday');
  if (diff > 0 && diff <= 7) return t('dashboard.date.in_days', { diff });
  return formatDate(dateStr);
};

export default function PatientDashboard() {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const { addToast } = useNotifications();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const [appointmentsResponse, followUpsResponse] = await Promise.all([
        fetch('/api/v1/appointments/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v1/appointments/eligible-followups', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const result = await appointmentsResponse.json();
      const followUpResult = await followUpsResponse.json();

      if (result.success) {
        setAppointments(result.data || []);
      } else {
        addToast(result.message || 'Failed to load dashboard data', 'error');
      }

      if (followUpResult.success) {
        setPendingFollowUps(followUpResult.data || []);
      } else {
        setPendingFollowUps([]);
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token]);

  // Computed stats
  const today = new Date().toISOString().split('T')[0];

  const upcomingAppointments = appointments.filter(a => {
    const aDate = a.appointment_date.split('T')[0];
    return aDate >= today && ['confirmed', 'pending'].includes(a.status.toLowerCase());
  }).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const completedCount = appointments.filter(a => a.status.toLowerCase() === 'completed').length;
  const prescriptionCount = appointments.filter(a => a.prescription && Object.keys(a.prescription).length > 0).length;
  const totalCount = appointments.length;
  const nextAppointment = upcomingAppointments[0] || null;

  // Recent activity: last 5 appointments sorted by date desc
  const recentActivity = [...appointments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 17) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCcw className="text-[#549E9E] w-10 h-10" />
        </motion.div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('dashboard.loading_dashboard')}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-bold text-gray-400 uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.3em]'} mb-1`}
          >
            {greeting()}
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-3xl font-black text-[#549E9E] uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.1em]'}`}
          >
            {t('dashboard.welcome_back')} <span className="text-[#E6C682]">{user?.name?.split(' ')[0]}</span>
          </motion.h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">{t('dashboard.health_overview')}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAppointments}
            className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-100 shadow-sm text-[10px] font-black text-gray-500 tracking-widest uppercase hover:text-[#549E9E] hover:border-[#549E9E]/20 transition-all"
          >
            <RefreshCcw size={12} />
            {t('dashboard.refresh')}
          </button>
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-100 shadow-sm text-[10px] font-black text-gray-500 tracking-widest uppercase">
            <Shield size={14} className="text-emerald-500" />
            {t('profile.verified_patient')}
          </div>
        </div>
      </div>

      {pendingFollowUps.length > 0 && (
        <div className="border border-red-100 bg-red-50/70 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Follow-up Due</span>
            </div>
            <p className="text-sm font-bold text-gray-700">
              {pendingFollowUps[0].doctor_name || 'Doctor'} advised a follow-up for {pendingFollowUps[0].visiting_patient_name || 'your visit'} on {formatDate(pendingFollowUps[0].parent_appointment_date)}. Due on {formatDate(pendingFollowUps[0].due_date)}.
            </p>
          </div>

          <Link
            to={`/booking?followup_parent_appointment_id=${pendingFollowUps[0].parent_appointment_id}${pendingFollowUps[0].fk_family_member_id ? `&followup_family_member_id=${pendingFollowUps[0].fk_family_member_id}` : ''}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
          >
            <CalendarPlus size={14} />
            Confirm &amp; Book Now
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Appointment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 p-6 relative overflow-hidden group hover:border-[#549E9E]/20 transition-all"
        >
          <div className="absolute top-3 right-3">
            <Calendar size={48} className="text-[#549E9E]/[0.04] group-hover:text-[#549E9E]/[0.08] transition-colors" />
          </div>
          <div className="w-10 h-10 bg-[#549E9E] flex items-center justify-center mb-4">
            <Calendar size={18} className="text-white" />
          </div>
          <p className={`text-[10px] font-black text-gray-400 uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.2em]'} mb-1`}>{t('dashboard.stats.next_appointment')}</p>
          <p className="text-lg font-black text-gray-800 tracking-tight leading-tight">
            {nextAppointment ? getRelativeDate(nextAppointment.appointment_date, t) : t('dashboard.stats.no_upcoming')}
          </p>
          {nextAppointment && (
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-[10px] font-bold text-[#549E9E] uppercase tracking-widest">
                {formatTime(nextAppointment.template_start_time || nextAppointment.scheduled_start_time || nextAppointment.start_time)}
              </p>
              {nextAppointment.live_estimated_start_at && (
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
                  {nextAppointment.live_delay_minutes > 0 
                    ? `Delayed by ${nextAppointment.live_delay_minutes} min` 
                    : 'On Time'}{' '}
                  (ETA: {formatTime(extractTime(nextAppointment.live_estimated_start_at))})
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Completed Visits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-gray-100 p-6 relative overflow-hidden group hover:border-[#E6C682]/30 transition-all"
        >
          <div className="absolute top-3 right-3">
            <CheckCircle2 size={48} className="text-[#E6C682]/[0.06] group-hover:text-[#E6C682]/[0.12] transition-colors" />
          </div>
          <div className="w-10 h-10 bg-[#E6C682] flex items-center justify-center mb-4">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <p className={`text-[10px] font-black text-gray-400 uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.2em]'} mb-1`}>{t('dashboard.stats.past_visits')}</p>
          <p className="text-3xl font-black text-gray-800 tracking-tight">{completedCount}</p>
        </motion.div>

        {/* Prescriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-100 p-6 relative overflow-hidden group hover:border-emerald-100 transition-all"
        >
          <div className="absolute top-3 right-3">
            <FileText size={48} className="text-emerald-500/[0.04] group-hover:text-emerald-500/[0.08] transition-colors" />
          </div>
          <div className="w-10 h-10 bg-emerald-500 flex items-center justify-center mb-4">
            <FileText size={18} className="text-white" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('dashboard.stats.prescriptions')}</p>
          <p className="text-3xl font-black text-gray-800 tracking-tight">{prescriptionCount}</p>
        </motion.div>

        {/* Total Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-gray-100 p-6 relative overflow-hidden group hover:border-indigo-100 transition-all"
        >
          <div className="absolute top-3 right-3">
            <Activity size={48} className="text-indigo-500/[0.04] group-hover:text-indigo-500/[0.08] transition-colors" />
          </div>
          <div className="w-10 h-10 bg-indigo-500 flex items-center justify-center mb-4">
            <Activity size={18} className="text-white" />
          </div>
          <p className={`text-[10px] font-black text-gray-400 uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.2em]'} mb-1`}>{t('dashboard.total_appointments')}</p>
          <p className="text-3xl font-black text-gray-800 tracking-tight">{totalCount}</p>
        </motion.div>
      </div>

      {/* Upcoming Appointment Highlight */}
      {nextAppointment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-[#549E9E] to-[#3d7f7f] p-6 md:p-8 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#E6C682]/10 rounded-full -ml-20 -mb-20 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Calendar size={24} className="text-[#E6C682]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-teal-100 uppercase tracking-[0.3em] mb-1">{t('dashboard.your_next_appointment')}</p>
                <h3 className="text-xl font-black uppercase tracking-widest mb-2">
                  {getRelativeDate(nextAppointment.appointment_date, t)} · {formatTime(nextAppointment.template_start_time || nextAppointment.scheduled_start_time || nextAppointment.start_time)}
                </h3>
                {nextAppointment.live_estimated_start_at && (
                  <div className="mb-3 bg-amber-500/20 border border-amber-400/30 text-amber-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 w-fit">
                    {nextAppointment.live_delay_minutes > 0 
                      ? `Delayed by ${nextAppointment.live_delay_minutes} mins` 
                      : 'On Time'}{' '}
                    · New ETA: {formatTime(extractTime(nextAppointment.live_estimated_start_at))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 text-teal-100 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope size={12} />
                    {nextAppointment.treatment_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    {nextAppointment.branch_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Ticket size={12} />
                    Token #{nextAppointment.display_token_display || nextAppointment.token_number}
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/my-appointments" 
              className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 shrink-0 self-start md:self-center"
            >
              {t('dashboard.view_details')} <ArrowRight size={12} />
            </Link>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-gray-100 relative overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h3 className={`text-sm font-black text-[#2d8789] uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.2em]'} flex items-center gap-3`}>
                <div className="w-1.5 h-6 bg-[#E6C682]" />
                {t('dashboard.stats.recent_activity')}
              </h3>
              <Link 
                to="/my-appointments" 
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#549E9E] transition-colors flex items-center gap-2"
              >
                {t('dashboard.view_all')} <ArrowRight size={12} />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gray-50 flex items-center justify-center text-gray-200">
                    <Clock size={36} />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white shadow-lg flex items-center justify-center text-[#E6C682]">
                    <Bell size={14} />
                  </div>
                </div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">{t('dashboard.stats.no_activity')}</p>
                <Link 
                  to="/book-appointment"
                  className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest hover:underline flex items-center gap-2"
                >
                  {t('dashboard.book_first')} <ArrowRight size={10} />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentActivity.map((apt, idx) => {
                  const hasPrescription = apt.prescription && Object.keys(apt.prescription).length > 0;
                  const isCompleted = apt.status.toLowerCase() === 'completed';
                  
                  return (
                    <motion.div
                      key={apt.appointment_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + idx * 0.05 }}
                      className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto flex-1">
                        {/* Date Badge */}
                        <div className="w-12 h-12 bg-gray-50 flex flex-col items-center justify-center shrink-0 rounded-lg group-hover:bg-[#549E9E]/5 transition-colors">
                          <span className="text-sm font-black text-gray-800 leading-none">
                            {new Date(apt.appointment_date).getDate()}
                          </span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            {new Date(apt.appointment_date).toLocaleDateString(i18n.language, { month: 'short' })}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-gray-800 truncate">{apt.treatment_name}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-400 mt-1">
                            <span className="text-[10px] font-bold flex items-center gap-1">
                              <MapPin size={9} />
                              {apt.branch_name}
                            </span>
                            <span className="text-[10px] font-bold flex items-center gap-1">
                              <Clock size={9} />
                              {formatTime(apt.template_start_time || apt.scheduled_start_time || apt.start_time)}
                            </span>
                            <span className="text-[10px] font-bold flex items-center gap-1">
                              <Ticket size={9} />
                              #{apt.display_token_display || apt.token_number}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-50 sm:border-0">
                        <StatusBadge status={apt.status} />
                        {isCompleted && hasPrescription && (
                          <Link
                            to="/my-appointments"
                            className="w-8 h-8 rounded-lg bg-[#549E9E]/10 flex items-center justify-center text-[#549E9E] hover:bg-[#549E9E] hover:text-white transition-all"
                            title="View Prescription"
                          >
                            <Eye size={14} />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Quick Actions + Health Tip */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <Link 
              to="/book-appointment"
              className="flex items-center gap-4 bg-[#549E9E] text-white p-5 group hover:bg-[#3d7f7f] transition-all"
            >
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center shrink-0">
                <CalendarPlus size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-teal-100 uppercase tracking-widest">{t('dashboard.quick_action')}</p>
                <p className="text-sm font-black uppercase tracking-widest">{t('dashboard.book_appointment_btn')}</p>
              </div>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              to="/my-appointments"
              className="flex items-center gap-4 bg-white border border-gray-100 p-5 group hover:border-[#549E9E]/20 transition-all"
            >
              <div className="w-10 h-10 bg-[#549E9E]/10 flex items-center justify-center shrink-0 text-[#549E9E]">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.view_label')}</p>
                <p className="text-sm font-black text-gray-800 uppercase tracking-widest">{t('dashboard.my_appointments_label')}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-[#549E9E] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link 
              to="/profile"
              className="flex items-center gap-4 bg-white border border-gray-100 p-5 group hover:border-[#E6C682]/30 transition-all"
            >
              <div className="w-10 h-10 bg-[#E6C682]/10 flex items-center justify-center shrink-0 text-[#E6C682]">
                <Shield size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.manage_label')}</p>
                <p className="text-sm font-black text-gray-800 uppercase tracking-widest">{t('dashboard.my_profile_label')}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-[#E6C682] group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>

          {/* Health Tip Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-[#549E9E] to-[#2d8789] p-8 shadow-[0_20px_40px_-10px_rgba(84,158,158,0.3)] text-white relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E6C682]/20 rounded-full -ml-16 -mb-16 blur-2xl" />
            
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 flex items-center justify-center mb-5 backdrop-blur-md">
                <TrendingUp size={20} className="text-[#E6C682]" />
              </div>
              <h3 className={`text-sm font-black uppercase ${i18n.language === 'hi' ? 'tracking-normal' : 'tracking-[0.2em]'} mb-3`}>{t('dashboard.health_tip.title')}</h3>
              <p className="text-teal-50 font-medium text-sm leading-relaxed opacity-90">
                {t('dashboard.health_tip.tip')}
              </p>
              
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#E6C682] flex items-center justify-center font-black text-[9px] text-[#2d8789]">100%</div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-teal-100">{t('dashboard.safe_natural')}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Upcoming Count Pill */}
          {upcomingAppointments.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-[#F2D06B]/10 border border-[#F2D06B]/20 p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-[#F2D06B] flex items-center justify-center text-white font-black text-sm">
                {upcomingAppointments.length}
              </div>
              <div>
                <p className="text-[10px] font-black text-[#856404] uppercase tracking-widest">{t('dashboard.upcoming_label')}</p>
                <p className="text-xs font-bold text-[#856404]/70">{t('dashboard.appointments_scheduled')}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
