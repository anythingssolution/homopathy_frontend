import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Banknote,
  BarChart2,
  CalendarCheck,
  ClipboardList,
  Pill,
  UserPlus,
  Sun,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type BadgeCounts = {
  followUps: number;
  collections: number;
  dispensary: number;
};

type SidebarProps = {
  badges: BadgeCounts;
};

const itemClass = (active: boolean) =>
  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left ${
    active
      ? 'bg-[#549E9E] text-white shadow-md shadow-[#549E9E]/20'
      : 'text-gray-500 hover:bg-[#549E9E]/5 hover:text-[#549E9E]'
  }`;

const Badge = ({ count, active }: { count: number; active: boolean }) => {
  if (!count) return null;
  return (
    <span
      className={`ml-auto text-[10px] font-black rounded-full min-w-[1.4rem] h-5 px-1.5 flex items-center justify-center ${
        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ badges }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col p-4 overflow-hidden">
      <div className="mb-4 px-2 hidden md:block shrink-0">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
          {t('reports_next.menu')}
        </h3>
        <p className="mt-1 text-[10px] font-bold text-[#549E9E] uppercase tracking-widest">
          {t('reports_next.menu_hint')}
        </p>
      </div>

      <nav className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:min-h-0 scrollbar-none md:flex-1 pb-2 md:pb-0">
        <div className="shrink-0 space-y-1.5 min-w-[220px] md:min-w-0">
          <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hidden md:block">
            {t('reports_next.group_start')}
          </p>
          <NavLink to="/reports-next" end className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <Sun size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                  {t('reports_next.nav.today')}
                </span>
              </>
            )}
          </NavLink>
        </div>

        <div className="shrink-0 space-y-1.5 min-w-[220px] md:min-w-0">
          <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hidden md:block">
            {t('reports_next.group_work')}
          </p>
          <NavLink to="/reports-next/appointments" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <CalendarCheck size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight flex-1">
                  {t('reports_next.nav.appointments')}
                </span>
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/follow-ups" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <ClipboardList size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight flex-1">
                  {t('reports_next.nav.follow_ups')}
                </span>
                <Badge count={badges.followUps} active={isActive} />
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/first-consults" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <UserPlus size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight flex-1">
                  {t('reports_next.nav.first_consults')}
                </span>
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/dispensary" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <Pill size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight flex-1">
                  {t('reports_next.nav.dispensary')}
                </span>
                <Badge count={badges.dispensary} active={isActive} />
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/collections" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <Banknote size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight flex-1">
                  {t('reports_next.nav.collections')}
                </span>
                <Badge count={badges.collections} active={isActive} />
              </>
            )}
          </NavLink>
        </div>

        <div className="shrink-0 space-y-1.5 min-w-[220px] md:min-w-0">
          <p className="px-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hidden md:block">
            {t('reports_next.group_review')}
          </p>
          <NavLink to="/reports-next/patients" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <Users size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                  {t('reports_next.nav.patients')}
                </span>
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/diagnosis" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <Activity size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                  {t('reports_next.nav.diagnosis')}
                </span>
              </>
            )}
          </NavLink>
          <NavLink to="/reports-next/compare" className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <BarChart2 size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs font-bold uppercase tracking-widest leading-tight">
                  {t('reports_next.nav.compare')}
                </span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
