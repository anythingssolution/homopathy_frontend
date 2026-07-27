import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StaffBranchSelectionGate from './StaffBranchSelectionGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, needsBranchSelection } = useAuth();
  const location = useLocation();

  console.log('--- ProtectedRoute Check ---');
  console.log('Path:', location.pathname);
  console.log('Authenticated:', isAuthenticated);
  console.log('Loading:', isLoading);
  console.log('User Role:', user?.role);
  console.log('Allowed Roles:', allowedRoles);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
        <div className="w-12 h-12 border-4 border-primary-teal/20 border-t-primary-teal rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted url
    return <Navigate to="/booking" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role) && !(user.role_code && allowedRoles.includes(user.role_code))) {
    // Role not authorized, redirect to home or a specific unauthorized page
    return <Navigate to="/" replace />;
  }

  if (needsBranchSelection) {
    return <StaffBranchSelectionGate />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
