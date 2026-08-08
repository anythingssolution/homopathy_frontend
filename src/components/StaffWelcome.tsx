import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  Settings, 
  LogOut, 
  UserCircle,
  Bell,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReceptionistPortal from './dashboard/ReceptionistPortal';
import MedicalDashboard from './dashboard/MedicalDashboard';
import StaffBranchSwitcher from './StaffBranchSwitcher';
import ReceptionistSessionToggle from './dashboard/ReceptionistSessionToggle';

export default function StaffWelcome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isReceptionist = user?.role_code === 'REC' || user?.role?.toLowerCase() === 'rec' || user?.role?.toLowerCase() === 'receptionist';
  const isMedical = user?.role_code === 'DOC'
    || user?.role_code === 'MED'
    || user?.role?.toLowerCase() === 'doc'
    || user?.role?.toLowerCase() === 'doctor'
    || user?.role?.toLowerCase() === 'med'
    || user?.role?.toLowerCase() === 'medical';

  if (isReceptionist) {
    return (
      <div className="pt-24 px-4 lg:px-8 max-w-7xl mx-auto min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <ReceptionistSessionToggle />
          <StaffBranchSwitcher />
        </div>
        <ReceptionistPortal />
      </div>
    );
  }

  if (isMedical) {
    return (
      <div className="pt-24 px-4 lg:px-8 max-w-7xl mx-auto min-h-screen">
        <div className="mb-6 flex justify-end">
          <StaffBranchSwitcher />
        </div>
        <MedicalDashboard />
      </div>
    );
  }

  const getRoleDisplay = () => {
    const role = user?.role?.toLowerCase();
    if (role === 'rec' || role === 'receptionist') return {
      title: 'Receptionist Desk',
      icon: Users,
      color: 'bg-blue-500',
      description: 'Manage appointments, patient check-ins, and front-desk operations.'
    };
    if (role === 'med' || role === 'medical' || role === 'medical_staff') return {
      title: 'Medical Staff Portal',
      icon: Activity,
      color: 'bg-emerald-500',
      description: 'Access patient records, assist in treatments, and manage clinical data.'
    };
    return {
      title: 'Portal',
      icon: ShieldCheck,
      color: 'bg-gray-500',
      description: 'Welcome to the clinic management system.'
    };
  };

  const roleInfo = getRoleDisplay();
  const Icon = roleInfo.icon;

  const quickActions = [
    { label: 'View Schedule', icon: Calendar, color: 'text-blue-500' },
    { label: 'Patient List', icon: Users, color: 'text-emerald-500' },
    { label: 'Reports', icon: ClipboardList, color: 'text-purple-500' },
    { label: 'Settings', icon: Settings, color: 'text-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDF7] flex flex-col pt-24">
      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-8 lg:p-16 flex flex-col items-center justify-center">
        <div className="w-full flex justify-end mb-6">
          <StaffBranchSwitcher />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className={`w-24 h-24 ${roleInfo.color} text-white rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-current/20 rotate-3`}>
            <Icon size={48} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-800 uppercase tracking-tighter mb-4">
            Welcome, <span className="text-primary-teal">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-sm max-w-md mx-auto leading-relaxed">
            {roleInfo.description}
          </p>
        </motion.div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-teal/20 transition-all flex flex-col items-center gap-4 group"
            >
              <div className={`p-4 bg-gray-50 rounded-2xl group-hover:bg-primary-teal/5 transition-colors ${action.color}`}>
                <action.icon size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary-teal">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* System Status Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 w-full bg-white rounded-[40px] p-8 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center animate-pulse">
              <Bell size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-widest">System Notice</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Your specific module dashboard is currently under development.</p>
            </div>
          </div>
          <button className="px-8 py-4 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary-teal transition-all shadow-xl shadow-gray-900/10 hover:shadow-primary-teal/20">
            Contact Admin
          </button>
        </motion.div>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 flex opacity-20">
        <div className="bg-blue-500 flex-1" />
        <div className="bg-emerald-500 flex-1" />
        <div className="bg-purple-500 flex-1" />
        <div className="bg-primary-teal flex-1" />
      </div>
    </div>
  );
}
