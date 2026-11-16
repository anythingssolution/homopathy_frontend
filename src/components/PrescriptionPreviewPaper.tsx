import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Screen-only A4 viewer. Print copies stay outside this scaled container. */
export default function PrescriptionPreviewPaper({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isHi = i18n.language.startsWith('hi');
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<{ zoom: number | null }>({ zoom: null });
  const [size, setSize] = useState({ width: 794, height: 1123, available: 794 });
  const fitScale = Math.min(1, size.available / size.width);
  const scale = view.zoom === null ? fitScale : Math.max(fitScale, Math.min(3, view.zoom));
  const current = useRef({ scale, fitScale });
  current.current = { scale, fitScale };
  const pending = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const resetScroll = useRef(false);

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

  // Preserve the point between the fingers as the paper and its scroll area resize.
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element || !stage.current) return;
    if (resetScroll.current) {
      element.scrollTo(0, 0);
      resetScroll.current = false;
    }
    const anchor = pending.current;
    if (!anchor) return;
    const bounds = element.getBoundingClientRect();
    const paperBounds = stage.current.getBoundingClientRect();
    const left = paperBounds.left - bounds.left + element.scrollLeft;
    const top = paperBounds.top - bounds.top + element.scrollTop;
    element.scrollLeft = left + anchor.x * scale - (anchor.clientX - bounds.left);
    element.scrollTop = top + anchor.y * scale - (anchor.clientY - bounds.top);
    pending.current = null;
  });

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let gesture: { distance: number; scale: number; x: number; y: number } | null = null;
    const points = (touches: TouchList) => ({
      distance: Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY),
      clientX: (touches[0].clientX + touches[1].clientX) / 2,
      clientY: (touches[0].clientY + touches[1].clientY) / 2,
    });
    const start = (event: TouchEvent) => {
      gesture = null;
      if (event.touches.length !== 2 || !paper.current) return;
      if (event.cancelable) event.preventDefault();
      const midpoint = points(event.touches);
      if (!midpoint.distance) return;
      const bounds = paper.current.getBoundingClientRect();
      gesture = {
        distance: midpoint.distance,
        scale: current.current.scale,
        x: (midpoint.clientX - bounds.left) / current.current.scale,
        y: (midpoint.clientY - bounds.top) / current.current.scale,
      };
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !gesture) return;
      if (event.cancelable) event.preventDefault();
      const midpoint = points(event.touches);
      const zoom = Math.max(current.current.fitScale, Math.min(3, gesture.scale * midpoint.distance / gesture.distance));
      pending.current = { x: gesture.x, y: gesture.y, clientX: midpoint.clientX, clientY: midpoint.clientY };
      setView({ zoom });
    };
    const end = (event: TouchEvent) => {
      if (event.touches.length === 2) start(event);
      else gesture = null;
    };
    const cancel = () => { gesture = null; pending.current = null; };
    // Only a two-finger gesture is intercepted. One-finger scrolling stays native.
    element.addEventListener('touchstart', start, { passive: false });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', cancel);
    return () => {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', end);
      element.removeEventListener('touchcancel', cancel);
    };
  }, []);

  const selectZoom = (zoom: number | null) => {
    pending.current = null;
    resetScroll.current = true;
    setView({ zoom });
  };

  return (
    <div className="no-print flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gray-200/60" data-prescription-preview>
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-gray-200 px-3 py-1.5 text-xs">
        <span className="mr-auto tabular-nums text-gray-600" aria-label={isHi ? 'ज़ूम' : 'Zoom'}>{Math.round(scale * 100)}%</span>
        <button type="button" aria-pressed={view.zoom === null} onClick={() => selectZoom(null)} className={`rounded-md px-3 py-1.5 font-bold ${view.zoom === null ? 'bg-[#549E9E] text-white' : 'bg-white text-gray-700'}`}>Fit width</button>
        <button type="button" aria-pressed={view.zoom !== null && Math.abs(scale - 1) < 0.001} onClick={() => selectZoom(1)} className={`rounded-md px-3 py-1.5 font-bold ${view.zoom !== null && Math.abs(scale - 1) < 0.001 ? 'bg-[#549E9E] text-white' : 'bg-white text-gray-700'}`}>100%</button>
      </div>
      <p className="shrink-0 px-3 py-1 text-[10px] text-gray-500 sm:hidden">{isHi ? 'दो उंगलियों से ज़ूम करें • एक उंगली से स्क्रॉल करें' : 'Pinch with two fingers to zoom · Swipe to scroll'}</p>
      <div ref={viewport} className="relative min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-3" style={{ touchAction: 'pan-x pan-y', overflowAnchor: 'none' }} data-lenis-prevent tabIndex={0} role="region" aria-label={isHi ? 'प्रिस्क्रिप्शन प्रीव्यू' : 'Prescription preview'}>
        <div ref={stage} className="relative mx-auto" style={{ width: size.width * scale, height: size.height * scale }}>
          <div ref={paper} className="absolute left-0 top-0 flex min-h-[297mm] w-[210mm] flex-col border border-gray-100 bg-white p-8 shadow-xl" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
