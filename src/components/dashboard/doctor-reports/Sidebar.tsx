import React from 'react';
import { LayoutDashboard, BarChart2, Users, FileText, Banknote, Pill, TrendingUp, Folder, ChevronRight } from 'lucide-react';
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
      label: t('reports.nav.appointments'),
      icon: LayoutDashboard,
    },
    {
      id: 'booked_vs_consulted',
      label: t('reports.nav.booked_vs_consulted'),
      icon: TrendingUp,
    },
    {
      id: 'clinical',
      label: t('reports.nav.clinical'),
      icon: FileText,
    },
    {
      id: 'patients_analytics',
      label: t('reports.nav.patients_analytics'),
      icon: Users,
    },
    {
      id: 'billing',
      label: t('reports.nav.billing'),
      icon: Banknote,
    },
    {
      id: 'medical',
      label: t('reports.nav.medical'),
      icon: Pill,
    },
    {
      id: 'analytics',
      label: t('reports.nav.analytics'),
      icon: BarChart2,
    },
    {
      id: 'patients',
      label: t('reports.nav.patients'),
      icon: Folder,
    }
  ] as const;

  return (
    <div className="w-full h-full bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col p-4 overflow-hidden">
      <div className="mb-4 px-2 hidden md:block shrink-0">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{t('reports.menu')}</h3>
      </div>

      <nav className="flex flex-row md:flex-col gap-3 md:gap-3 overflow-x-auto md:overflow-y-auto md:min-h-0 scrollbar-none md:flex-1 pb-2 md:pb-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as ViewType)}
              className={`flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 ${isActive
                  ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
                  : 'text-gray-500 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
                }`}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className="text-xs font-bold uppercase tracking-widest flex-1 text-left leading-tight">{item.label}</span>
              <ChevronRight size={14} className={`hidden md:block shrink-0 ${isActive ? 'text-white/80' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block mt-3 shrink-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#dceefc] via-[#e8f4fc] to-[#cfe6f8] px-3.5 py-2.5">
          <div className="relative z-10 pr-16">
            <p className="text-[13px] font-bold text-[#163a5f] leading-snug">
              {t('reports.promo_title_1')}<br />{t('reports.promo_title_2')}
            </p>
            <p className="text-[10px] text-[#3d5a80] mt-1 font-medium leading-tight">
              {t('reports.promo_subtitle')}
            </p>
          </div>

          <svg
            className="absolute -right-1 -bottom-1 w-[104px] h-[88px] pointer-events-none"
            viewBox="0 0 130 112"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M52 100C52 100 28 78 34 48C38 28 62 22 78 40C94 58 80 92 52 100Z"
              fill="#6FBF73"
            />
            <path d="M52 100C62 78 70 58 78 42" stroke="#3D8C4A" strokeWidth="1.4" fill="none" />
            <path d="M62 72C54 66 48 60 44 52" stroke="#3D8C4A" strokeWidth="1.2" fill="none" />
            <path d="M68 62C62 56 58 50 56 44" stroke="#3D8C4A" strokeWidth="1.2" fill="none" />
            <path
              d="M86 104C86 104 108 86 118 58C126 36 108 22 90 34C72 46 66 84 86 104Z"
              fill="#4CAF50"
            />
            <path d="M86 104C96 82 106 60 116 42" stroke="#2E7D32" strokeWidth="1.4" fill="none" />
            <path d="M98 76C106 70 112 62 116 54" stroke="#2E7D32" strokeWidth="1.2" fill="none" />
            <path d="M94 64C100 58 106 52 110 46" stroke="#2E7D32" strokeWidth="1.2" fill="none" />
            <ellipse cx="104" cy="32" rx="11" ry="13" stroke="#1B365D" strokeWidth="3.8" fill="none" />
            <path
              d="M93 32C84 32 76 40 76 50V58C76 70 66 78 54 78"
              stroke="#1B365D"
              strokeWidth="3.8"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="54" cy="78" r="8.5" stroke="#1B365D" strokeWidth="3.8" fill="none" />
            <circle cx="54" cy="78" r="3.5" fill="#1B365D" />
          </svg>
        </div>
      </div>
    </div>
  );
};
