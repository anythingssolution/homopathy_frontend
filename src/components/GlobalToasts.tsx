import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function GlobalToasts() {
  const { toasts, removeToast } = useNotifications();

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-600 shrink-0" />;
      default:
        return <Info size={18} className="text-[#549E9E] shrink-0" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-md w-full px-2 sm:px-0">
      <AnimatePresence>
        {toasts.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className={`px-4 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl border text-xs font-extrabold flex items-center gap-3 pointer-events-auto min-w-[280px] sm:min-w-[340px] ${
              notif.type === 'success'
                ? 'bg-white/95 border-emerald-200/80 text-emerald-950 shadow-emerald-500/10'
                : notif.type === 'error'
                ? 'bg-white/95 border-red-200/80 text-red-950 shadow-red-500/10'
                : notif.type === 'warning'
                ? 'bg-white/95 border-amber-200/80 text-amber-950 shadow-amber-500/10'
                : 'bg-white/95 border-[#549E9E]/30 text-teal-950 shadow-[#549E9E]/10'
            }`}
          >
            <div
              className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
                notif.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100'
                  : notif.type === 'error'
                  ? 'bg-red-50 border-red-100'
                  : notif.type === 'warning'
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-teal-50 border-teal-100'
              }`}
            >
              {getToastIcon(notif.type)}
            </div>
            <span className="flex-1 leading-snug tracking-tight text-gray-800 font-bold">{notif.msg}</span>
            <button
              onClick={() => removeToast(notif.id)}
              className="hover:bg-gray-100 p-1.5 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

