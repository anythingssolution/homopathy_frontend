import React from 'react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white px-3 py-2 border-l-4 rounded-xl shadow-sm border-y border-r border-gray-100 flex items-center gap-2 ${colorClass}`}
    >
      <Icon size={14} className="text-gray-400 shrink-0" />
      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-tight">{title}</h4>
      <p className="text-lg font-black text-gray-800 leading-none ml-auto whitespace-nowrap">{value}</p>
    </motion.div>
  );
};
