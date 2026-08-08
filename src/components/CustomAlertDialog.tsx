import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, Stethoscope, ArrowRight } from 'lucide-react';

export interface CustomAlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  confirmText?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  onClose?: () => void;
}

interface CustomAlertDialogProps {
  alert: CustomAlertState | null;
  onClose: () => void;
}

export default function CustomAlertDialog({ alert, onClose }: CustomAlertDialogProps) {
  if (!alert || !alert.isOpen) return null;

  const type = alert.type || 'warning';

  const typeConfigs = {
    warning: {
      bgIcon: 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/10',
      icon: <AlertTriangle size={32} className="text-amber-500" />,
      defaultTitle: 'Session Required',
      accentColor: 'text-amber-600',
    },
    error: {
      bgIcon: 'bg-red-500/10 text-red-600 border-red-500/20 shadow-red-500/10',
      icon: <AlertCircle size={32} className="text-red-500" />,
      defaultTitle: 'Action Failed',
      accentColor: 'text-red-600',
    },
    success: {
      bgIcon: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/10',
      icon: <CheckCircle2 size={32} className="text-emerald-500" />,
      defaultTitle: 'Success',
      accentColor: 'text-emerald-600',
    },
    info: {
      bgIcon: 'bg-[#549E9E]/10 text-[#549E9E] border-[#549E9E]/20 shadow-[#549E9E]/10',
      icon: <Info size={32} className="text-[#549E9E]" />,
      defaultTitle: 'Notice',
      accentColor: 'text-[#549E9E]',
    },
  };

  const config = typeConfigs[type];
  const title = alert.title || config.defaultTitle;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 sm:p-8 text-center z-10 overflow-hidden"
        >
          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Visual Icon Badge */}
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border shadow-md ${config.bgIcon}`}>
            {config.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-black text-[#549E9E] uppercase tracking-tight mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm sm:text-base font-semibold text-gray-700 leading-relaxed mb-6">
            {alert.message}
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {alert.primaryAction && (
              <button
                onClick={() => {
                  alert.primaryAction?.onClick();
                  onClose();
                }}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#549E9E] to-[#3d7f7f] hover:from-[#438383] hover:to-[#336868] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#549E9E]/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {alert.primaryAction.icon || <ArrowRight size={16} />}
                <span>{alert.primaryAction.label}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`w-full py-3.5 px-6 font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer ${
                alert.primaryAction
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gradient-to-r from-[#549E9E] to-[#3d7f7f] text-white shadow-lg shadow-[#549E9E]/20 hover:opacity-90'
              }`}
            >
              {alert.confirmText || 'Got it'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
