import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

interface Toast {
  id: number;
  msg: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface NotificationContextType {
  notificationHistory: Notification[];
  unreadCount: number;
  toasts: Toast[];
  fetchNotificationHistory: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  removeToast: (id: number) => void;
  // Event emitter for components to refresh data
  refreshTrigger: number; 
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, branchScope, needsBranchSelection } = useAuth();
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const addToast = useCallback((msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Date.now();
    setToasts(prev => [{ id, msg, type }, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchNotificationHistory = useCallback(async () => {
    if (!token || needsBranchSelection) {
      setNotificationHistory([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await fetch('/api/v1/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotificationHistory(data.data || []);
        setUnreadCount(data.data?.filter((n: any) => !n.is_read).length || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token, needsBranchSelection]);

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchNotificationHistory();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !needsBranchSelection) {
      fetchNotificationHistory();
    } else {
      setNotificationHistory([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, needsBranchSelection, fetchNotificationHistory, branchScope?.selected_branch_id]);

  useEffect(() => {
    if (token && isAuthenticated && !needsBranchSelection) {
      const socket = connectSocket(token);

      socket.on('socket.connected', (payload) => {
        console.log('Global notification socket connected:', payload);
      });

      // Unified Notification Handling
      const handleNewNotification = (msg: string) => {
        addToast(msg, 'info');
        fetchNotificationHistory();
        setRefreshTrigger(prev => prev + 1); // Trigger refresh for components
      };

      socket.on('prescription.ready_for_reception', (payload) => {
        handleNewNotification(`New prescription for ${payload.patient_name || 'a patient'} ready for review.`);
      });

      socket.on('notification.new', (payload) => {
        handleNewNotification(payload.message);
      });

      return () => {
        disconnectSocket();
      };
    }

    return () => {
      disconnectSocket();
    };
  }, [token, isAuthenticated, needsBranchSelection, addToast, fetchNotificationHistory, branchScope?.selected_branch_id]);

  return (
    <NotificationContext.Provider value={{
      notificationHistory,
      unreadCount,
      toasts,
      fetchNotificationHistory,
      markAllAsRead,
      addToast,
      removeToast,
      refreshTrigger
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
