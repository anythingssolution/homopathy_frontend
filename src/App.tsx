import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Zap } from 'lucide-react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Consultation from './components/Consultation';
import Gallery from './components/Gallery';
import AboutUs from './components/AboutUs';
import Treatments from './components/Treatments';
import Booking from './components/Booking';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import LiveQueue from './components/LiveQueue';
import LiveQueueFlow from './components/LiveQueueFlow';
import LiveQueueReplay from './components/LiveQueueReplay';
import DoctorPortal from './components/DoctorPortal';
import StaffWelcome from './components/StaffWelcome';
import NotFound from './components/NotFound';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/dashboard/DashboardLayout';
import PatientDashboard from './components/dashboard/PatientDashboard';
import Profile from './components/dashboard/Profile';
import MyAppointments from './components/dashboard/MyAppointments';
import { Prescriptions, ClinicHistory as PatientClinicHistory } from './components/dashboard/Placeholders';
import Bills from './components/dashboard/Bills';
import ConsultationPage from './components/dashboard/ConsultationPage';
import DoctorReports from './components/dashboard/DoctorReports';
import DoctorClinicHistory from './components/dashboard/DoctorClinicHistory';
import DispensaryHistory from './components/dashboard/DispensaryHistory';
import MedicalProductMaster from './components/dashboard/MedicalProductMaster';
import MedicalProductImport from './components/dashboard/MedicalProductImport';
import CrossRolePortal from './components/dashboard/CrossRolePortal';
import StaffAccess from './components/dashboard/StaffAccess';
import FamilyMembers from './components/dashboard/FamilyMembers';
import BackendLogsModule from './components/BackendLogsModule';
import DoctorLeaveCalendar from './components/dashboard/DoctorLeaveCalendar';
import ManageCMS from './components/dashboard/ManageCMS';
import DoctorFormulaMasterPage from './components/dashboard/DoctorFormulaMasterPage';
import ReceptionPatientManagement from './components/dashboard/ReceptionPatientManagement';

function HomePage() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const isDoc = user?.role_code === 'DOC' || user?.role?.toLowerCase() === 'doctor' || user?.role?.toLowerCase() === 'doc';
    const isMedical = user?.role_code === 'REC' || user?.role_code === 'MED' || 
                   ['REC', 'MED', 'medical', 'receptionist', 'rec', 'med'].includes(user?.role?.toLowerCase() || '');
    
    if (isDoc) return <Navigate to="/doctor-portal" replace />;
    if (isMedical) return <Navigate to="/medical-welcome" replace />;
    
    // For patients, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Hero />
      <Consultation />
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const lenisRef = useRef<Lenis | null>(null);
  const isDoctorPortal = location.pathname.toLowerCase().startsWith('/doctor-portal');
  const isMedicalPortal = location.pathname.toLowerCase().startsWith('/medical-welcome');
  const isDashboard = location.pathname.toLowerCase().startsWith('/dashboard');
  const isBackendLogsModule = location.pathname.toLowerCase().startsWith('/backend-logs');

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const { isAuthenticated, user } = useAuth();

  const isDoc = user?.role_code === 'DOC' || user?.role === 'doc' || user?.role === 'DOC' || user?.role === 'doctor';
  const isMedical = user?.role_code === 'REC' || user?.role_code === 'MED' || 
                 ['REC', 'MED', 'medical', 'receptionist', 'rec', 'med'].includes(user?.role || '');
                 
  const isLiveQueue = location.pathname.toLowerCase().startsWith('/live-queue');
  const isLiveQueueReplay = location.pathname.toLowerCase().startsWith('/live-queue-replay');
  const shouldHideNavigation = isLiveQueue || isLiveQueueReplay || isBackendLogsModule;
  const shouldHideFooter = (isAuthenticated && (isDoc || isMedical)) || isLiveQueue || isLiveQueueReplay || isBackendLogsModule;

  // Save last visited path for authenticated users
  useEffect(() => {
    if (isAuthenticated && 
        location.pathname !== '/' && 
        !location.pathname.toLowerCase().startsWith('/doctor-portal')) {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

  // Simplified: Always reset scroll to top on any route change
  useEffect(() => {
    window.scrollTo(0, 0);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">
      {!shouldHideNavigation && <Navigation />}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/treatments" element={<Treatments />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/backend-logs" element={<BackendLogsModule />} />
            {/* Medical Routes */}
            <Route 
              path="/medical-welcome" 
              element={
                <ProtectedRoute allowedRoles={['REC', 'rec', 'MED', 'med', 'medical', 'receptionist', 'doc', 'DOC']}>
                  <StaffWelcome />
                </ProtectedRoute>
              } 
            />

            {/* Cross-Role Routes */}
            <Route 
              path="/cross-role/medical" 
              element={
                <ProtectedRoute allowedRoles={['REC', 'rec', 'receptionist', 'doc', 'DOC']}>
                  <CrossRolePortal targetRole="medical" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cross-role/receptionist" 
              element={
                <ProtectedRoute allowedRoles={['MED', 'med', 'medical', 'doc', 'DOC']}>
                  <CrossRolePortal targetRole="receptionist" />
                </ProtectedRoute>
              } 
            />

            
            {/* Patient Dashboard Routes */}
            <Route element={<ProtectedRoute allowedRoles={['patient', 'PAT', 'doc', 'DOC', 'doctor', 'REC', 'rec', 'MED', 'med', 'medical', 'receptionist']}><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['patient', 'PAT']}><PatientDashboard /></ProtectedRoute>} />
              <Route path="/doctor-portal" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><DoctorPortal /></ProtectedRoute>} />
              <Route path="/doctor-formula-master" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><DoctorFormulaMasterPage /></ProtectedRoute>} />
              <Route path="/doctor-portal/cms" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><ManageCMS /></ProtectedRoute>} />
              <Route path="/doctor-leave-calendar" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><DoctorLeaveCalendar /></ProtectedRoute>} />
              <Route path="/consult/:appointmentId" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><ConsultationPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><DoctorReports /></ProtectedRoute>} />
              <Route path="/book-appointment" element={<Booking />} />
              <Route path="/reception-patients" element={<ProtectedRoute allowedRoles={['REC', 'rec', 'receptionist']}><ReceptionPatientManagement /></ProtectedRoute>} />
              <Route path="/my-appointments" element={<ProtectedRoute allowedRoles={['patient', 'PAT']}><MyAppointments /></ProtectedRoute>} />
              <Route path="/clinic-history" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><DoctorClinicHistory /></ProtectedRoute>} />
              <Route path="/dispensary-history" element={<ProtectedRoute allowedRoles={['MED', 'med', 'medical']}><DispensaryHistory /></ProtectedRoute>} />
              <Route path="/medical-product-master" element={<ProtectedRoute allowedRoles={['MED', 'med', 'medical', 'doc', 'DOC', 'doctor']}><MedicalProductMaster /></ProtectedRoute>} />
              <Route path="/medical-product-import" element={<ProtectedRoute allowedRoles={['MED', 'med', 'medical', 'doc', 'DOC', 'doctor']}><MedicalProductImport /></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><Bills /></ProtectedRoute>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/staff-access" element={<ProtectedRoute allowedRoles={['doc', 'DOC', 'doctor']}><StaffAccess /></ProtectedRoute>} />
              <Route path="/family-members" element={<ProtectedRoute allowedRoles={['patient', 'PAT']}><FamilyMembers /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
            
            {/* Live Queue Route */}
            <Route path="/live-queue" element={<LiveQueue />} />
            <Route path="/live-queue-flow" element={<LiveQueueFlow />} />
            <Route path="/live-queue-replay" element={<LiveQueueReplay />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function LogoutOverlay() {
  const { isLoggingOut } = useAuth();
  
  return (
    <AnimatePresence>
      {isLoggingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#549E9E]/20 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white px-12 py-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-primary-teal/10 rounded-2xl flex items-center justify-center text-primary-teal">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap size={32} />
              </motion.div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-widest mb-2">Logging Out</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Securing your session...</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { NotificationProvider } from './context/NotificationContext';
import { DoctorFormulaMasterProvider } from './context/DoctorFormulaMasterContext';
import GlobalToasts from './components/GlobalToasts';

export default function App() {
  const [isLoading, setIsLoading] = useState(() => {
    return sessionStorage.getItem('hasLoaded') !== 'true';
  });

  const handleLoadingComplete = () => {
    setIsLoading(false);
    sessionStorage.setItem('hasLoaded', 'true');
  };

  return (
    <AuthProvider>
      <NotificationProvider>
        <DoctorFormulaMasterProvider>
          <LogoutOverlay />
          <GlobalToasts />
          <Router>
            <AnimatePresence mode="wait">
              {isLoading && (
                <LoadingScreen onComplete={handleLoadingComplete} />
              )}
            </AnimatePresence>

            <div
              style={{ 
                opacity: isLoading ? 0 : 1, 
                transition: "opacity 0.5s ease-out" 
              }}
            >
              <AnimatedRoutes />
            </div>
          </Router>
        </DoctorFormulaMasterProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
