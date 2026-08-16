import React, { createContext, useContext, useState, useEffect } from 'react';
import { dedupedFetch } from '../utils/dedupedFetch';

type Role = 'patient' | 'doctor' | 'receptionist' | 'medical_staff' | 'doc' | 'receptionist' | 'medical' | 'DOC' | 'PAT' | 'REC' | 'MED';

export interface BranchOption {
  id: number;
  branch_name: string;
  address?: string | null;
  contact_no?: string | null;
  is_selected?: boolean;
}

export interface BranchScope {
  required: boolean;
  selected_branch_id: number | null;
  selected_branch: BranchOption | null;
  available_branches: BranchOption[];
}

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  role_code?: string;
  uuid?: string;
  age?: number;
  gender?: string;
  address?: string;
  has_cross_module_access?: number | boolean;
  can_access_reception_module?: number | boolean;
  can_access_medical_module?: number | boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  branchScope: BranchScope | null;
  needsBranchSelection: boolean;
  login: (userData: User, token: string, branchScope?: BranchScope | null) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  selectBranch: (branchId: number) => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredBranchScope = (): BranchScope | null => {
  const saved = localStorage.getItem('branchScope');
  return saved ? JSON.parse(saved) : null;
};

const isBranchScopedRole = (user: User | null | undefined) => {
  const roleCode = String(user?.role_code || '').toUpperCase();
  const role = String(user?.role || '').toLowerCase();
  return roleCode === 'DOC' || roleCode === 'REC' || roleCode === 'MED'
    || role === 'doctor' || role === 'doc' || role === 'receptionist' || role === 'rec' || role === 'medical' || role === 'med';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [branchScope, setBranchScope] = useState<BranchScope | null>(() => getStoredBranchScope());
  const [isLoading, setIsLoading] = useState(true);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const needsBranchSelection = Boolean(isBranchScopedRole(user) && branchScope?.required && !branchScope?.selected_branch_id);

  const refreshProfile = async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('--- Fetching Profile ---');
      console.log('URL: /api/v1/auth/me');
      
      const response = await dedupedFetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Only logout on expired/invalid token (401)
      if (response.status === 401) {
        console.warn('Auth token expired or invalid, logging out.');
        logout();
        return;
      }

      // For 403 (role not authorized for /me endpoint) — keep existing session
      if (!response.ok) {
        console.warn(`Profile API returned ${response.status}, keeping existing session.`);
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      console.log('Profile Response:', result);

      if (result.success) {
        // Preserve existing role_code if API doesn't return it
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userData: User = {
          id: result.data.uuid,
          name: result.data.full_name,
          phone: result.data.mobile_no,
          email: result.data.email || undefined,
          role: result.data.role || existingUser.role,
          role_code: result.data.role_code || existingUser.role_code,
          uuid: result.data.uuid,
          age: result.data.age,
          gender: result.data.gender,
          address: result.data.address !== undefined ? result.data.address : existingUser.address,
          has_cross_module_access: result.data.has_cross_module_access !== undefined ? result.data.has_cross_module_access : existingUser.has_cross_module_access,
          can_access_reception_module: result.data.can_access_reception_module !== undefined ? result.data.can_access_reception_module : existingUser.can_access_reception_module,
          can_access_medical_module: result.data.can_access_medical_module !== undefined ? result.data.can_access_medical_module : existingUser.can_access_medical_module
        };
        setUser(userData);
        setToken(savedToken);
        setBranchScope(result.data.branch_scope || null);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('branchScope', JSON.stringify(result.data.branch_scope || null));
      } else {
        // Non-success but not a 401 — keep existing user data, don't logout
        console.warn('Profile fetch returned non-success, keeping existing session:', result.message);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const role = user?.role_code || user?.role?.toUpperCase();
    const savedToken = localStorage.getItem('token');
    
    // If no token, we're not loading anything
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    // Refresh profile for all authenticated roles
    if (savedToken) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (userData: User, authToken: string, authBranchScope: BranchScope | null = null) => {
    setUser(userData);
    setToken(authToken);
    setBranchScope(authBranchScope);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    localStorage.setItem('branchScope', JSON.stringify(authBranchScope));
  };

  const selectBranch = async (branchId: number) => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      return { success: false, message: 'Missing auth token' };
    }

    try {
      const response = await fetch('/api/v1/auth/selected-branch', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branch_id: branchId })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, message: result.message || 'Failed to update selected branch' };
      }

      setBranchScope(result.data || null);
      localStorage.setItem('branchScope', JSON.stringify(result.data || null));
      return { success: true };
    } catch (error) {
      console.error('Error selecting branch:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        console.log('--- Logging Out ---');
        console.log('URL: /api/v1/auth/logout');
        
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${savedToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      setUser(null);
      setToken(null);
      setBranchScope(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('branchScope');
      localStorage.removeItem('lastPath');
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      branchScope,
      needsBranchSelection,
      login, 
      logout, 
      refreshProfile, 
      selectBranch,
      isAuthenticated: !!token,
      isLoading,
      isLoggingOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
