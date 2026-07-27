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
      className={`bg-white p-5 border-l-4 rounded-xl shadow-sm border-y border-r border-gray-100 ${colorClass}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</h4>
        <Icon size={16} className="text-gray-300" />
      </div>
      <p className="text-3xl font-black text-gray-800">{value}</p>
    </motion.div>
  );
};
