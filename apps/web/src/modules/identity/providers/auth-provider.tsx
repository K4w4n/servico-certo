'use client';

import type {
  Account,
  AuthResponse,
  LoginInput,
  RegisterTenantInput,
  Tenant,
} from '@servico-certo/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createApiClient, type ApiClient } from '@/shared/lib/api-client';
import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
} from '../lib/auth-api';

const REFRESH_SKEW_MS = 60_000;
const REFRESH_JITTER_MS = 30_000;
const MIN_REFRESH_DELAY_MS = 5_000;

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type Session = {
  account: Account;
  tenant: Tenant;
};

type AuthContextValue = {
  status: AuthStatus;
  account: Account | null;
  tenant: Tenant | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterTenantInput) => Promise<void>;
  logout: () => Promise<void>;
  updateAccount: (account: Account) => void;
  request: ApiClient['fetch'];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthResponse> | null>(null);
  const restoredRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const applySession = useCallback((response: AuthResponse) => {
    accessTokenRef.current = response.accessToken;
    setSession({ account: response.account, tenant: response.tenant });
    setExpiresAt(Date.now() + response.expiresIn * 1000);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setSession(null);
    setExpiresAt(null);
    setStatus('unauthenticated');
  }, []);

  const renewSession = useCallback((): Promise<AuthResponse> => {
    const inFlight = refreshPromiseRef.current;

    if (inFlight) {
      return inFlight;
    }

    const promise = refreshSession()
      .then((response) => {
        applySession(response);
        return response;
      })
      .catch((error: unknown) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = promise;

    return promise;
  }, [applySession, clearSession]);

  // Restaura a sessão a partir do cookie httpOnly de refresh. O single-flight
  // evita duas rotações concorrentes do mesmo token (o que revogaria a família).
  useEffect(() => {
    if (restoredRef.current) {
      return;
    }

    restoredRef.current = true;
    void renewSession().catch(() => undefined);
  }, [renewSession]);

  // Renova o access token pouco antes de expirar. O refresh também ocorre no
  // 401 (ver createApiClient), mas o timer evita uma falha visível ao usuário.
  useEffect(() => {
    if (status !== 'authenticated' || expiresAt === null) {
      return;
    }

    const jitter = Math.round((Math.random() - 0.5) * REFRESH_JITTER_MS);
    const refreshAt = expiresAt - REFRESH_SKEW_MS + jitter;
    const delay = Math.max(refreshAt - Date.now(), MIN_REFRESH_DELAY_MS);

    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        void renewSession().catch(() => undefined);
      }
    }, delay);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() >= refreshAt) {
        clearTimeout(timer);
        void renewSession().catch(() => undefined);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expiresAt, renewSession, status]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await loginRequest(input);
      applySession(response);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterTenantInput) => {
      const response = await registerRequest(input);
      applySession(response);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Mesmo que a API falhe, a sessão local deve ser encerrada.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateAccount = useCallback((account: Account) => {
    setSession((current) => (current ? { ...current, account } : current));
  }, []);

  const client = useMemo(
    () =>
      createApiClient({
        getAccessToken: () => accessTokenRef.current,
        refresh: async () => {
          const response = await renewSession().catch(() => null);
          return response?.accessToken ?? null;
        },
      }),
    [renewSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      account: session?.account ?? null,
      tenant: session?.tenant ?? null,
      login,
      register,
      logout,
      updateAccount,
      request: client.fetch,
    }),
    [client.fetch, login, logout, register, session, status, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
