import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { connectPublicStatusSocket, disconnectPublicStatusSocket, getSocket } from '../services/socket';
import {
  Home,
  MousePointer2,
  Stethoscope,
  Image as ImageIcon,
  Calendar,
  Phone,
  UserCheck,
  UserX,
  LogIn,
  User,
  LayoutDashboard,
  CalendarPlus,
  Clock,
  FileText,
  Receipt,
  LogOut,
  Languages,
  Shield,
  ShieldCheck,
  History,
  Users,
  BarChart,
  ArrowLeftRight,
  Menu,
  X,
  ChevronDown,
  Pill,
  FileSpreadsheet,
} from 'lucide-react';

const NavItem = ({
  icon: Icon,
  label,
  subLabel,
  isActive,
  highlightSubLabel = false,
  isCrossRole = false,
}: {
  icon: any,
  label: string,
  subLabel: string,
  isActive: boolean,
  highlightSubLabel?: boolean,
  isCrossRole?: boolean,
}) => (
  <motion.div
    whileHover={{ y: -1 }}
    className="flex flex-col items-center justify-center cursor-pointer group px-1 relative h-full py-2"
  >
    <div className="text-[#2d8789] group-hover:scale-110 transition-transform">
      <Icon size={22} />
    </div>
    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none mt-1 whitespace-nowrap">{label}</span>
    <span className={`leading-none mt-1 whitespace-nowrap transition-all ${highlightSubLabel
      ? isCrossRole
        ? `px-2 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.18em] ${isActive
          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black'
        }`
        : `px-2 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.18em] ${isActive
          ? 'bg-red-900 text-white border-red-900 shadow-sm'
          : 'bg-red-50 text-red-900 border-red-200 font-black'
        }`
      : 'text-[8px] font-black text-[#2d8789] uppercase tracking-[0.1em]'
      }`}>
      {subLabel}
    </span>

    {isActive && (
      <motion.div
        layoutId="nav-underline"
        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#2d8789] rounded-full mx-2"
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      />
    )}
  </motion.div>
);

export default function Navigation() {
  const [isDoctorAvailable, setIsDoctorAvailable] = useState(true);
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCrossRoleDropdownOpen, setIsCrossRoleDropdownOpen] = useState(false);
  const crossRoleDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoggingOut, branchScope } = useAuth();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCrossRoleDropdownOpen(false);
  }, [location.pathname]);

  // Close cross-role dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (crossRoleDropdownRef.current && !crossRoleDropdownRef.current.contains(e.target as Node)) {
        setIsCrossRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const { t, i18n } = useTranslation();
  const normalizedRole = user?.role?.toLowerCase() || '';
  const profileRoleLabel =
    ['DOC', 'doctor', 'doc'].includes(user?.role_code || normalizedRole) ? t('roles.doctor') :
      ['REC', 'rec', 'receptionist'].includes(user?.role_code || normalizedRole) ? t('roles.receptionist') :
        ['MED', 'med', 'medical'].includes(user?.role_code || normalizedRole) ? t('roles.medical') :
          t('roles.patient');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  // Sync Doctor Status & Time
  useEffect(() => {
    let activeSocket: any = null;
    let mainSocketAttached = false;

    const handleStatusUpdate = (payload: any) => {
      console.log("Doctor status update received:", payload);
      const statusData = payload?.data || payload;
      if (statusData && statusData.is_doctor_available !== undefined) {
        // Only update if it belongs to receptionist's/user's currently selected branch
        const selectedBranchId = branchScope?.selected_branch_id ? Number(branchScope.selected_branch_id) : null;
        const eventBranchId = statusData.branch_id ? Number(statusData.branch_id) : null;
        if (selectedBranchId && eventBranchId && selectedBranchId !== eventBranchId) {
          return; // Skip updates from other branches
        }

        setIsDoctorAvailable(statusData.is_doctor_available);
        if (statusData.started_at && statusData.is_doctor_available) {
          const d = new Date(statusData.started_at);
          setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else if (statusData.time && statusData.is_doctor_available) {
          const d = new Date(statusData.time);
          setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setActiveSince(null);
        }
      }
    };

    const attachSocketListeners = (socketInstance: any) => {
      if (!socketInstance) return;

      socketInstance.on('doctor.session.current', handleStatusUpdate);
      socketInstance.on('doctor.session.updated', handleStatusUpdate);
    };

    const detachSocketListeners = (socketInstance: any) => {
      if (!socketInstance) return;
      socketInstance.off('doctor.session.current', handleStatusUpdate);
      socketInstance.off('doctor.session.updated', handleStatusUpdate);
    };

    // Fallback/Initial Status HTTP call (Fixes refresh and branch-switch initial loading issues)
    const fetchInitialStatus = async () => {
      const selectedBranchId = branchScope?.selected_branch_id ? Number(branchScope.selected_branch_id) : null;
      try {
        let url = '/api/v1/public/doctor-status';
        if (selectedBranchId) {
          url += `?branch_id=${selectedBranchId}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data) {
          handleStatusUpdate(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch initial status:', err);
      }
    };

    fetchInitialStatus();

    if (isAuthenticated) {
      // Check for main socket periodically until connected
      let checkCount = 0;
      const checkSocketInterval = window.setInterval(() => {
        const mainSocket = getSocket();
        if (mainSocket) {
          window.clearInterval(checkSocketInterval);
          activeSocket = mainSocket;
          attachSocketListeners(activeSocket);
          mainSocketAttached = true;
        } else {
          checkCount++;
          if (checkCount > 5) {
            // Do nothing
          }
        }
      }, 500); // Check faster (every 500ms)

      return () => {
        window.clearInterval(checkSocketInterval);
        if (activeSocket && mainSocketAttached) {
          detachSocketListeners(activeSocket);
        }
      };
    } else {
      activeSocket = connectPublicStatusSocket();
      attachSocketListeners(activeSocket);

      return () => {
        if (activeSocket) {
          detachSocketListeners(activeSocket);
          disconnectPublicStatusSocket();
        }
      };
    }
  }, [isAuthenticated, branchScope?.selected_branch_id]);

  const publicLinks = [
    { to: '/', icon: Home, label: t('common.home'), subLabel: t('common.nav_sub.welcome') },
    { to: '/about', icon: MousePointer2, label: t('common.about'), subLabel: t('common.nav_sub.habitown') },
    { to: '/treatments', icon: Stethoscope, label: t('common.treatments'), subLabel: t('common.nav_sub.services') },
    { to: '/gallery', icon: ImageIcon, label: t('common.gallery'), subLabel: t('common.nav_sub.photos') },
    { to: '/booking', icon: Calendar, label: t('common.booking'), subLabel: t('common.nav_sub.reservation') },
    { to: '/contact', icon: Phone, label: t('common.contact_us'), subLabel: t('common.nav_sub.support') },
  ];

  const authLinks = [
    // Portals (Dynamic Dashboard)
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard.menu.dashboard'), subLabel: t('dashboard.menu_sub.dashboard'), roles: ['PAT', 'patient'] },
    { to: '/doctor-portal', icon: LayoutDashboard, label: t('dashboard.menu.dashboard'), subLabel: t('dashboard.menu_sub.dashboard'), roles: ['DOC', 'doc', 'doctor'] },
    { to: '/medical-welcome', icon: LayoutDashboard, label: t('dashboard.menu.dashboard'), subLabel: t('dashboard.menu_sub.dashboard'), roles: ['REC', 'MED', 'rec', 'med', 'medical', 'receptionist'] },
    { to: '/dispensary-history', icon: History, label: t('dashboard.menu.dispensary_history'), subLabel: t('dashboard.menu_sub.dispensary_history'), roles: ['MED', 'med', 'medical'] },
    { to: '/medical-product-master', icon: Pill, label: t('dashboard.menu.medical_product_master', 'Product Master'), subLabel: t('dashboard.menu_sub.medical_product_master', 'Medicine CRUD'), roles: ['MED', 'med', 'medical'] },
    { to: '/medical-product-import', icon: FileSpreadsheet, label: t('dashboard.menu.medical_product_import', 'Product Import'), subLabel: t('dashboard.menu_sub.medical_product_import', 'Excel master'), roles: ['MED', 'med', 'medical'] },

    // Actions
    { to: '/book-appointment', icon: CalendarPlus, label: t('dashboard.menu.book_appointment'), subLabel: t('dashboard.menu_sub.book_appointment'), roles: ['PAT', 'patient', 'REC', 'rec', 'receptionist'] },
    { to: '/reception-patients', icon: Users, label: t('dashboard.menu.patient_management'), subLabel: t('dashboard.menu_sub.patient_management'), roles: ['REC', 'rec', 'receptionist'] },
    { to: '/my-appointments', icon: Clock, label: t('dashboard.menu.my_appointments'), subLabel: t('dashboard.menu_sub.my_appointments'), roles: ['PAT', 'patient'] },
    { to: '/family-members', icon: Users, label: t('dashboard.menu.family_members', 'Family Members'), subLabel: t('dashboard.menu_sub.family_members', 'Dependents'), roles: ['PAT', 'patient'] },

    // Doctor specific additional tabs
    { to: '/reports', icon: BarChart, label: t('dashboard.menu.reports'), subLabel: t('dashboard.menu_sub.reports'), roles: ['DOC', 'doc', 'doctor'] },
    { to: '/doctor-leave-calendar', icon: Calendar, label: t('dashboard.menu.leave_calendar', 'Leave Calendar'), subLabel: t('dashboard.menu_sub.leave_calendar', 'Doctor leave dates'), roles: ['DOC', 'doc', 'doctor'] },
    { to: '/clinic-history', icon: History, label: t('dashboard.menu.clinic_history'), subLabel: t('dashboard.menu_sub.clinic_history'), roles: ['DOC', 'doc', 'doctor'] },
    { to: '/patient-records', icon: FileText, label: t('dashboard.menu.patient_records', 'Patient Records'), subLabel: t('dashboard.menu_sub.patient_records', 'History & documents'), roles: ['DOC', 'doc', 'doctor', 'REC', 'rec', 'receptionist', 'MED', 'med', 'medical'] },
    { to: '/bills', icon: Receipt, label: t('dashboard.menu.bills'), subLabel: t('dashboard.menu_sub.bills'), roles: ['DOC', 'doc', 'doctor'] },
    { to: '/staff-access', icon: Shield, label: t('dashboard.menu.staff_access'), subLabel: t('dashboard.menu_sub.staff_access'), roles: ['DOC', 'doc', 'doctor'] },
    {
      to: '/profile',
      icon: User,
      label: t('dashboard.menu.profile'),
      subLabel: user ? profileRoleLabel : t('dashboard.menu_sub.profile'),
      roles: ['PAT', 'patient', 'DOC', 'doc', 'doctor', 'REC', 'rec', 'MED', 'med', 'medical', 'receptionist']
    },
    // Cross-role menu items
    {
      to: '/cross-role/medical',
      icon: ArrowLeftRight,
      label: t('dashboard.menu.medical_menus'),
      subLabel: t('dashboard.menu_sub.medical_menus'),
      roles: ['REC', 'rec', 'receptionist', 'DOC', 'doc', 'doctor']
    },
    {
      to: '/cross-role/receptionist',
      icon: ArrowLeftRight,
      label: t('dashboard.menu.reception_menus'),
      subLabel: t('dashboard.menu_sub.reception_menus'),
      roles: ['MED', 'med', 'medical', 'DOC', 'doc', 'doctor']
    },
  ];

  const currentLinks = isAuthenticated
    ? authLinks.filter(link => {
      const userRole = user?.role || '';
      const userRoleCode = user?.role_code || '';
      const matchesRole = link.roles?.includes(userRole) || link.roles?.includes(userRoleCode);
      if (!matchesRole) return false;

      // Permission check for Medical Menus (for Receptionist)
      if (link.to === '/cross-role/medical') {
        const isDoc = userRoleCode === 'DOC' || userRole === 'doctor' || userRole === 'doc';
        if (isDoc) return true; // Doctors always have access (backend authorizes by role)
        const hasCross = user?.has_cross_module_access === 1 || user?.has_cross_module_access === true || String(user?.has_cross_module_access) === '1';
        const canAccessMed = user?.can_access_medical_module === 1 || user?.can_access_medical_module === true || String(user?.can_access_medical_module) === '1';
        return hasCross && canAccessMed;
      }

      // Permission check for Reception Menus (for Medical)
      if (link.to === '/cross-role/receptionist') {
        const isDoc = userRoleCode === 'DOC' || userRole === 'doctor' || userRole === 'doc';
        if (isDoc) return true; // Doctors always have access (backend authorizes by role)
        const hasCross = user?.has_cross_module_access === 1 || user?.has_cross_module_access === true || String(user?.has_cross_module_access) === '1';
        const canAccessRec = user?.can_access_reception_module === 1 || user?.can_access_reception_module === true || String(user?.can_access_reception_module) === '1';
        return hasCross && canAccessRec;
      }

      return true;
    })
    : publicLinks;

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      {/* Top Banner Tiling */}
      <div className="absolute top-0 left-0 w-full h-10 flex overflow-hidden opacity-40 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-full ${i % 3 === 0 ? 'bg-[#78C2C4]' : i % 3 === 1 ? 'bg-[#E6C682]' : 'bg-[#D6D6BC]'}`}
          />
        ))}
      </div>

      <div className="relative bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 flex items-center justify-between h-20 relative z-20">

          {/* Left: Logo Area */}
          <div className="flex-shrink-0 w-36 xs:w-44 xl:w-48">
            <Link to={isAuthenticated
              ? (user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doctor' || user?.role?.toLowerCase() === 'doc')
                ? '/doctor-portal'
                : (user?.role_code === 'REC' || user?.role_code === 'MED' || ['rec', 'med', 'medical', 'receptionist'].includes(user?.role?.toLowerCase() || ''))
                  ? '/medical-welcome'
                  : '/dashboard'
              : '/'
            } className="block">
              <img
                src="/logo.png.png"
                alt="Dr. Trivedi's Homeopathy"
                className="h-9 xl:h-12 w-auto object-contain drop-shadow-md"
              />
            </Link>
          </div>

          {/* Center: Navigation Items */}
          <div className="hidden xl:flex flex-1 items-center justify-center min-w-0 px-1">
            {(() => {
              const isDoc = user?.role_code === 'DOC' || normalizedRole === 'doc' || normalizedRole === 'doctor';
              const regularLinks = currentLinks.filter(link => !link.to.startsWith('/cross-role/'));
              const crossRoleLinks = currentLinks.filter(link => link.to.startsWith('/cross-role/'));

              return (
                <>
                  {regularLinks.map((link, idx) => (
                    <React.Fragment key={link.to}>
                      <Link
                        to={link.to}
                        className={`px-1.5 xl:px-2 ${idx !== regularLinks.length - 1 || crossRoleLinks.length > 0 ? 'border-r border-dashed border-gray-200' : ''}`}
                      >
                        <NavItem
                          icon={link.icon}
                          label={link.label}
                          subLabel={link.subLabel}
                          highlightSubLabel={link.to === '/profile' && isAuthenticated}
                          isActive={location.pathname === link.to}
                        />
                      </Link>
                    </React.Fragment>
                  ))}

                  {/* Cross-role links: grouped dropdown for doctors, inline for REC/MED */}
                  {crossRoleLinks.length > 0 && (
                    isDoc && crossRoleLinks.length > 1 ? (
                      <div className="relative px-1.5 xl:px-2" ref={crossRoleDropdownRef}>
                        <div
                          onClick={() => setIsCrossRoleDropdownOpen(prev => !prev)}
                          className="cursor-pointer"
                        >
                          <motion.div
                            whileHover={{ y: -1 }}
                            className="flex flex-col items-center justify-center group px-1 relative h-full py-2"
                          >
                            <div className="text-[#2d8789] group-hover:scale-110 transition-transform">
                              <ArrowLeftRight size={22} />
                            </div>
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none mt-1 whitespace-nowrap flex items-center gap-1">
                              {t('dashboard.menu.staff_portals', 'Staff Portals')}
                              <ChevronDown size={10} className={`transition-transform duration-300 ${isCrossRoleDropdownOpen ? 'rotate-180 text-[#549E9E]' : 'text-gray-400'}`} />
                            </span>
                            <span className={`px-2 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.18em] leading-none mt-1 whitespace-nowrap ${
                              location.pathname.startsWith('/cross-role/')
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {t('dashboard.menu_sub.staff_portals', 'Cross-Role')}
                            </span>
                            {location.pathname.startsWith('/cross-role/') && (
                              <motion.div
                                layoutId="nav-underline"
                                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#2d8789] rounded-full mx-2"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {isCrossRoleDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-200/60 overflow-hidden z-50"
                            >
                              <div className="p-1.5">
                                {crossRoleLinks.map((crLink) => {
                                  const isActiveCr = location.pathname === crLink.to;
                                  return (
                                    <Link
                                      key={crLink.to}
                                      to={crLink.to}
                                      onClick={() => setIsCrossRoleDropdownOpen(false)}
                                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isActiveCr
                                          ? 'bg-[#549E9E]/10 text-[#2d8789]'
                                          : 'hover:bg-gray-50 text-gray-600'
                                      }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        isActiveCr
                                          ? 'bg-[#549E9E]/20 text-[#2d8789]'
                                          : 'bg-gray-100 text-gray-400'
                                      }`}>
                                        {crLink.to.includes('medical') ? <Pill size={16} /> : <Calendar size={16} />}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-[0.12em] leading-none">
                                          {crLink.label}
                                        </span>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] mt-1.5 leading-none ${
                                          isActiveCr ? 'text-[#2d8789]' : 'text-gray-400'
                                        }`}>
                                          {crLink.subLabel}
                                        </span>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      crossRoleLinks.map((link, idx) => (
                        <React.Fragment key={link.to}>
                          <Link
                            to={link.to}
                            className={`px-1.5 xl:px-2 ${idx !== crossRoleLinks.length - 1 ? 'border-r border-dashed border-gray-200' : ''}`}
                          >
                            <NavItem
                              icon={link.icon}
                              label={link.label}
                              subLabel={link.subLabel}
                              highlightSubLabel
                              isCrossRole
                              isActive={location.pathname === link.to}
                            />
                          </Link>
                        </React.Fragment>
                      ))
                    )
                  )}
                </>
              );
            })()}
          </div>

          {/* Right: Actions Area */}
          <div className="flex-shrink-0 flex items-center justify-end gap-1.5 xl:gap-2">
            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                whileTap={{ scale: 0.96 }}
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(true)}
                title={t('common.logout')}
                aria-label={t('common.logout')}
                className={`hidden xl:flex items-center justify-center p-1.5 border border-red-200/80 bg-red-50/70 text-red-600 rounded-xl transition-all shadow-2xs hover:shadow-sm hover:border-red-300 group shrink-0 ${isLoggingOut ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="w-5 h-5 bg-red-100/80 group-hover:bg-red-500 group-hover:text-white rounded-lg flex items-center justify-center text-red-600 transition-colors shrink-0">
                  <LogOut size={13} />
                </div>
              </motion.button>
            ) : (
              <Link to="/booking">
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(84, 158, 158, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200/80 rounded-xl transition-all group hover:border-primary-teal/40 hover:shadow-sm"
                >
                  <div className="w-5 h-5 bg-primary-teal/10 rounded-lg flex items-center justify-center text-primary-teal transition-colors group-hover:bg-primary-teal group-hover:text-white">
                    <LogIn size={12} />
                  </div>
                  <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-wider leading-none">{t('common.login_register')}</span>
                </motion.button>
              </Link>
            )}

            {/* Clinic Status (Stacked Doctor In & Time) */}
            <div
              title={`${t('common.clinic_status')}: ${isDoctorAvailable ? t('common.doctor_in') : t('common.doctor_out')}${activeSince ? ` (${activeSince})` : ''}`}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-default select-none shrink-0 shadow-2xs hover:shadow-sm ${
                isDoctorAvailable
                  ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100/80'
                  : 'bg-amber-50/90 border-amber-200/80 text-amber-800 hover:bg-amber-100/80'
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                {isDoctorAvailable ? (
                  <UserCheck size={14} className="text-emerald-600" />
                ) : (
                  <UserX size={14} className="text-amber-600" />
                )}
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${isDoctorAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${isDoctorAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </span>
              </div>

              <div className="flex flex-col items-start justify-center leading-tight">
                <span className={`text-[9px] font-black uppercase tracking-wider whitespace-nowrap leading-none ${isDoctorAvailable ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {isDoctorAvailable ? t('common.doctor_in') : t('common.doctor_out')}
                </span>

                {isDoctorAvailable && activeSince && (
                  <span className="text-[8px] font-extrabold text-emerald-700/80 tracking-tight whitespace-nowrap leading-none mt-1">
                    {activeSince}
                  </span>
                )}
              </div>
            </div>

            {/* Language Switcher */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleLanguage}
              title={i18n.language === 'en' ? 'Switch to हिन्दी' : 'Switch to English'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200/80 bg-gray-50/80 text-[#2d8789] hover:text-[#549E9E] rounded-xl transition-all shadow-2xs hover:shadow-sm hover:border-[#549E9E]/40 group shrink-0 cursor-pointer"
            >
              <div className="w-5 h-5 bg-[#2d8789]/10 group-hover:bg-[#2d8789]/20 rounded-lg flex items-center justify-center text-[#2d8789] transition-colors shrink-0">
                <Languages size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#2d8789] whitespace-nowrap leading-none">
                {i18n.language === 'en' ? 'हिन्दी' : 'EN'}
              </span>
            </motion.button>

            {/* Hamburger Toggle Button (mobile only) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center p-2.5 rounded-xl border border-gray-100 bg-gray-50/80 text-[#2d8789] hover:bg-[#549E9E]/5 transition-all shadow-sm"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>

        </div>
      </div>

      {/* Sparkles Decoration */}
      <div className="absolute top-24 left-[35%] opacity-40 animate-pulse text-primary-teal">
        <div className="w-4 h-4 bg-current rotate-45" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
      </div>
      <div className="absolute top-28 right-[35%] opacity-40 animate-pulse text-primary-teal delay-700">
        <div className="w-4 h-4 bg-current rotate-12" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[24px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                <LogOut size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">{t('common.logout_modal.title')}</h3>
              <p className="text-sm font-medium text-gray-500 mb-8 px-4">
                {t('common.logout_modal.description')}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 bg-gray-50 text-gray-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  {t('common.logout_modal.cancel')}
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    await logout();
                    navigate('/');
                  }}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  {t('common.logout_modal.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="xl:hidden w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-lg overflow-hidden absolute top-20 left-0 z-10"
          >
            <div className="px-4 py-5 space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {/* Navigation Links */}
              <div className="flex flex-col gap-1.5">
                {currentLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  const Icon = link.icon;
                  const isCrossRole = link.to.startsWith('/cross-role/');
                  const isProfile = link.to === '/profile' && isAuthenticated;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3.5 p-3 rounded-xl transition-all ${isActive
                          ? 'bg-[#549E9E]/10 text-[#2d8789] font-bold shadow-sm'
                          : 'hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                      <div className={isActive ? 'text-[#2d8789]' : 'text-gray-400'}>
                        <Icon size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.12em] leading-none text-gray-900">
                          {link.label}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] mt-1.5 leading-none ${isActive
                            ? 'text-[#2d8789]'
                            : isCrossRole
                              ? 'text-emerald-700'
                              : isProfile
                                ? 'text-red-600'
                                : 'text-gray-400'
                          }`}>
                          {link.subLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-gray-150 pt-4 space-y-4">
                {/* Clinic Status */}
                <div className="flex items-center justify-between bg-gray-50/80 border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg ${isDoctorAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {isDoctorAvailable ? <UserCheck size={16} /> : <UserX size={16} />}
                      <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${isDoctorAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-45 ${isDoctorAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                        {t('common.clinic_status')}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isDoctorAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isDoctorAvailable ? t('common.doctor_in') : t('common.doctor_out')}
                      </span>
                    </div>
                  </div>
                  {isDoctorAvailable && activeSince && (
                    <span className="text-[9px] font-bold text-emerald-600/70 bg-emerald-100/50 px-2 py-0.5 rounded-md">
                      {activeSince}
                    </span>
                  )}
                </div>

                {/* Language Switcher (Mobile) */}
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between p-3 border border-gray-100 bg-gray-50/80 text-[#2d8789] rounded-xl transition-all hover:bg-gray-100 hover:shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-teal/5 rounded-lg flex items-center justify-center text-primary-teal">
                      <Languages size={16} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                        {t('common.language')}
                      </span>
                      <span className="text-[10px] font-black text-[#549E9E] uppercase tracking-widest leading-none">
                        {i18n.language === 'en' ? 'English (En)' : 'हिन्दी (Hi)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-400">
                    {i18n.language === 'en' ? 'Switch to हिन्दी' : 'Switch to English'}
                  </span>
                </button>

                {/* Authentication Action Button */}
                {isAuthenticated ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoggingOut}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className={`w-full flex items-center justify-center gap-3 p-3 border border-red-100 bg-red-50/40 text-red-600 rounded-xl transition-all hover:bg-red-50 hover:shadow-sm ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <LogOut size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                      {t('common.logout')}
                    </span>
                  </motion.button>
                ) : (
                  <Link to="/booking" className="block w-full">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-3 p-3 border border-gray-150 bg-gray-50/60 text-[#2d8789] rounded-xl transition-all hover:bg-gray-100 hover:shadow-sm"
                    >
                      <LogIn size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {t('common.login_register')}
                      </span>
                    </motion.button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
