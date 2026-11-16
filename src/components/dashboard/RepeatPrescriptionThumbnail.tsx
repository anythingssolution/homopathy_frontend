import React, { useLayoutEffect, useRef, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import PrescriptionPrint from '../PrescriptionPrint';

export type SavedRepeatPrescription = { appointment: any; consultation: any };

/** Fit the complete saved document inside the card, including long prescriptions. */
export default function RepeatPrescriptionThumbnail({ document, lang, label, onOpen }: {
  document?: SavedRepeatPrescription; lang: 'en' | 'hi'; label: string; onOpen: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 794, height: 1123, availableWidth: 180, availableHeight: 140 });
  useLayoutEffect(() => {
    if (!viewport.current || !paper.current) return;
    const measure = () => {
      if (!viewport.current || !paper.current) return;
      const next = { width: paper.current.offsetWidth, height: paper.current.offsetHeight,
        availableWidth: viewport.current.clientWidth, availableHeight: viewport.current.clientHeight };
      setSize(previous => Object.keys(next).every(key => next[key as keyof typeof next] === previous[key as keyof typeof next]) ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current); observer.observe(paper.current); measure();
    return () => observer.disconnect();
  }, [document, lang]);
  const scale = Math.min(size.availableWidth / Math.max(1, size.width), size.availableHeight / Math.max(1, size.height));
  const available = Boolean(document?.appointment && document?.consultation);
  return <div ref={viewport} className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100/80">
    {available ? <div aria-hidden="true" inert className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: size.width * scale, height: size.height * scale, transform: 'translate(-50%, -50%)' }}>
      <div ref={paper} className="absolute left-0 top-0 flex min-h-[297mm] w-[210mm] flex-col bg-white p-8 shadow-sm" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <PrescriptionPrint consultation={document!.consultation} appointment={document!.appointment} lang={lang} />
      </div>
    </div> : <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-500"><FileText size={24} />{lang === 'hi' ? 'प्रीव्यू उपलब्ध नहीं है' : 'Preview unavailable'}</div>}
    <button type="button" disabled={!available} onClick={onOpen} aria-label={label}
      className="group absolute inset-0 cursor-zoom-in rounded-lg outline-none hover:ring-2 hover:ring-inset hover:ring-[#549e9e] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#549e9e] disabled:cursor-default">
      {available && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-[#246e70] p-1.5 text-white shadow-sm group-hover:bg-[#1c5556]"><Eye size={14} /></span>}
    </button>
  </div>;
}
