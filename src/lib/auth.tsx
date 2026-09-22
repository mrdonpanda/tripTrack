import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { seedCitiesIfNeeded } from './api';
import { supabase } from './supabase';

type AuthValue = {
  session: Session | null;
  ready: boolean;
  seeded: boolean;
  seedError: string | null;
  retrySeed: () => void;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  ready: false,
  seeded: false,
  seedError: null,
  retrySeed: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedAttempt, setSeedAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setSeeded(false);
      setSeedError(null);
      return;
    }
    let live = true;
    setSeeded(false);
    seedCitiesIfNeeded(session.user)
      .then(() => {
        if (live) {
          setSeedError(null);
          setSeeded(true);
        }
      })
      .catch((error: Error) => {
        if (live) setSeedError(error.message);
      });
    return () => {
      live = false;
    };
  }, [session, seedAttempt]);

  return (
    <AuthContext.Provider
      value={{
        session,
        ready,
        seeded,
        seedError,
        retrySeed: () => setSeedAttempt((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
