import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

const STORAGE_PREFIX = 'view-state:';

export type RouteFrom = {
  pathname: string;
  search?: string;
};

export function readViewState<T>(key: string): Partial<T> | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

export function writeViewState<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Keeps list-page filters alive when the route unmounts (consult, history, records). */
export function usePersistViewState(key: string, value: Record<string, unknown>) {
  const serialized = JSON.stringify(value);
  useEffect(() => {
    writeViewState(key, JSON.parse(serialized));
  }, [key, serialized]);
}

export function goBackOr(
  navigate: NavigateFunction,
  fallback = '/doctor-portal',
  from?: RouteFrom | null,
) {
  if (from?.pathname) {
    navigate(`${from.pathname}${from.search || ''}`);
    return;
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate(fallback);
}
