import React from 'react';
import { useTranslation } from 'react-i18next';
import { reportWindowLabelKey } from './lib';

type WindowBannerProps = {
  dateFilter: string;
  mode?: 'due' | 'history';
  count?: number;
  fromCard?: boolean;
};

export const WindowBanner: React.FC<WindowBannerProps> = ({
  dateFilter,
  mode = 'history',
  count,
  fromCard,
}) => {
  const { t } = useTranslation();
  const windowLabel = t(reportWindowLabelKey(dateFilter, mode));
  const shown = typeof count === 'number' ? String(count) : '—';

  return (
    <div className="rounded-xl border border-[#d7ebea] bg-[#e7f5f4]/70 px-4 py-3">
      <p className="text-sm font-semibold text-slate-700">
        {t('reports_next.window.banner', { window: windowLabel, count: shown })}
      </p>
      {fromCard && (
        <p className="mt-1 text-[11px] font-bold text-[#2d8789]">
          {t('reports_next.window.from_card')}
        </p>
      )}
    </div>
  );
};
