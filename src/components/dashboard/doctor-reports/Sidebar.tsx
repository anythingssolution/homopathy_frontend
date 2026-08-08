import React from 'react';
import { LayoutDashboard, BarChart2, Users, FileText, Banknote, Pill, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ViewType = 'appointments' | 'booked_vs_consulted' | 'clinical' | 'patients_analytics' | 'billing' | 'medical' | 'analytics' | 'patients';

interface SidebarProps {
  activeView: ViewType;
  onChangeView: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView }) => {
  const { t } = useTranslation();

  const menuItems = [
    {
      id: 'appointments',
      label: 'Appointments',
      icon: LayoutDashboard,
    },
    {
      id: 'booked_vs_consulted',
      label: 'Booked vs Consulted',
      icon: TrendingUp,
    },
    {
      id: 'clinical',
      label: 'Clinical Insights',
      icon: FileText,
    },
    {
      id: 'patients_analytics',
      label: 'Patient Analytics',
      icon: Users,
    },
    {
      id: 'billing',
      label: 'Billing & Revenue',
      icon: Banknote,
    },
    {
      id: 'medical',
      label: 'Medical & Dispensary',
      icon: Pill,
    },
    {
      id: 'analytics',
      label: 'Custom Reports',
      icon: BarChart2,
    },
    {
      id: 'patients',
      label: 'Patient Directory',
      icon: Users,
    }
  ] as const;

  return (
    <div className="w-full md:w-64 bg-white border border-gray-200 flex-shrink-0 flex flex-col p-4 shadow-sm rounded-xl max-h-[calc(100vh-7rem)] overflow-y-auto">
      <div className="mb-6 px-2 hidden md:block">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Reports Menu</h3>
      </div>

      <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as ViewType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
                  : 'text-gray-500 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
              <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
