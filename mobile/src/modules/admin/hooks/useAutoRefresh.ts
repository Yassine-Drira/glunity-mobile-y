import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback: () => void, intervalMs: number = 60000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs === null || intervalMs <= 0) return;
    
    const interval = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}
