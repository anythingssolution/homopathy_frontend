import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

import StaffBranchSwitcher from '../StaffBranchSwitcher';
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
    <div className="flex flex-col md:block min-h-[calc(100vh-5rem)]">
      <aside className="w-full md:fixed md:left-0 md:top-20 md:bottom-0 md:w-64 z-20 no-print">
        <Sidebar activeView={activeView} onChangeView={setActiveView} />
      </aside>

      <div className="flex-1 min-w-0 md:ml-64 px-4 sm:px-6 lg:px-8 pt-3 pb-8 space-y-6">
        <div className="no-print">
          <StaffBranchSwitcher />
        </div>

        {renderView()}
      </div>
    </div>
  );
}
