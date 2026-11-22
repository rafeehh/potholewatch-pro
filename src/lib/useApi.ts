import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T) => void;
}

export function useApi<T>(path: string, pollMs?: number): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const active = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await api<T>(path);
      if (active.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      if (active.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    active.current = true;
    setLoading(true);
    void load();
    let timer: number | undefined;
    if (pollMs) {
      timer = window.setInterval(() => void load(), pollMs);
    }
    return () => {
      active.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [load, pollMs, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload, setData };
}
