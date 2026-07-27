import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  ArrowLeft,
  Calendar,
  FileText,
  Pill,
  History,
  CalendarPlus,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import ReceptionistPortal from './ReceptionistPortal';
import MedicalDashboard from './MedicalDashboard';
import DispensaryHistory from './DispensaryHistory';
import MedicalProductMaster from './MedicalProductMaster';
import MedicalProductImport from './MedicalProductImport';
import Booking from '../Booking';

type MedicalTab = 'prescriptions' | 'dispensary-history' | 'product-master' | 'product-import';
type ReceptionistTab = 'queue-billing' | 'book-appointment';

export default function CrossRolePortal({ targetRole }: { targetRole: 'medical' | 'receptionist' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isReceptionist = user?.role_code === 'REC' || user?.role?.toLowerCase() === 'rec' || user?.role?.toLowerCase() === 'receptionist';
  const isMedical = user?.role_code === 'MED' || user?.role?.toLowerCase() === 'med' || user?.role?.toLowerCase() === 'medical';
  const isDoctor = user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doc' || user?.role?.toLowerCase() === 'doctor';

  const [medicalTab, setMedicalTab] = useState<MedicalTab>('prescriptions');
  const [receptionistTab, setReceptionistTab] = useState<ReceptionistTab>('queue-billing');

  const handleGoBack = () => {
    navigate(isDoctor ? '/doctor-portal' : '/medical-welcome');
  };

  const hasCross = user?.has_cross_module_access === 1 || user?.has_cross_module_access === true || String(user?.has_cross_module_access) === '1';

  // Cross-role: Receptionist/Doctor viewing Medical menus
  if (targetRole === 'medical') {
    const canAccessMed = user?.can_access_medical_module === 1 || user?.can_access_medical_module === true || String(user?.can_access_medical_module) === '1';
    // Doctors get direct access (backend authorizes by role); REC needs cross-module flags
    if (!isDoctor && (!hasCross || !canAccessMed)) {
      return (
        <div className="pt-32 px-4 lg:px-8 max-w-md mx-auto text-center py-20 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-2">{t('cross_role.access_denied', 'Access Denied')}</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed mb-6">
            {t('cross_role.no_permission_medical', 'You do not have permission to view the Medical menus.')}
          </p>
          <button 
            onClick={handleGoBack} 
            className="px-6 py-3 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#437f7f] transition-all"
          >
            {t('cross_role.back_to_portal', 'Back to My Portal')}
          </button>
        </div>
      );
    }
    const tabs: { id: MedicalTab; label: string; icon: React.ElementType }[] = [
      { id: 'prescriptions', label: t('cross_role.prescriptions', 'Prescriptions'), icon: Pill },
      { id: 'dispensary-history', label: t('cross_role.dispensary_history', 'Dispensary History'), icon: History },
      { id: 'product-master', label: t('cross_role.product_master', 'Product Master'), icon: Pill },
      { id: 'product-import', label: t('cross_role.product_import', 'Product Import'), icon: FileSpreadsheet },
    ];

    return (
      <div className="pt-24 px-4 lg:px-8 max-w-7xl mx-auto min-h-screen pb-20">
        {/* Cross-Role Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ArrowLeftRight size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{t('cross_role.cross_role_access', 'Cross-Role Access')}</span>
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                    {t('cross_role.medical_menus', 'Medical Menus')}
                  </span>
                </div>
                <p className="text-xs font-bold text-white/90 mt-0.5">
                  {isDoctor
                    ? t('cross_role.viewing_medical_as_doctor', 'You are viewing Medical portal menus as a Doctor')
                    : t('cross_role.viewing_medical_as_receptionist', 'You are viewing Medical portal menus as a Receptionist')}
                </p>
              </div>
            </div>
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft size={14} />
              {t('cross_role.back_to_portal', 'Back to My Portal')}
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl w-max mb-6">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMedicalTab(tab.id)}
                className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  medicalTab === tab.id
                    ? 'bg-white text-[#549E9E] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                }`}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {medicalTab === 'prescriptions' && <MedicalDashboard />}
        {medicalTab === 'dispensary-history' && <DispensaryHistory />}
        {medicalTab === 'product-master' && <MedicalProductMaster />}
        {medicalTab === 'product-import' && <MedicalProductImport />}
      </div>
    );
  }

  // Cross-role: Medical/Doctor viewing Receptionist menus
  if (targetRole === 'receptionist') {
    const canAccessRec = user?.can_access_reception_module === 1 || user?.can_access_reception_module === true || String(user?.can_access_reception_module) === '1';
    // Doctors get direct access (backend authorizes by role); MED needs cross-module flags
    if (!isDoctor && (!hasCross || !canAccessRec)) {
      return (
        <div className="pt-32 px-4 lg:px-8 max-w-md mx-auto text-center py-20 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-2">{t('cross_role.access_denied', 'Access Denied')}</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed mb-6">
            {t('cross_role.no_permission_receptionist', 'You do not have permission to view the Receptionist menus.')}
          </p>
          <button 
            onClick={handleGoBack} 
            className="px-6 py-3 bg-[#549E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#437f7f] transition-all"
          >
            {t('cross_role.back_to_portal', 'Back to My Portal')}
          </button>
        </div>
      );
    }
    const tabs: { id: ReceptionistTab; label: string; icon: React.ElementType }[] = [
      { id: 'queue-billing', label: t('cross_role.queue_billing', 'Queue & Billing'), icon: Calendar },
      { id: 'book-appointment', label: t('cross_role.book_appointment', 'Book Appointment'), icon: CalendarPlus },
    ];

    return (
      <div className="pt-24 px-4 lg:px-8 max-w-7xl mx-auto min-h-screen pb-20">
        {/* Cross-Role Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-blue-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ArrowLeftRight size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{t('cross_role.cross_role_access', 'Cross-Role Access')}</span>
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                    {t('cross_role.receptionist_menus', 'Receptionist Menus')}
                  </span>
                </div>
                <p className="text-xs font-bold text-white/90 mt-0.5">
                  {isDoctor
                    ? t('cross_role.viewing_receptionist_as_doctor', 'You are viewing Receptionist portal menus as a Doctor')
                    : t('cross_role.viewing_receptionist_as_medical', 'You are viewing Receptionist portal menus as Medical')}
                </p>
              </div>
            </div>
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft size={14} />
              {t('cross_role.back_to_portal', 'Back to My Portal')}
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl w-max mb-6">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setReceptionistTab(tab.id)}
                className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  receptionistTab === tab.id
                    ? 'bg-white text-[#549E9E] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                }`}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {receptionistTab === 'queue-billing' && <ReceptionistPortal />}
        {receptionistTab === 'book-appointment' && (
          <div className="bg-white border border-gray-200 shadow-sm">
            <Booking />
          </div>
        )}
      </div>
    );
  }

  // Fallback — shouldn't reach here
  return null;
}
