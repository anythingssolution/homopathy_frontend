import { useCallback, useEffect, useRef } from 'react';

export function useCoalescedCallback(callback: () => void, waitMs = 700) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      callbackRef.current();
    }, waitMs);
  }, [waitMs]);
}
