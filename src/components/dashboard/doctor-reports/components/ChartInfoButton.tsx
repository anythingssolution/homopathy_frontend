import React, { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ChartInfoButtonProps = {
  infoKey: string;
};

export default function ChartInfoButton({ infoKey }: ChartInfoButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const title = t(`reports_charts.${infoKey}.title`);
  const body = t(`reports_charts.${infoKey}.body`);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#549E9E]/30 bg-[#549E9E]/10 text-[#549E9E] transition-colors hover:bg-[#549E9E] hover:text-white cursor-pointer"
        aria-label={t('reports_charts.info_aria', 'What this chart shows')}
        title={t('reports_charts.info_aria', 'What this chart shows')}
      >
        <Info size={11} strokeWidth={2.6} />
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-[80] w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
            <p className="text-xs font-black uppercase tracking-widest text-[#549E9E]">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              aria-label={t('reports_charts.close', 'Got it')}
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-xs font-medium leading-relaxed text-gray-700">{body}</p>
        </div>
      )}
    </div>
  );
}
