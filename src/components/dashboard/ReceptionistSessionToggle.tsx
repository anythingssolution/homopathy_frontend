import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, UserX } from 'lucide-react';
import { getSocket } from '../../services/socket';

export default function ReceptionistSessionToggle() {
  const { token, branchScope } = useAuth();
  const { t } = useTranslation();

  const [isAtDesk, setIsAtDesk] = useState(false);
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [realTime, setRealTime] = useState('');

  const applyDoctorStatusPayload = (statusData: any) => {
    if (!statusData) return;

    let isAvailable = false;
    if (statusData.doctor_active_in_selected_branch !== undefined) {
      isAvailable = Boolean(statusData.doctor_active_in_selected_branch);
    } else {
      const selectedBranchId = branchScope?.selected_branch_id ? Number(branchScope.selected_branch_id) : null;
      const eventBranchId = statusData.branch_id ? Number(statusData.branch_id) : null;
      isAvailable = Boolean(statusData.is_doctor_available) && (!selectedBranchId || selectedBranchId === eventBranchId);
    }

    setIsAtDesk(isAvailable);

    const timeField = statusData.time || statusData.started_at;
    if (timeField && isAvailable) {
       const d = new Date(timeField);
       setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
       setActiveSince(null);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/v1/receptionist/session/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          applyDoctorStatusPayload(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch initial status:', err);
      }
    };
    fetchStatus();

    let activeSocket: any = null;
    let mainSocketAttached = false;

    const handleDoctorSessionUpdated = (payload: any) => {
      console.log("[ReceptionistSessionToggle] Doctor session update:", payload);
      const statusData = payload?.data || payload;
      applyDoctorStatusPayload(statusData);
    };

    const attachSocketListeners = (socketInstance: any) => {
      if (!socketInstance) return;
      socketInstance.on('doctor.session.current', handleDoctorSessionUpdated);
      socketInstance.on('doctor.session.updated', handleDoctorSessionUpdated);
    };

    const detachSocketListeners = (socketInstance: any) => {
      if (!socketInstance) return;
      socketInstance.off('doctor.session.current', handleDoctorSessionUpdated);
      socketInstance.off('doctor.session.updated', handleDoctorSessionUpdated);
    };

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
        if (checkCount > 10) {
          window.clearInterval(checkSocketInterval);
        }
      }
    }, 500);

    return () => {
      window.clearInterval(checkSocketInterval);
      if (activeSocket && mainSocketAttached) {
        detachSocketListeners(activeSocket);
      }
    };
  }, [token, branchScope?.selected_branch_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRealTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async (status: boolean) => {
    try {
      if (status) {
        const res = await fetch('/api/v1/receptionist/session/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ note: 'Started session' })
        });
        const data = await res.json();
        if (data.success) {
          setIsAtDesk(true);
          const d = new Date(data.data?.time || data.data?.started_at || new Date());
          setActiveSince(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        const res = await fetch('/api/v1/receptionist/session/pause', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ note: 'Paused session' })
        });
        const data = await res.json();
        if (data.success) {
          setIsAtDesk(false);
          setActiveSince(null);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 h-full">
      <button
        onClick={() => toggleStatus(!isAtDesk)}
        className={`flex items-center gap-2 px-3 py-2 transition-all rounded-lg cursor-pointer ${
          isAtDesk
            ? 'bg-[#549E9E] text-white shadow-sm'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
        }`}
      >
        <div className={`flex items-center justify-center`}>
          {isAtDesk ? <UserCheck size={16} /> : <UserX size={16} />}
        </div>
        <div className="text-left">
          <span className="block text-[10px] font-black uppercase tracking-widest leading-tight">
            {isAtDesk ? t('doctor_portal.at_desk', 'At Desk') : t('doctor_portal.not_at_desk', 'Not at Desk')}
          </span>
          <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${isAtDesk ? 'text-white/80' : 'text-gray-400'}`}>
            {isAtDesk ? t('doctor_portal.pause_session', 'Pause Session') : t('doctor_portal.start_session', 'Start Session')}
          </span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isAtDesk && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 border-l border-gray-100 flex flex-col justify-center min-w-[90px] whitespace-nowrap">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-tight">Time</span>
              <span className="text-base font-black text-[#549E9E] tabular-nums tracking-widest leading-none my-0.5">{realTime}</span>
              {activeSince && <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Since {activeSince}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
