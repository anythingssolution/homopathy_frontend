import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { DoctorFormulaSnapshot } from '../utils/doctorFormulaParser';
import { getSocket } from '../services/socket';

type DoctorFormulaMasterContextType = {
  snapshot: DoctorFormulaSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refreshFormulaMaster: () => Promise<void>;
  applyFormulaSnapshot: (nextSnapshot: DoctorFormulaSnapshot | null) => void;
};

const DoctorFormulaMasterContext = createContext<DoctorFormulaMasterContextType | undefined>(undefined);

const STORAGE_PREFIX = 'doctorFormulaMasterSnapshot';
const BROADCAST_EVENT_KEY = 'doctorFormulaMasterBroadcast';

const isDoctorRole = (roleCode?: string, role?: string) => {
  const normalizedRoleCode = String(roleCode || '').toUpperCase();
  const normalizedRole = String(role || '').toLowerCase();
  return normalizedRoleCode === 'DOC' || normalizedRole === 'doctor' || normalizedRole === 'doc';
};

export const DoctorFormulaMasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, needsBranchSelection, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<DoctorFormulaSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${user?.id || 'anonymous'}`, [user?.id]);
  const isDoctor = isDoctorRole(user?.role_code, user?.role);

  const applyFormulaSnapshot = useCallback((nextSnapshot: DoctorFormulaSnapshot | null) => {
    setSnapshot(nextSnapshot);
    setError(null);

    if (nextSnapshot && user?.id) {
      localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
      localStorage.setItem(BROADCAST_EVENT_KEY, JSON.stringify({
        doctor_id: user.id,
        snapshot: nextSnapshot,
        updated_at: Date.now(),
      }));
    } else if (user?.id) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, user?.id]);

  const refreshFormulaMaster = useCallback(async () => {
    if (!token || !isAuthenticated || !isDoctor || needsBranchSelection) {
      setSnapshot(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/doctors/formula-master/bootstrap', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load formula master');
      }

      applyFormulaSnapshot(result.data?.snapshot || null);
    } catch (err: any) {
      console.error('Failed to refresh doctor formula master:', err);
      setError(err?.message || 'Failed to load formula master');
    } finally {
      setIsLoading(false);
    }
  }, [applyFormulaSnapshot, isAuthenticated, isDoctor, needsBranchSelection, token]);

  useEffect(() => {
    if (!isDoctor || !user?.id) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setSnapshot(JSON.parse(saved));
      } catch (err) {
        console.warn('Failed to parse cached doctor formula snapshot:', err);
      }
    }

    void refreshFormulaMaster();
  }, [isDoctor, refreshFormulaMaster, storageKey, user?.id]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== BROADCAST_EVENT_KEY || !event.newValue || !user?.id) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue);
        if (String(payload?.doctor_id) !== String(user.id)) {
          return;
        }

        setSnapshot(payload.snapshot || null);
        setError(null);
      } catch (err) {
        console.warn('Failed to read formula master broadcast payload:', err);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id || !isDoctor) {
      return;
    }

    const handleUpdated = (payload: any) => {
      if (payload?.snapshot) {
        applyFormulaSnapshot(payload.snapshot);
      }
    };

    socket.on('doctor.formula-master.updated', handleUpdated);
    return () => {
      socket.off('doctor.formula-master.updated', handleUpdated);
    };
  }, [applyFormulaSnapshot, isDoctor, user?.id, token]);

  return (
    <DoctorFormulaMasterContext.Provider value={{
      snapshot,
      isLoading,
      error,
      refreshFormulaMaster,
      applyFormulaSnapshot,
    }}>
      {children}
    </DoctorFormulaMasterContext.Provider>
  );
};

export const useDoctorFormulaMaster = () => {
  const context = useContext(DoctorFormulaMasterContext);
  if (!context) {
    throw new Error('useDoctorFormulaMaster must be used within DoctorFormulaMasterProvider');
  }
  return context;
};
