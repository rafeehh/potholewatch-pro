import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type SessionInfo } from './api';

interface SessionState {
  session: SessionInfo | null;
  loading: boolean;
  rename: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api<SessionInfo>('/api/session');
    setSession(data);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  const rename = useCallback(async (name: string) => {
    const data = await api<{ user: SessionInfo['user'] }>('/api/session', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
  }, []);

  const value = useMemo(() => ({ session, loading, rename, refresh }), [session, loading, rename, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
