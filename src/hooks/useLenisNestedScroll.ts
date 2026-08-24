import { useCallback, useEffect, useRef } from 'react';

type NestedScrollNode = HTMLElement | null;

const LERP = 0.14;
const WHEEL_MULTIPLIER = 0.9;
const LINE_HEIGHT = 16;

const getWheelDelta = (event: WheelEvent) => {
  if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT * WHEEL_MULTIPLIER;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight * WHEEL_MULTIPLIER;
  return event.deltaY * WHEEL_MULTIPLIER;
};

/** Keeps wheel/trackpad scroll inside a nested overflow list, with Lenis-like easing. */
export function useLenisNestedScroll() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setNode = useCallback((element: NestedScrollNode) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!element) return;

    let targetTop = element.scrollTop;
    let frame = 0;
    let hovering = false;

    const maxScroll = () => Math.max(0, element.scrollHeight - element.clientHeight);

    const stopPageScroll = () => window.dispatchEvent(new Event('lenis:stop'));
    const startPageScroll = () => window.dispatchEvent(new Event('lenis:start'));

    const tick = () => {
      const next = element.scrollTop + (targetTop - element.scrollTop) * LERP;
      if (Math.abs(targetTop - next) < 0.4) {
        element.scrollTop = targetTop;
        frame = 0;
        return;
      }
      element.scrollTop = next;
      frame = requestAnimationFrame(tick);
    };

    const onPointerEnter = () => {
      hovering = true;
      targetTop = element.scrollTop;
      stopPageScroll();
    };

    const onPointerLeave = () => {
      hovering = false;
      startPageScroll();
    };

    const onWheel = (event: WheelEvent) => {
      if (element.scrollHeight - element.clientHeight <= 1) return;

      event.preventDefault();
      event.stopPropagation();
      if (!hovering) stopPageScroll();

      const limit = maxScroll();
      targetTop = Math.max(0, Math.min(limit, targetTop + getWheelDelta(event)));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    element.addEventListener('pointerenter', onPointerEnter);
    element.addEventListener('pointerleave', onPointerLeave);
    element.addEventListener('wheel', onWheel, { passive: false });

    cleanupRef.current = () => {
      if (frame) cancelAnimationFrame(frame);
      element.removeEventListener('pointerenter', onPointerEnter);
      element.removeEventListener('pointerleave', onPointerLeave);
      element.removeEventListener('wheel', onWheel);
      startPageScroll();
    };
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return setNode;
}
