import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { BarChart as BarChartIcon } from 'lucide-react';

import { Sidebar } from './doctor-reports/Sidebar';
import { AppointmentAnalytics } from './doctor-reports/views/AppointmentAnalytics';
import { BookedVsConsultedView } from './doctor-reports/views/BookedVsConsultedView';
import { ClinicalAnalytics } from './doctor-reports/views/ClinicalAnalytics';
import { PatientAnalytics } from './doctor-reports/views/PatientAnalytics';
import { BillingAnalytics } from './doctor-reports/views/BillingAnalytics';
import { MedicalAnalytics } from './doctor-reports/views/MedicalAnalytics';
import { Analytics } from './doctor-reports/views/Analytics';
import { PatientDirectory } from './doctor-reports/views/PatientDirectory';

type ViewType = 'appointments' | 'booked_vs_consulted' | 'clinical' | 'patients_analytics' | 'billing' | 'medical' | 'analytics' | 'patients';

export default function DoctorReports() {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [activeView, setActiveView] = useState<ViewType>('appointments');

  const renderView = () => {
    switch (activeView) {
      case 'appointments':
        return <AppointmentAnalytics token={token} />;
      case 'booked_vs_consulted':
        return <BookedVsConsultedView token={token} />;
      case 'clinical':
        return <ClinicalAnalytics token={token} />;
      case 'patients_analytics':
        return <PatientAnalytics token={token} />;
      case 'billing':
        return <BillingAnalytics token={token} />;
      case 'medical':
        return <MedicalAnalytics token={token} />;
      case 'analytics':
        return <Analytics token={token} />;
      case 'patients':
        return <PatientDirectory token={token} />;
      default:
        return <AppointmentAnalytics token={token} />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Dashboard Header */}
      <div className="bg-[#549E9E] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm rounded-xl">
        <div>
          <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <BarChartIcon size={24} /> {t('doctor_reports.title', 'Analytics Dashboard')}
          </h3>
          <p className="text-white/80 text-xs font-black uppercase tracking-[0.2em] mt-1">
            {t('doctor_reports.subtitle', 'Track clinical performance and manage patients')}
          </p>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Reports Menu Sidebar (Sticky) */}
        <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-24 z-20">
          <Sidebar activeView={activeView} onChangeView={setActiveView} />
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 min-w-0">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
