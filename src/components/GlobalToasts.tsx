import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function GlobalToasts() {
  const { toasts, removeToast } = useNotifications();
  const { user } = useAuth();

  return (
    <div className="fixed top-24 right-8 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 pointer-events-auto min-w-[280px] ${
              notif.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
              notif.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
              notif.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${
              notif.type === 'success' ? 'bg-emerald-100' : 
              notif.type === 'error' ? 'bg-red-100' : 
              notif.type === 'warning' ? 'bg-amber-100' :
              'bg-blue-100'
            }`}>
              <Bell size={16} />
            </div>
            <span className="flex-1">{notif.msg}</span>
            <button 
              onClick={() => removeToast(notif.id)}
              className="hover:bg-black/5 p-1 rounded-lg transition-colors ml-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
