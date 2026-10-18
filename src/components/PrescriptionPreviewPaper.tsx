import React, { useLayoutEffect, useRef, useState } from 'react';

/** Fit the existing A4 document to the preview without reflowing its print layout. */
export default function PrescriptionPreviewPaper({ children }: { children: React.ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(true);
  const [size, setSize] = useState({ width: 794, height: 1123, available: 794 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!viewport.current || !paper.current) return;
      setSize({
        width: paper.current.offsetWidth,
        height: paper.current.offsetHeight,
        available: Math.max(1, viewport.current.clientWidth - 24),
      });
    };
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (paper.current) observer.observe(paper.current);
    measure();
    return () => observer.disconnect();
  }, []);

  const scale = fit ? Math.min(1, size.available / size.width) : 1;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-200/60">
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-gray-200 px-3 py-1.5 text-xs">
        <span className="mr-auto text-gray-600">Preview</span>
        <button type="button" aria-pressed={fit} onClick={() => setFit(true)} className={`rounded-md px-3 py-1.5 font-bold ${fit ? 'bg-[#549E9E] text-white' : 'bg-white text-gray-700'}`}>Fit width</button>
        <button type="button" aria-pressed={!fit} onClick={() => setFit(false)} className={`rounded-md px-3 py-1.5 font-bold ${!fit ? 'bg-[#549E9E] text-white' : 'bg-white text-gray-700'}`}>100%</button>
      </div>
      <div ref={viewport} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-3" data-lenis-prevent>
        <div className="relative mx-auto" style={{ width: size.width * scale, height: size.height * scale }}>
          <div ref={paper} className="absolute left-0 top-0 flex min-h-[297mm] w-[210mm] flex-col border border-gray-100 bg-white p-8 shadow-xl" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
