import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  Clock, 
  FileText, 
  Receipt, 
  User, 
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StaffBranchSwitcher from '../StaffBranchSwitcher';

export default function DashboardLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const isConsultPage = location.pathname.startsWith('/consult/');

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard.menu.dashboard') },
    { path: '/book-appointment', icon: CalendarPlus, label: t('dashboard.menu.book_appointment') },
    { path: '/my-appointments', icon: Clock, label: t('dashboard.menu.my_appointments') },
    { path: '/prescriptions', icon: FileText, label: t('dashboard.menu.prescriptions') },
    { path: '/bills', icon: Receipt, label: t('dashboard.menu.bills') },
    { path: '/profile', icon: User, label: t('dashboard.menu.profile') },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDF7] pt-20">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {!isConsultPage && (
          <div className="mb-6 flex sm:justify-end w-full">
            <div className="w-full sm:w-auto">
              <StaffBranchSwitcher />
            </div>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
